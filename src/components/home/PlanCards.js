'use client';
import { BedDouble, CalendarDays, Check, MapPin, Wallet } from 'lucide-react';
import TimmyAvatar from '../TimmyAvatar';

// 대화 안에 들어가는 일정 카드들: 후보 3개(가로로 넘김), 만드는 중, 완성된 일정 요약

const PACE_STYLE = {
  relaxed: 'bg-tm-safe-tint text-tm-safe-ink',
  balanced: 'bg-tm-sky-tint text-tm-navy',
  packed: 'bg-tm-warm-tint text-tm-warm',
};

export function PlanOptions({ copy, intro, options, chosenId, disabled, onChoose }) {
  return (
    <div className="tm-rise flex flex-col gap-2.5">
      <div className="max-w-[88%] rounded-[18px] rounded-bl-[4px] bg-white px-3.5 py-2.5 text-[15px] leading-normal">
        {intro || copy.plan.intro}
      </div>
      <p className="px-1 text-[12px] text-tm-muted">{copy.plan.swipeHint}</p>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="list">
        {options.map((option, i) => {
          const chosen = chosenId === option.id;
          const dimmed = chosenId && !chosen;
          return (
            <article
              key={option.id}
              role="listitem"
              aria-label={`${i + 1}. ${option.title}`}
              className={`flex w-[82%] max-w-[320px] shrink-0 snap-center flex-col gap-3 rounded-[18px] border bg-white p-4 transition-opacity ${chosen ? 'border-tm-navy ring-2 ring-tm-navy/15' : 'border-tm-line'} ${dimmed ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-bold tabular-nums text-tm-muted">{i + 1} / {options.length}</span>
                {option.pace && (
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${PACE_STYLE[option.pace] || PACE_STYLE.balanced}`}>
                    {copy.plan.pace[option.pace] || option.pace}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-[18px] font-bold leading-snug text-tm-ink">{option.title}</h3>
                {option.summary && <p className="text-[14px] leading-normal text-tm-muted">{option.summary}</p>}
              </div>

              {option.days?.length > 0 && (
                <ol className="flex flex-col gap-1.5 border-t border-tm-line pt-3">
                  {option.days.map((day, d) => (
                    <li key={d} className="text-[13px] leading-snug text-tm-ink">{day}</li>
                  ))}
                </ol>
              )}

              <dl className="flex flex-col gap-1.5 rounded-xl bg-tm-ground p-3 text-[13px]">
                {option.stayArea && (
                  <div className="flex gap-2">
                    <dt className="flex shrink-0 items-center gap-1 text-tm-muted"><BedDouble size={14} /> {copy.plan.stay}</dt>
                    <dd className="font-semibold text-tm-ink">{option.stayArea}{option.stayAreaReason ? <span className="font-normal text-tm-muted"> · {option.stayAreaReason}</span> : null}</dd>
                  </div>
                )}
                {option.estimatedCost && (
                  <div className="flex gap-2">
                    <dt className="flex shrink-0 items-center gap-1 text-tm-muted"><Wallet size={14} /> {copy.plan.cost}</dt>
                    <dd className="font-semibold text-tm-ink">{option.estimatedCost}</dd>
                  </div>
                )}
                {option.bestFor && (
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-tm-muted">{copy.plan.bestFor}</dt>
                    <dd className="text-tm-ink">{option.bestFor}</dd>
                  </div>
                )}
              </dl>

              <button
                type="button"
                onClick={() => onChoose(option)}
                disabled={disabled || Boolean(chosenId)}
                className={`mt-auto flex h-12 items-center justify-center gap-1.5 rounded-xl text-[15px] font-bold ${chosen ? 'bg-tm-safe text-white' : 'bg-tm-navy text-white disabled:opacity-40'}`}
              >
                {chosen && <Check size={18} strokeWidth={2.5} />}
                {copy.plan.choose}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function PlanWorking({ title, sub }) {
  return (
    <div className="flex items-center gap-2" role="status">
      <TimmyAvatar size={28} className="tm-float" />
      <div className="flex flex-col gap-1 rounded-[18px] rounded-bl-[4px] bg-white px-3.5 py-2.5">
        <span className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex h-3 items-center gap-1">
            <span className="tm-dot bg-tm-sky" />
            <span className="tm-dot bg-tm-sky" />
            <span className="tm-dot bg-tm-sky" />
          </span>
          <span className="text-[14px] text-tm-ink">{title}</span>
        </span>
        {sub && <span className="text-[12px] text-tm-muted">{sub}</span>}
      </div>
    </div>
  );
}

export function PlanResultCard({ copy, plan, request, opened, onOpen }) {
  const itinerary = Array.isArray(plan?.itinerary) ? plan.itinerary : [];
  return (
    <article className="tm-rise overflow-hidden rounded-[18px] border border-tm-line bg-white">
      <div className="flex flex-col gap-1 border-b border-tm-line p-4">
        <span className="text-[12px] font-bold text-tm-safe-ink">{copy.plan.ready}</span>
        <h3 className="text-[18px] font-bold leading-snug text-tm-ink">{plan.tripTitle || plan.destination}</h3>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-tm-muted">
          <span className="flex items-center gap-1"><MapPin size={14} /> {plan.destination || request?.destination}</span>
          {request?.startDate && (
            <span className="flex items-center gap-1 tabular-nums"><CalendarDays size={14} /> {request.startDate} – {request.endDate}</span>
          )}
        </span>
      </div>
      <ol className="flex flex-col px-4 py-2">
        {itinerary.map((day, i) => (
          <li key={i} className="flex gap-3 py-1.5 text-[14px] leading-snug">
            <span className="w-8 shrink-0 font-bold tabular-nums text-tm-navy">D{day.day || i + 1}</span>
            <span className="text-tm-ink">{(day.places || []).map((p) => p.name).filter(Boolean).slice(0, 3).join(' · ')}</span>
          </li>
        ))}
      </ol>
      <div className="p-4 pt-2">
        <button type="button" onClick={onOpen} className="flex h-12 w-full items-center justify-center rounded-xl bg-tm-navy text-[15px] font-bold text-white">
          {opened ? copy.plan.reopen : copy.plan.open}
        </button>
      </div>
    </article>
  );
}
