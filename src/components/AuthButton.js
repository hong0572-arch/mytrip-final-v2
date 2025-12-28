'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // 👈 페이지 이동용 훅 추가
import { auth, db } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { User, LogIn } from 'lucide-react'; // 아이콘 추가

export default function AuthButton() {
    const [user, setUser] = useState(null);
    const router = useRouter(); // 이동 도구

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                checkUserWallet(currentUser);
            }
        });
        return () => unsubscribe();
    }, []);

    // 💰 지갑 확인 및 생성 (1000P 지급 로직 포함)
    const checkUserWallet = async (user) => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            await setDoc(userRef, {
                email: user.email,
                name: user.displayName,
                photo: user.photoURL,
                points: 1000, // 가입 축하금
                createdAt: new Date()
            });
            // 신규 가입 시 알림은 선택 사항 (너무 자주 뜨면 귀찮으니 제거하거나 유지)
        }
    };

    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            if (error.code === 'auth/popup-closed-by-user') {
                console.log("창 닫음");
                return;
            }
            console.error("로그인 에러:", error);
        }
    };

    // ✅ 로그인 상태일 때 보여줄 버튼 (마이페이지 이동)
    if (user) {
        return (
            <button
                onClick={() => router.push('/mypage')} // 👈 클릭 시 마이페이지로 이동!
                className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-indigo-100 pr-4 pl-1 py-1 rounded-full shadow-md hover:bg-indigo-50 transition-all group"
            >
                {/* 프로필 사진 */}
                {user.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-8 h-8 rounded-full border border-gray-200"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <User size={16} />
                    </div>
                )}

                <div className="flex flex-col items-start">
                    <span className="text-xs font-bold text-gray-700 leading-none group-hover:text-indigo-600">
                        {user.displayName}님
                    </span>
                    <span className="text-[10px] text-indigo-500 font-bold leading-none mt-0.5">
                        MY PAGE &gt;
                    </span>
                </div>
            </button>
        );
    }

    // ❌ 비로그인 상태일 때 보여줄 버튼 (로그인)
    return (
        <button
            onClick={handleLogin}
            className="flex items-center gap-2 bg-white text-gray-800 px-4 py-2 rounded-full font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm"
        >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" alt="Google" />
            로그인
        </button>
    );
}