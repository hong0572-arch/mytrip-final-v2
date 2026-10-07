'use client';
import { addDoc, collection, doc, getDoc, increment, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, db } from './firebase';

// 일정 저장·수정·공유(예전 AIResult 화면의 저장 로직을 옮겨 온 것).
// 로그인 전이면 구글 로그인 후 이어서 저장한다. 모바일은 리디렉트 방식이라 sessionStorage에 잠시 맡겨 둔다.
export const PENDING_SAVE_KEY = 'pendingTripSave';
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const clean = (v) => JSON.parse(JSON.stringify(v));

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

  if (shareToFeed) {
    const dest = plan.destination || userInfo?.destination || 'Seoul';
    await addDoc(collection(db, 'feeds'), {
      author: user.displayName, authorUid: user.uid, avatar: user.photoURL,
      type: 'map', title: plan.tripTitle,
      image: `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(dest)}&zoom=12&size=600x600&maptype=roadmap&markers=color:red%7C${encodeURIComponent(dest)}&key=${GOOGLE_MAPS_API_KEY}`,
      tags: [`#${plan.destination}`, language === 'en' ? '#Route' : '#여행동선', '#TripMaker'],
      likes: 0, likedBy: [], comments: 0, forks: 0,
      mockTripData: clean(plan), createdAt: serverTimestamp(),
    });
    // 피드 공유 보상은 하루 한 번
    const today = new Date().toISOString().split('T')[0];
    const data = userSnap.exists() ? userSnap.data() : null;
    if (!data || data.lastFeedRewardDate !== today) {
      await updateDoc(userRef, { points: increment(100), lastFeedRewardDate: today });
      await addDoc(collection(db, 'users', user.uid, 'point_history'), { reason: '여행 일정 피드 공유 (일일 보상)', amount: 100, createdAt: serverTimestamp() });
    }
  }
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
    ...clean(plan),
    contactInfo: userInfo?.contact || '',
    createdAt: serverTimestamp(),
  });
  return `${window.location.origin}/share/${ref.id}`;
}
