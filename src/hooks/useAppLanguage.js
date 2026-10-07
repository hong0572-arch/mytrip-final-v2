'use client';
import { useCallback, useSyncExternalStore } from 'react';

// 앱 전체 언어 설정. 다른 화면과 같은 방식(localStorage 'language' + 'languageChanged' 이벤트)을 쓴다.
// 서버 렌더와 첫 하이드레이션은 'ko'로 그리고, 저장된 값·?lang=·브라우저 언어는 그 뒤 반영한다.
function subscribe(callback) {
  window.addEventListener('languageChanged', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('languageChanged', callback);
    window.removeEventListener('storage', callback);
  };
}

function readLanguage() {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('lang');
    if (fromQuery === 'en' || fromQuery === 'ko') return fromQuery;
    const saved = localStorage.getItem('language');
    if (saved === 'en' || saved === 'ko') return saved;
  } catch {}
  return (navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'ko';
}

export default function useAppLanguage() {
  const language = useSyncExternalStore(subscribe, readLanguage, () => 'ko');

  const setLanguage = useCallback((next) => {
    try {
      localStorage.setItem('language', next);
      // 저장한 언어가 주소의 ?lang= 보다 우선하도록 쿼리를 지운다.
      const url = new URL(window.location.href);
      if (url.searchParams.has('lang')) {
        url.searchParams.delete('lang');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    } catch {}
    window.dispatchEvent(new Event('languageChanged'));
  }, []);

  return [language, setLanguage];
}
