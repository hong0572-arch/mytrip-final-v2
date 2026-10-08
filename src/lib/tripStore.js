'use client';
import { addDoc, arrayRemove, collection, deleteDoc, doc, getDoc, increment, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, db } from './firebase';

// 일정 저장·수정·공유(예전 AIResult 화면의 저장 로직을 옮겨 온 것).
// 로그인 전이면 구글 로그인 후 이어서 저장한다. 모바일은 리디렉트 방식이라 sessionStorage에 잠시 맡겨 둔다.
export const PENDING_SAVE_KEY = 'pendingTripSave';
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const clean = (v) => JSON.parse(JSON.stringify(v));

// 피드에 일정 올리기 + 하루 한 번 100P 보상
async function postToFeed(user, plan, { destination, language }) {
  const dest = plan.destination || destination || 'Seoul';
  await addDoc(collection(db, 'feeds'), {
    author: user.displayName, authorUid: user.uid, avatar: user.photoURL,
    type: 'map', title: plan.tripTitle || dest,
    image: `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(dest)}&zoom=12&size=600x600&maptype=roadmap&markers=color:red%7C${encodeURIComponent(dest)}&key=${GOOGLE_MAPS_API_KEY}`,
    tags: [`#${dest}`, language === 'en' ? '#Route' : '#여행동선', '#TripMaker'],
    likes: 0, likedBy: [], comments: 0, forks: 0,
    mockTripData: clean(tripPlanOnly(plan)), createdAt: serverTimestamp(),
  });
  // 피드 공유 보상은 하루 한 번
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  const today = new Date().toISOString().split('T')[0];
  if (!userSnap.exists() || userSnap.data().lastFeedRewardDate !== today) {
    await setDoc(userRef, { points: increment(100), lastFeedRewardDate: today }, { merge: true });
    await addDoc(collection(db, 'users', user.uid, 'point_history'), { reason: '여행 일정 피드 공유 (일일 보상)', amount: 100, createdAt: serverTimestamp() });
  }
}

// 피드·사본에는 일정 내용만 싣는다(동행 목록·연락처·지갑·작성 시각 등은 뺀다).
const PRIVATE_FIELDS = ['id', 'memberIds', 'membersInfo', 'hostId', 'contact', 'contactInfo', 'phone', 'email', 'name', 'userName',
  'tripWalletBalance', 'depositStatus', 'foreignWallets', 'targetTotalCost', 'createdAt', 'updatedAt', 'isEdited', 'copiedFrom', 'isForked', 'originalAuthor'];
export function tripPlanOnly(trip) {
  const out = { ...(trip || {}) };
  for (const key of PRIVATE_FIELDS) delete out[key];
  return out;
}

async function writeTrip(user, { plan, userInfo, shareToFeed, language }) {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  let isNewUser = false;
  if (!userSnap.exists()) {
    isNewUser = true;
    await setDoc(userRef, { email: user.email, name: user.displayName, points: 1000, createdAt: serverTimestamp(), quizStats: { date: '', count: 0 } });
    await addDoc(collection(db, 'users', user.uid, 'point_history'), { desc: '신규 가입 축하금', amount: 1000, createdAt: serverTimestamp() });
  }

  const tripRef = await addDoc(collection(db, 'trips'), {
    ...clean(userInfo || {}),
    ...clean(plan),
    memberIds: [user.uid],
    membersInfo: [{ uid: user.uid, name: user.displayName || (language === 'en' ? 'Traveler' : '여행자'), avatar: user.photoURL || '' }],
    hostId: user.uid,
    createdAt: serverTimestamp(),
  });

  if (shareToFeed) await postToFeed(user, plan, { destination: userInfo?.destination, language });
  return { tripId: tripRef.id, isNewUser };
}

// 반환: { tripId, isNewUser } | { redirecting: true }
export async function saveNewTrip({ plan, userInfo, shareToFeed = false, language = 'ko' }) {
  let user = auth.currentUser;
  if (!user) {
    const provider = new GoogleAuthProvider();
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.innerWidth <= 768;
    if (standalone) {
      sessionStorage.setItem(PENDING_SAVE_KEY, JSON.stringify({ savedUserInfo: userInfo, savedTripPlan: plan, shouldShareToFeed: shareToFeed }));
      await signInWithRedirect(auth, provider);
      return { redirecting: true };
    }
    user = (await signInWithPopup(auth, provider)).user;
  }
  return writeTrip(user, { plan, userInfo, shareToFeed, language });
}

