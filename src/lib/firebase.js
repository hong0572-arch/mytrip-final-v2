// src/lib/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // 👈 1. 로그인 기능 가져오기

const firebaseConfig = {
    apiKey: "AIzaSyBlHvrHszUSCMBFx_w3rWvVNMFQ1oS7Ts0",
    authDomain: "my-trip-pro.firebaseapp.com",
    projectId: "my-trip-pro",
    storageBucket: "my-trip-pro.firebasestorage.app",
    messagingSenderId: "817442711390",
    appId: "1:817442711390:web:6e87b891e133195dad11cf",
    measurementId: "G-6DM3M8E0C4"
};

// Firebase 초기화 (Next.js에서 새로고침 시 에러 방지 코드 추가)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// DB 도구 내보내기
export const db = getFirestore(app);

// 2. 로그인 도구 내보내기 (추가됨)
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();