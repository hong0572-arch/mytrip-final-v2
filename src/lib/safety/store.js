'use client';
// 안심(안심 귀가) 상태 저장소 — 앱 전체에서 하나. /safety 화면과 전역 SafetyRuntime이 함께 쓴다.
// 상태는 이 기기의 localStorage에 둔다(예전 안전모드와 같은 키를 이어 써서 진행 중이던 보호가 끊기지 않는다).
// phase: idle(꺼짐) · active(진행 중) · grace(약속 시간이 지나 1분 동안 '도착했나요?') · alert(보호자에게 알림·사이렌)

const KEY = 'tm_safety_v2';
const LEGACY = { active: 'safeMode_active', end: 'safeMode_endTime', token: 'safeMode_shareToken', gUid: 'safeMode_gUserId', gName: 'safeMode_gName', gPhone: 'safeMode_gPhone' };
export const GRACE_MS = 60 * 1000;
export const MAX_GUARDIANS = 3;

const EMPTY = { phase: 'idle', endTime: 0, graceEndsAt: 0, startedAt: 0, minutes: 0, shareToken: '', guardians: [], sos: false, siren: false };
let state = null;
const listeners = new Set();

function readLegacy() {
  try {
    const guardians = [];
    const name = localStorage.getItem(LEGACY.gName);
    if (name) {
      const uid = localStorage.getItem(LEGACY.gUid) || '';
      const phone = localStorage.getItem(LEGACY.gPhone) || '';
      guardians.push(uid ? { id: `app-${uid}`, type: 'app', uid, name } : { id: `phone-${phone}`, type: 'phone', name, phone });
    }
    const active = localStorage.getItem(LEGACY.active) === 'true';
    const endTime = Number(localStorage.getItem(LEGACY.end) || 0);
    return { ...EMPTY, guardians, phase: active && endTime > Date.now() ? 'active' : 'idle', endTime: active ? endTime : 0, shareToken: localStorage.getItem(LEGACY.token) || '' };
  } catch {
    return { ...EMPTY };
  }
}

function load() {
  if (state) return state;
  if (typeof window === 'undefined') return EMPTY;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    state = saved && typeof saved === 'object' ? { ...EMPTY, ...saved, siren: false } : readLegacy();
  } catch {
    state = readLegacy();
  }
  return state;
}

function persist() {
  try {
    const { siren: _siren, ...rest } = state;
    localStorage.setItem(KEY, JSON.stringify(rest));
    // 다른 화면(홈 배너 등)이 쓰는 예전 표시 키도 맞춰 둔다
    const on = state.phase !== 'idle';
    if (on) {
      localStorage.setItem(LEGACY.active, 'true');
      localStorage.setItem(LEGACY.end, String(state.endTime));
      localStorage.setItem(LEGACY.token, state.shareToken);
    } else {
      localStorage.removeItem(LEGACY.active);
      localStorage.removeItem(LEGACY.end);
      localStorage.removeItem(LEGACY.token);
    }
  } catch {}
}

export function getSafety() {
  return load();
}

export function getServerSafety() {
  return EMPTY;
}

export function setSafety(patch) {
  const prev = load();
  const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
  const changedPhase = (prev.phase !== 'idle') !== (next.phase !== 'idle');
  state = next;
  persist();
  listeners.forEach((l) => l());
  if (changedPhase && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('safeModeChanged', { detail: { active: next.phase !== 'idle' } }));
  }
}

export function subscribeSafety(listener) {
  listeners.add(listener);
  const onStorage = (e) => {
    if (e.key === KEY) {
      state = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export const createShareToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

export const liveSessionPath = (uid, token) => (uid && token ? `/share/live_safemode?u=${encodeURIComponent(uid)}&t=${token}` : null);
