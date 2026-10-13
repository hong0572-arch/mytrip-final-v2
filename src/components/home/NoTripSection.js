'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plane, Shield } from 'lucide-react';
import { HOME_CITIES, weatherLabel } from '../../content/homeCities';
import { goToLogin, openTimmyPanel, startChat } from './homeActions';

const PHOTO_CITIES = HOME_CITIES.filter((c) => c.image);

// 일정이 없을 때: 혼자 가기 좋은 도시(사진 카드) → 요즘 묻는 것 → 안심·항공권
export default function NoTripSection({ copy, language, user, weather }) {
  const router = useRouter();
  const delay = (ms) => ({ animationDelay: `${ms}ms` });

  return (
    <>
      <section aria-labelledby="home-cities" className="-mx-5 flex flex-col gap-3">
        <div className="flex items-baseline justify-between px-5">
          <h2 id="home-cities" className="text-[18px] font-bold text-tm-ink">{copy.citiesTitle}</h2>
          <button type="button" onClick={() => startChat(router, copy.todayOtherPrompt)} className="min-h-11 text-[13px] font-semibold text-tm-navy">
            {copy.citiesMore}
          </button>
        </div>
        <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {PHOTO_CITIES.map((city, i) => {
            const c = city[language] || city.ko;
            const w = weather[city.id] ? { ...weather[city.id], ...weatherLabel(weather[city.id]) } : null;
            return (
              <li key={city.id} className="shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => startChat(router, c.prompt, { plan: true })}
                  className="tm-rise flex w-[168px] flex-col overflow-hidden rounded-[18px] bg-white text-left text-tm-ink shadow-[0_2px_10px_rgba(21,48,79,.06)]"
                  style={delay(80 + i * 60)}
                >
                  <span className="relative block h-[150px] w-full bg-tm-sky-tint">
                    <img src={city.image} alt="" width={168} height={150} loading={i < 2 ? 'eager' : 'lazy'} className="h-full w-full object-cover" />
                    <span className="absolute left-2 top-2 inline-flex h-[22px] items-center gap-1 rounded-full bg-white/90 px-2 text-[11px] font-bold text-tm-safe-ink">
                      <Shield size={12} strokeWidth={2.2} aria-hidden="true" /> {copy.soloSafe}
                    </span>
                    {w && (
                      <span className="absolute bottom-2 right-2 inline-flex h-[22px] items-center rounded-full bg-tm-ink/70 px-2 text-[11px] font-semibold tabular-nums text-white">
                        {w.icon} {w.temp}°
                      </span>
                    )}
                  </span>
                  <span className="flex flex-col gap-0.5 px-3 pb-3 pt-2.5">
                    <span className="text-[16px] font-bold">{c.name}</span>
                    <span className="text-[12px] leading-snug text-tm-muted">{c.note}</span>
                    <span className="mt-0.5 text-[11px] font-semibold tabular-nums text-tm-navy">✈ {c.flight}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="home-asked" className="flex flex-col gap-2.5">
        <h2 id="home-asked" className="text-[16px] font-bold text-tm-ink">{copy.askedTitle}</h2>
        {copy.asked.map((a, i) => (
          <button
            key={a.q}
            type="button"
            onClick={() => startChat(router, a.prompt, { plan: Boolean(a.plan) })}
            className="tm-rise flex min-h-[60px] items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-left text-tm-ink active:bg-tm-sky-tint"
            style={delay(200 + i * 60)}
          >
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tm-sky-tint text-[18px]">{a.icon}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[14px] font-semibold">{a.q}</span>
              <span className="text-[12px] text-tm-muted">{a.where}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-tm-muted" aria-hidden="true" />
          </button>
        ))}
      </section>

      <section aria-label="Shortcuts" className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => (user ? openTimmyPanel('safe') : goToLogin(router))}
          className="flex min-h-[88px] flex-col gap-2 rounded-2xl bg-tm-safe-tint p-3.5 text-left text-tm-ink"
        >
          <Shield size={22} strokeWidth={1.8} className="text-tm-safe-ink" aria-hidden="true" />
          <span className="flex flex-col">
            <span className="text-[14px] font-bold">{copy.tileSafety}</span>
            <span className="text-[11px] text-tm-muted">{copy.tileSafetySub}</span>
          </span>
        </button>
        <Link href="/plan?tab=flights_search" className="flex min-h-[88px] flex-col gap-2 rounded-2xl bg-white p-3.5 text-tm-ink">
          <Plane size={22} strokeWidth={1.8} className="text-tm-navy" aria-hidden="true" />
          <span className="flex flex-col">
            <span className="text-[14px] font-bold">{copy.tileFlights}</span>
            <span className="text-[11px] text-tm-muted">{copy.tileFlightsSub}</span>
          </span>
        </Link>
      </section>
    </>
  );
}
