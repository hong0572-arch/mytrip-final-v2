'use client';
// 안심 귀가 동작. 상태는 store.js, 보호자 실시간 정보는 Firestore safemode_sessions/{uid}(보호자는 일회용 키로 /api/safemode/live 조회).
// 앱 보호자에게는 match_requests로 앱 알림을, 전화번호 보호자에게는 내 휴대폰의 문자 보내기 화면(sms:)으로 알린다.
import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { GRACE_MS, MAX_GUARDIANS, createShareToken, getSafety, liveSessionPath, setSafety } from './store';
import { startSiren, stopSiren, vibrate } from './siren';

const sessionRef = (uid) => doc(db, 'safemode_sessions', uid);
const appGuardians = (s) => s.guardians.filter((g) => g.type === 'app' && g.uid);
const myName = (copy) => auth.currentUser?.displayName || copy.traveler;

async function notifyGuardians(type, message, extra = {}) {
  const user = auth.currentUser;
  if (!user) return;
  await Promise.all(appGuardians(getSafety()).map((g) => addDoc(collection(db, 'match_requests'), {
    type, senderId: user.uid, senderName: user.displayName || '', targetMateId: g.uid, targetMateName: g.name,
    status: 'pending', message, createdAt: serverTimestamp(), ...extra,
  }).catch(() => {})));
}

async function writeSession(fields, { create = false } = {}) {
  const user = auth.currentUser;
  if (!user) return;
  const s = getSafety();
  const uids = appGuardians(s).map((g) => g.uid);
  const base = create ? {
    userId: user.uid,
    userName: user.displayName || '',
    guardianUserIds: uids,
    guardianUserId: uids[0] || '', // 예전 화면 호환
    guardianName: s.guardians.map((g) => g.name).join(', '),
    location: null,
    shareToken: s.shareToken,
    language: (() => { try { return localStorage.getItem('language') === 'en' ? 'en' : 'ko'; } catch { return 'ko'; } })(), // 서버 푸시 문구용
    createdAt: serverTimestamp(),
  } : {};
  await setDoc(sessionRef(user.uid), { ...base, ...fields, updatedAt: serverTimestamp() }, { merge: !create }).catch((e) => console.error('[safety] session write failed', e));
}

export function liveLink() {
  const s = getSafety();
  const path = liveSessionPath(auth.currentUser?.uid, s.shareToken);
  return path ? `${window.location.origin}${path}` : '';
}

// 안심 귀가 시작
export async function startSafety(minutes, copy) {
  const endTime = Date.now() + minutes * 60 * 1000;
  setSafety({ phase: 'active', endTime, graceEndsAt: 0, startedAt: Date.now(), minutes, shareToken: createShareToken(), sos: false });
  vibrate(1);
  await writeSession({ status: 'active', duration: minutes, endTime }, { create: true });
  await notifyGuardians('safemode_started', copy.msgStarted(myName(copy)), { sessionUrl: liveSessionPath(auth.currentUser?.uid, getSafety().shareToken) });
}

export async function extendSafety(minutes = 15) {
  const s = getSafety();
  const base = s.phase === 'active' ? s.endTime : Date.now();
  const endTime = base + minutes * 60 * 1000;
  stopSiren();
  setSafety({ phase: 'active', endTime, graceEndsAt: 0, sos: false, siren: false });
  await writeSession({ status: 'active', endTime });
}

// 도착 · 안전해요: 보호를 끝내고 기록(보호자 링크)도 지운다
export async function endSafety(copy) {
  stopSiren();
  const hadSession = getSafety().phase !== 'idle';
  setSafety({ phase: 'idle', endTime: 0, graceEndsAt: 0, shareToken: '', sos: false, siren: false });
  const user = auth.currentUser;
  if (user) await deleteDoc(sessionRef(user.uid)).catch(() => {});
  if (hadSession) await notifyGuardians('safemode_safe', copy.msgSafe(myName(copy)));
}

// 약속 시간이 지남 → 1분 동안 먼저 물어본다
export function enterGrace() {
  setSafety({ phase: 'grace', graceEndsAt: Date.now() + GRACE_MS });
  vibrate(3);
}

