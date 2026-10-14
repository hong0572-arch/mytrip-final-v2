'use client';
import { useEffect, useRef } from 'react';
import { Headphones, Square, Volume2 } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { cancelSpeech, setVoicePrefs, speak, unlockSpeech, useSpeaking, useVoicePrefs } from '../../lib/voice/speech';
import TimmyAvatar from '../TimmyAvatar';

const BARS = [8, 18, 12, 24, 14, 20, 10, 16, 8];

// 헤더의 '음성' 버튼 — 대답이 끝나면 다시 듣기가 켜져 있으면 '음성 대화'로 눌린 상태
export function VoiceToggle({ copy, onOpen }) {
  const prefs = useVoicePrefs();
  const on = prefs.reply && prefs.autoListen;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={on}
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold ${on ? 'bg-tm-navy text-white' : 'border border-tm-line bg-white text-tm-navy'}`}
    >
      <Headphones size={16} strokeWidth={2} aria-hidden="true" />
      {on ? copy.voice.buttonOn : copy.voice.button}
    </button>
  );
}

// ① 티미가 말하는 중 — 누르면 멈추고 바로 듣기
export function SpeakingBar({ copy, onInterrupt }) {
  const speaking = useSpeaking();
  if (!speaking) return null;
  return (
    <div className="px-4 pb-2.5 pt-2.5">
      <button
        type="button"
        onClick={() => { cancelSpeech(); onInterrupt?.(); }}
        aria-label={copy.voice.stopSpeaking}
        className="flex w-full items-center gap-3 rounded-[18px] bg-tm-ink py-2.5 pl-3 pr-2.5 text-left text-white"
      >
        <TimmyAvatar size={36} />
        <span className="flex min-w-0 flex-1 flex-col" role="status" aria-live="polite">
          <span className="text-[14px] font-bold">{copy.voice.speaking}</span>
          <span className="truncate text-[12px] text-[#B9C8DA]">{copy.voice.speakingHint}</span>
        </span>
        <span aria-hidden="true" className="flex h-7 items-center gap-[3px] text-tm-sky-soft">
          {BARS.map((h, i) => <span key={i} className="tm-voice-bar block w-1 rounded-full bg-current" style={{ height: h, animationDelay: `${i * 80}ms` }} />)}
        </span>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-tm-ink"><Square size={16} fill="currentColor" aria-hidden="true" /></span>
      </button>
    </div>
  );
}

function Switch({ title, sub, checked, onChange }) {
  return (
    <label className="flex min-h-[60px] items-center gap-3 px-3.5 py-1.5">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-[12px] leading-snug text-tm-muted">{sub}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden="true" className="relative h-7 w-12 shrink-0 rounded-full bg-[#C9D2DD] transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-[22px] after:w-[22px] after:rounded-full after:bg-white after:transition-transform peer-checked:bg-tm-navy peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-tm-navy" />
    </label>
  );
}

// ③ 음성 대화 설정
export function VoiceSheet({ copy, language, onClose }) {
  const v = copy.voice;
  const prefs = useVoicePrefs();
  const speaking = useSpeaking();
  const panelRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const preview = (voice) => {
    unlockSpeech();
    if (speaking) { cancelSpeech(); return; }
    speak(v.previewText, language, { voice });
  };
  const loggedIn = Boolean(auth.currentUser);

  const voices = [
    { id: 'device', title: v.device, sub: v.deviceSub },
    { id: 'timmy', title: v.timmy, sub: loggedIn ? v.timmySub : v.timmyLogin, disabled: !loggedIn },
  ];

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center font-sans text-tm-ink">
      <button type="button" aria-label={v.done} tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-[rgba(13,31,54,0.45)]" />
      <section ref={panelRef} role="dialog" aria-modal="true" aria-label={v.sheetTitle} tabIndex={-1} className="tm-rise relative flex max-h-[90dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-t-3xl bg-tm-ground px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-2 outline-none">
        <div className="mx-auto h-1 w-10 shrink-0 rounded-full bg-[#D5D9DF]" />
        <div className="flex items-center gap-2.5">
          <Headphones size={22} className="text-tm-navy" aria-hidden="true" />
          <h2 className="flex-1 text-[20px] font-bold">{v.sheetTitle}</h2>
        </div>
        <p className="text-[13px] leading-relaxed text-tm-muted">{v.sheetBody}</p>

        <section className="flex flex-col divide-y divide-[#EEF0F2] rounded-[18px] bg-white">
          <Switch title={v.reply} sub={v.replySub} checked={prefs.reply} onChange={(on) => setVoicePrefs({ reply: on })} />
          <Switch title={v.autoListen} sub={v.autoListenSub} checked={prefs.reply && prefs.autoListen} onChange={(on) => setVoicePrefs({ autoListen: on, ...(on ? { reply: true } : {}) })} />
        </section>

        <span className="mx-1 mt-1 text-[13px] font-bold text-tm-muted">{v.voiceLabel}</span>
        <fieldset className="flex flex-col divide-y divide-[#EEF0F2] rounded-[18px] bg-white">
          <legend className="sr-only">{v.voiceLabel}</legend>
          {voices.map((o) => (
            <div key={o.id} className={`flex min-h-[64px] items-center gap-3 px-3.5 py-1.5 ${o.disabled ? 'opacity-55' : ''}`}>
              <label className="flex min-w-0 flex-1 items-center gap-3">
                <input type="radio" name="tm-voice" value={o.id} checked={prefs.voice === o.id} disabled={o.disabled} onChange={() => setVoicePrefs({ voice: o.id })} className="h-5 w-5 shrink-0 accent-tm-navy" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{o.title}</span>
                  <span className="text-[12px] leading-snug text-tm-muted">{o.sub}</span>
                </span>
              </label>
              <button type="button" disabled={o.disabled} onClick={() => preview(o.id)} aria-label={`${o.title} ${v.preview}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-tm-line bg-white text-tm-navy disabled:opacity-40">
                <Volume2 size={18} aria-hidden="true" />
              </button>
            </div>
          ))}
        </fieldset>

        <p className="mx-1 text-[12px] leading-relaxed text-tm-muted">{v.note}</p>
        <button type="button" onClick={onClose} className="h-[52px] shrink-0 rounded-[14px] bg-tm-navy text-[16px] font-bold text-white">{v.done}</button>
      </section>
    </div>
  );
}
