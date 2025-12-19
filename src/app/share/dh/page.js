// src/app/share/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import AIResult from '../../../components/AIResult';
import { useParams } from 'next/navigation'; // 주소창에서 ID 가져오기

export default function SharePage() {
    const { id } = useParams(); // URL의 [id] 부분 가져오기
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTrip() {
            if (!id) return;
            try {
                const docRef = doc(db, "trips", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setData(docSnap.data());
                } else {
                    alert("존재하지 않거나 삭제된 여행 일정입니다.");
                }
            } catch (e) {
                console.error("불러오기 실패:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchTrip();
    }, [id]);

    if (loading) return <div className="min-h-screen flex items-center justify-center">불러오는 중...</div>;
    if (!data) return <div className="min-h-screen flex items-center justify-center">데이터를 찾을 수 없습니다.</div>;

    // AIResult 컴포넌트 재사용 (저장된 데이터 표시)
    return <AIResult data={data} />;
}