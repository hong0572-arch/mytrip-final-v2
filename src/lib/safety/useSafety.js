'use client';
import { useSyncExternalStore } from 'react';
import { getSafety, getServerSafety, subscribeSafety } from './store';

// 안심 상태(store.js)를 React에서 읽는다. 서버 렌더·첫 하이드레이션은 '꺼짐'으로 그린다.
export default function useSafety() {
  return useSyncExternalStore(subscribeSafety, getSafety, getServerSafety);
}
