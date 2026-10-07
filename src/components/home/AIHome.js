'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import useAppLanguage from '../../hooks/useAppLanguage';
import { notifyLocalStore, useIsClient, useStoredString } from '../../hooks/useLocalStore';
import useMyTrips from '../../hooks/useMyTrips';
import { getAiHomeCopy } from '../../content/aiHomeCopy';
import { getTripDayNumber, getTripPhase, pickActiveTrip } from '../../utils/tripPhase';
import { goToLogin, openTimmyPanel, startChat } from './homeActions';
import HomeComposer from './HomeComposer';
import BottomNav from './BottomNav';
import NoTripSection from './NoTripSection';
import PreTripSection from './PreTripSection';
import OnTripSection from './OnTripSection';

// 예전 홈 주소(/?tab=…, /?mode=…)로 들어오면 예전 홈(/plan)으로 넘긴다(푸시 알림·북마크 호환).
const LEGACY_PARAMS = ['tab', 'mode'];

// AI 홈: 여행 단계(일정 없음 · 출발 전 · 여행 중)에 따라 입력창 위 카드가 바뀐다.
export default function AIHome() {
  const router = useRouter();
  const [language, setLanguage] = useAppLanguage();
  const copy = getAiHomeCopy(language);
  const { user, trips } = useMyTrips();
  // 안전모드(GlobalSafeMode)는 상태를 localStorage에 쓰고 'safeModeChanged' 이벤트를 보낸다.
  const [safeModeFlag] = useStoredString('safeMode_active', 'false');
  const safeModeActive = safeModeFlag === 'true';
  // 날짜 계산은 브라우저에서만(서버 렌더와 첫 화면을 '일정 없음'으로 맞춘다)
  const mounted = useIsClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (LEGACY_PARAMS.some((key) => params.has(key))) {
      router.replace(`/plan?${params.toString()}`);
    }
    window.addEventListener('safeModeChanged', notifyLocalStore);
    return () => window.removeEventListener('safeModeChanged', notifyLocalStore);
  }, [router]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const activeTrip = mounted ? pickActiveTrip(trips) : null;
  const phase = activeTrip ? getTripPhase(activeTrip) : 'none';
  const dayNumber = phase === 'during' ? getTripDayNumber(activeTrip) : null;
  const destination = activeTrip?.destination || activeTrip?.tripTitle || '';

  useEffect(() => {
    if (phase === 'during' && activeTrip?.id) {
      // 안전모드가 여행 단톡방에 알림을 보낼 때 쓰는 값(일정 화면과 동일)
      try {
        localStorage.setItem('activeTripId', activeTrip.id);
      } catch {}
    }
  }, [phase, activeTrip?.id]);

  const placeholder =
    phase === 'during' ? copy.composerPlaceholderOnTrip
      : phase === 'prep' && destination ? copy.composerPlaceholderTrip(destination)
        : copy.composerPlaceholder;

  return (
    <div className="flex min-h-dvh flex-col bg-tm-ground font-sans text-tm-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="flex items-center justify-between py-2 pl-5 pr-3">
          {phase === 'during' ? (
            <div className="flex flex-col gap-0.5 py-1">
              <span className="text-[12px] font-semibold text-tm-navy">{copy.onTripLabel(dayNumber)}</span>
              <span className="text-[20px] font-bold">{destination}</span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logotm.png" alt="Trip Maker" width={120} height={30} className="h-[30px] w-auto object-contain" />
          )}
          <div className="flex items-center gap-1">
            {phase === 'during' ? (
              <button
                type="button"
                onClick={() => openTimmyPanel('safe')}
                className="flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-tm-sos bg-white px-4 text-[14px] font-bold text-tm-sos"
              >
                <Shield size={18} strokeWidth={2} />
                {copy.safeModeButton}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
                  aria-label={copy.langToggleLabel}
                  className="h-11 min-w-11 px-2.5 text-[13px] font-semibold text-tm-muted"
                >
                  {copy.langToggle}
                </button>
                {!user && (
                  <button type="button" onClick={() => goToLogin(router)} className="h-11 rounded-full px-3 text-[14px] font-semibold text-tm-navy">
                    {copy.login}
                  </button>
                )}
              </>
            )}
          </div>
        </header>

        {safeModeActive && (
          <div className="mx-5 mb-2.5 flex items-center gap-2.5 rounded-[14px] bg-tm-safe-tint py-1 pl-3.5 pr-1">
            <span className="relative h-2 w-2 shrink-0 rounded-full bg-tm-safe">
              <span className="tm-beacon bg-tm-safe" />
            </span>
            <span className="flex-1 text-[13px] text-tm-safe-ink">{copy.safeActive}</span>
            <button type="button" onClick={() => openTimmyPanel('safe')} className="h-10 rounded-[10px] px-3 text-[13px] font-semibold text-tm-safe-ink">
              {copy.safeManage}
            </button>
          </div>
        )}

        <main className="flex flex-1 flex-col gap-[18px] px-5 pb-4 pt-1">
          {phase === 'during' && <OnTripSection copy={copy} trip={activeTrip} dayNumber={dayNumber} />}
          {phase === 'prep' && <PreTripSection copy={copy} language={language} trip={activeTrip} />}
          {phase !== 'during' && phase !== 'prep' && <NoTripSection copy={copy} user={user} />}

          <footer className="mt-auto flex justify-center gap-1 pt-4 text-[12px] text-tm-muted">
            <Link href="/guide" className="px-2 py-2">{copy.footerGuide}</Link>
            <span aria-hidden="true" className="py-2">·</span>
            <Link href="/privacy" className="px-2 py-2 font-semibold">{copy.footerPrivacy}</Link>
          </footer>
        </main>

        <div className="sticky bottom-0 z-10">
          <HomeComposer
            copy={copy}
            language={language}
            placeholder={placeholder}
            onSubmit={(message) => startChat(router, message)}
          />
          <BottomNav copy={copy} user={user} />
        </div>
      </div>
    </div>
  );
}
