'use client';
// 음성 대화의 '말로 대답하기'. 기본은 기기 음성(speechSynthesis, 무료·즉시),
// 설정에서 '티미 목소리'를 고르면 서버(/api/tts, Gemini TTS)로 만든 음성을 재생한다(실패하면 기기 음성으로).
// 대답이 길면 앞부분 2~3문장만 읽고 나머지는 화면에 둔다.
import { useSyncExternalStore } from 'react';
import { authHeaders } from '../../utils/authHeaders';

const PREFS_KEY = 'tm_voice';
const DEFAULT_PREFS = { reply: true, autoListen: false, voice: 'device' }; // voice: device | timmy · 다시 듣기는 직접 켠다
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

let speaking = false;
let prefs = null;
let audio = null;
let finish = null; // 지금 말하는 것을 끝낼 때 부르는 함수
let unlocked = false;
let turn = 0; // 말하기 차례 번호 — 멈추거나 새로 말하면 바뀌어, 늦게 도착한 음성은 버린다
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

// ── 설정 ──
function loadPrefs() {
  if (prefs) return prefs;
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try { prefs = { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch { prefs = { ...DEFAULT_PREFS }; }
  return prefs;
}
export function setVoicePrefs(patch) {
  prefs = { ...loadPrefs(), ...patch };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
  emit();
}
export const getVoicePrefs = () => loadPrefs();
export function useVoicePrefs() {
  return useSyncExternalStore(subscribe, loadPrefs, () => DEFAULT_PREFS);
}
export function useSpeaking() {
  return useSyncExternalStore(subscribe, () => speaking, () => false);
}
export const deviceVoiceSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

// ── 읽을 글 만들기 ──
const MAX = { ko: 170, en: 260 };
/** 마크다운·링크·이모지를 빼고 앞부분만. { text, truncated } */
export function spokenText(raw, lang = 'ko') {
  const plain = String(raw || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/^\s*(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, '')
    .replace(/[*_~`|]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = plain.match(/[^.!?。]+[.!?。]+["”’)]?|\S[^.!?。]*$/g) || [];
  const limit = MAX[lang] || MAX.ko;
  let out = '';
  let count = 0;
  for (const s of sentences) {
    const next = (out ? `${out} ` : '') + s.trim();
    if (count >= 3 || (out && next.length > limit)) break;
    out = next;
    count += 1;
  }
  if (!out) out = plain.slice(0, limit);
  return { text: out, truncated: out.length < plain.length - 5 };
}

// ── 재생 ──
function setSpeaking(v) { if (speaking !== v) { speaking = v; emit(); } }

/** 첫 탭(마이크 등)에서 불러 iOS의 '탭 없이 재생 금지'를 풀어 둔다 */
export function unlockSpeech() {
  if (unlocked || typeof window === 'undefined') return;
  unlocked = true;
  try { if (deviceVoiceSupported()) window.speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch {}
  try { audio = audio || new Audio(); audio.src = SILENT; audio.play().catch(() => {}); } catch {}
}

function pickVoice(lang) {
  const want = lang === 'en' ? 'en' : 'ko';
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith(want));
  // 자연스러운 목소리 우선(구글·애플 고품질·여성 기본 목소리)
  return voices.find((v) => /google|siri|premium|enhanced|natural|yuna|samantha/i.test(v.name)) || voices[0] || null;
}

function speakDevice(text, lang) {
  return new Promise((resolve) => {
    if (!deviceVoiceSupported()) { resolve(); return; }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'en' ? 'en-US' : 'ko-KR';
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.rate = 1;
    const done = () => { finish = null; setSpeaking(false); resolve(); };
    u.onend = done;
    u.onerror = done;
    finish = () => { synth.cancel(); done(); };
    setSpeaking(true);
    synth.speak(u);
  });
}

async function speakTimmy(text, lang, myTurn) {
  const res = await fetch('/api/tts/', { method: 'POST', headers: await authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ text, lang }) });
  if (!res.ok) throw new Error(`tts ${res.status}`);
  const blob = await res.blob();
  if (myTurn !== turn) return; // 받는 사이 멈췄다
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    audio = audio || new Audio();
    const a = audio;
    const done = () => { a.onended = null; a.onerror = null; finish = null; URL.revokeObjectURL(url); setSpeaking(false); resolve(); };
    a.onended = done;
    a.onerror = () => { done(); reject(new Error('play')); };
    finish = () => { a.pause(); done(); };
    a.src = url;
    setSpeaking(true);
    a.play().catch((err) => { done(); reject(err); });
  });
}

/** 글을 소리 내어 읽는다. 끝나거나 멈추면 resolve */
// opts.voice: 이번 한 번만 목소리 지정(설정의 미리 듣기)
export async function speak(text, lang = 'ko', { voice } = {}) {
  cancelSpeech();
  if (!text) return;
  const myTurn = turn;
  if ((voice || loadPrefs().voice) === 'timmy') {
    setSpeaking(true); // 받는 동안에도 '말하는 중'으로 보여 준다
    try { await speakTimmy(text, lang, myTurn); return; } catch { if (myTurn !== turn) return; }
  }
  if (myTurn === turn) await speakDevice(text, lang);
}

export function cancelSpeech() {
  turn += 1;
  if (finish) finish();
  else if (deviceVoiceSupported()) { try { window.speechSynthesis.cancel(); } catch {} }
  setSpeaking(false);
}
