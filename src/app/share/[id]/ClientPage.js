'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import AIResult from "../../../components/AIResult";
import { Loader2, Home, Map } from 'lucide-react';

export default function ShareDetailPage() {
    const params = useParams();
    const router = useRouter();
    const shareId = params.id;

    const [tripData, setTripData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchSharedTrip = async () => {
            if (!shareId) return;
            try {
                // 1순위: 외부 공유용으로 저장된 shared_links 컬렉션 확인
                const docRef = doc(db, "shared_links", shareId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setTripData(docSnap.data());
                } else {
                    // 2순위: 혹시 워크스페이스(trips) ID로 바로 접근했을 경우를 대비해 trips 컬렉션도 확인
                    const tripRef = doc(db, "trips", shareId);
                    const tripSnap = await getDoc(tripRef);
                    if (tripSnap.exists()) {
                        setTripData(tripSnap.data());
                    } else {
                        setError(true);
                    }
                }
            } catch (err) {
                console.error("공유 데이터 로딩 에러:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchSharedTrip();
    }, [shareId]);

    // 1. 로딩 화면
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
                <Loader2 className="animate-spin mb-4 text-brand-primary" size={48} />
                <h2 className="text-xl font-bold animate-pulse">친구의 멋진 일정을 불러오는 중...</h2>
            </div>
        );
    }

    // 2. 에러 (없는 링크) 화면
    if (error || !tripData) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-6">
                <div className="bg-gray-800 p-8 rounded-3xl text-center max-w-sm w-full shadow-2xl">
                    <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                        <Map size={32} />
                    </div>
                    <h2 className="text-2xl font-black mb-2">일정을 찾을 수 없어요</h2>
                    <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                        유효하지 않은 링크이거나 만료된 일정입니다.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-4 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
                    >
                        <Home size={18} /> 나만의 여행 만들기
                    </button>
                </div>
            </div>
        );
    }

    // 3. 정상 화면 (뷰어 + 홈으로 가기 유도 버튼)
    return (
        <div className="relative w-full h-full bg-gray-100">
            {/* 바이럴 유도를 위한 홈 버튼 (왼쪽 상단) */}
            <div className="absolute top-6 left-6 z-50 pointer-events-auto sm:top-10 sm:left-10">
                <button
                    onClick={() => router.push('/')}
                    className="bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg text-brand-primary font-bold hover:bg-brand-primary/10 transition-colors flex items-center gap-2"
                >
                    <Home size={18} strokeWidth={2.5} />
                    <span className="text-sm">나도 AI로 여행 짜기</span>
                </button>
            </div>

            <AIResult
                data={tripData}
                userInfo={tripData}
                tripId={shareId}
            />
        </div>
    );
}
