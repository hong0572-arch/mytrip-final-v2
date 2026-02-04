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

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-192x192.png', // 아이콘 경로 확인
        badge: '/icon-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});