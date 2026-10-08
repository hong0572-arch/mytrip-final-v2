'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import TripDetail from "../../../components/trip/TripDetail";
import useAppLanguage from "../../../hooks/useAppLanguage";
import { Home, Map } from 'lucide-react';
import TimmyAvatar from '../../../components/TimmyAvatar';

export default function ShareDetailPage() {
    const params = useParams();
    const router = useRouter();
    const shareId = params.id;
    const [language] = useAppLanguage();

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
            <div className="min-h-dvh bg-tm-ground flex flex-col items-center justify-center gap-3 text-tm-ink font-sans">
                <TimmyAvatar size={64} ring className="tm-float" />
                <p className="text-[15px] font-semibold text-tm-muted" role="status">친구의 여행 일정을 불러오는 중…</p>
            </div>
        );
    }

    // 2. 에러 (없는 링크) 화면
    if (error || !tripData) {
        return (
            <div className="min-h-dvh bg-tm-ground flex flex-col items-center justify-center px-5 font-sans text-tm-ink">
                <div className="w-full max-w-sm rounded-[20px] bg-white p-7 text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-tm-sky-tint text-tm-navy">
                        <Map size={28} strokeWidth={1.8} />
                    </div>
                    <h1 className="mb-2 text-[22px] font-bold">일정을 찾을 수 없어요</h1>
                    <p className="mb-7 text-[14px] leading-relaxed text-tm-muted">링크가 잘못됐거나 공유가 끝난 일정이에요.</p>
                    <button
                        onClick={() => router.push('/')}
                        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-tm-navy text-[16px] font-bold text-white"
                    >
                        <Home size={18} /> 나만의 여행 만들기
                    </button>
                </div>
            </div>
        );
    }

    // 3. 정상 화면: 보기 전용 일정 상세('내 일정으로 저장하기'로 사본 저장)
    return (
        <TripDetail data={tripData} userInfo={tripData} mode="shared" language={language} onBack={() => router.push('/')} />
    );
}
