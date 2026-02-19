// src/lib/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // 👈 1. 로그인 기능 가져오기
// ✨ Messaging 추가
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyBlHvrHszUSCMBFx_w3rWvVNMFQ1oS7Ts0",
    authDomain: "my-trip-pro.firebaseapp.com",
    projectId: "my-trip-pro",
    storageBucket: "my-trip-pro.firebasestorage.app",
    messagingSenderId: "817442711390",
    appId: "1:817442711390:web:6e87b891e133195dad11cf",
    measurementId: "G-6DM3M8E0C4"
};

// 앱 초기화
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// ✨ 메시징 초기화 (브라우저 환경에서만 동작하도록 처리)
let messaging = null;
if (typeof window !== "undefined") {
    isSupported().then((isSupported) => {
        if (isSupported) {
            messaging = getMessaging(app);
        }
    });
}

export { auth, db, messaging };