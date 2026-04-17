// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBlHvrHszUSCMBFx_w3rWvVNMFQ1oS7Ts0",
    authDomain: "my-trip-pro.firebaseapp.com",
    projectId: "my-trip-pro",
    storageBucket: "my-trip-pro.firebasestorage.app",
    messagingSenderId: "817442711390",
    appId: "1:817442711390:web:6e87b891e133195dad11cf",
    measurementId: "G-6DM3M8E0C4"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// 백그라운드 메시지 수신 처리
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // 파이어베이스 콘솔(알림 메시지)에서 보내면 브라우저가 자동으로 알림을 띄우므로
    // 여기서 중복으로 showNotification을 호출하면 알림이 2개 뜹니다.
    // 데이터(data)만 있는 백그라운드 메시지일 때만 수동으로 띄웁니다.
    if (!payload.notification) {
        const notificationTitle = payload.data?.title || 'Trip Maker AI';
        const notificationOptions = {
            body: payload.data?.body || '새로운 메시지가 도착했습니다.',
            icon: '/icon-192.png',
            badge: '/icon-192.png'
        };
        self.registration.showNotification(notificationTitle, notificationOptions);
    }
});