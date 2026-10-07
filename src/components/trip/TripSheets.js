'use client';
import { useState } from 'react';
import { ClipboardCopy, FileDown, MessageCircle, MessagesSquare, Plus, Star, UserPlus, X } from 'lucide-react';

function Sheet({ label, onClose, children }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-tm-ink/40" onClick={onClose}>
      <div role="dialog" aria-label={label} className="rounded-t-[22px] bg-tm-ground px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// 저장 확인. 피드 공유는 기본으로 끈다(혼자 여행 중 날짜·동네 노출을 피하기 위해).
export function SaveSheet({ copy, saving, onCancel, onConfirm }) {
  const [shareToFeed, setShareToFeed] = useState(false);
  return (
    <Sheet label={copy.saveTitle} onClose={saving ? undefined : onCancel}>
      <h2 className="text-[19px] font-bold text-tm-ink">{copy.saveTitle}</h2>
      <p className="mt-1.5 text-[14px] leading-normal text-tm-muted">{copy.saveBody}</p>
      <label className="mt-4 flex items-start gap-3 rounded-2xl bg-white p-3.5">
        <input type="checkbox" checked={shareToFeed} onChange={(e) => setShareToFeed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-tm-navy" />
        <span className="flex flex-col gap-0.5">
          <span className="text-[14px] font-semibold text-tm-ink">{copy.shareToFeed}</span>
          <span className="text-[12px] leading-normal text-tm-muted">{copy.shareToFeedHint}</span>
        </span>
      </label>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className="h-[52px] flex-1 rounded-[14px] border border-tm-line bg-white text-[15px] font-semibold text-tm-ink disabled:opacity-50">{copy.cancel}</button>
        <button type="button" onClick={() => onConfirm(shareToFeed)} disabled={saving} className="h-[52px] flex-[1.6] rounded-[14px] bg-tm-navy text-[16px] font-bold text-white disabled:opacity-70">
          {saving ? copy.saving : copy.saveConfirm}
        </button>
      </div>
    </Sheet>
  );
}

export function MoreMenu({ copy, onClose, items }) {
  const icons = { copyText: ClipboardCopy, print: FileDown, consult: MessageCircle, chat: MessagesSquare, invite: UserPlus };
  return (
    <Sheet label={copy.more} onClose={onClose}>
      <ul className="flex flex-col">
        {items.map(({ key, onClick }) => {
          const Icon = icons[key];
          return (
            <li key={key}>
              <button type="button" onClick={() => { onClose(); onClick(); }} className="flex h-14 w-full items-center gap-3 rounded-xl px-2 text-left text-[15px] font-semibold text-tm-ink active:bg-tm-sky-tint">
                {Icon && <Icon size={20} className="text-tm-navy" aria-hidden="true" />}
                {copy.menu[key]}
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={onClose} className="mt-2 h-12 w-full rounded-[14px] border border-tm-line bg-white text-[15px] font-semibold text-tm-muted">{copy.close}</button>
    </Sheet>
  );
}

// 지도에서 주변 장소를 눌렀을 때의 작은 카드
export function NearbyCard({ copy, place, canAdd, onAdd, onClose }) {
  return (
    <div className="mx-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_6px_20px_rgba(21,48,79,.18)]">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-bold text-tm-ink">{place.name}</span>
        <span className="flex items-center gap-1 truncate text-[12px] text-tm-muted">
          {place.rating && <><Star size={12} className="fill-tm-sun text-tm-sun" aria-hidden="true" />{place.rating} · </>}
          {place.address}
        </span>
      </div>
      {canAdd && (
        <button type="button" onClick={onAdd} className="flex h-10 shrink-0 items-center gap-1 rounded-xl bg-tm-navy px-3 text-[13px] font-bold text-white">
          <Plus size={16} aria-hidden="true" /> {copy.nearbyAdd}
        </button>
      )}
      <button type="button" onClick={onClose} aria-label={copy.close} className="flex h-10 w-10 shrink-0 items-center justify-center text-tm-muted"><X size={18} /></button>
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div role="status" className="pointer-events-none absolute inset-x-0 top-20 z-50 flex justify-center px-6">
      <span className="tm-rise rounded-full bg-tm-ink px-4 py-2.5 text-center text-[14px] font-semibold text-white shadow-lg">{message}</span>
    </div>
  );
}
