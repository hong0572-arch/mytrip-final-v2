'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBrowserSupport } from './useLocalStore';

// 브라우저 음성 인식(Web Speech API). Android WebView·일부 브라우저는 지원하지 않으므로
// supported=false일 때는 호출부가 키보드 입력으로 안내한다. 음성은 브라우저/OS 음성 인식 서비스로 전송된다.
// onInterim: 말하는 도중의 글자(화면 미리 보기용)
export default function useSpeechInput({ language = 'ko', onResult, onInterim }) {
  const [listening, setListening] = useState(false);
  const supported = useBrowserSupport(() => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);

  useEffect(() => {
    onResultRef.current = onResult;
    onInterimRef.current = onInterim;
  }, [onResult, onInterim]);

  useEffect(() => () => recognitionRef.current?.abort?.(), []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop?.();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return false;
    recognitionRef.current?.abort?.();
    const recognition = new Recognition();
    recognition.lang = language === 'en' ? 'en-US' : 'ko-KR';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const results = Array.from(event.results);
      const transcript = results.map((result) => result[0]?.transcript || '').join(' ').trim();
      if (results.every((r) => r.isFinal)) {
        onInterimRef.current?.('');
        if (transcript) onResultRef.current?.(transcript);
      } else {
        onInterimRef.current?.(transcript);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => { setListening(false); onInterimRef.current?.(''); };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      return true;
    } catch {
      setListening(false);
      return false;
    }
  }, [language]);

  return { supported, listening, start, stop };
}
