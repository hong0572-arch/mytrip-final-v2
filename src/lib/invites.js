'use client';
// 일정 동행 초대 링크(1회성·기간 제한)와 동행 관리. 참여는 서버 API(/api/invites)가 처리한다.
import { arrayRemove, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { parseLocalDate } from '../utils/tripPhase';

const newKey = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
const DAY = 24 * 60 * 60 * 1000;

export const inviteUrl = (tripId, key) => `${window.location.origin}/j/?k=${tripId}.${key}`;

// expiry: '24h' | '7d' | 'start'(출발일 끝까지, 날짜가 없으면 30일)
export function expiryFor(expiry, trip) {
  if (expiry === '24h') return Date.now() + DAY;
  if (expiry === 'start') {
    const start = parseLocalDate(trip?.startDate);
    if (start) return Math.max(start.getTime() + DAY, Date.now() + DAY);
    return Date.now() + 30 * DAY;
  }
  return Date.now() + 7 * DAY;
}

export async function createInvite(trip, { maxUses = 1, expiry = '7d', role = 'edit' } = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('login required');
  const key = newKey();
  await setDoc(doc(db, 'trips', trip.id, 'invites', key), {
    createdBy: user.uid, maxUses, uses: 0, role, expiresAt: expiryFor(expiry, trip), revoked: false, createdAt: serverTimestamp(),
  });
  return inviteUrl(trip.id, key);
}

export async function revokeInvite(tripId, key) {
  await updateDoc(doc(db, 'trips', tripId, 'invites', key), { revoked: true, revokedAt: serverTimestamp() });
}

export function inviteState(inv, now = Date.now()) {
  if (inv.revoked) return 'closed';
  if (typeof inv.expiresAt === 'number' && inv.expiresAt < now) return 'expired';
  if (inv.maxUses > 0 && (inv.uses || 0) >= inv.maxUses) return 'used';
  return 'open';
}

// 만든 사람만: 동행 내보내기
export async function removeMember(trip, uid) {
  const membersInfo = (trip.membersInfo || []).filter((m) => m?.uid !== uid);
  await updateDoc(doc(db, 'trips', trip.id), { memberIds: arrayRemove(uid), viewerIds: arrayRemove(uid), membersInfo });
}

// 만든 사람만: 권한 바꾸기(보기만 ↔ 함께 편집)
export async function setMemberRole(trip, uid, role) {
  const viewers = new Set(trip.viewerIds || []);
  if (role === 'view') viewers.add(uid); else viewers.delete(uid);
  await updateDoc(doc(db, 'trips', trip.id), { viewerIds: [...viewers] });
}
