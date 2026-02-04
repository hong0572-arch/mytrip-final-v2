'use client';

import { useState, useEffect, use } from 'react';
import { db } from '../../../lib/firebase';
import { doc, getDoc, collectionGroup, query, where, getDocs } from 'firebase/firestore';
import AIResult from '../../../components/AIResult';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SharePage({ params }) {
    const { id } = use(params); // Next.js 15: params 언랩핑

    const [tripData, setTripData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const fetchTripData = async () => {
            const tripId = id;
            setLoading(true);

            try {
                // 1️⃣ [1순위] rectrips (링크형 추천 여행) 확인
                let docRef = doc(db, "rectrips", tripId);
                let docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // ✨ 링크된 여행(tripPath)이라면 -> 원본 데이터를 가져옴
                    if (data.tripPath) {
                        const originalRef = doc(db, data.tripPath);
                        const originalSnap = await getDoc(originalRef);
                        if (originalSnap.exists()) {
                            // 원본 데이터 + 추천 메타데이터 합체
                            setTripData({ id: tripId, ...originalSnap.data(), ...data });
                            setLoading(false);
                            return;
                        }
                    }
                    // 링크 없으면 그냥 rectrips 데이터 표시
                    setTripData({ id: tripId, ...data });
                    setLoading(false);
                    return;
                }

                // 2️⃣ [2순위] recommended_trips (구버전 추천) 확인
                docRef = doc(db, "recommended_trips", tripId);
                docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTripData({ id: tripId, ...docSnap.data() });
                    setLoading(false);
                    return;
                }

                // 3️⃣ [3순위] trips (엑셀 업로드) 확인
                docRef = doc(db, "trips", tripId);
                docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setTripData({ id: tripId, ...docSnap.data() });
                    setLoading(false);
                    return;
                }

                // 4️⃣ [4순위] 사용자 일정 등 기타 (찾지 못하면 에러)
                setError("여행 정보를 찾을 수 없습니다. (삭제되었거나 잘못된 링크)");

            } catch (err) {
                console.error("데이터 로딩 실패:", err);
                setError("데이터를 불러오는 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchTripData();
        }
    }, [id]);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <Loader2 className="animate-spin text-rose-500 mb-4" size={48} />
            <p className="text-gray-500 font-bold">여행 정보를 불러오는 중...</p>
        </div>
    );

    if (error || !tripData) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <AlertTriangle className="text-amber-500 mb-4" size={48} />
            <h1 className="text-xl font-bold text-gray-800 mb-2">오류 발생</h1>
            <p className="text-gray-600 mb-6 text-center">{error || "데이터가 없습니다."}</p>
            <button onClick={() => router.push('/')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
                홈으로 돌아가기
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* 🔴 [수정됨] 상단 네비게이션: 높이 축소 및 슬림화 */}
            <div className="bg-white sticky top-0 z-50 border-b px-3 py-2 flex items-center justify-between shadow-sm shrink-0 h-12">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-1 text-gray-600 font-bold hover:bg-gray-100 px-2 py-1.5 rounded-lg transition text-sm"
                >
                    <ArrowLeft size={18} /> 메인으로
                </button>
                <h1 className="font-bold text-base truncate max-w-[200px] text-gray-800">
                    {tripData.tripTitle || tripData.destination || "여행 일정"}
                </h1>
                <div className="w-16"></div> {/* 레이아웃 균형용 빈 공간 */}
            </div>

            {/* 🟢 [수정됨] 일정 결과 컴포넌트: 여백(Padding) 제거하여 꽉 차게 표시 */}
            <div className="max-w-3xl mx-auto w-full flex-1">
                <AIResult
                    data={tripData}
                    userInfo={{ contact: tripData.contactInfo }}
                    tripId={tripData.id}
                />
            </div>
        </div>
    );
}