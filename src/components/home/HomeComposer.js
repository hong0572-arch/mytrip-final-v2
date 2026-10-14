'use client';
import { useEffect, useState } from 'react';
import { ArrowUp, Mic, Square } from 'lucide-react';
import useSpeechInput from '../../hooks/useSpeechInput';

const BARS = [6, 12, 20, 26, 16, 10, 22, 14, 8, 18, 12, 6];

// 화면 아래 고정 입력창 + 마이크. 홈과 대화 화면이 같이 쓴다.
// onSubmit(text, { voice }) — 마이크로 말한 질문이면 voice=true(대화 화면은 말로 대답한다).
// listenRequest: 숫자가 바뀌면 자동으로 다시 듣는다(음성 대화의 '대답이 끝나면 다시 듣기').
// onMicStart: 마이크를 켜기 직전(티미가 말하는 중이면 멈추게 할 때).
export default function HomeComposer({ copy, language, placeholder, onSubmit, disabled = false, listenRequest = 0, onMicStart }) {
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const [interim, setInterim] = useState('');

  const submit = (value, opts = {}) => {
    const message = (value ?? text).trim();
    if (!message || disabled) return;
    onSubmit(message, opts);
    setText('');
  };

  const { supported, listening, start, stop } = useSpeechInput({
    language,
    onResult: (transcript) => submit(transcript, { voice: true }),
    onInterim: setInterim,
  });

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

  const handleMic = () => {
    if (listening) {
      stop();
      return;
    }
    onMicStart?.();
    if (!supported || !start()) flash(copy.micUnsupported);
  };

  // 자동으로 다시 듣기
  useEffect(() => {
    if (!listenRequest || !supported) return;
    const t = setTimeout(() => { start(); }, 250);
    return () => clearTimeout(t);
  }, [listenRequest, supported, start]);

  return (
    <div className="border-t border-tm-line bg-tm-ground px-4 py-2.5">
      {listening ? (
        <div role="status" aria-live="polite" className="mb-2.5 flex items-center gap-3 rounded-2xl border-[1.5px] border-tm-navy bg-white px-3.5 py-2.5">
          <span aria-hidden="true" className="flex h-7 items-center gap-[3px] text-tm-navy">
            {BARS.map((h, i) => <span key={i} className="tm-voice-bar block w-1 rounded-full bg-current" style={{ height: h, animationDelay: `${i * 70}ms` }} />)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[14px] font-bold text-tm-ink">{copy.micListening}</span>
            <span className="truncate text-[12px] text-tm-muted">{interim || copy.micHint}</span>
          </span>
        </div>
      ) : notice ? (
        <p role="status" className="mb-2 text-center text-[13px] text-tm-muted">{notice}</p>
      ) : null}
      <form
        className="flex items-center gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="flex h-[52px] min-w-0 flex-1 items-center rounded-full border border-tm-line bg-white pl-[18px] pr-1.5 focus-within:border-tm-navy">
          <span className="sr-only">{copy.composerLabel}</span>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            enterKeyHint="send"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-tm-ink outline-none placeholder:text-tm-muted"
          />
          {text.trim() && (
            <button
              type="submit"
              aria-label={copy.send}
              disabled={disabled}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tm-navy text-white disabled:opacity-50"
            >
              <ArrowUp size={20} strokeWidth={2.4} />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={handleMic}
          aria-label={listening ? copy.micStop : copy.mic}
          aria-pressed={listening}
          className={`relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-tm-navy text-white ${listening ? 'shadow-[0_0_0_6px_var(--color-tm-sky-tint)]' : ''}`}
        >
          {!listening && <span className="tm-ring bg-tm-sky" />}
          {listening ? <Square size={20} fill="currentColor" className="relative" /> : <Mic size={24} strokeWidth={2} className="relative" />}
        </button>
      </form>
    </div>
  );
}
