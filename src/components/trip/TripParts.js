'use client';
import { Bus, Car, ChevronLeft, ChevronRight, Footprints, MoonStar, Navigation, ShieldCheck } from 'lucide-react';
import { directionsUrl, isEveningStop, parseTransit, placeSearchUrl } from './tripUtils';

// 날짜 탭(1일차 · 11.17)
export function DayTabs({ copy, days, dayIdx, dates, onChange }) {
  return (
    <div role="tablist" aria-label="days" className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 pt-1 [scrollbar-width:none]">
      {days.map((d, i) => {
        const active = i === dayIdx;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(i)}
            className={`flex h-11 min-w-16 shrink-0 flex-col items-center justify-center rounded-xl px-2.5 ${active ? 'bg-tm-navy text-white' : 'border border-tm-line bg-white text-tm-muted'}`}
          >
            <span className="text-[13px] font-bold">{copy.dayLabel(d.day || i + 1)}</span>
            {dates[i] && <span className={`text-[11px] tabular-nums ${active ? 'text-[#B9C8DA]' : ''}`}>{dates[i]}</span>}
          </button>
        );
      })}
    </div>
  );
}

const MODE_ICON = { walk: Footprints, transit: Bus, drive: Car };
const MODE_KIND = { WALKING: 'walk', TRANSIT: 'transit', DRIVING: 'drive' };

// 장소 사이 이동 정보: 지도 경로 계산 값이 있으면 그것을, 없으면 AI가 준 값을 보여 준다
export function TransitPill({ copy, place, legMinutes, travelMode }) {
  const parsed = parseTransit(place?.transitToNext);
  if (legMinutes == null && !parsed) return null;
  const kind = legMinutes != null ? MODE_KIND[travelMode] : parsed.kind;
  const Icon = MODE_ICON[kind] || Footprints;
  const label = legMinutes != null ? `${copy.modes[travelMode]} ${copy.minutes(legMinutes)}` : parsed.text;
  return (
    <span className="inline-flex h-[26px] items-center gap-1 rounded-full bg-tm-sky-tint px-2.5 text-[12px] font-semibold text-tm-navy">
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      {label}
    </span>
  );
}

// 하루 일정 목록(번호·세로선·이동 정보). compact면 지도 위 반쯤 열린 시트용
export function PlanList({ copy, places, legs, travelMode, selectedIdx, onSelect, compact = false }) {
  if (!places.length) return <p className="px-1 py-6 text-center text-[14px] text-tm-muted">{copy.noPlaces}</p>;
  return (
    <ol className="flex flex-col">
      {places.map((p, i) => {
        const last = i === places.length - 1;
        const evening = isEveningStop(p, i, places.length);
        const selected = selectedIdx === i;
        return (
          <li key={`${p.name}-${i}`} className="flex gap-3">
            <div className="flex w-8 shrink-0 flex-col items-center">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-bold text-white ${selected ? 'bg-tm-sky ring-4 ring-tm-sky/20' : 'bg-tm-navy'}`}>{i + 1}</span>
              {!last && <span className="w-0.5 flex-1 bg-tm-line" />}
            </div>
            <div className={`min-w-0 flex-1 ${last ? '' : 'pb-1.5'}`}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                className="flex w-full items-center gap-2 rounded-[14px] bg-white p-3 text-left active:bg-tm-sky-tint"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {(p.category || p.budget) && (
                    <span className="truncate text-[12px] text-tm-muted">{[p.category, p.budget].filter(Boolean).join(' · ')}</span>
                  )}
                  <span className="text-[16px] font-bold leading-snug text-tm-ink">{p.name}</span>
                  {!compact && p.description && <span className="line-clamp-2 text-[13px] leading-normal text-tm-muted">{p.description}</span>}
                  {compact && p.reason && <span className="line-clamp-1 text-[12px] text-tm-safe-ink">{p.reason}</span>}
                  {evening && (
                    <span className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-tm-warm-tint px-2.5 py-1.5 text-[12px] leading-normal text-tm-warm">
                      <MoonStar size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {copy.nightReturn}
                    </span>
                  )}
                </span>
                <ChevronRight size={18} className="shrink-0 text-tm-muted" aria-hidden="true" />
              </button>
              {!last && (
                <div className="py-2">
                  <TransitPill copy={copy} place={p} legMinutes={legs[i]} travelMode={travelMode} />
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// 장소를 눌렀을 때: 추천 이유, 안심 포인트, 길찾기·이전/다음, 리뷰·바꾸기·빼기
export function PlaceDetail({ copy, place, index, total, dayNumber, destination, language, canEdit, busy, onPrev, onNext, onSwap, onRemove }) {
  return (
    <div className="flex h-full flex-col px-4 pb-3">
      <span className="text-[12px] font-semibold text-tm-navy">{copy.placeOf(dayNumber, index + 1)}</span>
      <div className="mt-1 flex flex-col gap-0.5">
        {(place.category || place.budget) && <span className="text-[12px] text-tm-muted">{[place.category, place.budget].filter(Boolean).join(' · ')}</span>}
        <h2 className="text-[20px] font-bold leading-snug text-tm-ink">{place.name}</h2>
      </div>
      {place.description && <p className="mt-2.5 text-[14px] leading-relaxed text-tm-ink/80">{place.description}</p>}
      {place.reason && (
        <p className="mt-2.5 flex items-start gap-2 rounded-xl bg-tm-safe-tint px-3 py-2.5 text-[13px] leading-normal text-tm-safe-ink">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span><b className="font-bold">{copy.safePoint}</b> · {place.reason}</span>
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-3">
        <div className="flex gap-2">
          <button type="button" onClick={onPrev} disabled={index === 0} aria-label={copy.prev} className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border border-tm-line bg-white text-tm-ink disabled:opacity-35">
            <ChevronLeft size={20} />
          </button>
          <a href={directionsUrl(place, destination)} target="_blank" rel="noopener noreferrer" className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-tm-navy text-[16px] font-bold text-white">
            <Navigation size={18} aria-hidden="true" />
            {copy.directions}
          </a>
          <button type="button" onClick={onNext} disabled={index >= total - 1} aria-label={copy.next} className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border border-tm-line bg-white text-tm-ink disabled:opacity-35">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex items-center justify-center text-[13px] font-semibold">
          <a href={placeSearchUrl(place, destination, language)} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center px-3 text-tm-navy">{copy.reviews}</a>
          {canEdit && (
            <>
              <span aria-hidden="true" className="text-tm-line">|</span>
              <button type="button" disabled={busy} onClick={onSwap} className="h-10 px-3 text-tm-navy disabled:opacity-50">{copy.swap}</button>
              <span aria-hidden="true" className="text-tm-line">|</span>
              <button type="button" disabled={busy} onClick={onRemove} className="h-10 px-3 text-tm-muted disabled:opacity-50">{copy.remove}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
