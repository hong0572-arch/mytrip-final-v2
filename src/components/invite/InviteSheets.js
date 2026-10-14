'use client';
import { useEffect, useRef, useState } from 'react';
import { Copy, Link2, Send } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { createInvite, inviteState, removeMember, revokeInvite, setMemberRole } from '../../lib/invites';
import { createShareLink, listShareLinks, setShareEnabled, shareUrl } from '../../lib/tripStore';
import { onSnapshotError } from '../../lib/snapshotError';
import { getInviteCopy } from '../../content/inviteCopy';

const DAY = 24 * 60 * 60 * 1000;
const daysFrom = (ms, now) => Math.ceil((ms - now) / DAY);
const shortDate = (ms, language) => (ms ? new Date(ms).toLocaleDateString(language === 'en' ? 'en-US' : 'ko-KR', { month: 'numeric', day: 'numeric' }) : '');

// 일정 만든 사람(예전 일정은 hostId가 없어 첫 멤버)
export const hostOf = (trip) => trip?.hostId || trip?.memberIds?.[0] || null;
export const isViewer = (trip, uid) => Boolean(uid && (trip?.viewerIds || []).includes(uid));

// 어디서 열어도 맨 위에 뜨는 아래 시트(배경 누르기·Esc로 닫기)
function Sheet({ label, onClose, children }) {
  const panelRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center font-sans text-tm-ink">
      <button type="button" aria-label="close" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-[rgba(13,31,54,0.45)]" />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="tm-rise relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-tm-ground px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(13,31,54,.18)] outline-none"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D5D9DF]" />
        {children}
      </section>
    </div>
  );
}

