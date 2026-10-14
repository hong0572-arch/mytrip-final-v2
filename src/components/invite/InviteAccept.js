'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Link2Off, Users } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { authHeaders } from '../../utils/authHeaders';
import { formatTripRange } from '../../utils/tripPhase';
import useAppLanguage from '../../hooks/useAppLanguage';
import { getInviteCopy } from '../../content/inviteCopy';
import { goToLogin } from '../home/homeActions';
import TimmyAvatar from '../TimmyAvatar';

const DAY = 24 * 60 * 60 * 1000;

// 닫힌 초대(사용됨·만료·취소·예전 /join 링크 모두 같은 화면)
export function InviteClosed({ language, legacy = false }) {
  const copy = getInviteCopy(language);
  return (
    <div className="flex min-h-dvh justify-center bg-tm-ground font-sans text-tm-ink">
      <main className="flex w-full max-w-md flex-col items-center gap-3 px-6 pb-10 pt-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-tm-muted"><Link2Off size={28} aria-hidden="true" /></span>
        <h1 className="mt-2 text-[22px] font-bold">{copy.closedTitle}</h1>
        <p className="text-[14px] leading-relaxed text-tm-muted">{legacy ? copy.legacyBody : copy.closedBody}<br />{copy.closedAsk}</p>
        <Link href="/" className="mt-6 flex h-[52px] w-full items-center justify-center rounded-[14px] bg-tm-navy text-[16px] font-bold text-white">{copy.makeOwn}</Link>
        <Link href="/" className="flex min-h-11 items-center text-[14px] font-semibold text-tm-navy">{copy.home}</Link>
      </main>
    </div>
  );
}

// 초대받은 사람 화면. 참여 전에는 일정 이름·날짜·초대한 사람·인원만 보여 준다.
export default function InviteAccept() {
  const router = useRouter();
  const [language] = useAppLanguage();
  const copy = getInviteCopy(language);
  const [params] = useState(() => {
    if (typeof window === 'undefined') return { k: '', r: '' };
    const sp = new URLSearchParams(window.location.search);
    return { k: sp.get('k') || '', r: sp.get('r') || '' };
  });
  const [user, setUser] = useState(undefined);
  const [invite, setInvite] = useState(null); // null 로딩 · false 닫힘 · 객체
  const [state, setState] = useState('idle'); // idle | busy | error
  const [now] = useState(() => Date.now());

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  // 미리보기: 링크 초대는 로그인 전에도, 앱 안 초대(r)는 로그인 뒤에
  useEffect(() => {
    if (user === undefined) return;
    if (!params.k && !params.r) { Promise.resolve().then(() => setInvite(false)); return; }
    if (params.r && !user) return;
    let alive = true;
    (async () => {
      try {
        const qs = params.k ? `k=${encodeURIComponent(params.k)}` : `r=${encodeURIComponent(params.r)}`;
        const headers = user ? await authHeaders() : {};
        const res = await fetch(`/api/invites/?${qs}`, { headers, cache: 'no-store' });
        const data = res.ok ? await res.json() : null;
        if (alive) setInvite(data?.status === 'open' ? data : false);
      } catch {
        if (alive) setInvite(false);
      }
    })();
    return () => { alive = false; };
  }, [user, params]);

  const back = `/j/?${params.k ? `k=${params.k}` : `r=${params.r}`}`;

  const join = useCallback(async () => {
    setState('busy');
    try {
      const res = await fetch('/api/invites/', {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(params.k ? { k: params.k } : { r: params.r }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.status === 'joined' && data.tripId) {
        try { localStorage.setItem('activeTripId', data.tripId); } catch {}
        router.replace(`/trip?id=${data.tripId}`);
        return;
      }
      if (data.status === 'closed') { setInvite(false); return; }
      setState('error');
    } catch {
      setState('error');
    }
  }, [params, router]);

  if (invite === false) return <InviteClosed language={language} />;

  if (invite === null && !(params.r && user === null)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-tm-ground font-sans">
        <TimmyAvatar size={64} ring className="tm-float" />
        <p role="status" className="text-[15px] font-semibold text-tm-muted">{copy.loading}</p>
      </div>
    );
  }

  const days = invite?.expiresAt ? Math.max(0, Math.ceil((invite.expiresAt - now) / DAY)) : null;
  const others = (invite?.memberNames || []).join(', ');
  const range = invite ? formatTripRange(invite, language) : '';

  return (
    <div className="flex min-h-dvh justify-center bg-tm-ground font-sans text-tm-ink">
      <main className="flex w-full max-w-md flex-col gap-5 px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <TimmyAvatar size={56} ring />
          <h1 className="text-[22px] font-bold leading-snug">{copy.acceptTitle(invite?.inviter)}</h1>
        </div>

        {invite && (
          <section className="flex flex-col gap-3 rounded-[20px] bg-white p-5">
            <h2 className="text-[20px] font-bold">{invite.title || invite.destination}</h2>
            {range && <p className="flex items-center gap-2 text-[14px] tabular-nums text-tm-muted"><CalendarDays size={16} aria-hidden="true" />{range}</p>}
            <p className="flex items-center gap-2 text-[14px] text-tm-muted"><Users size={16} aria-hidden="true" />{copy.nowMembers(invite.memberCount, others)}</p>
            <p className="mt-1 rounded-xl bg-tm-sky-tint px-3.5 py-2.5 text-[14px] font-semibold text-tm-navy">{copy.roleDesc[invite.role]}</p>
            <p className="text-[12px] text-tm-muted">{copy.hiddenNote}</p>
          </section>
        )}

        {user ? (
          <button type="button" onClick={join} disabled={state === 'busy' || !invite} className="h-[52px] rounded-[14px] bg-tm-navy text-[16px] font-bold text-white disabled:opacity-60">
            {state === 'busy' ? copy.joining : copy.join}
          </button>
        ) : (
          <button type="button" onClick={() => goToLogin(router, back)} className="h-[52px] rounded-[14px] bg-tm-navy text-[16px] font-bold text-white">{copy.loginToJoin}</button>
        )}
        {state === 'error' && <p role="alert" className="text-center text-[13px] text-tm-warm">{copy.failed}</p>}
        {invite && <p className="text-center text-[13px] text-tm-muted">{copy.linkLeft(days, invite.remaining)}</p>}
      </main>
    </div>
  );
}
