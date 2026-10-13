'use client';
import { useEffect, useState } from 'react';

// Google Maps JS(places 포함)를 한 번만 불러온다.
// 키·결제 문제(BillingNotEnabled 등)는 스크립트가 '성공'으로 끝난 뒤 window.gm_authFailure로만 알려 주므로
// 그 신호도 실패로 본다 → 화면은 지도 대신 안내(MapFallback)를 보여 준다.
const SCRIPT_ID = 'tm-google-maps';
const AUTH_EVENT = 'tm-maps-auth-failure';
let loading = null;
let authFailed = false;

function loadGoogleMaps() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (authFailed) return Promise.reject(new Error('Google Maps auth failure'));
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (loading) return loading;
  if (!window.gm_authFailure) {
    window.gm_authFailure = () => {
      authFailed = true;
      window.dispatchEvent(new Event(AUTH_EVENT));
    };
  }
  loading = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) || document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    // 다른 곳에서 넣은 스크립트: places가 준비될 때까지 잠시 기다린다
    const done = () => {
      const started = Date.now();
      const wait = () => {
        if (window.google?.maps?.places) return resolve(window.google);
        if (Date.now() - started > 10000) return reject(new Error('Google Maps failed to load'));
        setTimeout(wait, 50);
      };
      wait();
    };
    if (existing) {
      if (window.google?.maps) return done();
      existing.addEventListener('load', done);
      existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    // loading=async + callback: 라이브러리(places)까지 준비되면 콜백이 불린다
    window.__tmMapsReady = () => resolve(window.google);
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async&callback=__tmMapsReady`;
    script.async = true;
    script.onerror = () => { loading = null; reject(new Error('Google Maps failed to load')); };
    document.head.appendChild(script);
  });
  return loading;
}

// 키·결제 실패 뒤에는 같은 페이지에서 다시 불러올 수 없으므로 '다시 시도'는 새로 고침으로 한다.
export default function useGoogleMaps() {
  const [state, setState] = useState({ ready: false, error: null });
  useEffect(() => {
    let alive = true;
    const fail = (error) => alive && setState({ ready: false, error });
    const onAuth = () => fail(new Error('Google Maps auth failure'));
    window.addEventListener(AUTH_EVENT, onAuth);
    loadGoogleMaps()
      .then(() => alive && !authFailed && setState({ ready: true, error: null }))
      .catch(fail);
    return () => {
      alive = false;
      window.removeEventListener(AUTH_EVENT, onAuth);
    };
  }, []);
  return state;
}