// 리디렉트 로그인 후 돌아왔을 때 맡겨 둔 저장을 마친다. 없으면 null.
export async function completePendingSave(language = 'ko') {
  let pending = null;
  try { pending = JSON.parse(sessionStorage.getItem(PENDING_SAVE_KEY) || 'null'); } catch {}
  if (!pending?.savedTripPlan) return null;
  const result = await getRedirectResult(auth).catch(() => null);
  const user = result?.user || auth.currentUser;
  if (!user) return null;
  sessionStorage.removeItem(PENDING_SAVE_KEY);
  return writeTrip(user, { plan: pending.savedTripPlan, userInfo: pending.savedUserInfo, shareToFeed: pending.shouldShareToFeed, language });
}

export async function updateItinerary(tripId, itinerary) {
  await updateDoc(doc(db, 'trips', tripId), { itinerary: clean(itinerary), isEdited: true, updatedAt: serverTimestamp() });
}

// 로그인 없이 볼 수 있는 공유 링크(일정 사본을 shared_links에 저장)
export async function createShareLink(plan, userInfo) {
  const ref = await addDoc(collection(db, 'shared_links'), {
    ...clean(tripPlanOnly(plan)),
    contactInfo: userInfo?.contact || '',
    createdAt: serverTimestamp(),
  });
  return `${window.location.origin}/share/${ref.id}`;
}

const requireUser = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('login-required');
  return user;
};

// ── 내 일정 목록(/trips)에서 쓰는 동작 ──

export async function renameTrip(tripId, title) {
  await updateDoc(doc(db, 'trips', tripId), { tripTitle: title, updatedAt: serverTimestamp() });
}

// 끝난 여행을 피드에 올린다(여행 중 위치 노출을 막기 위해 목록에서는 끝난 여행에만 권한다).
export async function shareTripToFeed(trip, language = 'ko') {
  await postToFeed(requireUser(), trip, { destination: trip.destination, language });
}

// 일정만 복사해 새 여행을 만든다. startDate('YYYY-MM-DD')를 주면 원래 일수만큼 날짜를 다시 매긴다. 반환: 새 tripId
export async function duplicateTrip(trip, { startDate, titleSuffix = '' } = {}) {
  const user = requireUser();
  const plan = clean(tripPlanOnly(trip));
  const itinerary = Array.isArray(plan.itinerary) ? plan.itinerary : [];
  const days = Math.max(itinerary.length, 1);
  if (startDate) {
    const [y, m, d] = startDate.split('-').map(Number);
    const ymd = (offset) => {
      const date = new Date(y, m - 1, d + offset);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    plan.startDate = ymd(0);
    plan.endDate = ymd(days - 1);
    itinerary.forEach((day, i) => { if (day && typeof day === 'object') day.date = ymd(i); });
  } else {
    delete plan.startDate;
    delete plan.endDate;
  }
  const ref = await addDoc(collection(db, 'trips'), {
    ...plan,
    tripTitle: `${trip.tripTitle || trip.destination || ''}${titleSuffix}`,
    memberIds: [user.uid],
    membersInfo: [{ uid: user.uid, name: user.displayName || '', avatar: user.photoURL || '' }],
    hostId: user.uid,
    copiedFrom: trip.id || null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// 만든 사람(또는 혼자인 일정)은 지우고, 동행으로 들어간 일정은 나만 나간다.
export function canDeleteTrip(trip, uid) {
  const members = Array.isArray(trip?.memberIds) ? trip.memberIds : [];
  return trip?.hostId === uid || members.length <= 1;
}

export async function removeTrip(trip) {
  const user = requireUser();
  const ref = doc(db, 'trips', trip.id);
  if (canDeleteTrip(trip, user.uid)) {
    await deleteDoc(ref);
    return 'removed';
  }
  const membersInfo = (trip.membersInfo || []).filter((m) => m?.uid !== user.uid);
  await updateDoc(ref, { memberIds: arrayRemove(user.uid), membersInfo });
  return 'left';
}
