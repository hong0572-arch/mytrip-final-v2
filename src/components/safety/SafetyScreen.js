'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Link2, MessageSquare, Shield, Store, Timer, Trash2, UserRound, X } from 'lucide-react';
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { onSnapshotError } from '../../lib/snapshotError';
import useAppLanguage from '../../hooks/useAppLanguage';
import useMyTrips from '../../hooks/useMyTrips';
import { useIsClient } from '../../hooks/useLocalStore';
import { getAiHomeCopy } from '../../content/aiHomeCopy';
import { getSafetyCopy } from '../../content/safetyCopy';
import useSafety from '../../lib/safety/useSafety';
import { MAX_GUARDIANS, liveSessionPath, setSafety } from '../../lib/safety/store';
import {
  addPhoneGuardian, createGuardianInvite, endSafety, extendSafety, liveLink, raiseAlert, removeGuardian, shareLocation, smsHref, startSafety, syncAcceptedInvites,
} from '../../lib/safety/actions';
import { pickActiveTrip } from '../../utils/tripPhase';
import BottomNav from '../home/BottomNav';
import { goToLogin } from '../home/homeActions';
import { EmergencyCard, SosButton } from './SafetyParts';

const R = 92;
const CIRC = 2 * Math.PI * R;
const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
const clock = (ms, language) => new Date(ms).toLocaleTimeString(language === 'en' ? 'en-US' : 'ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

function Toast({ message }) {
  if (!message) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex justify-center px-6">
      <span className="tm-rise rounded-full bg-tm-ink px-4 py-2.5 text-center text-[14px] font-semibold text-white shadow-lg">{message}</span>
    </div>
  );
}

function AddGuardianSheet({ copy, count, userName, onClose, onToast }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const full = count >= MAX_GUARDIANS;

  const invite = async () => {
    setBusy(true);
    try {
      const url = await createGuardianInvite();
      const text = copy.inviteShareText(userName || '');
      if (navigator.share) {
        try { await navigator.share({ title: copy.joinTitle, text, url }); } catch {}
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        onToast(copy.inviteCopied);
      }
      onClose();
    } catch {
      onToast(copy.failed);
    } finally {
      setBusy(false);
    }
  };

  const savePhone = (e) => {
    e.preventDefault();
    if (!name.trim() || phone.replace(/\D/g, '').length < 7) return;
    if (addPhoneGuardian(name, phone)) { onToast(copy.toastSaved); onClose(); } else onToast(copy.full);
  };

  const field = 'h-12 w-full rounded-xl border border-tm-line bg-tm-ground px-3.5 text-[16px] outline-none focus:border-tm-navy';
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button type="button" aria-label={copy.close} tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-[rgba(13,31,54,0.45)]" />
      <section role="dialog" aria-modal="true" aria-label={copy.addTitle} className="tm-rise relative flex max-h-[92dvh] w-full max-w-md flex-col gap-3.5 overflow-y-auto rounded-t-3xl bg-tm-ground px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto h-1 w-10 rounded-full bg-[#D5D9DF]" />
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-bold">{copy.addTitle}</h2>
          <button type="button" onClick={onClose} aria-label={copy.close} className="flex h-11 w-11 items-center justify-center text-tm-muted"><X size={20} /></button>
        </div>
        <p className="text-[14px] leading-relaxed text-tm-muted">{full ? copy.full : copy.addIntro}</p>
        {!full && (
          <>
            <section className="flex flex-col gap-3 rounded-[20px] bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tm-sky-tint text-tm-navy"><Link2 size={20} aria-hidden="true" /></span>
                <span className="flex flex-col gap-1"><span className="text-[16px] font-bold">{copy.inviteTitle}</span><span className="text-[13px] leading-normal text-tm-muted">{copy.inviteBody}</span></span>
              </div>
              <button type="button" onClick={invite} disabled={busy} className="h-[50px] rounded-[14px] bg-tm-navy text-[15px] font-bold text-white disabled:opacity-60">{copy.inviteShare}</button>
            </section>
            <form onSubmit={savePhone} className="flex flex-col gap-3 rounded-[20px] bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tm-ground text-tm-muted"><MessageSquare size={20} aria-hidden="true" /></span>
                <span className="flex flex-col gap-1"><span className="text-[16px] font-bold">{copy.phoneTitle}</span><span className="text-[13px] leading-normal text-tm-muted">{copy.phoneBody}</span></span>
              </div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={copy.phoneName} aria-label={copy.phoneName} maxLength={20} className={field} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={copy.phoneNumber} aria-label={copy.phoneNumber} inputMode="tel" type="tel" maxLength={20} className={field} />
              <button type="submit" className="h-12 rounded-xl border border-tm-line bg-white text-[15px] font-bold text-tm-navy">{copy.save}</button>
            </form>
          </>
        )}
        <p className="rounded-2xl bg-tm-safe-tint px-3.5 py-3 text-[12px] leading-relaxed text-tm-safe-ink">{copy.privacyNote}</p>
      </section>
    </div>
  );
}

