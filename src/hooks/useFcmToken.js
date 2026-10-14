import { useEffect, useState } from 'react';
import { webPushToken } from '../lib/push';

// 웹 푸시 토큰. 알림 권한은 여기서 묻지 않는다 — 이미 허용된 기기만 토큰을 새로 받아 저장한다.
// (권한 요청은 '출발 알림 받기' 같은 버튼에서 lib/push.js enableTripAlerts가 한다)
export default function useFcmToken() {
    const [token, setToken] = useState('');
    const [notificationPermission, setNotificationPermission] = useState('');

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                if (typeof window === 'undefined' || !('Notification' in window)) return;
                if (alive) setNotificationPermission(Notification.permission);
                const current = await webPushToken();
                if (!current || !alive) return;
                setToken(current);
                // 앱이 열려 있을 때 온 알림도 보여 준다
                const { getMessaging, onMessage } = await import('firebase/messaging');
                onMessage(getMessaging(), (payload) => {
                    if (Notification.permission !== 'granted' || !payload.notification) return;
                    new Notification(payload.notification.title, { body: payload.notification.body, icon: '/icon-192.png', data: payload.fcmOptions || payload.data });
                });
            } catch (error) {
                console.warn('FCM 토큰 확보 중단:', error?.message);
            }
        })();
        return () => { alive = false; };
    }, []);

    return { token, notificationPermission };
}
