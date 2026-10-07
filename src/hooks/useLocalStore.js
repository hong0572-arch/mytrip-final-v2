'use client';
import { useCallback, useSyncExternalStore } from 'react';

// localStorage 값을 React 상태처럼 읽는다. 서버 렌더·첫 하이드레이션에서는 fallback을 쓰고
// 그 뒤 저장된 값으로 바뀐다(하이드레이션 불일치 없음). 같은 탭의 변경은 LOCAL_EVENT로 알린다.
const LOCAL_EVENT = 'tm-local-store';

function subscribe(callback) {
  window.addEventListener('storage', callback);
  window.addEventListener(LOCAL_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(LOCAL_EVENT, callback);
  };
}

export function useStoredString(key, fallback = '') {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) ?? fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback
  );

  const setValue = useCallback((next) => {
    try {
      localStorage.setItem(key, next);
    } catch {}
    window.dispatchEvent(new Event(LOCAL_EVENT));
  }, [key]);

  return [value, setValue];
}

// localStorage를 바꾼 다른 코드(예: 안전모드)가 있을 때 다시 읽도록 알린다.
export function notifyLocalStore() {
  window.dispatchEvent(new Event(LOCAL_EVENT));
}

const noopSubscribe = () => () => {};

// 브라우저에서 렌더 중인지(서버 렌더·하이드레이션 첫 렌더에서는 false)
export function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

// 렌더 중 브라우저 기능 지원 여부 확인(서버에서는 false)
export function useBrowserSupport(check) {
  return useSyncExternalStore(noopSubscribe, check, () => false);
}
