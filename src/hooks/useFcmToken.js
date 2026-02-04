import { useEffect, useState } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { firebaseConfig } from '../lib/firebase'; // firebase config가 export 안되어 있다면 직접 입력하거나 구조 조정 필요

export default function useFcmToken() {
    const [token, setToken] = useState('');
    const [notificationPermission, setNotificationPermission] = useState('');

    useEffect(() => {
        const retrieveToken = async () => {
            try {
                if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                    const messaging = getMessaging();

                    // 1. 권한 요청
                    const permission = await Notification.requestPermission();
                    setNotificationPermission(permission);

                    if (permission === 'granted') {
                        // 2. 토큰 가져오기
                        const currentToken = await getToken(messaging, {
                            vapidKey: 'BGbHmsiKlsaSkfEQiOYQz5R17r6DLgykoKNq22WE8CDRzG1BF8OFI09U21SiFS363Q7X4XtXKqdw_XfPxfZrrHk'
                        });

                        if (currentToken) {
                            setToken(currentToken);
                            console.log('FCM Token:', currentToken);
                            // TODO: 이 토큰을 서버(Firestore users 컬렉션 등)에 저장해야 나중에 알림을 보낼 수 있습니다.
                        } else {
                            console.log('토큰을 가져올 수 없습니다.');
                        }
                    }
                }
            } catch (error) {
                console.error('토큰 가져오기 실패:', error);
            }
        };

        retrieveToken();
    }, []);

    return { token, notificationPermission };
}