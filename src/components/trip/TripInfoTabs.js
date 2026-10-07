'use client';
import Link from 'next/link';
import { ChevronRight, MapPin, Phone, ShieldCheck, Sun, Lightbulb, Wallet } from 'lucide-react';
import { CONSULAR_CALL, emergencyNumbers, hotelCompareUrl, placeSearchUrl } from './tripUtils';

const tel = (n) => `tel:${n.replace(/[^\d+]/g, '')}`;

export function StayTab({ copy, plan, destination, language, onShowHotel }) {
  const hotels = plan.recommendedHotels || [];
  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      {plan.stayArea && (
        <section className="flex items-start gap-3 rounded-2xl bg-tm-sky-tint p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tm-navy text-white">
            <MapPin size={20} aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-bold text-tm-navy">{copy.stayAreaTitle}</span>
            <span className="text-[17px] font-bold text-tm-ink">{plan.stayArea}</span>
            {plan.stayAreaReason && <span className="text-[13px] leading-normal text-tm-ink/80">{plan.stayAreaReason}</span>}
          </div>
        </section>
      )}

      {hotels.length === 0 && <p className="py-6 text-center text-[14px] text-tm-muted">{copy.stayEmpty}</p>}

      {hotels.map((h, i) => (
        <article key={`${h.name}-${i}`} className="flex flex-col gap-2.5 rounded-2xl bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[16px] font-bold text-tm-ink">{h.name}</span>
              {(h.address || h.description) && <span className="line-clamp-2 text-[13px] leading-normal text-tm-muted">{h.description || h.address}</span>}
            </div>
            {h.priceRange && <span className="shrink-0 text-[14px] font-bold tabular-nums text-tm-ink">{h.priceRange}</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {h.safetyScore != null && h.safetyScore !== '' && (
              <span className="inline-flex h-[26px] items-center rounded-full bg-tm-safe-tint px-2.5 text-[12px] font-bold text-tm-safe-ink">{copy.safetyBadge(h.safetyScore)}</span>
            )}
            {h.isMainStreet && <span className="inline-flex h-[26px] items-center rounded-full bg-[#F1F2F4] px-2.5 text-[12px] font-semibold text-tm-ink/80">{copy.mainStreet}</span>}
            {h.soloFriendly && <span className="inline-flex h-[26px] items-center rounded-full bg-[#F1F2F4] px-2.5 text-[12px] font-semibold text-tm-ink/80">{copy.soloFriendly}</span>}
          </div>
          <div className="flex gap-2">
            <a href={hotelCompareUrl(h, destination)} target="_blank" rel="nofollow noopener noreferrer" className="flex h-11 flex-1 items-center justify-center rounded-xl bg-tm-navy text-[14px] font-bold text-white">
              {copy.stayCompare}
            </a>
            {h.coordinates ? (
              <button type="button" onClick={() => onShowHotel(h)} className="h-11 rounded-xl border border-tm-line bg-white px-3.5 text-[14px] font-semibold text-tm-ink">{copy.stayMap}</button>
            ) : (
              <a href={placeSearchUrl(h, destination, language)} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center rounded-xl border border-tm-line bg-white px-3.5 text-[14px] font-semibold text-tm-ink">{copy.stayMap}</a>
            )}
          </div>
        </article>
      ))}

      {hotels.length > 0 && <p className="text-[12px] leading-normal text-tm-muted">{copy.stayNote}</p>}
    </div>
  );
}

