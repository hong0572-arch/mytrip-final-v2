// src/app/trip/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, auth } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import AIResult from "../../../components/AIResult"; // 우리가 만든 그 멋진 결과 화면 재사용!

export default function TripDetail() {
    const params = useParams(); // URL에서 [id] 가져오기
    const router = useRouter();
    const [tripData, setTripData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        // 1. 로그인 체크
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                alert("로그인이 필요한 페이지입니다.");
                router.push('/');
                return;
            }
            setUser(currentUser);
            fetchTrip(currentUser.uid, params.id);
        });
        return () => unsubscribe();
    }, [params.id]);

    // 2. DB에서 여행 데이터 가져오기
    const fetchTrip = async (uid, tripId) => {
        try {
            const docRef = doc(db, "users", uid, "itineraries", tripId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setTripData(docSnap.data());
            } else {
                alert("삭제되거나 존재하지 않는 여행입니다.");
                router.push('/mypage');
            }
        } catch (error) {
            console.error("데이터 로딩 실패:", error);
            alert("여행 정보를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex justify-center items-center text-gray-500">일정을 불러오는 중입니다... ✈️</div>;
    if (!tripData) return null;

    // 3. AIResult 컴포넌트에 데이터 주입 (재사용의 마법 ✨)
    return (
        <AIResult
            data={tripData} // 저장된 일정 데이터
            userInfo={tripData} // 저장된 사용자 입력 정보
            tripId={params.id} // DB 문서 ID (수정 시 필요)
        />
    );
}