'use client';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useIsClient } from '../../hooks/useLocalStore';
import { HOME_CITIES, weatherLabel } from '../../content/homeCities';
import TimmyAvatar from '../TimmyAvatar';
import { goToLogin, startChat } from './homeActions';

const DAY_MS = 24 * 60 * 60 * 1000;

// 일정이 없을 때의 홈 머리: 시간대에 맞춘 인사 + 티미의 오늘 한마디(오늘의 도시 · 실시간 날씨)
// 시간·날짜는 브라우저에서만 계산한다(서버 렌더와 첫 화면은 중립 인사·밤하늘).
export default function HomeHero({ copy, language, user, weather, onToggleLanguage }) {
  const router = useRouter();
  const mounted = useIsClient();
  const now = mounted ? new Date() : null;
  const hour = now ? now.getHours() : null;
  const isDay = hour != null && hour >= 6 && hour < 18;
  const city = HOME_CITIES[now ? Math.floor(now.getTime() / DAY_MS) % HOME_CITIES.length : 0];
  const c = city[language] || city.ko;
  const w = weather[city.id] ? { ...weather[city.id], ...weatherLabel(weather[city.id].code, language) } : null;
  const name = (user?.displayName || '').split(' ')[0];
  const clock = now
    ? now.toLocaleString(language === 'en' ? 'en-US' : 'ko-KR', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
    : '';

  return (
    <section
      className="relative overflow-hidden rounded-b-[28px] px-5 pb-6 pt-2 text-white transition-[background] duration-700"
      style={{ background: isDay ? 'linear-gradient(180deg, #1B3D6B 0%, #2B5C93 62%, #4C86BF 100%)' : 'linear-gradient(180deg, #0F2747 0%, #1B3D6B 70%, #2B5C93 100%)' }}
    >
      {/* 하늘 장식: 밤에는 달·별, 낮에는 해 */}
      <svg aria-hidden="true" width="390" height="220" viewBox="0 0 390 220" className="pointer-events-none absolute right-0 top-0">
        {isDay ? (
          <><circle cx="380" cy="6" r="44" fill="#F7C873" opacity=".28" /><circle cx="380" cy="6" r="26" fill="#F7C873" opacity=".55" /></>
        ) : (
          <>
            <circle className="tm-twinkle" cx="40" cy="44" r="1.5" fill="#fff" />
            <circle className="tm-twinkle" cx="190" cy="22" r="1" fill="#fff" style={{ animationDelay: '1.4s' }} />
            <circle className="tm-twinkle" cx="300" cy="30" r="1.2" fill="#fff" style={{ animationDelay: '.8s' }} />
            <circle className="tm-twinkle" cx="372" cy="150" r="1.6" fill="#fff" style={{ animationDelay: '.3s' }} />
            <circle cx="372" cy="12" r="30" fill="#F7E7B5" opacity=".5" />
            <circle cx="384" cy="2" r="26" fill="#0F2747" />
          </>
        )}
      </svg>

      <div className="relative flex h-11 items-center justify-between">
        <span className="text-[12px] tabular-nums text-tm-sky-soft" suppressHydrationWarning>{clock}</span>
        <div className="-mr-2 flex items-center">
          <button type="button" onClick={onToggleLanguage} aria-label={copy.langToggleLabel} className="h-11 min-w-11 px-2.5 text-[13px] font-semibold text-white/80">
            {copy.langToggle}
          </button>
          {!user && (
            <button type="button" onClick={() => goToLogin(router)} className="h-11 rounded-full px-3 text-[14px] font-semibold text-white">
              {copy.login}
            </button>
          )}
        </div>
      </div>

      <div className="relative mt-2 flex items-end gap-3">
        <TimmyAvatar size={64} ring className="tm-float" />
        <div className="flex min-w-0 flex-col gap-1 pb-1">
          <span className="text-[14px] text-tm-sky-soft">{copy.greeting(hour, name)}</span>
          <h1 className="text-[26px] font-bold leading-[1.25] tracking-[-0.02em]">
            {copy.heroAsk[0]}
            <br />
            {copy.heroAsk[1]}
          </h1>
        </div>
      </div>

      <div className="tm-rise relative mt-4 flex flex-col gap-2.5 rounded-[18px] border border-white/15 bg-white/10 p-3.5" style={{ animationDelay: '160ms' }}>
        <span className="flex items-center gap-1.5 text-[12px] text-tm-sky-soft">
          <Sparkles size={14} strokeWidth={2} aria-hidden="true" /> {copy.todayLabel}
        </span>
        <p className="text-[15px] leading-normal">
          {w && <span aria-hidden="true">{w.icon} </span>}
          {copy.todayLine(c.name, w, c.tip)}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => startChat(router, c.prompt, { plan: true })} className="h-10 rounded-full bg-white px-3.5 text-[13px] font-bold text-tm-navy">
            {copy.todayPlan(c.name)}
          </button>
          <button type="button" onClick={() => startChat(router, copy.todayOtherPrompt)} className="h-10 rounded-full border border-white/30 px-3.5 text-[13px] font-semibold text-white">
            {copy.todayOther}
          </button>
        </div>
      </div>
    </section>
  );
}
