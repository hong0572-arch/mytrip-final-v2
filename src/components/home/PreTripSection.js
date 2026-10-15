'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plane } from 'lucide-react';
import { daysUntil, formatDDay, formatTripRange } from '../../utils/tripPhase';
import { startChat } from './homeActions';
import ReadinessCard from './ReadinessCard';

// 출발 전: D-day 카드, 떠나기 전 준비(여행지·날짜 맞춤, 기기에만 저장), 항공권, 이 여행에 맞춘 질문
export default function PreTripSection({ copy, language, trip }) {
  const router = useRouter();
  const destination = trip.destination || trip.tripTitle || '';
  const dDay = daysUntil(trip.startDate);
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

      <ReadinessCard trip={trip} language={language} style={delay(120)} />

      <Link href="/flights/" className="tm-rise flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-tm-ink" style={delay(200)}>
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
