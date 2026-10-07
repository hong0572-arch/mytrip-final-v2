'use client';
import { useState } from 'react';
import { ArrowUp, Mic, Square } from 'lucide-react';
import useSpeechInput from '../../hooks/useSpeechInput';

// 화면 아래 고정 입력창 + 마이크. 홈과 대화 화면이 같이 쓴다.
export default function HomeComposer({ copy, language, placeholder, onSubmit, disabled = false }) {
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');

  const submit = (value) => {
    const message = (value ?? text).trim();
    if (!message || disabled) return;
    onSubmit(message);
    setText('');
  };

  const { supported, listening, start, stop } = useSpeechInput({
    language,
    onResult: (transcript) => submit(transcript),
  });

  const handleMic = () => {
    if (listening) {
      stop();
      return;
    }
    if (!supported || !start()) {
      setNotice(copy.micUnsupported);
      setTimeout(() => setNotice(''), 4000);
    }
  };

  return (
    <div className="border-t border-tm-line bg-tm-ground px-4 py-2.5">
      {(notice || listening) && (
        <p role="status" className="mb-2 text-center text-[13px] text-tm-muted">
          {listening ? copy.micListening : notice}
        </p>
      )}
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
          aria-label={copy.mic}
          aria-pressed={listening}
          className={`relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-white ${listening ? 'bg-tm-sos' : 'bg-tm-navy'}`}
        >
          {!listening && <span className="tm-ring bg-tm-sky" />}
          {listening ? <Square size={20} fill="currentColor" className="relative" /> : <Mic size={24} strokeWidth={2} className="relative" />}
        </button>
      </form>
    </div>
  );
}
