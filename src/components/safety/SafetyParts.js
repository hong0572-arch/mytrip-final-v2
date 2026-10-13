'use client';
import { useEffect, useRef, useState } from 'react';
import { Phone, ShieldAlert } from 'lucide-react';
import { CONSULAR_CALL, emergencyNumbers } from '../trip/tripUtils';

const telHref = (n) => `tel:${String(n).replace(/[^\d+]/g, '')}`;

// 현지 긴급번호(경찰·구급) + 영사콜센터(한국인용) 또는 1330 관광안내(한국을 여행하는 외국인용).
// destination으로 나라를 고른다(모르면 영사콜센터만).
export function EmergencyCard({ copy, destination, basis, children, showConsular = true, hotline = null }) {
  const nums = emergencyNumbers(destination || '');
  return (
    <section className="flex flex-col gap-3 rounded-[20px] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold">{copy.emergencyTitle}</h2>
        {basis && <span className="truncate text-[12px] text-tm-muted">{basis}</span>}
      </div>
      {children}
      {nums && (
        <div className="flex gap-2">
          {[[nums.police, nums.policeLabel === 'touristPolice' ? copy.touristPolice : copy.police], [nums.ambulance, copy.ambulance]].map(([n, label]) => (
            <a key={label} href={telHref(n)} className="flex min-h-16 flex-1 flex-col justify-center gap-0.5 rounded-2xl bg-tm-sky-tint px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-[20px] font-bold tabular-nums text-tm-navy"><Phone size={16} strokeWidth={2} aria-hidden="true" />{n}</span>
              <span className="text-[12px] text-tm-muted">{label}</span>
            </a>
          ))}
        </div>
      )}
      {hotline && (
        <a href="tel:1330" className="flex min-h-12 items-center gap-2.5 rounded-[14px] bg-tm-ground px-3">
          <Phone size={16} strokeWidth={2} className="shrink-0 text-tm-navy" aria-hidden="true" />
          <span className="flex min-w-0 flex-1 flex-col py-1.5"><span className="text-[14px] font-semibold">{hotline}</span><span className="text-[13px] tabular-nums text-tm-muted">1330</span></span>
        </a>
      )}
      {showConsular && (
      <a href={telHref(CONSULAR_CALL)} className="flex min-h-12 items-center gap-2.5 rounded-[14px] bg-tm-ground px-3">
        <Phone size={16} strokeWidth={2} className="shrink-0 text-tm-navy" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col py-1.5">
          <span className="text-[14px] font-semibold">{copy.consular}</span>
          <span className="text-[13px] tabular-nums text-tm-muted">{CONSULAR_CALL}</span>
        </span>
      </a>
      )}
    </section>
  );
}

// 3초 눌러야 작동하는 SOS 버튼(실수로 눌리지 않게). 빨강은 SOS 전용.
export function SosButton({ copy, onTrigger, className = '' }) {
  const [held, setHeld] = useState(0); // 0~3000ms
  const startRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  // requestAnimationFrame이 주는 시각으로 누른 시간을 잰다
  const tick = (ts) => {
    if (!startRef.current) startRef.current = ts;
    const ms = ts - startRef.current;
    if (ms >= 3000) {
      setHeld(0);
      startRef.current = 0;
      onTrigger();
      return;
    }
    setHeld(ms);
    frameRef.current = requestAnimationFrame(tick);
  };
  const down = (e) => {
    e.preventDefault();
    cancelAnimationFrame(frameRef.current);
    startRef.current = 0;
    frameRef.current = requestAnimationFrame(tick);
  };
  const up = () => {
    cancelAnimationFrame(frameRef.current);
    startRef.current = 0;
    setHeld(0);
  };

  const left = Math.ceil((3000 - held) / 1000);
  return (
    <button
      type="button"
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) down(e); }}
      onKeyUp={up}
      className={`relative flex h-16 w-full touch-none select-none items-center justify-center gap-2 overflow-hidden rounded-[18px] bg-tm-sos text-[18px] font-bold text-white ${className}`}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${(held / 3000) * 100}%` }} />
      <ShieldAlert size={22} strokeWidth={2.2} className="relative" aria-hidden="true" />
      <span className="relative">{held > 0 ? copy.sosHolding(left) : copy.sosHold}</span>
    </button>
  );
}
