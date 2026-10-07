'use client';
import { useRef, useState } from 'react';
import { GripVertical, MinusCircle, Plus, Search, Sparkles, X } from 'lucide-react';
import HomeComposer from '../home/HomeComposer';
import { reorderByDistance } from './tripUtils';

let keySeq = 0;
const withKeys = (places) => places.map((p) => ({ key: `k${keySeq++}`, p }));

// 하루 일정 편집: 손잡이를 끌어 순서 바꾸기(키보드는 ↑↓), 빼기, 사이에 추가, AI 동선 정리, 말로 고치기
export function EditDay({ copy, homeCopy, language, dayNumber, places, busy, onCancel, onDone, onAsk, searchPlaces, recommendPlaces, notify }) {
  const [items, setItems] = useState(() => withKeys(places));
  const [drag, setDrag] = useState(null); // { index, startY, dy, target, rects }
  const [addAt, setAddAt] = useState(null);
  const [asking, setAsking] = useState(false);
  const rowRefs = useRef([]);

  const move = (from, to) => {
    if (from === to || to < 0 || to >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  };

  // 끌기: 시작하면 창 전체에서 움직임을 받아 손가락이 줄 밖으로 나가도 이어진다
  const dragRef = useRef(null);
  const onPointerDown = (e, index) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    const rects = rowRefs.current.slice(0, items.length).map((el) => el?.getBoundingClientRect());
    dragRef.current = { index, startY: e.clientY, dy: 0, target: index, rects };
    setDrag(dragRef.current);

    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const dy = ev.clientY - d.startY;
      const r = d.rects[d.index];
      const center = r.top + r.height / 2 + dy;
      let target = 0;
      d.rects.forEach((rect, i) => {
        if (i !== d.index && rect && center > rect.top + rect.height / 2) target += 1;
      });
      dragRef.current = { ...d, dy, target };
      setDrag(dragRef.current);
    };
    const onUp = () => {
      const d = dragRef.current;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      dragRef.current = null;
      setDrag(null);
      if (d) move(d.index, d.target);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const shiftFor = (i) => {
    if (!drag || i === drag.index) return 0;
    const h = (drag.rects[drag.index]?.height || 64) + 8;
    if (drag.index < drag.target && i > drag.index && i <= drag.target) return -h;
    if (drag.index > drag.target && i >= drag.target && i < drag.index) return h;
    return 0;
  };

  const optimize = () => {
    const ordered = reorderByDistance(items.map((it) => it.p));
    setItems((prev) => ordered.map((p) => prev.find((it) => it.p === p)));
    notify(copy.optimized);
  };

  const ask = async (text) => {
    setAsking(true);
    try {
      const next = await onAsk(text, items.map((it) => it.p));
      if (next) {
        setItems(withKeys(next));
        notify(copy.askDone);
      }
    } finally {
      setAsking(false);
    }
  };

  const insert = (place) => {
    const at = addAt ?? items.length;
    setItems((prev) => {
      const next = [...prev];
      next.splice(at, 0, ...withKeys([place]));
      return next;
    });
    setAddAt(null);
    notify(copy.added(place.name));
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-tm-ground">
      <header className="flex items-center justify-between border-b border-tm-line px-2 py-2">
        <button type="button" onClick={onCancel} className="h-11 px-3 text-[15px] font-semibold text-tm-muted">{copy.cancel}</button>
        <span className="text-[16px] font-bold text-tm-ink">{copy.editTitle(dayNumber)}</span>
        <button type="button" onClick={() => onDone(items.map((it) => it.p))} disabled={busy || asking} className="h-11 px-3 text-[15px] font-bold text-tm-navy disabled:opacity-50">{copy.done}</button>
      </header>

      <main className={`flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3.5 ${drag ? 'select-none' : ''}`}>
        <p className="mb-1 text-[13px] text-tm-muted">{copy.editHint}</p>
        {items.map((it, i) => {
          const dragging = drag?.index === i;
          return (
            <div key={it.key} className="flex flex-col gap-2">
              <div
                ref={(el) => { rowRefs.current[i] = el; }}
                style={{ transform: `translateY(${dragging ? drag.dy : shiftFor(i)}px)${dragging ? ' rotate(-1deg)' : ''}`, transition: dragging ? 'none' : 'transform .18s ease' }}
                className={`relative flex items-center gap-2.5 rounded-[14px] bg-white py-2.5 pl-1 pr-1.5 ${dragging ? 'z-10 border-[1.5px] border-tm-navy shadow-[0_8px_20px_rgba(21,48,79,.16)]' : ''}`}
              >
                <button
                  type="button"
                  aria-label={copy.dragHandle(it.p.name)}
                  onPointerDown={(e) => onPointerDown(e, i)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') { e.preventDefault(); move(i, i - 1); }
                    if (e.key === 'ArrowDown') { e.preventDefault(); move(i, i + 1); }
                  }}
                  className={`flex h-11 w-8 touch-none select-none items-center justify-center ${dragging ? 'cursor-grabbing text-tm-navy' : 'cursor-grab text-tm-muted'}`}
                >
                  <GripVertical size={18} />
                </button>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tm-navy text-[13px] font-bold text-white">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-tm-ink">{it.p.name}</span>
                <button type="button" aria-label={copy.removeAria(it.p.name)} onClick={() => setItems((prev) => prev.filter((x) => x.key !== it.key))} className="flex h-11 w-11 items-center justify-center text-tm-muted">
                  <MinusCircle size={20} />
                </button>
              </div>
              {i < items.length - 1 && !drag && (
                <button type="button" onClick={() => setAddAt(i + 1)} aria-label={copy.addHere} className="mx-auto flex h-8 w-20 items-center justify-center rounded-full text-tm-muted active:bg-tm-sky-tint">
                  <Plus size={16} />
                </button>
              )}
            </div>
          );
        })}

        <button type="button" onClick={() => setAddAt(items.length)} className="flex h-11 items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-tm-line text-[14px] font-semibold text-tm-navy">
          <Plus size={16} /> {copy.addHere}
        </button>
        <button type="button" onClick={optimize} disabled={items.length < 3} className="mt-1 flex h-12 items-center justify-center gap-2 rounded-[14px] border border-tm-line bg-white text-[14px] font-bold text-tm-navy disabled:opacity-40">
          <Sparkles size={18} /> {copy.optimize}
        </button>
        {asking && <p className="text-center text-[13px] text-tm-muted" role="status">{copy.asking}</p>}
      </main>

      <div className="pb-[env(safe-area-inset-bottom)]">
        <p className="border-t border-tm-line bg-tm-ground px-4 pt-2 text-[12px] text-tm-muted">{copy.askLabel}</p>
        <HomeComposer copy={homeCopy} language={language} placeholder={copy.askPlaceholder} onSubmit={ask} disabled={asking || busy} />
      </div>

      {addAt != null && (
        <AddPlaceSheet copy={copy} onClose={() => setAddAt(null)} onPick={insert} searchPlaces={searchPlaces} recommendPlaces={recommendPlaces} />
      )}
    </div>
  );
}