// 보호자에게 알림 + 사이렌. sos=true면 버튼으로 직접 보낸 것
export async function raiseAlert(copy, { sos = false } = {}) {
  const s = getSafety();
  const wasIdle = s.phase === 'idle';
  setSafety({ phase: 'alert', sos, shareToken: s.shareToken || createShareToken(), endTime: s.endTime || Date.now() });
  setSafety({ siren: startSiren() });
  vibrate(3);
  await writeSession({ status: 'expired', endTime: getSafety().endTime }, { create: wasIdle });
  const name = myName(copy);
  await notifyGuardians('safemode_expired', sos ? copy.msgSos(name) : copy.msgExpire(name), { sessionUrl: liveSessionPath(auth.currentUser?.uid, getSafety().shareToken) });
  try {
    const tripId = localStorage.getItem('activeTripId');
    if (tripId && !sos) {
      await addDoc(collection(db, 'trips', tripId, 'messages'), { text: copy.msgChat(name), senderId: 'system_safemode', senderName: '🛡️ Safe Mode', senderAvatar: '/logotm.png', createdAt: serverTimestamp() });
    }
  } catch {}
  updateLocation().catch(() => {});
}

export function toggleSiren() {
  if (getSafety().siren) {
    stopSiren();
    setSafety({ siren: false });
  } else {
    setSafety({ siren: startSiren() });
  }
}

function currentPosition(timeout = 8000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition((p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }), reject, { enableHighAccuracy: true, timeout, maximumAge: 30000 });
  });
}

// 진행 중 위치 갱신(전역 런타임이 15초마다 부른다). 실패하면 가짜 좌표 대신 실패 사실만 기록한다.
export async function updateLocation() {
  if (!auth.currentUser || getSafety().phase === 'idle') return null;
  try {
    const location = await currentPosition();
    await writeSession({ location, locationError: false, locationUpdatedAt: serverTimestamp() });
    return location;
  } catch {
    await writeSession({ locationError: true });
    return null;
  }
}

// '지금 위치 보내기': 앱 보호자에게 알림, 문자용 본문을 돌려준다
export async function shareLocation(copy) {
  const loc = await updateLocation();
  await notifyGuardians('safemode_location_share', copy.msgLocation(myName(copy)), { sessionUrl: liveSessionPath(auth.currentUser?.uid, getSafety().shareToken) });
  return smsText(copy, loc);
}

export function smsText(copy, loc) {
  const live = liveLink();
  const name = myName(copy);
  return loc ? copy.smsBody(name, `https://maps.google.com/?q=${loc.lat},${loc.lng}`, live) : copy.smsBodyNoLoc(name, live);
}

export const smsHref = (phone, body) => `sms:${String(phone).replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(body)}`;

// ── 보호자 관리 ──
export function addPhoneGuardian(name, phone) {
  const s = getSafety();
  if (s.guardians.length >= MAX_GUARDIANS) return false;
  const clean = String(phone).replace(/[^\d+]/g, '');
  setSafety({ guardians: [...s.guardians.filter((g) => g.id !== `phone-${clean}`), { id: `phone-${clean}`, type: 'phone', name: name.trim(), phone: clean }] });
  return true;
}

export async function removeGuardian(id) {
  const g = getSafety().guardians.find((x) => x.id === id);
  setSafety((s) => ({ guardians: s.guardians.filter((x) => x.id !== id) }));
  // 앱 보호자면 초대 기록도 지워 연결을 끊는다(상대의 '내가 지켜 주는 사람'에서도 빠진다)
  if (g?.inviteId) await deleteDoc(doc(db, 'guardian_invites', g.inviteId)).catch(() => {});
}

// 초대가 수락되면(SafetyScreen이 구독) 앱 보호자로 넣는다
export function syncAcceptedInvites(invites) {
  setSafety((s) => {
    const guardians = [...s.guardians];
    invites.forEach((inv) => {
      if (inv.acceptedBy && !guardians.some((g) => g.uid === inv.acceptedBy) && guardians.length < MAX_GUARDIANS) {
        guardians.push({ id: `app-${inv.acceptedBy}`, type: 'app', uid: inv.acceptedBy, name: inv.acceptedName || '', inviteId: inv.id });
      }
    });
    return guardians.length === s.guardians.length ? {} : { guardians };
  });
}

// 초대 링크 만들기(추측할 수 없는 128비트 id). 반환: 링크
export async function createGuardianInvite() {
  const user = auth.currentUser;
  if (!user) throw new Error('login required');
  const id = createShareToken();
  await setDoc(doc(db, 'guardian_invites', id), { ownerUid: user.uid, ownerName: user.displayName || '', status: 'pending', createdAt: serverTimestamp() });
  return `${window.location.origin}/safety/join?t=${id}`;
}
