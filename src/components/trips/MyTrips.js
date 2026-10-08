'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { onSnapshotError } from '../../lib/snapshotError';
import useAppLanguage from '../../hooks/useAppLanguage';
import useMyTrips from '../../hooks/useMyTrips';
import { useIsClient, useStoredString } from '../../hooks/useLocalStore';
import { getAiHomeCopy } from '../../content/aiHomeCopy';
import { getTripsCopy } from '../../content/tripsCopy';
import { getTripDayNumber, getTripPhase, parseJsonObject } from '../../utils/tripPhase';
import { canDeleteTrip, createShareLink, duplicateTrip, removeTrip, renameTrip, shareTripToFeed } from '../../lib/tripStore';
import { goToLogin, startChat } from '../home/homeActions';
import BottomNav from '../home/BottomNav';
import { InviteBanner, NewTripCard, NextTripHero, OnTripHero, PastRow, PostTripPrompt, TripRow } from './TripCards';
import { ReuseSheet, Toast, TripMenuSheet } from './TripSheets';
import TripsEmpty from './TripsEmpty';
import { daysSinceEnd, groupTrips, toInputDate, tripTitle } from './tripsUtils';

// 끝난 지 이 기간 안의 여행에만 '어떠셨어요?' 카드를 띄운다.
const POST_PROMPT_DAYS = 14;
const POST_DONE_KEY = 'tm_post_prompt_done';