function Choice({ label, options, value, onChange }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[13px] font-semibold text-tm-muted">{label}</legend>
      <div className="flex gap-2">
        {options.map(([key, text]) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={`h-11 flex-1 rounded-xl border text-[14px] font-semibold ${value === key ? 'border-tm-navy bg-tm-navy text-white' : 'border-tm-line bg-white text-tm-ink'}`}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function useFlash() {
  const [msg, setMsg] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = (m) => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 2200); };
  return [msg, flash];
}

function Flash({ message }) {
  return <p role="status" aria-live="polite" className={`min-h-5 text-center text-[13px] font-semibold text-tm-navy ${message ? '' : 'invisible'}`}>{message || '.'}</p>;
}

const tripName = (trip) => trip?.tripTitle || trip?.destination || '';

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

// ① 초대 링크 만들기 — 기본 1명 · 7일 · 함께 편집
export function InviteSheet({ trip, language, meta, onClose }) {
  const copy = getInviteCopy(language);
  const [uses, setUses] = useState(1);
  const [expiry, setExpiry] = useState('7d');
  const [role, setRole] = useState('edit');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, flash] = useFlash();

  const make = async () => {
    setBusy(true);
    try {
      const link = await createInvite(trip, { maxUses: uses, expiry, role });
      setUrl(link);
      if (await copyText(link)) flash(copy.copied);
    } catch (err) {
      console.error('invite create failed:', err);
      flash(copy.failed);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (navigator.share) await navigator.share({ title: copy.sendText(tripName(trip)), text: copy.sendText(tripName(trip)), url }).catch(() => {});
    else if (await copyText(url)) flash(copy.copied);
  };

  return (
    <Sheet label={copy.inviteTitle} onClose={onClose}>
      <h2 className="text-[20px] font-bold">{copy.inviteTitle}</h2>
      {meta && <p className="mt-0.5 text-[13px] tabular-nums text-tm-muted">{meta}</p>}

      {!url ? (
        <div className="mt-5 flex flex-col gap-5">
          <Choice label={copy.usesLabel} value={uses} onChange={setUses} options={[1, 3, 0].map((n) => [n, copy.uses[n]])} />
          <Choice label={copy.expiryLabel} value={expiry} onChange={setExpiry} options={['24h', '7d', 'start'].map((k) => [k, copy.expiry[k]])} />
          <Choice label={copy.roleLabel} value={role} onChange={setRole} options={['edit', 'view'].map((k) => [k, copy.role[k]])} />
          <button type="button" onClick={make} disabled={busy} className="flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-tm-navy text-[16px] font-bold text-white disabled:opacity-60">
            <Link2 size={18} aria-hidden="true" />{busy ? copy.creating : copy.create}
          </button>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-tm-line bg-white p-2 pl-3.5">
            <span className="min-w-0 flex-1 truncate text-[13px] tabular-nums text-tm-muted">{url.replace(/^https?:\/\//, '')}</span>
            <button type="button" onClick={async () => { if (await copyText(url)) flash(copy.copied); }} className="flex h-11 items-center gap-1.5 rounded-xl bg-tm-sky-tint px-3.5 text-[14px] font-bold text-tm-navy">
              <Copy size={14} aria-hidden="true" />{copy.copy}
            </button>
          </div>
          <p className="text-[13px] font-semibold text-tm-ink">{copy.linkSummary(copy.uses[uses], copy.role[role])} · {copy.expiry[expiry]}</p>
          <button type="button" onClick={send} className="flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-tm-navy text-[16px] font-bold text-white">
            <Send size={18} aria-hidden="true" />{copy.send}
          </button>
          <button type="button" onClick={() => setUrl('')} className="h-12 rounded-[14px] border border-tm-line bg-white text-[15px] font-semibold">{copy.newLink}</button>
        </div>
      )}
      <p className="mt-4 text-[12px] leading-relaxed text-tm-muted">{copy.createNote(uses)}</p>
      <Flash message={msg} />
    </Sheet>
  );
}

// ④ 동행 관리 — 만든 사람은 권한 바꾸기·내보내기, 편집 가능한 동행은 열린 링크 닫기
export function MembersSheet({ trip, language, onClose, onNewInvite }) {
  const copy = getInviteCopy(language);
  const uid = auth.currentUser?.uid;
  const host = hostOf(trip);
  const amHost = uid && uid === host;
  const canInvite = uid && !isViewer(trip, uid);
  const [invites, setInvites] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [now] = useState(() => Date.now());
  const [msg, flash] = useFlash();

  useEffect(() => {
    if (!canInvite || !trip?.id) return;
    const q = query(collection(db, 'trips', trip.id, 'invites'), where('revoked', '==', false));
    return onSnapshot(q, (snap) => setInvites(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onSnapshotError('trip/invites', () => setInvites([])));
  }, [canInvite, trip?.id]);

  const open = invites.filter((inv) => inviteState(inv, now) === 'open').sort((a, b) => (a.expiresAt || 0) - (b.expiresAt || 0));
  const members = (trip.memberIds || []).map((id) => ({ uid: id, ...(trip.membersInfo || []).find((m) => m?.uid === id) }));

  const run = async (fn) => {
    try { await fn(); } catch (err) { console.error('members action failed:', err); flash(copy.failed); }
  };

  return (
    <Sheet label={copy.membersTitle} onClose={onClose}>
      <h2 className="text-[20px] font-bold">{copy.membersTitle} <span className="tabular-nums text-tm-muted">{members.length}</span></h2>
      {!canInvite && <p className="mt-1 text-[13px] text-tm-muted">{copy.viewerNote}</p>}

      <ul className="mt-3 flex flex-col gap-2">
        {members.map((m) => {
          const name = m.name || '…';
          const isMe = m.uid === uid;
          const role = m.uid === host ? copy.host : isViewer(trip, m.uid) ? copy.role.view : copy.role.edit;
          return (
            <li key={m.uid} className="flex min-h-[60px] items-center gap-3 rounded-2xl bg-white px-3.5 py-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tm-sky-tint text-[14px] font-bold text-tm-navy">{name.slice(0, 1)}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-semibold">{name}{isMe && <span className="ml-1 text-[12px] font-normal text-tm-muted">({copy.me})</span>}</span>
                {amHost && m.uid !== host ? (
                  <select
                    aria-label={`${name} · ${copy.roleLabel}`}
                    value={isViewer(trip, m.uid) ? 'view' : 'edit'}
                    onChange={(e) => run(() => setMemberRole(trip, m.uid, e.target.value))}
                    className="-ml-1 h-8 w-fit rounded-lg bg-transparent text-[13px] text-tm-muted"
                  >
                    <option value="edit">{copy.role.edit}</option>
                    <option value="view">{copy.role.view}</option>
                  </select>
                ) : (
                  <span className="text-[13px] text-tm-muted">{role}</span>
                )}
              </span>
              {amHost && m.uid !== host && (
                confirm === m.uid ? (
                  <span className="flex gap-1.5">
                    <button type="button" onClick={() => setConfirm(null)} className="h-11 rounded-xl border border-tm-line px-3 text-[13px] font-semibold">{copy.cancel}</button>
                    <button type="button" onClick={() => { setConfirm(null); run(() => removeMember(trip, m.uid)); }} className="h-11 rounded-xl bg-tm-ink px-3 text-[13px] font-bold text-white">{copy.removeYes}</button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirm(m.uid)} aria-label={copy.removeConfirm(name)} className="h-11 rounded-xl border border-tm-line px-3 text-[13px] font-semibold text-tm-muted">{copy.remove}</button>
                )
              )}
            </li>
          );
        })}
      </ul>

      {canInvite && (
        <>
          <div className="mt-6 flex items-center justify-between">
            <h3 className="text-[15px] font-bold">{copy.openLinks}</h3>
            <button type="button" onClick={onNewInvite} className="h-11 px-1 text-[14px] font-bold text-tm-navy">{copy.addLink}</button>
          </div>
          {open.length === 0 ? (
            <p className="mt-1 rounded-2xl bg-white p-4 text-[14px] text-tm-muted">{copy.noLinks}</p>
          ) : (
            <ul className="mt-1 flex flex-col gap-2">
              {open.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 rounded-2xl bg-white py-2 pl-3.5 pr-2">
                  <Link2 size={18} className="shrink-0 text-tm-navy" aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[14px] font-semibold">{copy.linkSummary(copy.uses[inv.maxUses] || copy.uses[0], copy.role[inv.role === 'view' ? 'view' : 'edit'])}</span>
                    <span className="text-[12px] tabular-nums text-tm-muted">{copy.daysLeft(daysFrom(inv.expiresAt, now))} · {copy.usedOf(inv.uses || 0, inv.maxUses)}</span>
                  </span>
                  <button type="button" onClick={() => run(() => revokeInvite(trip.id, inv.id))} className="h-11 rounded-xl border border-tm-line px-3.5 text-[13px] font-semibold">{copy.closeLink}</button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[12px] leading-relaxed text-tm-muted">{copy.closeNote}</p>
        </>
      )}
      <Flash message={msg} />
      <button type="button" onClick={onClose} className="h-12 w-full rounded-[14px] border border-tm-line bg-white text-[15px] font-semibold text-tm-muted">{copy.close}</button>
    </Sheet>
  );
}

// ⑤ 보기 전용 공유 링크 — 이 일정에서 내가 만든 링크 끄고 켜기·새로 만들기
export function SharesSheet({ trip, plan, language, onClose }) {
  const copy = getInviteCopy(language);
  const [links, setLinks] = useState(null);
  const [now] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [msg, flash] = useFlash();

  useEffect(() => {
    let alive = true;
    listShareLinks(trip.id).then((rows) => alive && setLinks(rows)).catch((err) => { console.error('shares load failed:', err); if (alive) setLinks([]); });
    return () => { alive = false; };
  }, [trip.id]);

  const create = async () => {
    setBusy(true);
    try {
      const url = await createShareLink(plan || trip, trip, trip.id);
      const id = url.split('/share/')[1];
      setLinks((prev) => [{ id, enabled: true, createdAt: Date.now(), expiresAt: Date.now() + 30 * DAY }, ...(prev || [])]);
      if (navigator.share) await navigator.share({ title: tripName(trip), url }).catch(() => {});
      else if (await copyText(url)) flash(copy.shareCopied);
    } catch (err) {
      console.error('share create failed:', err);
      flash(copy.failed);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (link) => {
    try {
      await setShareEnabled(link.id, !link.enabled);
      setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, enabled: !l.enabled } : l)));
    } catch (err) {
      console.error('share toggle failed:', err);
      flash(copy.failed);
    }
  };

  return (
    <Sheet label={copy.sharesTitle} onClose={onClose}>
      <h2 className="text-[20px] font-bold">{copy.sharesTitle}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-tm-muted">{copy.sharesIntro}</p>

      <ul className="mt-4 flex flex-col gap-2">
        {links === null && <li role="status" className="p-4 text-center text-[14px] text-tm-muted">…</li>}
        {links?.length === 0 && <li className="rounded-2xl bg-white p-4 text-[14px] text-tm-muted">{copy.noShares}</li>}
        {links?.map((link) => {
          const expired = link.expiresAt && link.expiresAt < now;
          const live = link.enabled && !expired;
          const closes = expired ? copy.closedTag : link.expiresAt ? copy.closesIn(daysFrom(link.expiresAt, now)) : copy.noExpiry;
          return (
            <li key={link.id} className={`flex flex-col gap-2 rounded-2xl bg-white p-3.5 ${live ? '' : 'opacity-70'}`}>
              <div className="flex items-center gap-2">
                <Link2 size={18} className="shrink-0 text-tm-navy" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[13px] tabular-nums text-tm-muted">{shareUrl(link.id).replace(/^https?:\/\//, '')}</span>
                <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${live ? 'bg-tm-sky-tint text-tm-navy' : 'bg-tm-ground text-tm-muted'}`}>{live ? copy.shareOn : copy.closedTag}</span>
              </div>
              <span className="text-[12px] tabular-nums text-tm-muted">{copy.shareMeta(shortDate(link.createdAt, language), closes)}</span>
              {!expired && (
                <div className="flex gap-2">
                  {live && (
                    <button type="button" onClick={async () => { if (await copyText(shareUrl(link.id))) flash(copy.shareCopied); }} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-tm-sky-tint text-[13px] font-bold text-tm-navy">
                      <Copy size={14} aria-hidden="true" />{copy.copyLink}
                    </button>
                  )}
                  <button type="button" onClick={() => toggle(link)} className="h-11 flex-1 rounded-xl border border-tm-line text-[13px] font-semibold">{copy.shareToggle(link.enabled)}</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button type="button" onClick={create} disabled={busy} className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-tm-navy text-[16px] font-bold text-white disabled:opacity-60">
        <Link2 size={18} aria-hidden="true" />{copy.newShare}
      </button>
      <p className="mt-3 text-[12px] leading-relaxed text-tm-muted">{copy.sharesNote}</p>
      <Flash message={msg} />
    </Sheet>
  );
}