// 안심 탭: 안심 귀가 시작·진행, 현지 긴급번호, 보호자, 안심 장소, 내가 지켜 주는 사람
export default function SafetyScreen() {
  const router = useRouter();
  const [language] = useAppLanguage();
  const copy = getSafetyCopy(language);
  const homeCopy = getAiHomeCopy(language);
  const { user, authReady, trips } = useMyTrips();
  const mounted = useIsClient();
  const s = useSafety();
  const [now, setNow] = useState(0);
  const [minutes, setMinutes] = useState(60);
  const [custom, setCustom] = useState('');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');
  const [country, setCountry] = useState(null);
  const [invites, setInvites] = useState([]);
  const [wards, setWards] = useState({ invites: [], sessions: [] });
  const [smsBody, setSmsBody] = useState('');

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2400); };

  // 긴급번호 기준 여행지: 여행 중 → 가장 가까운 출발
  const trip = useMemo(() => (mounted ? pickActiveTrip(trips) : null), [mounted, trips]);
  const tripDest = trip?.destination || trip?.tripTitle || '';
  useEffect(() => { if (tripDest && s.dest !== tripDest) setSafety({ dest: tripDest }); }, [tripDest, s.dest]);

  useEffect(() => {
    if (s.phase === 'idle') return undefined;
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [s.phase]);

  // 내가 보낸 보호자 초대(수락되면 보호자로 들어온다) · 내가 수락한 초대(내가 지켜 주는 사람)
  useEffect(() => {
    if (!user) return undefined;
    const a = onSnapshot(query(collection(db, 'guardian_invites'), where('ownerUid', '==', user.uid)), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setInvites(list);
      syncAcceptedInvites(list.filter((i) => i.status === 'accepted'));
    }, onSnapshotError('safety/invites'));
    const b = onSnapshot(query(collection(db, 'guardian_invites'), where('acceptedBy', '==', user.uid)), (snap) => {
      setWards((w) => ({ ...w, invites: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }));
    }, onSnapshotError('safety/wards'));
    const c = onSnapshot(query(collection(db, 'safemode_sessions'), where('guardianUserIds', 'array-contains', user.uid)), (snap) => {
      setWards((w) => ({ ...w, sessions: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }));
    }, onSnapshotError('safety/ward-sessions'));
    return () => { a(); b(); c(); };
  }, [user]);

  const guardianNames = s.guardians.map((g) => g.name).filter(Boolean).join(', ');
  const pending = invites.filter((i) => i.status === 'pending').length;
  const active = s.phase === 'active' || s.phase === 'grace';
  const left = active && now ? Math.max(0, Math.round((s.endTime - now) / 1000)) : 0;
  const total = Math.max(1, (s.minutes || 1) * 60);

  const start = async () => {
    const m = custom ? Math.round(Number(custom)) : minutes;
    if (!s.guardians.length) { flash(copy.needGuardian); setAdding(true); return; }
    if (!m || m <= 0 || m > 24 * 60) return;
    await startSafety(m, copy);
    flash(copy.toastStarted);
  };

  const sendLoc = async () => {
    const body = await shareLocation(copy);
    setSmsBody(body);
    flash(copy.toastLocation);
  };

  const copyLive = async () => {
    try { await navigator.clipboard.writeText(liveLink()); flash(copy.toastLinkCopied); } catch { flash(copy.failed); }
  };

  const guestCountry = copy.countries.find((c) => c.id === country) || copy.countries[0];
  const loading = !authReady || !mounted;

  return (
    <div className="flex min-h-dvh flex-col bg-tm-ground font-sans text-tm-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="py-2 pl-5 pr-3"><h1 className="py-1.5 text-[24px] font-bold tracking-[-0.02em]">{copy.title}</h1></header>

        <main className="flex flex-1 flex-col gap-3.5 px-4 pb-6 pt-1">
          {/* 진행 중 */}
          {user && active && (
            <section className="flex flex-col items-center gap-3.5 rounded-[22px] border-[1.5px] border-tm-safe bg-white p-[18px]">
              <span className="inline-flex items-center gap-1.5 self-start text-[13px] font-bold text-tm-safe-ink">
                <span className="relative h-2 w-2 rounded-full bg-tm-safe"><span className="tm-beacon bg-tm-safe" /></span>
                {copy.activeLabel(guardianNames)}
              </span>
              <div className="relative h-[210px] w-[210px]">
                <svg width="210" height="210" viewBox="0 0 210 210" aria-hidden="true">
                  <circle cx="105" cy="105" r={R} fill="none" stroke="var(--color-tm-safe-tint)" strokeWidth="12" />
                  <circle cx="105" cy="105" r={R} fill="none" stroke="var(--color-tm-safe)" strokeWidth="12" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - Math.min(1, left / total))} transform="rotate(-90 105 105)" className="transition-[stroke-dashoffset] duration-1000 ease-linear" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                  <span role="timer" className="text-[44px] font-bold tabular-nums tracking-[-0.02em]">{fmt(left)}</span>
                  <span className="text-[13px] text-tm-muted">{copy.promise(clock(s.endTime, language))}</span>
                </div>
              </div>
              <button type="button" onClick={async () => { await endSafety(copy); flash(copy.toastStopped); }} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-tm-safe text-[17px] font-bold text-white">
                <Check size={20} strokeWidth={2.6} aria-hidden="true" /> {copy.arrived}
              </button>
              <div className="flex w-full gap-2">
                <button type="button" onClick={async () => { await extendSafety(15); flash(copy.toastExtended); }} className="h-12 flex-1 rounded-[14px] border border-tm-line text-[14px] font-semibold">{copy.extend}</button>
                <button type="button" onClick={sendLoc} className="h-12 flex-1 rounded-[14px] border border-tm-line text-[14px] font-semibold">{copy.sendLocation}</button>
              </div>
              {smsBody && s.guardians.filter((g) => g.type === 'phone').map((g) => (
                <a key={g.id} href={smsHref(g.phone, smsBody)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-tm-sky-tint text-[14px] font-bold text-tm-navy">
                  <MessageSquare size={16} aria-hidden="true" /> {copy.smsTo(g.name)}
                </a>
              ))}
              <button type="button" onClick={copyLive} className="min-h-11 text-[13px] font-semibold text-tm-navy">{copy.copyLive}</button>
            </section>
          )}

          {user && active && (
            <section className="flex flex-col gap-2.5 rounded-[20px] bg-white p-4">
              <SosButton copy={copy} onTrigger={() => raiseAlert(copy, { sos: true })} />
              <p className="text-center text-[12px] leading-normal text-tm-muted">{copy.sosHint}</p>
            </section>
          )}

          {/* 시작 */}
          {user && !active && (
            <section className="flex flex-col gap-3.5 rounded-[22px] bg-tm-ink p-[18px] text-white">
              <div className="flex items-center gap-2.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-tm-sky-soft"><Shield size={24} strokeWidth={2} aria-hidden="true" /></span>
                <div className="flex flex-col gap-0.5"><span className="text-[17px] font-bold">{copy.startTitle}</span><span className="text-[12px] text-[#B9C8DA]">{copy.startBody(guardianNames)}</span></div>
              </div>
              <div role="radiogroup" aria-label={copy.customLabel} className="flex flex-wrap gap-1.5">
                {copy.durations.map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={!custom && minutes === m} onClick={() => { setMinutes(m); setCustom(''); }}
                    className={`h-10 rounded-full px-3.5 text-[14px] font-bold ${!custom && minutes === m ? 'bg-white text-tm-navy' : 'border border-white/25 text-white'}`}>
                    {copy.minutes(m)}
                  </button>
                ))}
                <label className={`flex h-10 items-center gap-1 rounded-full px-3 text-[14px] ${custom ? 'bg-white text-tm-navy' : 'border border-white/25'}`}>
                  <Timer size={15} aria-hidden="true" />
                  <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder={copy.custom} aria-label={copy.customLabel}
                    className="w-14 bg-transparent font-bold outline-none placeholder:text-white/80" />
                </label>
              </div>
              <button type="button" onClick={start} className="h-[52px] rounded-[14px] bg-tm-sky-soft text-[16px] font-bold text-tm-navy-deep">{copy.start}</button>
            </section>
          )}

          {/* 로그인 전 */}
          {!loading && !user && (
            <>
              <EmergencyCard copy={copy} destination={guestCountry.dest} basis={copy.emergencyGuest}>
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
                  {copy.countries.map((c) => (
                    <button key={c.id} type="button" aria-pressed={guestCountry.id === c.id} onClick={() => setCountry(c.id)}
                      className={`h-10 shrink-0 rounded-full px-3.5 text-[14px] font-semibold ${guestCountry.id === c.id ? 'bg-tm-navy text-white' : 'border border-tm-line bg-white'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </EmergencyCard>
              <section className="flex flex-col gap-3.5 rounded-[22px] bg-tm-ink p-[18px] text-white">
                <span className="text-[18px] font-bold leading-snug">{copy.guestIntroTitle[0]}<br />{copy.guestIntroTitle[1]}</span>
                {copy.guestFeatures.map(([t, sub], i) => (
                  <div key={t} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-tm-sky-soft">{[<Timer key="a" size={18} />, <UserRound key="b" size={18} />, <Shield key="c" size={18} />][i]}</span>
                    <span className="flex flex-col"><span className="text-[14px] font-bold">{t}</span><span className="text-[12px] text-[#B9C8DA]">{sub}</span></span>
                  </div>
                ))}
                <button type="button" onClick={() => goToLogin(router)} className="h-[52px] rounded-[14px] bg-white text-[15px] font-bold text-tm-navy">{copy.loginToStart}</button>
              </section>
            </>
          )}

          {user && (
            <EmergencyCard copy={copy} destination={tripDest} basis={tripDest ? copy.emergencyBasis(tripDest) : ''}>
              {!active && <SosButton copy={copy} onTrigger={() => raiseAlert(copy, { sos: true })} className="h-14 text-[16px]" />}
            </EmergencyCard>
          )}

          {user && (
            <section className="flex flex-col gap-2 rounded-[20px] bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold">{copy.guardians}</h2>
                {s.guardians.length < MAX_GUARDIANS && <button type="button" onClick={() => setAdding(true)} className="min-h-11 text-[13px] font-bold text-tm-navy">{copy.addGuardian}</button>}
              </div>
              {s.guardians.length === 0 && <p className="text-[13px] leading-relaxed text-tm-muted">{copy.noGuardian}</p>}
              {s.guardians.map((g) => (
                <div key={g.id} className="flex min-h-[52px] items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tm-sky-tint font-bold text-tm-navy">{(g.name || '?').slice(0, 1)}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="truncate text-[15px] font-semibold">{g.name}</span>
                    <span className="truncate text-[12px] text-tm-muted">{g.type === 'app' ? copy.guardianApp : copy.guardianPhone(g.phone)}</span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${g.type === 'app' ? 'bg-tm-safe-tint text-tm-safe-ink' : 'bg-tm-ground text-tm-muted'}`}>{g.type === 'app' ? copy.linked : copy.sms}</span>
                  {!active && (
                    <button type="button" onClick={() => removeGuardian(g.id)} aria-label={`${copy.remove} ${g.name}`} className="flex h-11 w-10 items-center justify-center text-tm-muted"><Trash2 size={16} /></button>
                  )}
                </div>
              ))}
              {pending > 0 && <p className="text-[12px] text-tm-muted">{copy.pendingInvites(pending)}</p>}
            </section>
          )}

          <Link href="/map?cat=safe" className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tm-safe-tint text-tm-safe-ink"><Store size={20} aria-hidden="true" /></span>
            <span className="flex flex-1 flex-col gap-0.5"><span className="text-[15px] font-semibold">{copy.safePlaces}</span><span className="text-[12px] text-tm-muted">{copy.safePlacesSub}</span></span>
            <ChevronRight size={18} className="text-tm-muted" aria-hidden="true" />
          </Link>

          {user && wards.invites.length > 0 && (
            <section className="flex flex-col gap-2 rounded-[20px] bg-white p-4">
              <h2 className="text-[15px] font-bold">{copy.protecting}</h2>
              {wards.invites.map((inv) => {
                const sess = wards.sessions.find((x) => x.id === inv.ownerUid);
                const mins = sess?.endTime ? Math.max(0, Math.round((sess.endTime - (now || sess.endTime)) / 60000)) : 0;
                const link = sess ? liveSessionPath(sess.id, sess.shareToken) : null;
                return (
                  <div key={inv.id} className="flex min-h-[52px] items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tm-sky-tint font-bold text-tm-navy">{(inv.ownerName || '?').slice(0, 1)}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="truncate text-[15px] font-semibold">{inv.ownerName || copy.traveler}</span>
                      <span className={`truncate text-[12px] ${sess?.status === 'expired' ? 'font-bold text-tm-sos' : 'text-tm-muted'}`}>
                        {sess ? (sess.status === 'expired' ? copy.protectingAlert : copy.protectingActive(mins)) : copy.protectingIdle}
                      </span>
                    </span>
                    {link && <a href={link} className="flex h-9 items-center rounded-full bg-tm-sky-tint px-3 text-[13px] font-bold text-tm-navy">{copy.viewMap}</a>}
                    <button type="button" onClick={() => removeGuardianLink(inv.id)} aria-label={copy.remove} className="flex h-11 w-10 items-center justify-center text-tm-muted"><Trash2 size={16} /></button>
                  </div>
                );
              })}
            </section>
          )}
        </main>

        <div className="sticky bottom-0 z-10">
          <BottomNav copy={homeCopy} user={user} active="safety" />
        </div>
      </div>
      {adding && user && <AddGuardianSheet copy={copy} count={s.guardians.length} userName={user.displayName} onClose={() => setAdding(false)} onToast={flash} />}
      <Toast message={toast} />
    </div>
  );
}

// 보호자가 스스로 연결을 끊는다(초대 기록 삭제)
async function removeGuardianLink(inviteId) {
  await deleteDoc(doc(db, 'guardian_invites', inviteId)).catch(() => {});
}
