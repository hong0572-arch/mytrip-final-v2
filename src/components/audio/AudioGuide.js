'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, Headphones, Loader2, Pause, Play, RotateCcw, SkipForward, Subtitles, X } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { getAudioCopy, formatTime } from '../../content/audioCopy';
import { pause, playChapter, playPlace, reportGuide, resume, seekBy, seekTo, setRate, stop, usePlayer } from '../../lib/audio/player';
import { goToLogin } from '../home/homeActions';

const RATES = [1, 1.25, 1.5, 0.85];
const nextRate = (r) => RATES[(RATES.indexOf(r) + 1) % RATES.length];

function Badge({ copy, source }) {
  return source === 'odii'
    ? <span className="inline-flex h-6 items-center rounded-full bg-tm-warm-tint px-2.5 text-[12px] font-bold text-tm-warm">{copy.ktoBadge}</span>
    : <span className="inline-flex h-6 items-center rounded-full bg-tm-sky-tint px-2.5 text-[12px] font-bold text-tm-navy">{copy.aiBadge}</span>;
}

function Progress({ current, duration, onSeek, dark = false, label }) {
  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  return (
    <input
      type="range"
      min={0}
      max={Math.max(1, Math.round(duration))}
      step={1}
      value={Math.round(current)}
      onChange={(e) => onSeek(Number(e.target.value))}
      aria-label={label}
      aria-valuetext={`${formatTime(current)} / ${formatTime(duration)}`}
      className="h-6 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full"
      style={{
        accentColor: dark ? '#7FD3F5' : 'var(--color-tm-navy)',
        background: 'transparent',
        backgroundImage: `linear-gradient(to right, ${dark ? '#7FD3F5' : 'var(--color-tm-navy)'} ${pct}%, ${dark ? '#2E4E75' : '#C9D2DD'} ${pct}%)`,
        backgroundSize: '100% 4px',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}

// ① 장소 카드의 "들려줘" — 이 장소를 재생 중이면 작은 재생기로 바뀐다
export function ListenCard({ place, language, korea = false, onOpen }) {
  const router = useRouter();
  const copy = getAudioCopy(language);
  const p = usePlayer();
  const mine = p.place?.key === place.key;
  const status = mine ? p.status : 'idle';
  const track = mine ? p.guide?.tracks?.[p.trackIdx] : null;

  const start = () => {
    if (!auth.currentUser) return goToLogin(router);
    playPlace(place, language);
  };

  if (status === 'idle' || status === 'loading' || status === 'error') {
    const sub = status === 'loading' ? copy.preparing
      : status === 'error' ? (p.error === 'limit' ? copy.limit : p.error === 'play' ? copy.playFailed : copy.failed)
      : korea ? copy.listenSubKorea : copy.listenSub;
    return (
      <button
        type="button"
        onClick={start}
        disabled={status === 'loading'}
        aria-busy={status === 'loading'}
        className="mt-3 flex min-h-[72px] w-full items-center gap-3.5 rounded-[18px] bg-tm-ink py-3 pl-3 pr-4 text-left text-white disabled:opacity-90"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-tm-ink">
          {status === 'loading' ? <Loader2 size={22} className="animate-spin" aria-hidden="true" /> : status === 'error' ? <RotateCcw size={20} aria-hidden="true" /> : <Play size={20} className="ml-0.5 fill-current" aria-hidden="true" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[16px] font-bold">{status === 'error' ? copy.retry : copy.listen}</span>
          <span role={status === 'loading' || status === 'error' ? 'status' : undefined} className="text-[13px] leading-snug text-[#B9C8DA]">{sub}</span>
        </span>
        <Headphones size={22} className="shrink-0 text-tm-sky-soft" aria-hidden="true" />
      </button>
    );
  }

  const playing = status === 'playing';
  return (
    <section aria-label={copy.nowPlaying} className="mt-3 flex flex-col gap-1.5 rounded-[18px] bg-tm-ink px-3.5 pb-2 pt-3 text-white">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] text-[#B9C8DA]">{status === 'ended' ? copy.ended : playing ? copy.nowPlaying : copy.paused} · {track?.title || place.name}</span>
        <span className="text-[12px] tabular-nums text-[#B9C8DA]">{formatTime(p.current)} / {formatTime(p.duration)}</span>
      </div>
      <Progress current={p.current} duration={p.duration} onSeek={seekTo} dark label={copy.nowPlaying} />
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setRate(nextRate(p.rate))} aria-label={copy.speed} className="h-11 w-14 rounded-xl text-[14px] font-bold tabular-nums">{p.rate}×</button>
        <button type="button" onClick={() => seekBy(-15)} aria-label={copy.back15} className="flex h-11 w-11 items-center justify-center"><RotateCcw size={22} aria-hidden="true" /></button>
        <button
          type="button"
          onClick={() => (playing ? pause() : status === 'ended' ? playChapter(0) : resume())}
          aria-label={playing ? copy.pause : status === 'ended' ? copy.replay : copy.play}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-tm-ink"
        >
          {playing ? <Pause size={24} className="fill-current" aria-hidden="true" /> : <Play size={24} className="ml-0.5 fill-current" aria-hidden="true" />}
        </button>
        <button type="button" onClick={onOpen} aria-label={copy.captions} className="flex h-11 w-11 items-center justify-center"><Subtitles size={22} aria-hidden="true" /></button>
        <button type="button" onClick={stop} aria-label={copy.stop} className="flex h-11 w-14 items-center justify-center text-[#B9C8DA]"><X size={20} aria-hidden="true" /></button>
      </div>
    </section>
  );
}

// 장소 카드를 닫았을 때 아래에 남는 작은 재생 막대
export function MiniPlayer({ language, onOpen }) {
  const copy = getAudioCopy(language);
  const p = usePlayer();
  if (!p.place || p.status === 'idle') return null;
  const playing = p.status === 'playing';
  const track = p.guide?.tracks?.[p.trackIdx];
  const pct = p.duration > 0 ? (p.current / p.duration) * 100 : 0;
  return (
    <div className="relative mx-3 mb-2 overflow-hidden rounded-2xl bg-tm-ink text-white shadow-[0_6px_20px_rgba(21,48,79,.25)]">
      <div className="flex items-center gap-2 py-1.5 pl-1.5 pr-1">
        <button type="button" onClick={onOpen} aria-label={copy.open} className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 px-2 text-left">
          {p.status === 'loading' ? <Loader2 size={18} className="shrink-0 animate-spin text-tm-sky-soft" aria-hidden="true" /> : <Headphones size={18} className="shrink-0 text-tm-sky-soft" aria-hidden="true" />}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[14px] font-bold">{track?.title || p.place.name}</span>
            <span className="truncate text-[12px] text-[#B9C8DA]">{p.status === 'loading' ? copy.preparing : playing ? copy.nowPlaying : p.status === 'ended' ? copy.ended : copy.paused}</span>
          </span>
        </button>
        {p.status !== 'loading' && p.status !== 'error' && (
          <button type="button" onClick={() => (playing ? pause() : p.status === 'ended' ? playChapter(0) : resume())} aria-label={playing ? copy.pause : copy.play} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-tm-ink">
            {playing ? <Pause size={18} className="fill-current" aria-hidden="true" /> : <Play size={18} className="ml-0.5 fill-current" aria-hidden="true" />}
          </button>
        )}
        <button type="button" onClick={stop} aria-label={copy.stop} className="flex h-11 w-11 items-center justify-center text-[#B9C8DA]"><X size={18} aria-hidden="true" /></button>
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-[#2E4E75]"><div className="h-full bg-tm-sky-soft" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

// ② 크게 보기 — 자막(지금 문장 강조)·구간·틀린 내용 알려 주기
export function PlayerSheet({ language, onClose, onNext }) {
  const copy = getAudioCopy(language);
  const p = usePlayer();
  const panelRef = useRef(null);
  const activeRef = useRef(null);
  const [reporting, setReporting] = useState(false);
  const [note, setNote] = useState('');
  const [reportState, setReportState] = useState('idle'); // idle | busy | done | error

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const guide = p.guide;
  const track = guide?.tracks?.[p.trackIdx];
  const cues = track?.cues || [];
  let active = -1;
  for (let i = 0; i < cues.length; i++) if (cues[i].t <= p.current + 0.2) active = i;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [active]);

  const playing = p.status === 'playing';
  const send = async () => {
    setReportState('busy');
    try { await reportGuide(guide.id, note); setReportState('done'); setReporting(false); } catch { setReportState('error'); }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center font-sans text-tm-ink">
      <button type="button" aria-label={copy.close} tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-[rgba(13,31,54,0.45)]" />
      <section ref={panelRef} role="dialog" aria-modal="true" aria-label={copy.nowPlaying} tabIndex={-1} className="tm-rise relative flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-3xl bg-tm-ground px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2 outline-none">
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-[#D5D9DF]" />
        <div className="flex shrink-0 items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[13px] text-tm-muted">{p.status === 'loading' ? copy.preparing : playing ? copy.nowPlaying : p.status === 'ended' ? copy.ended : copy.paused}</span>
            <h2 className="text-[20px] font-bold leading-snug">{p.place?.name}</h2>
            {track && guide?.tracks?.length > 1 && <span className="text-[13px] text-tm-muted">{track.title}</span>}
          </div>
          {guide && <Badge copy={copy} source={guide.source} />}
        </div>

        {guide && (
          <section className="mt-3 flex shrink-0 flex-col gap-1 rounded-[18px] bg-white px-4 pb-2 pt-3">
            <Progress current={p.current} duration={p.duration} onSeek={seekTo} label={copy.nowPlaying} />
            <div className="flex justify-between text-[12px] tabular-nums text-tm-muted"><span>{formatTime(p.current)}</span><span>{formatTime(p.duration)}</span></div>
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setRate(nextRate(p.rate))} aria-label={copy.speed} className="h-11 w-14 rounded-xl border border-tm-line text-[14px] font-bold tabular-nums">{p.rate}×</button>
              <button type="button" onClick={() => seekBy(-15)} aria-label={copy.back15} className="flex h-12 w-12 items-center justify-center"><RotateCcw size={26} aria-hidden="true" /></button>
              <button type="button" onClick={() => (playing ? pause() : p.status === 'ended' ? playChapter(0) : resume())} aria-label={playing ? copy.pause : copy.play} className="flex h-16 w-16 items-center justify-center rounded-full bg-tm-navy text-white">
                {playing ? <Pause size={26} className="fill-current" aria-hidden="true" /> : <Play size={26} className="ml-1 fill-current" aria-hidden="true" />}
              </button>
              <button type="button" onClick={onNext} disabled={!onNext} aria-label={copy.nextPlace} className="flex h-12 w-12 items-center justify-center disabled:opacity-30"><SkipForward size={24} aria-hidden="true" /></button>
              <button type="button" onClick={stop} aria-label={copy.stop} className="flex h-11 w-14 items-center justify-center text-tm-muted"><X size={20} aria-hidden="true" /></button>
            </div>
          </section>
        )}

        {guide?.tracks?.length > 1 && (
          <div className="mt-3 flex shrink-0 gap-2 overflow-x-auto pb-1" role="list" aria-label={copy.chapters}>
            {guide.tracks.map((t, i) => (
              <button key={t.src} role="listitem" type="button" onClick={() => playChapter(i)} aria-current={i === p.trackIdx} className={`h-11 shrink-0 rounded-xl px-3.5 text-[13px] font-semibold ${i === p.trackIdx ? 'bg-tm-navy text-white' : 'border border-tm-line bg-white text-tm-ink'}`}>
                {t.title}{t.duration ? ` · ${formatTime(t.duration)}` : ''}
              </button>
            ))}
          </div>
        )}

        <section aria-label={copy.captions} className="mt-3 min-h-[120px] flex-1 overflow-y-auto">
          {cues.length > 0 ? (
            <div className="flex flex-col gap-1">
              {cues.map((c, i) => (
                <p key={i} ref={i === active ? activeRef : null} onClick={() => seekTo(c.t)} className={`-mx-2 cursor-pointer rounded-lg px-2 py-1 text-[15px] leading-relaxed ${i === active ? 'bg-tm-warm-tint font-semibold text-tm-ink' : 'text-tm-muted'} ${i > 0 && cues[i - 1].p !== c.p ? 'mt-3' : ''}`}>
                  {c.text}
                </p>
              ))}
            </div>
          ) : track?.script ? (
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-tm-ink/80">{track.script}</p>
          ) : (
            guide && <p className="text-[14px] text-tm-muted">{copy.noScript}</p>
          )}
        </section>

        {guide && (
          <div className="mt-2 flex shrink-0 flex-col gap-2 border-t border-tm-line pt-3">
            {reporting ? (
              <div className="flex flex-col gap-2">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder={copy.reportPlaceholder} aria-label={copy.report} className="rounded-xl border border-tm-line bg-white p-3 text-[16px] outline-none focus:border-tm-navy" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setReporting(false)} className="h-11 flex-1 rounded-xl border border-tm-line bg-white text-[14px] font-semibold">{copy.close}</button>
                  <button type="button" onClick={send} disabled={reportState === 'busy'} className="h-11 flex-1 rounded-xl bg-tm-navy text-[14px] font-bold text-white disabled:opacity-60">{copy.reportSend}</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[12px] leading-normal text-tm-muted">{guide.source === 'odii' ? copy.ktoNote : copy.aiNote}</span>
                {reportState !== 'done' && (
                  <button type="button" onClick={() => setReporting(true)} className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-tm-line bg-white px-3 text-[13px] font-semibold"><Flag size={14} aria-hidden="true" />{copy.report}</button>
                )}
              </div>
            )}
            {reportState === 'done' && <p role="status" className="text-[13px] font-semibold text-tm-navy">{copy.reported}</p>}
            {reportState === 'error' && <p role="alert" className="text-[13px] text-tm-warm">{copy.failed}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
