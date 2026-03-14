// src/lib/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";
import { getStorage } from "firebase/storage"; // ✨ 1. Storage 함수 임포트 추가

const firebaseConfig = {
    apiKey: "AIzaSyBlHvrHszUSCMBFx_w3rWvVNMFQ1oS7Ts0",
    authDomain: "my-trip-pro.firebaseapp.com",
    projectId: "my-trip-pro",
    storageBucket: "my-trip-pro.firebasestorage.app",
    messagingSenderId: "817442711390",
    appId: "1:817442711390:web:6e87b891e133195dad11cf",
    measurementId: "G-6DM3M8E0C4"
};

// 1. 앱 초기화 (중복 방지)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 2. 인증(Auth) 및 구글 로그인 프로바이더 설정
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// 3. Firestore 초기화 (✨ 중요: 앱 환경에서의 오프라인 에러 방지 설정)
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true, // 👈 웹뷰(Capacitor) 통신 안정성을 위한 핵심 설정
    useFetchStreams: false, // 👈 스트림 사용을 명시적으로 꺼서 안정성 확보
});

// ✨ 4. Storage(저장소) 초기화 (사진 업로드용)
const storage = getStorage(app);

// 5. 메시징(Messaging) 초기화 (브라우저 환경 체크)
let messaging = null;
if (typeof window !== "undefined" && "Notification" in window) { // 👈 Notification 존재 여부 체크 필수!
    isSupported().then((supported) => {
        if (supported) {
            messaging = getMessaging(app);
        }
    }).catch(err => console.log("Firebase Messaging not supported", err));
}

// ✨ 6. 외부에서 사용할 수 있도록 storage 추가 내보내기
export { auth, db, storage, messaging, googleProvider };