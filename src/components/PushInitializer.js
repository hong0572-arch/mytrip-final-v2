'use client';

import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications'; // 👈 로컬 알림 추가
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function PushInitializer() {
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
            if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()) {

                console.log("🚀 네이티브 통합 기능 초기화 시작");

                try {
                    // 1. 구글 로그인 엔진 예열
                    await GoogleAuth.initialize({
                        clientId: '817442711390-3l23qcluqvqdfpr7jadmjfutrfe0q7b4.apps.googleusercontent.com',
                        scopes: ['profile', 'email'],
                        grantOfflineAccess: true,
                    });

                    // 2. 알림 권한 통합 요청 (푸시 & 로컬)
                    await PushNotifications.requestPermissions();
                    await LocalNotifications.requestPermissions();

                    await PushNotifications.register();

                    // 3. [컴백 알림 설정] 기존 21일 뒤 예약된 알림이 있다면 취소하고 새로 예약
                    // 유저가 앱을 켤 때마다 이 알림은 다시 21일 뒤로 미뤄집니다.
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
                                schedule: { at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21) }, // 21일 뒤
                                sound: 'beep.wav'
                            }
                        ]
                    });

                    // 4. 푸시 리스너 설정
                    PushNotifications.addListener('registration', (token) => {
                        window._fcmToken = token.value;
                    });

                } catch (err) {
                    console.error("❌ 초기화 에러:", err);
                }

                // 5. 인증 상태 감시 및 환영 알림/데이터 업데이트
                const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        try {
                            const userRef = doc(db, "users", user.uid);
                            const userSnap = await getDoc(userRef);

                            const updateData = {
                                lastActive: serverTimestamp(),
                                updatedAt: serverTimestamp()
                            };

                            if (window._fcmToken) {
                                updateData.fcmToken = window._fcmToken;
                            }

                            // [최초 로그인 환영 알림] Firestore에 기록이 없을 때만 발송
                            if (userSnap.exists() && !userSnap.data().isWelcomeSent) {
                                await LocalNotifications.schedule({
                                    notifications: [
                                        {
                                            title: `반가워요, ${userSnap.data().name || '여행자'}님! ✨`,
                                            body: "트립메이커 '냥 프로'와 함께 설레는 여행을 시작해봐요!",
                                            id: 1,
                                            schedule: { at: new Date(Date.now() + 1000) } // 1초 뒤 즉시
                                        }
                                    ]
                                });
                                updateData.isWelcomeSent = true; // 다시 안 뜨게 플래그 저장
                            }

                            await setDoc(userRef, updateData, { merge: true });
                            console.log("✅ 접속 기록 및 알림 설정 완료");

                        } catch (e) {
                            console.error("❌ DB 업데이트 실패:", e);
                        }
                    }
                });

                return unsubscribeAuth;
            }
        };

        const cleanupPromise = initNativeFeatures();

        return () => {
            if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()) {
                PushNotifications.removeAllListeners();
                cleanupPromise.then(unsub => unsub && unsub());
            }
        };
    }, []);

    return null;
}