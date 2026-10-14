'use client';
// 여행 알림(출발 D-7·전날 저녁·당일 아침) 켜고 끄기.
// 알림 권한은 사용자가 '출발 알림 받기'를 눌렀을 때만 묻는다(첫 방문에 묻지 않는다).
// 웹: FCM 토큰 / 앱(Capacitor): PushInitializer가 받은 네이티브 토큰. 서버(functions sendTripReminders)는 users/{uid}.notifyTrips·fcmToken을 본다.
import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const VAPID_KEY = 'BGbHmsiKlsaSkfEQiOYQz5R17r6DLgykoKNq22WE8CDRzG1BF8OFI09U21SiFS363Q7X4XtXKqdw_XfPxfZrrHk';
// 알림용 서비스 워커는 오프라인용(/sw.js)과 다른 범위에 둔다. 같은 범위(/)에 두면 서로 덮어쓴다.
export const MESSAGING_SW_SCOPE = '/firebase-cloud-messaging-push-scope';

const isNative = () => typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());

export function deviceContext() {
  let language = 'ko';
  try { language = localStorage.getItem('language') === 'en' ? 'en' : 'ko'; } catch {}
  let timezone = 'Asia/Seoul';
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone; } catch {}
  return { language, timezone };
}

/** 웹 FCM 토큰(권한이 이미 허용된 경우에만). 없으면 null */
export async function webPushToken() {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return null;
  if (Notification.permission !== 'granted') return null;
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
  if (!(await isSupported())) return null;
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: MESSAGING_SW_SCOPE });
  return getToken(getMessaging(), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
}

export function pushSupported() {
  if (isNative()) return true;
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

async function saveUser(patch) {
  const user = auth.currentUser;
  if (!user) throw new Error('login required');
  await setDoc(doc(db, 'users', user.uid), { ...patch, ...deviceContext(), updatedAt: serverTimestamp() }, { merge: true });
}

/** 켜기(탭에서 부른다). 반환: 'on' | 'denied' | 'unsupported' */
export async function enableTripAlerts() {
  if (!pushSupported()) return 'unsupported';
  if (isNative()) {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return 'denied';
    await PushNotifications.register(); // 토큰은 PushInitializer가 저장한다
    await saveUser({ notifyTrips: true, ...(window._fcmToken ? { fcmToken: window._fcmToken } : {}) });
    return 'on';
  }
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') return 'denied';
  const token = await webPushToken();
  if (!token) return 'unsupported';
  await saveUser({ notifyTrips: true, fcmToken: token, lastTokenUpdate: serverTimestamp() });
  return 'on';
}

export async function disableTripAlerts() {
  await saveUser({ notifyTrips: false });
}

/** 상태: loading | on | off | denied | unsupported | guest */
export function useTripAlerts() {
  const [state, setState] = useState('loading');

  const refresh = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) { setState('guest'); return; }
    if (!pushSupported()) { setState('unsupported'); return; }
    if (!isNative() && Notification.permission === 'denied') { setState('denied'); return; }
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      const data = snap.exists() ? snap.data() : {};
      const granted = isNative() || Notification.permission === 'granted';
      setState(data.notifyTrips === true && granted && data.fcmToken ? 'on' : 'off');
    } catch {
      setState('off');
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const unsub = auth.onAuthStateChanged(() => { if (alive) refresh(); });
    return () => { alive = false; unsub(); };
  }, [refresh]);

  const enable = useCallback(async () => {
    setState('loading');
    try { setState(await enableTripAlerts() === 'on' ? 'on' : (!isNative() && Notification.permission === 'denied' ? 'denied' : 'off')); } catch { setState('off'); }
  }, []);
  const disable = useCallback(async () => {
    setState('loading');
    try { await disableTripAlerts(); setState('off'); } catch { refresh(); }
  }, [refresh]);

  return { state, enable, disable };
}
