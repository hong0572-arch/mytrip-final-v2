'use client';
// 오디오 가이드 재생기 — 앱 전체에서 하나(장소 카드를 닫아도 계속 들린다).
// <audio> 하나를 만들어 두고 상태를 useSyncExternalStore로 나눠 준다. 잠금 화면 조작은 Media Session API.
// 오늘 투어(tour): 하루 일정의 장소를 순서대로 듣는다. 한 곳이 끝나면 다음 장소 안내를 보여 주고(waiting),
// 다음 장소 해설은 미리 받아 둔다(처음 만드는 해설의 20초 대기를 없애려고).
import { useSyncExternalStore } from 'react';
import { authHeaders } from '../../utils/authHeaders';

const IDLE = { status: 'idle', guide: null, trackIdx: 0, place: null, current: 0, duration: 0, rate: 1, error: '', tour: null };
let state = IDLE;
let audio = null;
let onNext = null; // 투어가 아닐 때 ⏭(재생 시트·잠금 화면) — 일정 화면이 정한다
let unlocked = false;
let lang = 'ko';
// iOS는 탭 직후가 아니면 재생을 막는다. 탭한 순간 빈 소리를 한 번 재생해 이 <audio>를 풀어 둔다.
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const guides = new Map(); // `${lang}|${key}` → Promise<guide>
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
  audio.addEventListener('ended', onEnded);
  audio.addEventListener('error', () => { if (state.status !== 'loading') set({ status: 'error', error: 'play' }); });
  return audio;
}

function onEnded() {
  const tracks = state.guide?.tracks || [];
  if (state.trackIdx < tracks.length - 1) { playTrack(state.trackIdx + 1); return; }
  const tour = state.tour;
  if (tour && state.place) {
    const heard = tour.heard.includes(state.place.key) ? tour.heard : [...tour.heard, state.place.key];
    set({ status: 'ended', current: state.duration, tour: { ...tour, heard, waiting: tour.idx < tour.places.length - 1 } });
    return;
  }
  set({ status: 'ended', current: state.duration });
}

function mediaSession() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const track = state.guide?.tracks?.[state.trackIdx];
  const next = state.tour ? () => tourNext() : onNext;
  try {
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: track?.title || state.place?.name || '',
      artist: 'Trip Maker',
      album: state.tour?.title || state.place?.album || '',
      artwork: [{ src: '/timmy-face-192.webp', sizes: '192x192', type: 'image/webp' }],
    });
    navigator.mediaSession.setActionHandler('play', () => resume());
    navigator.mediaSession.setActionHandler('pause', () => pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => seekBy(-15));
    navigator.mediaSession.setActionHandler('seekforward', () => seekBy(15));
    navigator.mediaSession.setActionHandler('nexttrack', next ? () => next() : null);
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

// 해설 받기(같은 장소는 한 번만 요청)
function fetchGuide(place) {
  const id = `${lang}|${place.key}`;
  if (!guides.has(id)) {
    const p = (async () => {
      const res = await fetch('/api/audio-guide/', {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: place.name, query: place.query, city: place.city, category: place.category, description: place.description, lat: place.lat, lng: place.lng, lang }),
      });
      if (!res.ok) { const err = new Error('load'); err.code = res.status === 429 ? 'limit' : 'load'; throw err; }
      return res.json();
    })();
    guides.set(id, p);
    p.catch(() => guides.delete(id)); // 실패는 다시 시도할 수 있게
  }
  return guides.get(id);
}

function unlock() {
  const a = el();
  if (!unlocked) { unlocked = true; a.src = SILENT; a.play().catch(() => {}); }
  return a;
}

async function load(place) {
  const a = unlock();
  a.pause();
  set({ guide: null, trackIdx: 0, current: 0, duration: 0, error: '', status: 'loading', place });
  try {
    const guide = await fetchGuide(place);
    if (state.place?.key !== place.key) return; // 그 사이 다른 장소를 눌렀다
    set({ guide });
    playTrack(0);
  } catch (err) {
    if (state.place?.key === place.key) set({ status: 'error', error: err?.code || 'load' });
  }
}

/**
 * 장소 해설을 불러와 재생한다. 이미 같은 장소면 이어서 재생/일시정지.
 * place: { key, name, query, city, category, description, lat, lng, album }
 */
export function playPlace(place, language) {
  lang = language === 'en' ? 'en' : 'ko';
  if (state.place?.key === place.key && state.guide) {
    if (state.status === 'playing') pause(); else if (state.status === 'ended') playTrack(0); else resume();
    return;
  }
  // 투어에 없는 장소를 따로 누르면 투어는 끝낸다
  const inTour = state.tour?.places.findIndex((p) => p.key === place.key) ?? -1;
  if (state.tour) set({ tour: inTour >= 0 ? { ...state.tour, idx: inTour, waiting: false } : null });
  load(place);
}

// ── 오늘 투어 ──
export function startTour({ title, places, startIdx = 0 }, language) {
  lang = language === 'en' ? 'en' : 'ko';
  if (!places.length) return;
  set({ tour: { title, places, idx: startIdx, heard: [], waiting: false, arrive: state.tour?.arrive ?? true } });
  load(places[startIdx]);
  prefetchNext(startIdx);
}
export function tourPlay(idx) {
  const tour = state.tour;
  if (!tour?.places[idx]) return;
  set({ tour: { ...tour, idx, waiting: false } });
  load(tour.places[idx]);
  prefetchNext(idx);
}
export function tourNext() {
  const tour = state.tour;
  if (tour && tour.idx < tour.places.length - 1) tourPlay(tour.idx + 1);
}
export function setTourArrive(on) { if (state.tour) set({ tour: { ...state.tour, arrive: on } }); }
export function endTour() { set({ tour: null }); }
function prefetchNext(idx) {
  const next = state.tour?.places[idx + 1];
  if (next) fetchGuide(next).catch(() => {});
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
