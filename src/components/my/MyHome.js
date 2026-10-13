'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Box, ChevronRight, Compass, Globe, Inbox, LayoutGrid, Lock, MessageCircle, Phone, Receipt, Shield, BookOpen } from 'lucide-react';
import { collection, doc, getCountFromServer, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { onSnapshotError } from '../../lib/snapshotError';
import useAppLanguage from '../../hooks/useAppLanguage';
import useMyTrips from '../../hooks/useMyTrips';
import { useIsClient } from '../../hooks/useLocalStore';
import { getAiHomeCopy } from '../../content/aiHomeCopy';
import { getMyCopy } from '../../content/myCopy';
import { authHeaders } from '../../utils/authHeaders';
import BottomNav from '../home/BottomNav';
import { goToLogin, openTimmyPanel } from '../home/homeActions';
import { groupTrips } from '../trips/tripsUtils';

const KAKAO_CONSULT_URL = 'https://pf.kakao.com/_xcJhrn/chat';
const todayKst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

function Row({ href, onClick, Icon, label, sub, tone = 'navy', right, badge }) {
  const inner = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone === 'safe' ? 'bg-tm-safe-tint text-tm-safe-ink' : 'bg-tm-sky-tint text-tm-navy'}`}>
        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="flex items-center gap-1.5 text-[15px] font-semibold text-tm-ink">
          {label}
          {badge ? <span className="rounded-full bg-tm-sky-tint px-1.5 text-[11px] font-bold tabular-nums text-tm-navy">{badge}</span> : null}
        </span>
        {sub && <span className="truncate text-[12px] text-tm-muted">{sub}</span>}
      </span>
      {right ?? <ChevronRight size={18} className="shrink-0 text-tm-muted" aria-hidden="true" />}
    </>
  );
  const cls = 'flex min-h-14 w-full items-center gap-3 border-t border-[#EEF0F2] px-3.5 py-2 text-left first:border-t-0 active:bg-tm-ground';
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

function Group({ title, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="mx-1 text-[13px] font-bold text-tm-muted">{title}</h2>
      <div className="overflow-hidden rounded-[18px] bg-white">{children}</div>
    </section>
  );
}

// 마이: 프로필 · 포인트 · 안심 · 여행 도구 · 커뮤니티 · 설정을 한 화면에
export default function MyHome() {
  const router = useRouter();
  const [language, setLanguage] = useAppLanguage();
  const copy = getMyCopy(language);
  const homeCopy = getAiHomeCopy(language);
  const { user, authReady, trips } = useMyTrips();
  const mounted = useIsClient();
  const [profile, setProfile] = useState(null);
  const [feedCount, setFeedCount] = useState(0);
  const [pending, setPending] = useState(0);
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  useEffect(() => {
    if (!user) return undefined;
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => setProfile(snap.exists() ? snap.data() : {}), onSnapshotError('my/user'));
    const unsubReq = onSnapshot(
      query(collection(db, 'match_requests'), where('targetMateId', '==', user.uid), where('status', '==', 'pending')),
      (snap) => setPending(snap.size),
      onSnapshotError('my/requests')
    );
    getCountFromServer(query(collection(db, 'feeds'), where('authorUid', '==', user.uid)))
      .then((r) => setFeedCount(r.data().count))
      .catch(() => {});
    return () => { unsubUser(); unsubReq(); };
  }, [user]);

  const { upcoming, past } = useMemo(() => (mounted ? groupTrips(trips) : { upcoming: [], past: [] }), [mounted, trips]);
  const checkedIn = mounted && profile?.lastCheckInDate === todayKst();

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const checkIn = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/points/', { method: 'POST', headers: await authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ action: 'checkin' }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error);
      if (json.awarded) flash(copy.checkinDone(json.awarded));
    } catch {
      flash(copy.failed);
    } finally {
      setChecking(false);
    }
  };

  const name = profile?.name || user?.displayName || copy.traveler;
  const photo = profile?.profileImgBase64 || user?.photoURL || '';
  const tags = Array.isArray(profile?.travelTags) ? profile.travelTags.slice(0, 3) : [];
  const safe = () => (user ? openTimmyPanel('safe') : goToLogin(router));

  return (
    <div className="flex min-h-dvh flex-col bg-tm-ground font-sans text-tm-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="flex items-center justify-between py-2 pl-5 pr-3">
          <h1 className="text-[24px] font-bold tracking-[-0.02em]">{copy.title}</h1>
          {user && (
            <Link href="/mypage/more?open=inbox" aria-label={copy.inbox} className="relative flex h-11 w-11 items-center justify-center text-tm-ink">
              <Bell size={22} strokeWidth={1.8} />
              {pending > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-tm-ground bg-tm-sky" />}
            </Link>
          )}
        </header>

        <main className="flex flex-1 flex-col gap-[18px] px-4 pb-6 pt-1">
          {authReady && !user && (
            <div className="flex flex-col items-center gap-3 rounded-[20px] bg-white px-5 py-8 text-center">
              <p className="text-[15px] font-semibold">{copy.loginTitle}</p>
              <button type="button" onClick={() => goToLogin(router)} className="h-12 rounded-[14px] bg-tm-navy px-6 text-[15px] font-bold text-white">{copy.login}</button>
            </div>
          )}

          {user && (
            <>
              <section className="flex flex-col gap-3.5 rounded-[20px] bg-white p-4">
                <div className="flex items-center gap-3.5">
                  {photo
                    ? <img src={photo} alt="" width={64} height={64} referrerPolicy="no-referrer" className="h-16 w-16 shrink-0 rounded-full object-cover" />
                    : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-tm-sky-tint text-[24px] font-bold text-tm-navy">{name.slice(0, 1)}</span>}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[19px] font-bold">{name}</span>
                    {profile?.bio && <span className="truncate text-[13px] text-tm-muted">{profile.bio}</span>}
                    {tags.length > 0 && (
                      <span className="mt-0.5 flex gap-1.5">
                        {tags.map((t) => <span key={t} className="rounded-full bg-tm-ground px-2 py-0.5 text-[11px] font-semibold text-tm-muted">{t}</span>)}
                      </span>
                    )}
                  </div>
                  <Link href="/mypage/more?open=profile" className="flex h-9 shrink-0 items-center rounded-full border border-tm-line px-3 text-[13px] font-semibold">{copy.edit}</Link>
                </div>
                <div className="grid grid-cols-3 border-t border-[#EEF0F2] pt-3 text-center">
                  {[
                    [past.length, copy.stats.past, '/trips'],
                    [upcoming.length, copy.stats.upcoming, '/trips'],
                    [feedCount, copy.stats.feeds, '/mypage/more?tab=social'],
                  ].map(([n, label, href]) => (
                    <Link key={label} href={href} className="flex min-h-11 flex-col justify-center gap-0.5">
                      <span className="text-[18px] font-bold tabular-nums">{n}</span>
                      <span className="text-[12px] text-tm-muted">{label}</span>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="flex items-center gap-3.5 rounded-[20px] bg-tm-ink p-4 text-white">
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-[12px] text-[#B9C8DA]">{copy.points}</span>
                  <span className="text-[26px] font-bold tabular-nums">{(profile?.points || 0).toLocaleString()} P</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button type="button" onClick={checkIn} disabled={checkedIn || checking} className="h-10 rounded-xl bg-white px-3.5 text-[13px] font-bold text-tm-navy disabled:bg-white/20 disabled:text-white/80">
                    {checkedIn ? copy.checkedIn : copy.checkin}
                  </button>
                  <Link href="/mypage/more?open=quiz" className="flex h-9 items-center justify-center rounded-xl border border-white/25 px-3.5 text-[12px] font-semibold">{copy.quizHistory}</Link>
                </div>
              </section>

              <Group title={copy.groups.safety}>
                <Row onClick={safe} Icon={Shield} tone="safe" label={copy.safety} sub={copy.safetySub} />
                <Row onClick={safe} Icon={Phone} label={copy.emergency} sub={copy.emergencySub} />
              </Group>

              <Group title={copy.groups.tools}>
                <Row href="/mypage/expenses" Icon={Receipt} label={copy.expenses} sub={copy.expensesSub} />
                <Row href="/mypage/more?tab=vault" Icon={Box} label={copy.vault} sub={copy.vaultSub} />
                <Row href="/mypage/more?tab=price_alert" Icon={Bell} label={copy.priceAlert} sub={copy.priceAlertSub} />
                <Row href="/mypage/more?tab=coach" Icon={Compass} label={copy.coach} sub={copy.coachSub} />
              </Group>

              <Group title={copy.groups.community}>
                <Row href="/mypage/more?tab=social" Icon={LayoutGrid} label={copy.feed} sub={copy.feedSub} />
                <Row href="/mypage/more?open=inbox" Icon={Inbox} label={copy.inbox} sub={copy.inboxSub} badge={pending || null} />
              </Group>
            </>
          )}

          <Group title={copy.groups.settings}>
            <Row
              onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
              Icon={Globe}
              label={copy.language}
              right={<span className="text-[13px] text-tm-muted">{copy.languageValue} ›</span>}
            />
            <Row onClick={() => window.open(KAKAO_CONSULT_URL, '_blank', 'noopener')} Icon={MessageCircle} label={copy.contact} sub={copy.contactSub} />
            <Row href="/guide" Icon={BookOpen} label={copy.guide} />
            {user ? <Row href="/mypage/account" Icon={Lock} label={copy.account} sub={copy.accountSub} /> : <Row href="/privacy" Icon={Lock} label={copy.account} />}
          </Group>
        </main>

        <div className="sticky bottom-0 z-10">
          <BottomNav copy={homeCopy} user={user} active="my" />
        </div>
      </div>
      {toast && (
        <div role="status" className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-6">
          <span className="tm-rise rounded-full bg-tm-ink px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg">{toast}</span>
        </div>
      )}
    </div>
  );
}
