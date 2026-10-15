'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useStoredString } from '../../hooks/useLocalStore';
import { formatDDay, parseJsonObject } from '../../utils/tripPhase';
import { getReadinessCopy } from '../../content/readinessCopy';
import { buildReadiness, dueItems } from '../../lib/readiness';
import { openTimmyPanel, startChat } from './homeActions';

export const readinessKey = (tripId) => `tm_readiness_${tripId}`;

// 체크 상태(기기에만 저장)와 여행지 맞춤 항목
export function useReadiness(trip, language) {
  const [raw, setRaw] = useStoredString(readinessKey(trip.id), '{}');
  const checked = parseJsonObject(raw);
  const r = buildReadiness(trip, getReadinessCopy(language), language);
  const all = r.groups.flatMap((g) => g.items);
  const done = all.filter((i) => checked[i.id]).length;
  const toggle = (id) => setRaw(JSON.stringify({ ...checked, [id]: !checked[id] }));
  return { ...r, checked, toggle, done, total: all.length };
}

function ActionButton({ action, trip, router }) {
  const base = 'flex h-9 shrink-0 items-center gap-1 rounded-[10px] px-2.5 text-[12px] font-bold';
  if (action.type === 'link') {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" className={`${base} border border-tm-line bg-white text-tm-navy`}>
        {action.label}
        <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
      </a>
    );
  }
  const onClick = () => {
    if (action.type === 'safe') openTimmyPanel('safe');
    else if (action.type === 'trip') router.push(`/trip?id=${trip.id}`);
    else if (action.type === 'chat') startChat(router, action.prompt);
  };
  return (
    <button type="button" onClick={onClick} className={`${base} bg-tm-navy text-white`}>
      {action.label}
    </button>
  );
}

function Item({ item, done, onToggle, trip, router, compact }) {
  return (
    <li className={`flex items-start gap-3 border-t border-[#EEF0F2] ${compact ? 'py-2' : 'py-3'}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={item.title}
        onClick={onToggle}
        className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <span className={`flex h-6 w-6 items-center justify-center rounded-[7px] ${done ? 'bg-tm-navy text-white' : 'border-2 border-[#C9D2DD]'}`}>
          {done && <Check size={15} strokeWidth={3} />}
        </span>
      </button>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <span className={`text-[15px] font-semibold ${done ? 'text-tm-muted line-through' : 'text-tm-ink'}`}>{item.title}</span>
        {item.sub && !done && <span className="text-[12.5px] leading-normal text-tm-muted">{item.sub}</span>}
      </span>
      {item.action && !done && <ActionButton action={item.action} trip={trip} router={router} />}
    </li>
  );
}

// 전체 목록(화면 전체를 덮는 시트)
function ReadinessSheet({ state, trip, language, onClose }) {
  const router = useRouter();
  const t = getReadinessCopy(language);
  const place = [String(trip.destination || trip.tripTitle || '').split(/[,#]/)[0].trim(), state.country ? (language === 'en' ? state.country.en : state.country.ko) : '']
    .filter((v, i, a) => v && a.indexOf(v) === i).join(' · ');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={t.title} className="fixed inset-0 z-50 overflow-y-auto bg-tm-ground">
      <div className="mx-auto flex max-w-md flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-1 bg-tm-ground py-2 pl-1.5 pr-3">
          <button type="button" onClick={onClose} aria-label={t.close} className="flex h-11 w-11 items-center justify-center text-tm-ink">
            <ChevronLeft size={24} strokeWidth={2} />
          </button>
          <div className="flex min-w-0 flex-col">
            <h2 className="text-[18px] font-bold text-tm-ink">{t.title}</h2>
            <span className="text-[12px] tabular-nums text-tm-muted">{t.sheetSub(place, state.daysLeft != null ? formatDDay(state.daysLeft) : '', state.done, state.total)}</span>
          </div>
        </header>
        <div className="flex flex-col gap-3 px-4 pb-8 pt-1">
          {state.groups.filter((g) => g.items.length).map((g) => (
            <section key={g.id} className="rounded-[18px] bg-white px-4 pb-1 pt-3.5">
              <div className="flex items-center gap-2 pb-1.5">
                <h3 className="flex-1 text-[15px] font-bold text-tm-ink">
                  {g.title} <span className="text-[12px] font-semibold text-tm-muted">{g.when}</span>
                </h3>
                {g.badge && <span className="rounded-full bg-tm-sky-tint px-2 py-0.5 text-[11px] font-bold text-tm-navy">{g.badge}</span>}
              </div>
              <ul>
                {g.items.map((item) => (
                  <Item key={item.id} item={item} done={Boolean(state.checked[item.id])} onToggle={() => state.toggle(item.id)} trip={trip} router={router} />
                ))}
              </ul>
            </section>
          ))}
          <p className="px-1 text-[12px] leading-normal text-tm-muted">{t.note}</p>
        </div>
      </div>
    </div>
  );
}

// 홈 카드: 진행률 + 지금 할 일 3개 + 전체 보기
export default function ReadinessCard({ trip, language, style }) {
  const router = useRouter();
  const t = getReadinessCopy(language);
  const state = useReadiness(trip, language);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const due = dueItems(state.groups, state.daysLeft, state.checked).slice(0, 3);
  const progress = state.total ? Math.round((state.done / state.total) * 100) : 0;

  return (
    <section className="tm-rise flex flex-col gap-2.5 rounded-2xl bg-white px-4 pt-4" style={style}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[16px] font-bold text-tm-ink">{t.title}</h2>
        <span className="text-[13px] tabular-nums text-tm-muted">{t.progress(state.done, state.total)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-tm-sky-tint">
        <div className="tm-fill h-full rounded-full bg-tm-navy transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>
      {due.length ? (
        <>
          <span className="text-[12px] font-bold text-tm-navy">{t.dueNow} · {due[0].group.when}</span>
          <ul>
            {due.map((item) => (
              <Item key={item.id} item={item} done={false} onToggle={() => state.toggle(item.id)} trip={trip} router={router} compact />
            ))}
          </ul>
        </>
      ) : (
        <p className="py-2 text-[14px] text-tm-ink">{t.allDone}</p>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-mx-4 flex h-11 items-center justify-center gap-1 border-t border-[#EEF0F2] text-[14px] font-bold text-tm-navy"
      >
        {t.seeAll(state.total)}
        <ChevronRight size={16} strokeWidth={2} />
      </button>
      {open && <ReadinessSheet state={state} trip={trip} language={language} onClose={close} />}
    </section>
  );
}
