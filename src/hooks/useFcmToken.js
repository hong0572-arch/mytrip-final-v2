import { useEffect, useState } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';

export default function useFcmToken() {
    const [token, setToken] = useState('');
    const [notificationPermission, setNotificationPermission] = useState('');

    useEffect(() => {
        const retrieveToken = async () => {
            try {
                // 🛡️ 1단계: 환경 체크 (window, navigator, 그리고 가장 중요한 Notification 객체 확인)
                const isBrowser = typeof window !== 'undefined';
                const hasSW = isBrowser && 'serviceWorker' in navigator;
                const hasNotification = isBrowser && 'Notification' in window; // 👈 여기가 핵심!

                // 앱(웹뷰) 환경이거나 알림을 지원하지 않으면 조용히 종료
                if (!isBrowser || !hasSW || !hasNotification) {
                    console.log('⚠️ 알림을 지원하지 않는 환경(앱 또는 구형 브라우저)입니다. FCM 스킵.');
                    return;
                }

                const messaging = getMessaging();

                // 🛡️ 2단계: 권한 확인 및 요청 (단, 세션당 1회만 요청하여 중복 팝업 방지)
                let permission = Notification.permission;
                
                if (permission === 'default') {
                    const hasPrompted = sessionStorage.getItem('fcmPrompted');
                    if (!hasPrompted) {
                        sessionStorage.setItem('fcmPrompted', 'true');
                        permission = await Notification.requestPermission();
                    }
                }
                
                setNotificationPermission(permission);

                if (permission === 'granted') {
                    // 3. 토큰 가져오기
                    const currentToken = await getToken(messaging, {
                        vapidKey: 'BGbHmsiKlsaSkfEQiOYQz5R17r6DLgykoKNq22WE8CDRzG1BF8OFI09U21SiFS363Q7X4XtXKqdw_XfPxfZrrHk'
                    });

                    if (currentToken) {
                        setToken(currentToken);
                        console.log('✅ FCM Token:', currentToken);
                    } else {
                        console.log('토큰을 가져올 수 없습니다.');
                    }
                }
            } catch (error) {
                // 여기서 에러가 나도 앱 전체가 멈추지 않도록 관리
                console.warn('FCM 토큰 확보 중단:', error.message);
            }
        };

        retrieveToken();
    }, []);

    return { token, notificationPermission };
}