// 내 일정 목록: 지금 필요한 여행(여행 중 → 가장 가까운 출발)이 맨 위에 온다.
export default function MyTrips() {
  const router = useRouter();
  const [language] = useAppLanguage();
  const copy = getTripsCopy(language);
  const homeCopy = getAiHomeCopy(language);
  const { user, authReady, trips } = useMyTrips();
  const mounted = useIsClient(); // 날짜 계산은 브라우저에서만
  const [tab, setTab] = useState(null); // null이면 상황에 맞게 고른다
  const [invites, setInvites] = useState([]);
  const [menuTrip, setMenuTrip] = useState(null);
  const [reuseTrip, setReuseTrip] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const [postDoneRaw, setPostDoneRaw] = useStoredString(POST_DONE_KEY, '{}');
  const postDone = parseJsonObject(postDoneRaw);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // 나에게 온 동행 초대(마이페이지 '초대하기'가 보내는 match_requests)
  useEffect(() => {
    if (!user) return undefined;
    const q = query(collection(db, 'match_requests'), where('targetMateId', '==', user.uid), where('status', '==', 'pending'));
    return onSnapshot(
      q,
      (snap) => setInvites(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.type === 'workspace_invite' && r.tripId)),
      onSnapshotError('trips/invites', () => setInvites([]))
    );
  }, [user]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  };

  const { upcoming, past } = useMemo(() => (mounted ? groupTrips(trips) : { upcoming: [], past: [] }), [mounted, trips]);
  const myTripIds = useMemo(() => new Set(trips.map((t) => t.id)), [trips]);
  const openInvites = (user ? invites : []).filter((r) => !myTripIds.has(r.tripId));
  const activeTab = tab || (upcoming.length === 0 && past.length > 0 ? 'past' : 'upcoming');

  const first = upcoming[0];
  const firstPhase = first ? getTripPhase(first) : 'none';
  const hero = firstPhase === 'during' || firstPhase === 'prep' ? first : null;
  const rest = hero ? upcoming.slice(1) : upcoming;
  const justEnded = past.find((t) => {
    const since = daysSinceEnd(t);
    return since !== null && since <= POST_PROMPT_DAYS && !postDone[t.id];
  });

  const newTrip = () => startChat(router, '', { plan: true });

  // '다시 가기': 기본 출발일은 오늘부터 30일 뒤, 오늘 이전은 고를 수 없다
  const openReuse = (trip) => {
    const today = new Date();
    const later = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
    setReuseTrip({ trip, min: toInputDate(today), def: toInputDate(later) });
  };

  const inviteLink = async (trip) => {
    const url = `${window.location.origin}/join/${trip.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: tripTitle(trip), url });
        return;
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast(copy.toast.linkCopied);
    } catch {
      showToast(copy.toast.failed);
    }
  };

  const markPostDone = (trip) => setPostDoneRaw(JSON.stringify({ ...postDone, [trip.id]: true }));

  const shareToFeed = async (trip) => {
    setBusy(true);
    try {
      await shareTripToFeed(trip, language);
      markPostDone(trip);
      showToast(copy.shareFeedDone);
    } catch {
      showToast(copy.toast.failed);
    } finally {
      setBusy(false);
    }
  };

  const reuse = async (trip, startDate) => {
    setBusy(true);
    try {
      const id = await duplicateTrip(trip, { startDate });
      setReuseTrip(null);
      showToast(copy.toast.duplicated);
      router.push(`/trip?id=${id}`);
    } catch {
      showToast(copy.toast.failed);
    } finally {
      setBusy(false);
    }
  };

  const onMenuAction = async (action, value) => {
    const trip = menuTrip;
    if (!trip) return;
    if (action === 'open') return router.push(`/trip?id=${trip.id}`);
    if (action === 'duplicate') {
      setMenuTrip(null);
      return openReuse(trip);
    }
    if (action === 'invite') {
      setMenuTrip(null);
      return inviteLink(trip);
    }
    setMenuTrip(null);
    try {
      if (action === 'rename') {
        await renameTrip(trip.id, value);
        showToast(copy.toast.renamed);
      } else if (action === 'shareLink') {
        const url = await createShareLink(trip, null);
        await navigator.clipboard.writeText(url).catch(() => {});
        showToast(copy.toast.linkCopied);
      } else if (action === 'remove' || action === 'leave') {
        const result = await removeTrip(trip);
        showToast(result === 'left' ? copy.toast.left : copy.toast.removed);
      }
    } catch {
      showToast(copy.toast.failed);
    }
  };

  const loading = !mounted || !authReady;
  const isEmpty = !loading && user && trips.length === 0;
  const delay = (i) => ({ animationDelay: `${Math.min(i, 6) * 60}ms` });

  return (
    <div className="flex min-h-dvh flex-col bg-tm-ground font-sans text-tm-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="flex items-center justify-between py-2 pl-5 pr-3">
          <h1 className="text-[24px] font-bold tracking-[-0.02em]">{copy.title}</h1>
          {user && !isEmpty && (
            <button type="button" onClick={newTrip} aria-label={copy.newTrip} className="flex h-11 w-11 items-center justify-center rounded-full bg-tm-navy text-white">
              <Plus size={20} strokeWidth={2.2} />
            </button>
          )}
        </header>

        <main className="flex flex-1 flex-col gap-3 px-5 pb-6">
          {loading && <p role="status" className="py-10 text-center text-[14px] text-tm-muted">{copy.loading}</p>}

          {!loading && !user && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
              <h2 className="text-[19px] font-bold">{copy.loginTitle}</h2>
              <p className="text-[14px] leading-relaxed text-tm-muted">{copy.loginBody}</p>
              <div className="flex w-full max-w-[330px] flex-col gap-2">
                <button type="button" onClick={() => goToLogin(router)} className="h-[52px] rounded-2xl bg-tm-navy text-[16px] font-bold text-white">{copy.login}</button>
                <button type="button" onClick={newTrip} className="h-[52px] rounded-2xl border border-tm-line bg-white text-[15px] font-semibold">{copy.emptyCta}</button>
              </div>
            </div>
          )}

          {!loading && user && openInvites.map((invite) => <InviteBanner key={invite.id} copy={copy} invite={invite} />)}

          {isEmpty && <TripsEmpty copy={copy} />}

          {!loading && user && trips.length > 0 && (
            <>
              <div role="tablist" aria-label={copy.tabsLabel} className="flex gap-1.5 pb-1">
                {[
                  ['upcoming', copy.tabUpcoming(upcoming.length)],
                  ['past', copy.tabPast(past.length)],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === key}
                    onClick={() => setTab(key)}
                    className={`h-10 rounded-full px-4 text-[14px] ${activeTab === key ? 'bg-tm-navy font-bold text-white' : 'border border-tm-line bg-white font-medium text-tm-muted'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeTab === 'upcoming' && (
                <div role="tabpanel" className="flex flex-col gap-3">
                  {hero && firstPhase === 'during' && <OnTripHero copy={copy} trip={hero} dayNumber={getTripDayNumber(hero)} />}
                  {hero && firstPhase === 'prep' && (
                    <NextTripHero copy={copy} homeCopy={homeCopy} language={language} trip={hero} onMenu={() => setMenuTrip(hero)} onInvite={() => inviteLink(hero)} />
                  )}
                  {!hero && upcoming.length === 0 && <p className="py-4 text-center text-[14px] text-tm-muted">{copy.upcomingEmpty}</p>}
                  {rest.length > 0 && <h2 className="mt-1.5 text-[15px] font-bold">{hero ? copy.nextTrips : copy.otherTrips}</h2>}
                  {rest.map((trip, i) => (
                    <TripRow key={trip.id} copy={copy} language={language} trip={trip} onMenu={() => setMenuTrip(trip)} style={delay(i + 1)} />
                  ))}
                  <NewTripCard copy={copy} onClick={newTrip} />
                </div>
              )}

              {activeTab === 'past' && (
                <div role="tabpanel" className="flex flex-col gap-3">
                  {justEnded && <PostTripPrompt copy={copy} trip={justEnded} sharing={busy} onShare={() => shareToFeed(justEnded)} />}
                  {past.length === 0 && <p className="py-4 text-center text-[14px] text-tm-muted">{copy.pastEmpty}</p>}
                  {past.map((trip, i) => (
                    <PastRow key={trip.id} copy={copy} language={language} trip={trip} onMenu={() => setMenuTrip(trip)} onReuse={() => openReuse(trip)} style={delay(i)} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        <div className="sticky bottom-0 z-10">
          <BottomNav copy={homeCopy} user={user} active="trips" />
        </div>
      </div>

      {menuTrip && (
        <TripMenuSheet
          copy={copy}
          language={language}
          trip={menuTrip}
          canDelete={canDeleteTrip(menuTrip, user?.uid)}
          onClose={() => setMenuTrip(null)}
          onAction={onMenuAction}
        />
      )}
      {reuseTrip && (
        <ReuseSheet
          copy={copy}
          trip={reuseTrip.trip}
          defaultDate={reuseTrip.def}
          minDate={reuseTrip.min}
          busy={busy}
          onClose={() => setReuseTrip(null)}
          onSubmit={(date) => reuse(reuseTrip.trip, date)}
        />
      )}
      <Toast message={toast} />
    </div>
  );
}