// 장소 추가: 이름으로 찾기(구글 장소) 또는 AI 추천
export function AddPlaceSheet({ copy, onClose, onPick, searchPlaces, recommendPlaces }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async (fn) => {
    setLoading(true);
    try { setResults(await fn()); } catch { setResults([]); } finally { setLoading(false); }
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-tm-ink/40" onClick={onClose}>
      <div className="flex max-h-[80%] flex-col rounded-t-[22px] bg-tm-ground" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={copy.addTitle}>
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <h2 className="text-[17px] font-bold text-tm-ink">{copy.addTitle}</h2>
          <button type="button" onClick={onClose} aria-label={copy.close} className="flex h-11 w-11 items-center justify-center text-tm-muted"><X size={20} /></button>
        </div>
        <form className="px-4" onSubmit={(e) => { e.preventDefault(); if (query.trim()) run(() => searchPlaces(query.trim())); }}>
          <label className="flex h-12 items-center gap-2 rounded-full border border-tm-line bg-white px-4 focus-within:border-tm-navy">
            <Search size={18} className="text-tm-muted" aria-hidden="true" />
            <span className="sr-only">{copy.addSearch}</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={copy.addSearchPlaceholder} className="min-w-0 flex-1 bg-transparent text-[15px] text-tm-ink outline-none placeholder:text-tm-muted" />
          </label>
        </form>
        <div className="px-4 pt-3">
          <p className="mb-2 text-[12px] font-semibold text-tm-muted">{copy.addAi}</p>
          <div className="flex flex-wrap gap-2">
            {copy.addAiCats.map((c) => (
              <button key={c} type="button" onClick={() => run(() => recommendPlaces(c))} className="flex h-10 items-center gap-1 rounded-full border border-tm-line bg-white px-3.5 text-[14px] font-medium text-tm-ink">
                <Sparkles size={14} className="text-tm-navy" aria-hidden="true" /> {c}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex-1 overflow-y-auto px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
          {loading && <p className="py-4 text-center text-[14px] text-tm-muted" role="status">{copy.adding}</p>}
          {!loading && results?.length === 0 && <p className="py-4 text-center text-[14px] text-tm-muted">{copy.addNoResult}</p>}
          {!loading && results?.length > 0 && (
            <ul className="flex flex-col gap-2">
              {results.map((r, i) => (
                <li key={`${r.name}-${i}`}>
                  <button type="button" onClick={() => onPick(r)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-bold text-tm-ink">{r.name}</span>
                      <span className="truncate text-[12px] text-tm-muted">{[r.category, r.address].filter(Boolean).join(' · ')}</span>
                    </span>
                    <Plus size={20} className="shrink-0 text-tm-navy" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