export function SafetyTab({ copy, plan, destination, onSafeMode }) {
  const nums = emergencyNumbers(destination);
  const advice = String(plan.safetyAdvice || '')
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.replace(/^[-•\s]+/, '').trim())
    .filter((s) => s.length > 3)
    .slice(0, 6);
  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <section aria-label="emergency" className={`grid gap-2 ${nums ? 'grid-cols-3' : 'grid-cols-1'}`}>
        {nums && (
          <>
            <a href={tel(nums.police)} className="flex min-h-[72px] flex-col items-center justify-center gap-0.5 rounded-[14px] border-[1.5px] border-[#F2C6C2] bg-white px-1.5 text-tm-sos">
              <span className="text-[20px] font-bold tabular-nums">{nums.police}</span>
              <span className="text-[12px] font-semibold">{copy[nums.policeLabel] || copy.police}</span>
            </a>
            <a href={tel(nums.ambulance)} className="flex min-h-[72px] flex-col items-center justify-center gap-0.5 rounded-[14px] border-[1.5px] border-[#F2C6C2] bg-white px-1.5 text-tm-sos">
              <span className="text-[20px] font-bold tabular-nums">{nums.ambulance}</span>
              <span className="text-[12px] font-semibold">{copy.ambulance}</span>
            </a>
          </>
        )}
        <a href={tel(CONSULAR_CALL)} className={`flex min-h-[72px] items-center justify-center gap-0.5 rounded-[14px] border border-tm-line bg-white px-1.5 text-tm-ink ${nums ? 'flex-col' : 'gap-2'}`}>
          {!nums && <Phone size={18} className="text-tm-navy" aria-hidden="true" />}
          <span className="text-[14px] font-bold">{copy.consular}</span>
          <span className="whitespace-nowrap text-[11px] tabular-nums text-tm-muted">{CONSULAR_CALL}</span>
        </a>
      </section>
      {!nums && <p className="text-[12px] text-tm-muted">{copy.emergencyUnknown}</p>}

      <button type="button" onClick={onSafeMode} className="flex h-14 items-center justify-between rounded-2xl bg-tm-safe px-4 text-left text-white">
        <span className="flex items-center gap-2.5">
          <ShieldCheck size={20} aria-hidden="true" />
          <span className="flex flex-col">
            <span className="text-[15px] font-bold">{copy.safeModeTitle}</span>
            <span className="text-[12px] text-[#CFEDE2]">{copy.safeModeSub}</span>
          </span>
        </span>
        <ChevronRight size={20} aria-hidden="true" />
      </button>

      {advice.length > 0 && (
        <section className="rounded-2xl bg-white px-4 py-3.5">
          <h3 className="mb-2 text-[15px] font-bold text-tm-ink">{copy.safetyTitle}</h3>
          <ul className="flex list-disc flex-col gap-1.5 pl-[18px] text-[14px] leading-normal text-tm-ink/80">
            {advice.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </section>
      )}

      {(plan.weather || plan.travelTips?.length > 0) && (
        <section className="grid grid-cols-1 gap-2">
          {plan.weather && (
            <div className="flex gap-3 rounded-2xl bg-white p-4">
              <Sun size={18} className="mt-0.5 shrink-0 text-tm-warm" aria-hidden="true" />
              <div><span className="text-[12px] text-tm-muted">{copy.weather}</span><p className="text-[14px] leading-normal text-tm-ink">{plan.weather}</p></div>
            </div>
          )}
          {plan.travelTips?.length > 0 && (
            <div className="flex gap-3 rounded-2xl bg-white p-4">
              <Lightbulb size={18} className="mt-0.5 shrink-0 text-tm-navy" aria-hidden="true" />
              <div className="min-w-0">
                <span className="text-[12px] text-tm-muted">{copy.tips}</span>
                <ul className="mt-1 flex list-disc flex-col gap-1 pl-4 text-[14px] leading-normal text-tm-ink">
                  {plan.travelTips.slice(0, 6).map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export function BudgetTab({ copy, plan, saved }) {
  const placeCosts = plan.itinerary.flatMap((d) => d.places.filter((p) => p.budget).map((p) => ({ day: d.day, name: p.name, budget: p.budget })));
  const empty = !plan.estimatedCost && plan.budgetBreakdown.length === 0 && placeCosts.length === 0;
  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      {empty && <p className="py-6 text-center text-[14px] text-tm-muted">{copy.budgetEmpty}</p>}
      {plan.estimatedCost && (
        <section className="flex items-center gap-3 rounded-2xl bg-tm-ink p-4 text-white">
          <Wallet size={20} className="text-tm-sky-soft" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="text-[12px] text-[#B9C8DA]">{copy.budgetTotal}</span>
            <span className="text-[18px] font-bold tabular-nums">{plan.estimatedCost}</span>
          </div>
        </section>
      )}
      {plan.budgetBreakdown.length > 0 && (
        <section className="rounded-2xl bg-white px-4 py-3.5">
          <h3 className="mb-2 text-[15px] font-bold text-tm-ink">{copy.budgetItems}</h3>
          <ul className="flex flex-col divide-y divide-tm-line text-[14px] text-tm-ink">
            {plan.budgetBreakdown.map((b, i) => <li key={i} className="py-2">{b}</li>)}
          </ul>
        </section>
      )}
      {placeCosts.length > 0 && (
        <section className="rounded-2xl bg-white px-4 py-3.5">
          <h3 className="mb-2 text-[15px] font-bold text-tm-ink">{copy.budgetPlaces}</h3>
          <ul className="flex flex-col divide-y divide-tm-line text-[14px]">
            {placeCosts.map((c, i) => (
              <li key={i} className="flex justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-tm-ink"><span className="text-tm-muted">{copy.dayLabel(c.day)} · </span>{c.name}</span>
                <span className="shrink-0 font-semibold tabular-nums text-tm-ink">{c.budget}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {saved && (
        <Link href="/mypage?tab=wallet" className="flex items-center justify-between rounded-2xl border border-tm-line bg-white px-4 py-3.5 text-[14px] text-tm-ink">
          <span>{copy.budgetTrack}</span>
          <span className="flex shrink-0 items-center font-bold text-tm-navy">{copy.budgetTrackCta}<ChevronRight size={18} aria-hidden="true" /></span>
        </Link>
      )}
    </div>
  );
}
