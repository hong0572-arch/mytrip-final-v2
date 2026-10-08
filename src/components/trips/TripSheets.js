'use client';
import { useEffect, useRef, useState } from 'react';
import { Copy, Link2, LogOut, MapPin, Pencil, Trash2, UserPlus } from 'lucide-react';
import { formatDDay, daysUntil, formatTripRange } from '../../utils/tripPhase';
import { TripThumb } from './TripCards';
import { companionLabel, tripLength, tripTitle } from './tripsUtils';

// 아래에서 올라오는 시트 공통 틀(배경 누르기·Esc로 닫기)
function Sheet({ label, onClose, children }) {
  const panelRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button type="button" aria-label="close" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-[rgba(13,31,54,0.45)]" />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="tm-rise relative w-full max-w-md rounded-t-3xl bg-white pb-[calc(20px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(13,31,54,.18)] outline-none"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D5D9DF]" />
        {children}
      </section>
    </div>
  );
}

function MenuItem({ Icon, label, sub, onClick, muted = false }) {
  return (
    <li>
      <button type="button" onClick={onClick} className={`flex min-h-[52px] w-full items-center gap-3.5 rounded-xl px-3 text-left active:bg-tm-ground ${muted ? 'text-tm-muted' : 'text-tm-ink'}`}>
        <Icon size={22} strokeWidth={1.8} className="shrink-0" />
        <span className="flex flex-1 flex-col gap-px py-2">
          <span className="text-[15px] font-semibold">{label}</span>
          {sub && <span className="text-[12px] font-normal text-tm-muted">{sub}</span>}
        </span>
      </button>
    </li>
  );
}

// 일정 카드 ⋯ 메뉴. 삭제는 빨강을 쓰지 않고(빨강은 SOS 전용) 한 번 더 확인한다.
export function TripMenuSheet({ copy, language, trip, canDelete, onClose, onAction }) {
  const m = copy.menu;
  const [mode, setMode] = useState('menu'); // menu | rename | confirm
  const [name, setName] = useState(tripTitle(trip));
  const title = tripTitle(trip);
  const dDay = daysUntil(trip.startDate);
  const meta = [dDay !== null && dDay >= 0 ? formatDDay(dDay) : null, formatTripRange(trip, language), companionLabel(trip, copy)].filter(Boolean).join(' · ');

  return (
    <Sheet label={title} onClose={onClose}>
      <div className="flex items-center gap-3 border-b border-tm-line px-5 pb-3.5">
        <TripThumb trip={trip} size={48} className="rounded-[10px]" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[17px] font-bold">{title}</span>
          <span className="text-[12px] tabular-nums text-tm-muted">{meta}</span>
        </div>
      </div>

      {mode === 'menu' && (
        <>
          <ul className="px-2 py-1.5">
            <MenuItem Icon={MapPin} label={m.open} onClick={() => onAction('open')} />
            <MenuItem Icon={Pencil} label={m.rename} onClick={() => setMode('rename')} />
            <MenuItem Icon={UserPlus} label={m.invite} sub={m.inviteSub} onClick={() => onAction('invite')} />
            <MenuItem Icon={Link2} label={m.shareLink} sub={m.shareLinkSub} onClick={() => onAction('shareLink')} />
            <MenuItem Icon={Copy} label={m.duplicate} onClick={() => onAction('duplicate')} />
          </ul>
          <div className="mx-5 border-t border-tm-line pt-2">
            <ul className="-mx-3">
              <MenuItem Icon={canDelete ? Trash2 : LogOut} label={canDelete ? m.remove : m.leave} sub={canDelete ? m.removeNote : m.leaveNote} muted onClick={() => setMode('confirm')} />
            </ul>
          </div>
        </>
      )}

      {mode === 'rename' && (
        <form
          className="flex flex-col gap-3 px-5 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const next = name.trim();
            if (next && next !== title) onAction('rename', next);
            else onClose();
          }}
        >
          <label htmlFor="trip-rename" className="text-[14px] font-semibold">{m.rename}</label>
          <input
            id="trip-rename"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
            placeholder={m.renamePlaceholder}
            className="h-12 rounded-xl border border-tm-line bg-tm-ground px-3.5 text-[16px] outline-none focus:border-tm-navy"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode('menu')} className="h-12 flex-1 rounded-xl border border-tm-line text-[15px] font-semibold">{m.cancel}</button>
            <button type="submit" className="h-12 flex-1 rounded-xl bg-tm-navy text-[15px] font-bold text-white">{m.renameSave}</button>
          </div>
        </form>
      )}

      {mode === 'confirm' && (
        <div className="flex flex-col gap-4 px-5 pt-4">
          <p className="text-[15px] leading-normal">{canDelete ? m.confirmRemove(title) : m.confirmLeave(title)}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode('menu')} autoFocus className="h-12 flex-1 rounded-xl bg-tm-navy text-[15px] font-bold text-white">{m.cancel}</button>
            <button type="button" onClick={() => onAction(canDelete ? 'remove' : 'leave')} className="h-12 flex-1 rounded-xl border border-tm-line text-[15px] font-semibold text-tm-muted">
              {canDelete ? m.confirmYes : m.confirmLeaveYes}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

// 같은 일정으로 다시 가기: 출발일만 고르면 일수만큼 날짜를 다시 매겨 새 여행을 만든다.
export function ReuseSheet({ copy, trip, defaultDate, minDate, busy, onClose, onSubmit }) {
  const [date, setDate] = useState(defaultDate);
  return (
    <Sheet label={copy.reuseTitle} onClose={onClose}>
      <form
        className="flex flex-col gap-3 px-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (date) onSubmit(date);
        }}
      >
        <h2 className="text-[18px] font-bold">{copy.reuseTitle}</h2>
        <p className="text-[13px] leading-normal text-tm-muted">{copy.reuseBody(tripLength(trip))}</p>
        <label htmlFor="reuse-date" className="mt-1 text-[14px] font-semibold">{copy.reuseStart}</label>
        <input
          id="reuse-date"
          type="date"
          value={date}
          min={minDate}
          required
          onChange={(e) => setDate(e.target.value)}
          className="h-12 rounded-xl border border-tm-line bg-tm-ground px-3.5 text-[16px] outline-none focus:border-tm-navy"
        />
        <button type="submit" disabled={busy || !date} className="mt-1 h-[52px] rounded-[14px] bg-tm-navy text-[16px] font-bold text-white disabled:opacity-60">
          {copy.reuseCreate}
        </button>
      </form>
    </Sheet>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex justify-center px-6">
      <span className="tm-rise rounded-full bg-tm-ink px-4 py-2.5 text-center text-[14px] font-semibold text-white shadow-lg">{message}</span>
    </div>
  );
}
