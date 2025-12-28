'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from "../../lib/firebase"; // 경로는 프로젝트 설정에 따라 다를 수 있음 (@/lib/firebase 추천)
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { User, Coins, Map, Calendar, LogOut, ChevronRight, BrainCircuit, X, History, Sparkles } from 'lucide-react';
import TravelQuiz from '../../components/TravelQuiz';

export default function MyPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [itineraries, setItineraries] = useState([]);
    const [pointHistory, setPointHistory] = useState([]); // 🔥 진짜 기록
    const [loading, setLoading] = useState(true);

    // 팝업 및 퀴즈 상태
    const [showHistory, setShowHistory] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);
    const [aiQuizData, setAiQuizData] = useState(null); // AI가 만든 퀴즈 데이터
    const [quizLoading, setQuizLoading] = useState(false); // 퀴즈 생성 로딩 상태

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/');
                return;
            }
            setUser(currentUser);
            await fetchUserData(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const fetchUserData = async (currentUser) => {
        try {
            // 1. 유저 기본 정보
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                setUserData(userSnap.data());
            }

            // 2. 여행 일정 가져오기 (내 여행 보관함 - 최신순 정렬)
            const q = query(
                collection(db, "users", currentUser.uid, "itineraries"),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setItineraries(list);

            // 3. 🔥 포인트 기록 가져오기 (Real History - 최신순 정렬)
            const historyQ = query(
                collection(db, "users", currentUser.uid, "point_history"),
                orderBy("createdAt", "desc")
            );
            const historySnap = await getDocs(historyQ);
            const historyList = [];
            historySnap.forEach((doc) => {
                historyList.push({ id: doc.id, ...doc.data() });
            });
            setPointHistory(historyList);

        } catch (error) {
            console.error("데이터 로딩 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    // 🔥 AI 퀴즈 생성 함수 (최근 여행지 기반)
    const handleStartQuiz = async () => {
        // 1. 여행 일정이 없는 경우 차단
        if (itineraries.length === 0) {
            alert("아직 생성된 여행 일정이 없습니다!\n먼저 여행을 만들고 퀴즈에 도전하세요.");
            router.push('/');
            return;
        }

        // 가장 최근 여행지 가져오기
        const lastTrip = itineraries[0];
        const destination = lastTrip.destination;

        setQuizLoading(true);
        setShowQuiz(true); // 모달 열기

        try {
            // API 호출 (AI에게 퀴즈 생성 요청)
            const response = await fetch('/api/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destination })
            });
            const data = await response.json();

            if (data.result) {
                setAiQuizData(data.result);
            } else {
                throw new Error("퀴즈 생성 실패");
            }
        } catch (error) {
            console.error(error);
            alert("퀴즈를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
            setShowQuiz(false);
        } finally {
            setQuizLoading(false);
        }
    };

    const handleLogout = async () => {
        await auth.signOut();
        router.push('/');
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* 1. 상단 프로필 카드 */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="Profile" className="w-16 h-16 rounded-full border-2 border-indigo-100 shadow-sm" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                                <User size={32} />
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-1">
                                {user?.displayName}님
                            </h2>
                            <p className="text-gray-400 text-sm">{user?.email}</p>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={handleStartQuiz}
                            className="flex-1 md:flex-none bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-indigo-200 shadow-lg"
                        >
                            <BrainCircuit size={18} />
                            퀴즈 풀러 가기
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex-1 md:flex-none px-5 py-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition flex items-center justify-center gap-2 font-medium"
                        >
                            <LogOut size={18} /> 로그아웃
                        </button>
                    </div>
                </div>

                {/* 2. 정보 카드 (포인트 & 퀴즈) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* 💰 포인트 카드 (클릭 가능) */}
                    <div
                        onClick={() => setShowHistory(true)}
                        className="bg-gradient-to-br from-[#6366f1] to-[#a855f7] rounded-3xl p-8 text-white shadow-lg relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform group"
                    >
                        <div className="relative z-10">
                            <p className="text-indigo-100 text-sm font-medium mb-2 flex items-center gap-1">
                                내 보유 포인트 <ChevronRight size={14} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                            </p>
                            <h3 className="text-5xl font-extrabold flex items-baseline gap-2">
                                {userData?.points?.toLocaleString() || 0} <span className="text-2xl font-bold opacity-80">P</span>
                            </h3>
                        </div>
                        <Coins className="absolute right-6 bottom-6 text-white opacity-20 rotate-12 group-hover:rotate-45 transition-transform duration-500" size={80} />
                    </div>

                    {/* 🎮 퀴즈 현황 카드 */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-center">
                        <div className="relative z-10">
                            <p className="text-gray-400 text-sm font-medium mb-2">오늘의 퀴즈 기회</p>
                            <h3 className="text-4xl font-bold text-gray-800 flex items-center gap-2">
                                {userData?.quizStats?.count || 0} / 2 <span className="text-xl text-gray-400 font-medium">회 사용</span>
                            </h3>
                            <p className="text-xs text-indigo-500 mt-3 font-bold bg-indigo-50 inline-block px-2 py-1 rounded">
                                * 매일 자정 초기화됩니다.
                            </p>
                        </div>
                        <BrainCircuit className="absolute right-6 bottom-6 text-gray-100" size={80} />
                    </div>
                </div>

                {/* 3. 내 여행 보관함 */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm min-h-[400px]">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Map size={20} className="text-indigo-500" />
                            내 여행 보관함
                        </h3>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 font-bold">
                            총 {itineraries.length}개
                        </span>
                    </div>

                    <div className="p-6">
                        {itineraries.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                                <div className="bg-gray-50 p-4 rounded-full mb-4">
                                    <Map size={32} className="opacity-30" />
                                </div>
                                <p className="mb-4">아직 저장된 여행이 없어요.</p>
                                <button
                                    onClick={() => router.push('/')}
                                    className="text-indigo-600 font-bold hover:underline"
                                >
                                    + 첫 여행 만들러 가기
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {itineraries.map((trip) => (
                                    <div
                                        key={trip.id}
                                        onClick={() => router.push(`/trip/${trip.id}`)}
                                        className="border border-gray-200 rounded-2xl p-5 hover:border-indigo-500 hover:shadow-md transition cursor-pointer group bg-white"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-bold text-lg text-gray-800 group-hover:text-indigo-600 mb-1">
                                                    {trip.destination} 여행
                                                </h4>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(trip.createdAt?.seconds * 1000).toLocaleDateString()} 생성
                                                </p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition">
                                                <ChevronRight size={18} className="text-gray-400 group-hover:text-indigo-600" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                            <Calendar size={14} />
                                            {trip.duration || "기간 정보 없음"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* 🟢 [팝업 1] 진짜 포인트 히스토리 */}
            {showHistory && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
                        <button onClick={() => setShowHistory(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600"><X size={24} /></button>

                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <History className="text-indigo-500" /> 포인트 기록
                        </h3>

                        <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar px-1">
                            {pointHistory.length === 0 ? (
                                <div className="text-center text-gray-400 py-10">아직 적립 내역이 없습니다.</div>
                            ) : (
                                pointHistory.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                        <div>
                                            <p className="font-bold text-gray-700">{item.desc || "포인트 적립"}</p>
                                            <p className="text-xs text-gray-400">
                                                {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : "날짜 없음"}
                                            </p>
                                        </div>
                                        <span className="text-indigo-600 font-bold">+{item.amount} P</span>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                            <p className="text-sm text-gray-500">총 보유 포인트: <span className="font-bold text-indigo-600">{userData?.points?.toLocaleString()} P</span></p>
                        </div>
                    </div>
                </div>
            )}

            {/* 🟢 [팝업 2] 퀴즈 모달 (AI 생성 연동) */}
            {showQuiz && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="relative w-full max-w-md">
                        <button
                            onClick={() => setShowQuiz(false)}
                            className="absolute -top-12 right-0 text-white/80 hover:text-white flex items-center gap-1 font-bold"
                        >
                            닫기 <X size={24} />
                        </button>

                        {/* 로딩 중일 때 표시 */}
                        {quizLoading ? (
                            <div className="bg-white rounded-2xl p-10 text-center shadow-2xl">
                                <Sparkles className="animate-spin mx-auto text-indigo-500 mb-4" size={48} />
                                <h3 className="text-xl font-bold text-gray-800">AI가 퀴즈를 만들고 있어요!</h3>
                                <p className="text-gray-500 text-sm mt-2">
                                    {itineraries[0]?.destination ? `${itineraries[0].destination} 여행 지식 충전 중... ⚡` : "여행지 정보를 불러오는 중..."}
                                </p>
                            </div>
                        ) : (
                            /* 로딩 끝나면 퀴즈 컴포넌트 표시 */
                            aiQuizData && <TravelQuiz aiQuizData={aiQuizData} />
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}