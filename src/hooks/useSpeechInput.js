'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBrowserSupport } from './useLocalStore';

// 브라우저 음성 인식(Web Speech API). Android WebView·일부 브라우저는 지원하지 않으므로
// supported=false일 때는 호출부가 키보드 입력으로 안내한다. 음성은 브라우저/OS 음성 인식 서비스로 전송된다.
export default function useSpeechInput({ language = 'ko', onResult }) {
  const [listening, setListening] = useState(false);
  const supported = useBrowserSupport(() => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

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
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      if (transcript) onResultRef.current?.(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
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
