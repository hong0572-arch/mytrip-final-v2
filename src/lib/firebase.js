// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBlHvrHszUSCMBFx_w3rWvVNMFQ1oS7Ts0",
    authDomain: "my-trip-pro.firebaseapp.com",
    projectId: "my-trip-pro",
    storageBucket: "my-trip-pro.firebasestorage.app",
    messagingSenderId: "817442711390",
    appId: "1:817442711390:web:6e87b891e133195dad11cf",
    measurementId: "G-6DM3M8E0C4"
};

// Firebase 초기화 (앱 시작)
const app = initializeApp(firebaseConfig);

// DB 도구 내보내기 (다른 파일에서 쓸 수 있게)
export const db = getFirestore(app);