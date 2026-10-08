'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Home as HomeIcon, Plane, Shield } from 'lucide-react';
import { goToLogin, openTimmyPanel, startChat } from './homeActions';
import TimmyAvatar from '../TimmyAvatar';

const ROUTE_PATH = 'M76 54 C 150 0, 250 0, 330 40';

// 티미가 떠 있고, 비행기가 점선 경로를 따라 목적지 핀까지 날아간다(장식, 스크린리더 제외).
function FlightHero() {
  return (
    <div aria-hidden="true" className="relative h-[78px] w-[350px] max-w-full">
      <svg width="350" height="78" viewBox="0 0 350 78" className="absolute left-0 top-0">
        <path className="tm-route" d={ROUTE_PATH} fill="none" stroke="var(--color-tm-sky)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 9" />
      </svg>
      <span className="tm-plane absolute left-0 top-0 h-5 w-5 text-tm-navy" style={{ offsetPath: `path("${ROUTE_PATH}")` }}>
        <Plane size={20} fill="currentColor" strokeWidth={1} />
      </span>
      <span className="tm-pin absolute left-[320px] top-[22px] h-[22px] w-[22px]">
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="var(--color-tm-sun)" stroke="var(--color-tm-ink)" strokeWidth="1.4" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="3" fill="#fff" />
        </svg>
      </span>
      <TimmyAvatar size={64} ring className="tm-float absolute left-0.5 top-1.5" />
    </div>
  );
}

export default function NoTripSection({ copy, user }) {
  const router = useRouter();
  const delay = (ms) => ({ animationDelay: `${ms}ms` });

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <FlightHero />
        <h1 className="tm-rise text-[28px] font-bold leading-[1.3] tracking-[-0.02em] text-tm-ink">
          {copy.heroTitle[0]}
          <br />
          {copy.heroTitle[1]}
        </h1>
        <p className="tm-rise text-[15px] leading-[1.55] text-tm-muted" style={delay(80)}>
          {copy.heroBody}
        </p>
      </section>

      <section aria-label="Suggestions" className="flex flex-wrap gap-2">
        {copy.suggestions.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => startChat(router, s.prompt, { plan: Boolean(s.plan) })}
            className="tm-rise h-11 rounded-full border border-tm-line bg-white px-4 text-[14px] font-medium text-tm-ink active:bg-tm-sky-tint"
            style={delay(160 + i * 60)}
          >
            {s.label}
          </button>
        ))}
      </section>

      <button
        type="button"
        onClick={() => (user ? openTimmyPanel('safe') : goToLogin(router))}
        className="tm-rise flex items-start gap-3.5 rounded-[18px] bg-tm-sky-tint p-4 text-left"
        style={delay(420)}
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tm-navy text-white">
          <span className="tm-ring bg-tm-navy" />
          <Shield size={20} strokeWidth={2} className="relative" />
        </span>
        <span className="flex flex-1 flex-col gap-1">
          <span className="text-[15px] font-bold text-tm-ink">{copy.safetyTitle}</span>
          <span className="text-[13px] leading-normal text-tm-muted">{copy.safetyBody}</span>
          <span className="mt-0.5 text-[13px] font-bold text-tm-navy">{copy.safetyCta}</span>
        </span>
      </button>

      <section aria-label="Shortcuts" className="grid grid-cols-3 gap-2">
        <Link href="/plan?tab=flights_search" className="tm-rise flex min-h-[84px] flex-col gap-2.5 rounded-2xl bg-white p-3.5 text-tm-ink" style={delay(480)}>
          <Plane size={22} className="text-tm-navy" strokeWidth={1.8} />
          <span className="text-[13px] font-semibold leading-[1.3]">{copy.shortcuts.flights[0]}<br />{copy.shortcuts.flights[1]}</span>
        </Link>
        <button type="button" onClick={() => startChat(router, copy.shortcuts.stayPrompt)} className="tm-rise flex min-h-[84px] flex-col gap-2.5 rounded-2xl bg-white p-3.5 text-left text-tm-ink" style={delay(530)}>
          <HomeIcon size={22} className="text-tm-navy" strokeWidth={1.8} />
          <span className="text-[13px] font-semibold leading-[1.3]">{copy.shortcuts.stay[0]}<br />{copy.shortcuts.stay[1]}</span>
        </button>
        <button type="button" onClick={() => startChat(router, '', { plan: true })} className="tm-rise flex min-h-[84px] flex-col gap-2.5 rounded-2xl bg-white p-3.5 text-left text-tm-ink" style={delay(580)}>
          <CalendarPlus size={22} className="text-tm-navy" strokeWidth={1.8} />
          <span className="text-[13px] font-semibold leading-[1.3]">{copy.shortcuts.planner[0]}<br />{copy.shortcuts.planner[1]}</span>
        </button>
      </section>
    </>
  );
}
