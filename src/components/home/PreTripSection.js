'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plane } from 'lucide-react';
import { useStoredString } from '../../hooks/useLocalStore';
import { daysUntil, formatDDay, formatTripRange, parseJsonObject } from '../../utils/tripPhase';
import { openTimmyPanel, startChat } from './homeActions';

const checklistKey = (tripId) => `tm_readiness_${tripId}`;

// 출발 전: D-day 카드, 안심 준비 체크리스트(기기에만 저장), 항공권, 이 여행에 맞춘 질문
export default function PreTripSection({ copy, language, trip }) {
  const router = useRouter();
  const destination = trip.destination || trip.tripTitle || '';
  const dDay = daysUntil(trip.startDate);
  const [raw, setRaw] = useStoredString(checklistKey(trip.id), '{}');
  const checked = parseJsonObject(raw);

  const toggle = (id) => setRaw(JSON.stringify({ ...checked, [id]: !checked[id] }));

  const doneCount = copy.readiness.filter((item) => checked[item.id]).length;
  const progress = Math.round((doneCount / copy.readiness.length) * 100);
  const delay = (ms) => ({ animationDelay: `${ms}ms` });

  return (
    <>
      <Link href={`/trip?id=${trip.id}`} className="tm-rise flex flex-col gap-3.5 rounded-[20px] bg-tm-ink px-5 py-[18px] text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[13px] text-[#B9C8DA]">{copy.upcoming}</span>
            <span className="truncate text-[24px] font-bold tracking-[-0.01em]">{destination}</span>
            {trip.companion && <span className="text-[13px] text-[#B9C8DA]">{trip.companion}</span>}
          </div>
          <span className="shrink-0 text-[30px] font-bold tabular-nums tracking-tight text-tm-sky-soft">{formatDDay(dDay)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-white/15 pt-3">
          <span className="text-[13px] tabular-nums">{formatTripRange(trip, language)}</span>
          <span className="flex items-center gap-1 text-[14px] font-semibold">
            {copy.viewItinerary}
            <ChevronRight size={18} strokeWidth={2} />
          </span>
        </div>
      </Link>

      <section className="tm-rise flex flex-col gap-2.5 rounded-2xl bg-white p-4" style={delay(120)}>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-tm-ink">{copy.readinessTitle}</h2>
          <span className="text-[13px] tabular-nums text-tm-muted">{doneCount} / {copy.readiness.length}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-tm-sky-tint">
          <div className="tm-fill h-full rounded-full bg-tm-navy transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <ul className="flex flex-col">
          {copy.readiness.map((item) => (
            <li key={item.id} className="flex min-h-11 items-center gap-3">
              <input
                id={`ready-${item.id}`}
                type="checkbox"
                checked={Boolean(checked[item.id])}
                onChange={() => toggle(item.id)}
                className="h-5 w-5 shrink-0 accent-tm-navy"
              />
              <label htmlFor={`ready-${item.id}`} className={`flex-1 text-[14px] ${checked[item.id] ? 'text-tm-muted line-through' : 'text-tm-ink'}`}>
                {item.label}
              </label>
              {item.action === 'safe' && !checked[item.id] && (
                <button type="button" onClick={() => openTimmyPanel('safe')} className="h-9 rounded-lg px-2 text-[13px] font-semibold text-tm-navy">
                  <ChevronRight size={18} aria-label={item.label} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Link href="/plan?tab=flights_search" className="tm-rise flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-tm-ink" style={delay(200)}>
        <Plane size={20} className="text-tm-navy" strokeWidth={1.8} />
        <span className="flex-1 text-[15px] font-semibold">{copy.flightsRow}</span>
        <ChevronRight size={20} className="text-tm-muted" />
      </Link>

      {destination && (
        <section aria-label="Ask Timmy" className="flex flex-wrap gap-2">
          {copy.askAboutTrip(destination).map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => startChat(router, s.prompt)}
              className="h-11 rounded-full border border-tm-line bg-white px-4 text-[14px] font-medium text-tm-ink active:bg-tm-sky-tint"
            >
              {s.label}
            </button>
          ))}
        </section>
      )}
    </>
  );
}
