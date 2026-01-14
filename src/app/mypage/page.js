'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, orderBy, deleteDoc } from "firebase/firestore";
import { User, Coins, Map, Calendar, LogOut, ChevronRight, BrainCircuit, X, History, Sparkles, Share2, Copy, Ticket, Gift, Trophy, Home, Trash2 } from 'lucide-react';
import TravelQuiz from '../../components/TravelQuiz';

export default function MyPage() {
    const router = useRouter();

    // --- 상태 관리 ---
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [itineraries, setItineraries] = useState([]);
    const [pointHistory, setPointHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- 팝업 & 퀴즈 상태 ---
    const [showHistory, setShowHistory] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);
    const [aiQuizData, setAiQuizData] = useState(null);
    const [quizLoading, setQuizLoading] = useState(false);

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
            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                setUserData(userSnap.data());
            }

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

    // 일정 삭제 핸들러 (기존 기능 유지)
    const handleDeleteTrip = async (e, tripId, destination) => {
        e.stopPropagation();

        if (!confirm(`'${destination}' 여행 일정을 정말 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`)) return;

        try {
            await deleteDoc(doc(db, "users", user.uid, "itineraries", tripId));
            setItineraries(prev => prev.filter(item => item.id !== tripId));
            alert("여행 일정이 삭제되었습니다.");
        } catch (error) {
            console.error("삭제 실패:", error);
            alert("삭제 중 오류가 발생했습니다.");
        }
    };

    const handleShareLink = () => {
        if (!user) return;
        const baseUrl = window.location.origin;
        const link = `${baseUrl}?ref=${user.uid}`;

        if (navigator.share) {
            navigator.share({
                title: '친구야, 여행 가자! ✈️',
                text: 'AI가 짜주는 초개인화 여행! 지금 가입하고 1,000P 받으세요.',
                url: link,
            }).catch((err) => console.log('공유 취소됨', err));
        } else {
            navigator.clipboard.writeText(link);
            alert("🔗 초대 링크가 복사되었습니다!\n친구에게 붙여넣기(Ctrl+V)해서 보내세요.");
        }
    };

    const handleStartQuiz = async () => {
        if (itineraries.length === 0) {
            alert("아직 생성된 여행 일정이 없습니다!\n먼저 여행을 만들고 퀴즈에 도전하세요.");
            router.push('/');
            return;
        }
        const lastTrip = itineraries[0];
        const destination = lastTrip.destination;

        setQuizLoading(true);
        setShowQuiz(true);

        try {
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
            alert("퀴즈를 불러오는 중 문제가 발생했습니다.");
            setShowQuiz(false);
        } finally {
            setQuizLoading(false);
        }
    };

    const handleLogout = async () => {
        if (!confirm("로그아웃 하시겠습니까?")) return;
        await auth.signOut();
        router.push('/');
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

    return (
        <div className="min-h-screen bg-[#F8F9FD] p-4 md:p-8 font-sans pb-24 relative">
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-100/50 to-transparent -z-10" />

            <div className="max-w-4xl mx-auto space-y-8">

                {/* 1. 상단 프로필 영역 */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* 왼쪽: 프로필 정보 */}
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg">
                                <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center border-2 border-white">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl font-black text-indigo-600">{user?.displayName?.[0]}</span>
                                    )}
                                </div>
                            </div>
                            <span className="absolute -bottom-1 -right-1 bg-white text-xs font-bold px-2 py-1 rounded-full shadow-md border border-gray-100 flex items-center gap-1">
                                <Trophy size={12} className="text-yellow-500" /> LV.1
                            </span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                                {user?.displayName}님 <span className="text-xl">👋</span>
                            </h2>
                            <p className="text-gray-500 text-sm font-medium mt-1">{user?.email}</p>
                        </div>
                    </div>

                    {/* ✨ 오른쪽: 액션 버튼 그룹 (홈, 퀴즈, 로그아웃) */}
                    <div className="flex gap-3 w-full md:w-auto">

                        {/* 🏠 [이동 완료] 홈 버튼 (A 위치) */}
                        <button
                            onClick={() => router.push('/')}
                            className="flex-1 md:flex-none px-5 py-3 bg-white border border-gray-200 rounded-2xl text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition flex items-center justify-center gap-2 font-bold shadow-sm"
                        >
                            <Home size={18} />
                            <span className="hidden sm:inline">홈</span>
                        </button>

                        {/* 퀴즈 버튼 */}
                        <button
                            onClick={handleStartQuiz}
                            className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <BrainCircuit size={18} />
                            퀴즈 도전
                        </button>

                        {/* 로그아웃 버튼 */}
                        <button
                            onClick={handleLogout}
                            className="flex-1 md:flex-none px-5 py-3 bg-white border border-gray-200 rounded-2xl text-gray-500 hover:bg-gray-50 hover:text-red-500 transition flex items-center justify-center gap-2 font-bold shadow-sm"
                            title="로그아웃"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                {/* 2. 대시보드 그리드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* 포인트 카드 */}
                    <div
                        onClick={() => setShowHistory(true)}
                        className="relative bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#d946ef] rounded-[32px] p-8 text-white shadow-xl shadow-indigo-200 overflow-hidden cursor-pointer group hover:scale-[1.01] transition-all duration-300"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:opacity-10 transition-opacity"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                                    <Coins size={24} className="text-white" />
                                </div>
                                <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-1 group-hover:bg-white/30 transition-colors">
                                    내역 보기 <ChevronRight size={12} />
                                </span>
                            </div>
                            <p className="text-indigo-100 text-sm font-medium mb-1">현재 보유 포인트</p>
                            <h3 className="text-5xl font-black tracking-tight">
                                {userData?.points?.toLocaleString() || 0}
                            </h3>
                        </div>
                    </div>

                    {/* 퀴즈 카드 */}
                    <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-lg shadow-gray-100 relative overflow-hidden flex flex-col justify-between group hover:border-indigo-100 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                <Sparkles size={24} />
                            </div>
                            <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">매일 초기화</span>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm font-bold mb-1">오늘의 퀴즈 기회</p>
                            <div className="flex items-end gap-2">
                                <h3 className="text-4xl font-black text-gray-800">
                                    {userData?.quizStats?.count || 0} <span className="text-gray-300 text-2xl">/</span> 2
                                </h3>
                                <span className="text-sm text-gray-500 font-medium mb-1.5">회</span>
                            </div>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full mt-4 overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                style={{ width: `${((userData?.quizStats?.count || 0) / 2) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* 3. 친구 초대 카드 */}
                <div className="bg-gradient-to-r from-rose-500 via-orange-400 to-amber-500 rounded-[32px] p-1 shadow-lg shadow-orange-200">
                    <div className="bg-white/10 backdrop-blur-sm rounded-[28px] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white relative overflow-hidden">
                        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-yellow-300 blur-[60px] opacity-30 animate-pulse"></div>
                        <div className="relative z-10 text-center md:text-left">
                            <h3 className="text-2xl font-black flex items-center justify-center md:justify-start gap-2 mb-2">
                                <Gift className="animate-bounce" /> 친구 초대 이벤트
                            </h3>
                            <p className="text-white/90 font-medium leading-relaxed">
                                친구에게 여행의 설렘을 선물하세요!<br />
                                가입 시 두 분 모두에게 <span className="bg-white text-rose-500 px-1.5 py-0.5 rounded font-black">1,000 P</span>를 드립니다.
                            </p>
                        </div>
                        <button
                            onClick={handleShareLink}
                            className="relative z-10 w-full md:w-auto bg-white text-rose-600 px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-gray-50 transition shadow-xl active:scale-95 group"
                        >
                            <Copy size={18} className="group-hover:rotate-12 transition-transform" />
                            링크 복사하기
                        </button>
                    </div>
                </div>

                {/* 4. 내 여행 보관함 (삭제 기능 포함) */}
                <div>
                    <div className="flex justify-between items-center mb-6 px-2">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Ticket size={24} className="text-indigo-500" />
                            내 여행 티켓
                        </h3>
                        <span className="text-xs bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-500 font-bold shadow-sm">
                            {itineraries.length} Trips
                        </span>
                    </div>

                    {itineraries.length === 0 ? (
                        <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center flex flex-col items-center justify-center text-gray-400 group hover:border-indigo-200 transition-colors">
                            <Map size={48} className="mb-4 text-gray-200 group-hover:text-indigo-200 transition-colors" />
                            <p className="font-medium mb-4">아직 떠날 여행이 없네요!</p>
                            <button
                                onClick={() => router.push('/')}
                                className="text-indigo-600 font-bold hover:underline bg-indigo-50 px-4 py-2 rounded-xl"
                            >
                                + 첫 여행 계획하기
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {itineraries.map((trip) => (
                                <div
                                    key={trip.id}
                                    onClick={() => router.push(`/trip/${trip.id}`)}
                                    className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    {/* ✨ 일정 삭제 버튼 */}
                                    <button
                                        onClick={(e) => handleDeleteTrip(e, trip.id, trip.destination)}
                                        className="absolute top-4 right-4 z-20 p-2 bg-gray-50 rounded-full text-gray-400 hover:bg-rose-100 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                        title="일정 삭제"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div>
                                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md mb-2 inline-block">
                                                D-{Math.floor((new Date() - new Date(trip.createdAt?.seconds * 1000)) / (1000 * 60 * 60 * 24)) * -1 > 0 ? Math.floor((new Date() - new Date(trip.createdAt?.seconds * 1000)) / (1000 * 60 * 60 * 24)) * -1 : "Day"}
                                            </span>
                                            <h4 className="font-black text-xl text-gray-800 group-hover:text-indigo-600 transition-colors">
                                                {trip.destination}
                                            </h4>
                                            <p className="text-xs text-gray-400 mt-1 font-medium">
                                                {new Date(trip.createdAt?.seconds * 1000).toLocaleDateString()} 생성됨
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                                            <Calendar size={12} />
                                            {trip.duration || "기간 미정"}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                                            <User size={12} />
                                            {trip.people || 1}명
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* 하단 모달들 (포인트, 퀴즈) */}
            {showHistory && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl animate-slide-up sm:animate-zoom-in">
                        <button onClick={() => setShowHistory(false)} className="absolute top-5 right-5 p-2 bg-gray-100 rounded-full text-gray-400 hover:bg-gray-200 transition"><X size={20} /></button>

                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><History size={20} /></div>
                            포인트 적립/사용 내역
                        </h3>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                            {pointHistory.length === 0 ? (
                                <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                                    <Sparkles size={32} className="mb-2 opacity-20" />
                                    아직 포인트 내역이 없어요.
                                </div>
                            ) : (
                                pointHistory.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-indigo-50 transition-colors">
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">{item.desc || "포인트 적립"}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : "-"}
                                            </p>
                                        </div>
                                        <span className="text-indigo-600 font-black text-lg">+{item.amount}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showQuiz && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-md">
                        <button
                            onClick={() => setShowQuiz(false)}
                            className="absolute -top-12 right-0 text-white/80 hover:text-white flex items-center gap-2 font-bold bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm"
                        >
                            닫기 <X size={20} />
                        </button>

                        {quizLoading ? (
                            <div className="bg-white rounded-[32px] p-12 text-center shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50 to-pink-50 opacity-50" />
                                <div className="relative z-10">
                                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                        <Sparkles className="text-indigo-600 animate-spin-slow" size={40} />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">AI가 퀴즈 생성 중...</h3>
                                    <p className="text-gray-500 font-medium">
                                        {itineraries[0]?.destination} 여행 꿀팁을 모으고 있어요! ⚡
                                    </p>
                                </div>
                            </div>
                        ) : (
                            aiQuizData && <TravelQuiz aiQuizData={aiQuizData} />
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}