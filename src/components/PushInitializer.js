'use client';

import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import useFcmToken from '../hooks/useFcmToken'; // 👈 Web 토큰용 훅 추가

export default function PushInitializer() {
    const { token: webFcmToken } = useFcmToken(); // 🌐 Web FCM 토큰 가져오기

    // 🌐 Web Service Worker 등록 (Standard PWA)
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/firebase-messaging-sw.js')
                .then((reg) => console.log('🚀 서비스 워커 등록 성공!', reg))
                .catch((err) => console.log('❌ 서비스 워커 등록 실패!', err));
        }
    }, []);

    useEffect(() => {
        const initNativeFeatures = async () => {
            const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform();

            // 1. 네이티브 전용 설정
            if (isNative) {
                console.log("🚀 네이티브 통합 기능 초기화 시작");
                try {
                    await GoogleAuth.initialize({
                        clientId: '817442711390-3l23qcluqvqdfpr7jadmjfutrfe0q7b4.apps.googleusercontent.com',
                        scopes: ['profile', 'email'],
                        grantOfflineAccess: true,
                    });

                    await PushNotifications.requestPermissions();
                    await LocalNotifications.requestPermissions();
                    await PushNotifications.register();

                    // 컴백 알림 설정
                    const pending = await LocalNotifications.getPending();
                    const oldInactivityNote = pending.notifications.find(n => n.id === 999);
                    if (oldInactivityNote) {
                        await LocalNotifications.cancel({ notifications: [{ id: 999 }] });
                    }

                    await LocalNotifications.schedule({
                        notifications: [
                            {
                                title: "냥 프로가 기다리고 있어요! 🐾",
                                body: "대표님, 여행 계획 세우신 지 벌써 3주가 지났네요. 새로운 핫플레이스를 구경해보세요!",
                                id: 999,
                                schedule: { at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21) },
                                sound: 'beep.wav'
                            }
                        ]
                    });

                    PushNotifications.addListener('registration', async (token) => {
                        console.log('✅ Native FCM Token received:', token.value);
                        window._fcmToken = token.value;
                        
                        // Immediately update Firestore if user is logged in
                        if (auth.currentUser) {
                            try {
                                const userRef = doc(db, "users", auth.currentUser.uid);
                                await setDoc(userRef, {
                                    fcmToken: token.value,
                                    updatedAt: serverTimestamp()
                                }, { merge: true });
                                console.log("✅ Native FCM token saved to Firestore");
                            } catch (e) {
                                console.error("❌ Failed to save Native FCM token:", e);
                            }
                        }
                    });
                } catch (err) {
                    console.error("❌ 네이티브 초기화 에러:", err);
                }
            }

            // 2. [공통] 인증 상태 감시 및 토큰 업데이트
            const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
                if (user) {
                    try {
                        const userRef = doc(db, "users", user.uid);
                        const userSnap = await getDoc(userRef);

                        const updateData = {
                            lastActive: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        };

                        // 🛡️ 플랫폼별 토큰 우선순위 적용하여 업데이트
                        const finalToken = isNative ? window._fcmToken : webFcmToken;
                        if (finalToken) {
                            updateData.fcmToken = finalToken;
                            console.log(`✅ [${isNative ? 'Native' : 'Web'}] FCM 토큰 등록 준비:`, finalToken);
                        }

                        // 최초 로그인 환영 로컬 알림 (네이티브 전용)
                        if (isNative && userSnap.exists() && !userSnap.data().isWelcomeSent) {
                            await LocalNotifications.schedule({
                                notifications: [
                                    {
                                        title: `반가워요, ${userSnap.data().name || '여행자'}님! ✨`,
                                        body: "트립메이커 '냥 프로'와 함께 설레는 여행을 시작해봐요!",
                                        id: 1,
                                        schedule: { at: new Date(Date.now() + 1000) }
                                    }
                                ]
                            });
                            updateData.isWelcomeSent = true;
                        }

                        await setDoc(userRef, updateData, { merge: true });
                        console.log("✅ 유저 정보 및 토큰 업데이트 완료");

                    } catch (e) {
                        console.error("❌ 유저 데이터 업데이트 실패:", e);
                    }
                }
            });

            return unsubscribeAuth;
        };

        const cleanupPromise = initNativeFeatures();

        return () => {
            if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()) {
                PushNotifications.removeAllListeners();
            }
            cleanupPromise.then(unsub => unsub && unsub());
        };
    }, [webFcmToken]); // webFcmToken이 바뀔 때마다 다시 실행하여 반영 가능하게 함

    return null;
}