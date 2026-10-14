'use client';
// 오디오 가이드 재생기 — 앱 전체에서 하나(장소 카드를 닫아도 계속 들린다).
// <audio> 하나를 만들어 두고 상태를 useSyncExternalStore로 나눠 준다. 잠금 화면 조작은 Media Session API.
import { useSyncExternalStore } from 'react';
import { authHeaders } from '../../utils/authHeaders';

const IDLE = { status: 'idle', guide: null, trackIdx: 0, place: null, current: 0, duration: 0, rate: 1, error: '' };
let state = IDLE;
let audio = null;
let onNext = null; // 다음 장소로(재생 시트·잠금 화면의 ⏭)
let unlocked = false;
// iOS는 탭 직후가 아니면 재생을 막는다. 탭한 순간 빈 소리를 한 번 재생해 이 <audio>를 풀어 둔다.
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const listeners = new Set();

function set(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const getPlayer = () => state;
export function usePlayer() {
  return useSyncExternalStore(subscribe, getPlayer, () => IDLE);
}

function el() {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = 'auto';
  audio.addEventListener('timeupdate', () => set({ current: audio.currentTime }));
  audio.addEventListener('loadedmetadata', () => set({ duration: audio.duration || state.duration }));
  audio.addEventListener('play', () => { if (state.status !== 'loading') set({ status: 'playing' }); });
  audio.addEventListener('pause', () => { if (state.status === 'playing') set({ status: 'paused' }); });
  audio.addEventListener('ended', () => {
    const tracks = state.guide?.tracks || [];
    if (state.trackIdx < tracks.length - 1) playTrack(state.trackIdx + 1);
    else set({ status: 'ended', current: state.duration });
  });
  audio.addEventListener('error', () => { if (state.status !== 'loading') set({ status: 'error', error: 'play' }); });
  return audio;
}

function mediaSession() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const track = state.guide?.tracks?.[state.trackIdx];
  try {
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: track?.title || state.place?.name || '',
      artist: 'Trip Maker',
      album: state.place?.album || '',
      artwork: [{ src: '/timmy-face-192.webp', sizes: '192x192', type: 'image/webp' }],
    });
    navigator.mediaSession.setActionHandler('play', () => resume());
    navigator.mediaSession.setActionHandler('pause', () => pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => seekBy(-15));
    navigator.mediaSession.setActionHandler('seekforward', () => seekBy(15));
    navigator.mediaSession.setActionHandler('nexttrack', onNext ? () => onNext() : null);
  } catch {}
}

function playTrack(idx) {
  const track = state.guide?.tracks?.[idx];
  if (!track) return;
  const a = el();
  a.src = track.src;
  a.playbackRate = state.rate;
  set({ trackIdx: idx, current: 0, duration: track.duration || 0, status: 'playing' });
  mediaSession();
  a.play().catch(() => set({ status: 'paused' }));
}

/**
 * 장소 해설을 불러와 재생한다. 이미 같은 장소면 이어서 재생/일시정지.
 * place: { key, name, query, city, category, description, lat, lng, album }
 */
export async function playPlace(place, language) {
  if (state.place?.key === place.key && state.guide) {
    if (state.status === 'playing') pause(); else if (state.status === 'ended') playTrack(0); else resume();
    return;
  }
  const a = el();
  a.pause();
  if (!unlocked) { unlocked = true; a.src = SILENT; a.play().catch(() => {}); }
  set({ ...IDLE, rate: state.rate, status: 'loading', place });
  try {
    const res = await fetch('/api/audio-guide/', {
      method: 'POST',
      headers: await authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...place, lang: language === 'en' ? 'en' : 'ko' }),
    });
    if (state.place?.key !== place.key) return; // 그 사이 다른 장소를 눌렀다
    if (!res.ok) { set({ status: 'error', error: res.status === 429 ? 'limit' : 'load' }); return; }
    const guide = await res.json();
    set({ guide });
    playTrack(0);
  } catch {
    if (state.place?.key === place.key) set({ status: 'error', error: 'load' });
  }
}

export const playChapter = (idx) => playTrack(idx);
export function pause() { audio?.pause(); if (state.status === 'playing') set({ status: 'paused' }); }
export function resume() { if (audio?.src) { audio.play().catch(() => {}); } }
export function seekBy(sec) {
  if (!audio) return;
  audio.currentTime = Math.max(0, Math.min((audio.duration || state.duration) - 0.5, audio.currentTime + sec));
}
export function seekTo(sec) { if (audio) audio.currentTime = Math.max(0, sec); }
export function setRate(rate) { if (audio) audio.playbackRate = rate; set({ rate }); }
export function stop() {
  audio?.pause();
  set({ ...IDLE, rate: state.rate });
  try { if ('mediaSession' in navigator) navigator.mediaSession.metadata = null; } catch {}
}
export function setOnNext(fn) { onNext = fn; mediaSession(); }

// 틀린 내용 알려 주기
export async function reportGuide(id, note = '') {
  const res = await fetch('/api/audio-guide/', {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ action: 'report', id, note }),
  });
  if (!res.ok) throw new Error('report failed');
}

// 장소를 구분하는 키(같은 장소면 같은 해설)
export const placeKey = (place, city) => `${place?.name || ''}|${city || ''}`;
