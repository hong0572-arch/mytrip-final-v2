'use client';

import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Trash2, ExternalLink, RefreshCcw, Lock } from 'lucide-react';

export default function AdminPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState('');
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(false);

    // 🔐 로그인 처리
    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'hong0572!') { // 사장님이 정하신 비밀번호
            setIsLoggedIn(true);
            fetchTrips();
        } else {
            alert('비밀번호가 틀렸습니다!');
        }
    };

    // 📡 데이터 가져오기 (Firebase)
    const fetchTrips = async () => {
        setLoading(true);
        try {
            // 최신순 정렬
            const q = query(collection(db, "trips"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const list = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTrips(list);
        } catch (error) {
            console.error("Error fetching trips:", error);
            alert("데이터를 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // 🗑️ 삭제 처리
    const handleDelete = async (id) => {
        if (!confirm('정말 이 데이터를 삭제하시겠습니까?')) return;
        try {
            await deleteDoc(doc(db, "trips", id));
            // 화면에서도 바로 지우기
            setTrips(prev => prev.filter(trip => trip.id !== id));
            alert('삭제되었습니다.');
        } catch (error) {
            console.error("Delete error:", error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    // 날짜 포맷팅 함수
    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        // Firebase Timestamp를 JS Date로 변환
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('ko-KR', {
            month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    // --- 1. 로그인 전 화면 ---
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                    <div className="flex justify-center mb-6">
                        <div className="bg-rose-100 p-3 rounded-full">
                            <Lock className="text-[#FF5A5F]" size={24} />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-center mb-6 text-gray-800">관리자 접속</h2>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="비밀번호 입력"
                        className="w-full p-3 border border-gray-300 rounded-xl mb-4 focus:outline-none focus:border-[#FF5A5F]"
                        autoFocus
                    />
                    <button type="submit" className="w-full bg-[#FF5A5F] text-white py-3 rounded-xl font-bold hover:bg-[#FF3D43] transition">
                        접속하기
                    </button>
                </form>
            </div>
        );
    }

    // --- 2. 관리자 대시보드 화면 ---
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">

                {/* 헤더 */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">👑 고객 여행 관리</h1>
                        <p className="text-sm text-gray-500 mt-1">총 <span className="text-[#FF5A5F] font-bold">{trips.length}</span>건의 일정이 생성되었습니다.</p>
                    </div>
                    <button onClick={fetchTrips} className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium text-sm">
                        <RefreshCcw size={16} className={loading ? "animate-spin" : ""} /> 새로고침
                    </button>
                </div>

                {/* 테이블 (카드형 리스트) */}
                <div className="grid gap-4">
                    {trips.length === 0 ? (
                        <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-200">
                            아직 저장된 데이터가 없습니다.
                        </div>
                    ) : (
                        trips.map((trip) => (
                            <div key={trip.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-rose-200 transition">

                                {/* 왼쪽 정보 */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                                            {formatDate(trip.createdAt)}
                                        </span>
                                        {trip.isEdited && (
                                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md">
                                                수정됨✏️
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                                        {trip.tripTitle || "제목 없음"}
                                    </h3>

                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <span className="font-bold text-[#FF5A5F]">📞 {trip.contactInfo}</span>
                                        <span className="text-gray-300">|</span>
                                        <span>{trip.destination || "여행지 미상"}</span>
                                    </div>
                                </div>

                                {/* 오른쪽 버튼들 */}
                                <div className="flex items-center gap-3 shrink-0">
                                    <a
                                        href={`/share/${trip.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-xl hover:bg-blue-100 transition"
                                    >
                                        <ExternalLink size={14} /> 일정 보기
                                    </a>
                                    <button
                                        onClick={() => handleDelete(trip.id)}
                                        className="flex items-center gap-1 text-sm font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition"
                                    >
                                        <Trash2 size={14} /> 삭제
                                    </button>
                                </div>

                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
}