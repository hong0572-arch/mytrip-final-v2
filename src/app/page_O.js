"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation'; // 라우터 추가
import DogMascot from '../components/DogMascot';
import VoiceSearchInput from '../components/VoiceSearchInput';

// ✅ 경로 문제 해결을 위해 절대 경로(@) 사용
import TravelQuiz from "../components/TravelQuiz";
import AIResult from "../components/AIResult";
// AuthButton 컴포넌트는 제거하고 직접 코드를 작성하여 디자인과 기능을 제어합니다.

import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Calendar, Wallet, User, Sparkles, Users, Compass, Heart, Baby, Briefcase, Crown, Download, X, Zap, Coins, CheckCircle, UserPlus, CreditCard, LogIn, LogOut } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from 'date-fns/locale';

// Firebase (친구 추천 로직용)
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";

// 배경 이미지 배열
const backgroundImages = [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1498855926480-d98e83099315?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1543107511-b0481b23c445?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop",
];

const tourOptions = [
    { id: '자유여행', label: '자유여행', desc: '내 맘대로 자유롭게' },
    { id: '소그룹', label: '소그룹 투어', desc: '우리끼리 편안하게' },
    { id: '패키지', label: '세미 패키지', desc: '핵심만 쏙쏙' },
];

const companionOptions = [
    { id: '혼자', label: '나홀로', icon: <User size={20} /> },
    { id: '연인', label: '연인', icon: <Heart size={20} /> },
    { id: '친구', label: '친구', icon: <Users size={20} /> },
    { id: '가족', label: '가족', icon: <Baby size={20} /> },
    { id: '비즈니스', label: '출장/워크샵', icon: <Briefcase size={20} /> },
];

export default function Home() {
    const router = useRouter();

    // --- 기능 관련 상태 ---
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [bgIndex, setBgIndex] = useState(0);
    const [dateRange, setDateRange] = useState([null, null]);
    const [startDate, endDate] = dateRange;
    const [isLuxury, setIsLuxury] = useState(false);
    const [user, setUser] = useState(null); // 로그인 유저 상태

    // --- 팝업 & PWA 관련 상태 ---
    const [showWelcome, setShowWelcome] = useState(true); // 기본값 true (팝업 뜸)
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    const [formData, setFormData] = useState({
        destination: "", startDate: "", endDate: "", companion: "연인",
        people: 2, budget: 100, hotelType: "호텔", tourType: "자유여행",
        themes: [], contact: "", request: "",
    });

    // --- 초기화 및 감지 (useEffect) ---
    useEffect(() => {
        // 1. 배경 슬라이드 타이머
        const timer = setInterval(() => {
            setBgIndex((prev) => (prev + 1) % backgroundImages.length);
        }, 5000);

        // 2. 앱 실행 모드 감지 (PWA) -> 앱이면 팝업 숨김
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        if (isStandalone) {
            setShowWelcome(false);
        }

        // 3. PWA 설치 이벤트 감지
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 4. 로그인 상태 감지
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        // 🔥 5. [친구 추천 핵심] URL에 추천인 코드(?ref=...)가 있는지 확인
        const params = new URLSearchParams(window.location.search);
        const refCode = params.get('ref');

        if (refCode) {
            // 추천인 코드가 있으면 브라우저에 저장 (로그인 시 사용)
            localStorage.setItem('referralCode', refCode);
            console.log("추천인 코드 감지됨:", refCode);
        }

        return () => {
            clearInterval(timer);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            unsubscribe();
        };
    }, []);

    // --- 핸들러 함수들 ---

    // 🔥 [핵심] 로그인 처리 및 친구 추천 보상 지급 로직
    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // DB에서 유저 확인
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            // 신규 가입일 경우에만 친구 추천 로직 실행
            if (!userSnap.exists()) {
                const referrerId = localStorage.getItem('referralCode'); // 저장된 추천인 ID
                let initialPoints = 0; // 신규 가입 기본 포인트

                // 유효한 추천인이 있는 경우
                if (referrerId && referrerId !== user.uid) {
                    try {
                        // A. 추천인에게 보상 지급 (+1000P)
                        const referrerRef = doc(db, "users", referrerId);
                        await updateDoc(referrerRef, {
                            points: increment(1000),
                            invitedCount: increment(1)
                        });

                        // B. 본인(신규가입자)에게 보상 지급 (+1000P)
                        initialPoints += 1000;

                        alert("🎉 친구 초대 이벤트!\n가입 축하 포인트 1,000P가 지급되었습니다!");
                        localStorage.removeItem('referralCode'); // 사용한 코드 삭제
                    } catch (e) {
                        console.error("추천 보상 지급 실패:", e);
                    }
                }

                // 유저 데이터 생성 (기본 가입 로직)
                await setDoc(userRef, {
                    email: user.email,
                    name: user.displayName,
                    photo: user.photoURL,
                    points: initialPoints,
                    createdAt: serverTimestamp(),
                    role: 'user'
                });
            }
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
    };

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setShowWelcome(false);
            }
        } else {
            alert("브라우저 메뉴(점 3개)에서 '앱 설치' 또는 '홈 화면에 추가'를 눌러주세요!");
        }
    };

    // --- 기존 입력 폼 핸들러 ---
    const toggleLuxuryMode = () => {
        const newMode = !isLuxury;
        setIsLuxury(newMode);
        setFormData(prev => ({ ...prev, hotelType: newMode ? "5성급 스위트룸/풀빌라" : "호텔" }));
    };
    const handleInputChange = (e) => { const { name, value } = e.target; setFormData({ ...formData, [name]: value }); };
    const handleDateChange = (update) => {
        setDateRange(update);
        const [start, end] = update;
        if (start && end) {
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 30) {
                alert("여행 기간은 최대 30일까지만 가능합니다.");
                setDateRange([start, null]);
                return;
            }
            const format = (d) => d.toISOString().split('T')[0];
            setFormData(prev => ({ ...prev, startDate: format(start), endDate: format(end) }));
        } else {
            setFormData(prev => ({ ...prev, startDate: start ? start.toISOString().split('T')[0] : "", endDate: "" }));
        }
    };
    const updatePeople = (delta) => { setFormData(prev => ({ ...prev, people: Math.max(1, Math.min(20, prev.people + delta)) })); };

    const generatePlan = async () => {
        if (!formData.destination) { alert("어디로 떠나시나요? 여행지를 입력해주세요!"); return; }
        if (!formData.startDate || !formData.endDate) { alert("여행 날짜를 달력에서 선택해주세요!"); return; }
        if (!formData.contact || formData.contact.trim().length < 2) { alert("연락처를 입력해주세요."); return; }

        setLoading(true);
        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, isLuxury: isLuxury }),
            });
            const data = await response.json();
            if (data.result) setResult(data.result);
            else alert("일정을 생성하지 못했습니다: " + (data.error || "오류 발생"));
        } catch (error) { console.error(error); alert("서버 오류가 발생했습니다."); }
        finally { setLoading(false); }
    };

    // 팝업 애니메이션 설정 (A: 움직이게 해줘)
    const popupVariants = {
        hidden: { opacity: 0, scale: 0.8, y: 50 },
        visible: {
            opacity: 1, scale: 1, y: 0,
            transition: { type: "spring", stiffness: 300, damping: 25 }
        },
        exit: { opacity: 0, scale: 0.8, y: 50, transition: { duration: 0.2 } }
    };

    if (result) return <AIResult data={result} userInfo={formData} />;




    return (
        <div className="h-screen w-full flex justify-center items-center bg-gray-900 sm:p-8 font-sans relative overflow-hidden">

            {/* 1. 배경 슬라이드 */}
            <div className="absolute inset-0 z-0">
                <AnimatePresence mode='wait'>
                    <motion.img key={bgIndex} src={backgroundImages[bgIndex]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0 w-full h-full object-cover" />
                </AnimatePresence>
                <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* 2. 메인 앱 컨테이너 */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[440px] h-full sm:h-[92vh] bg-white/95 backdrop-blur-md sm:rounded-[35px] shadow-2xl overflow-hidden relative flex flex-col z-10">

                {/* 🟢 헤더 (로고 유지 + ✨예뻐진 로그인/MY 버튼) */}
                <div className="px-6 pt-6 pb-2 shrink-0 flex justify-between items-center bg-white/50 backdrop-blur-sm z-20">
                    <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />

                    <div className="absolute top-4 right-4 z-50">
                        {user ? (
                            // ✨ 로그인 후: 세련된 프로필 아이콘 & MY 버튼
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center text-white font-bold">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{user.displayName ? user.displayName[0].toUpperCase() : <User size={18} />}</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => router.push('/mypage')}
                                    className="text-sm font-bold text-gray-700 hover:text-indigo-600 bg-white px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all"
                                >
                                    MY
                                </button>
                            </div>
                        ) : (
                            // ✨ 로그인 전: 오로라 그라데이션 로그인 버튼
                            <button
                                onClick={handleLogin}
                                className="group relative px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2"
                            >
                                <LogIn size={16} className="group-hover:rotate-12 transition-transform" />
                                <span>로그인</span>
                            </button>
                        )}
                    </div>

                </div>

                {/* 스크롤 영역 (기능 입력폼) */}
                <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-2 pb-36">

                    {/* ✨ 메인 타이틀 (그라데이션 효과 적용) */}
                    <div className="mb-10 mt-6">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                        >
                            <div className="flex flex-row items-center justify-between gap-2 mb-6">

                                <h2 className="text-4xl font-black leading-[1.15] tracking-tight">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-indigo-900 to-gray-800">
                                        검색은 이제 그만,
                                    </span>
                                    <br />
                                    <span className="relative inline-block mt-1">
                                        <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-[#FF5A5F] via-rose-500 to-amber-500">
                                            여행 시작은 여기!
                                        </span>
                                        <span className="absolute bottom-2 left-0 w-full h-3 bg-rose-100/60 -z-0 rounded-full"></span>
                                    </span>
                                </h2>


                                {/* 기존 스피너 대신 우리의 댕댕이 투입! */}
                                <DogMascot
                                    width={80}
                                    message="여기에요!"
                                />


                            </div>


                        </motion.div>




                    </div>

                    <div className="space-y-7">
                        {/* 여행지 */}
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative z-10">
                            <div className="mb-4 border-b border-gray-100 pb-4">
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-500 mb-2"><MapPin size={16} className="text-[#FF5A5F]" /> 어디로 가세요?</label>
                                <input type="text" name="destination" value={formData.destination} onChange={handleInputChange} placeholder="" className="w-full text-xl font-bold text-gray-800 placeholder-gray-300 outline-none bg-transparent" />
                                <VoiceSearchInput />
                            </div>
                            <div className="w-full">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-1"><Calendar size={14} /> 여행 일정</label>
                                <DatePicker selectsRange={true} startDate={startDate} endDate={endDate} onChange={handleDateChange} minDate={new Date()} locale={ko} dateFormat="yyyy.MM.dd" placeholderText="날짜 선택" className="w-full text-lg font-bold text-gray-800 bg-transparent outline-none cursor-pointer placeholder-gray-300" wrapperClassName="w-full" />
                            </div>
                        </div>

                        {/* 동행자 */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-3 px-1"><Users size={18} className="text-[#FF5A5F]" /> 동행자</label>
                            <div className="grid grid-cols-5 gap-2">{companionOptions.map((opt) => (<button key={opt.id} onClick={() => setFormData({ ...formData, companion: opt.id })} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all gap-1 ${formData.companion === opt.id ? 'bg-[#FF5A5F] text-white shadow-md scale-105 font-bold' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{opt.icon} <span className="text-[10px]">{opt.label}</span></button>))}</div>
                        </div>

                        {/* 스타일 */}
                        <div>
                            <div className="flex justify-between items-center mb-3 px-1"><label className="flex items-center gap-2 text-sm font-bold text-gray-600"><Compass size={18} className="text-[#FF5A5F]" /> 스타일</label></div>
                            <div className="grid grid-cols-3 gap-2 mb-3">{tourOptions.map((option) => (<button key={option.id} onClick={() => setFormData({ ...formData, tourType: option.id })} className={`py-3 px-2 rounded-2xl border transition-all flex flex-col items-center text-center ${formData.tourType === option.id ? 'bg-white border-[#FF5A5F] text-[#FF5A5F] shadow-lg shadow-rose-100 ring-1 ring-[#FF5A5F]' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}><span className="font-bold text-sm mb-1">{option.label}</span><span className="text-[10px] opacity-70 break-keep">{option.desc}</span></button>))}</div>
                            <button onClick={toggleLuxuryMode} className={`w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border ${isLuxury ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200" : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"}`}>{isLuxury ? <><Crown size={16} fill="white" /> 초호화 럭셔리 여행 ON</> : <><Crown size={16} /> 초호화 여행 가상 체험하기</>}</button>
                        </div>

                        {/* 예산 & 인원 */}
                        <div className={`p-5 rounded-3xl border relative z-0 transition-all duration-300 ${isLuxury ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100"}`}>
                            <div className="flex gap-6 items-center justify-between">
                                {isLuxury ? (<div className="flex-1 flex flex-col justify-center h-[52px]"><div className="flex items-center gap-2 text-amber-600 font-bold mb-1"><Sparkles size={16} /> VIP 전용 예산 적용</div><p className="text-xs text-gray-500">2,000만원 ~ 5,000만원 (AI 자동 최적화)</p></div>) : (<div className="flex-1 relative"><label className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><Wallet size={14} /> 1인 예산</label><div className="flex items-end gap-1 mb-2"><span className="text-xl font-bold text-[#FF5A5F]">{formData.budget.toLocaleString()}</span><span className="text-sm font-medium text-gray-500 mb-1">만원</span></div><input type="range" name="budget" min="50" max="1000" step="10" style={{ zIndex: 50 }} value={formData.budget} onChange={handleInputChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF5A5F] relative z-20 touch-action-none" /></div>)}
                                <div className="w-1px h-12 bg-gray-200"></div>
                                <div className="flex flex-col items-center min-w-[70px]"><label className="text-xs font-bold text-gray-500 mb-2">인원</label><div className="flex items-center gap-3"><button onClick={() => updatePeople(-1)} className="w-7 h-7 bg-white rounded-full shadow text-gray-500 font-bold hover:bg-gray-100">-</button><span className="font-bold text-gray-800">{formData.people}</span><button onClick={() => updatePeople(1)} className="w-7 h-7 bg-[#FF5A5F] rounded-full shadow text-white font-bold hover:bg-rose-600">+</button></div></div>
                            </div>
                        </div>

                        {/* 연락처 */}
                        <div className="space-y-3">
                            <div className="bg-white p-4 rounded-2xl border border-gray-200 focus-within:border-[#FF5A5F] transition-colors"><label className="text-xs font-bold text-gray-400 mb-1 block">연락처 (필수)</label><input type="text" name="contact" value={formData.contact} onChange={handleInputChange} placeholder="카톡ID / 인스타ID / 이메일" className="w-full text-sm font-medium outline-none text-gray-800" /></div>
                            <div className="bg-white p-4 rounded-2xl border border-gray-200 focus-within:border-[#FF5A5F] transition-colors"><label className="text-xs font-bold text-gray-400 mb-1 block">추가 요청사항</label><textarea name="request" value={formData.request} onChange={handleInputChange} placeholder="예: 해산물 알러지가 있어요 등" className="w-full text-sm font-medium outline-none text-gray-800 resize-none h-20" /></div>
                        </div>
                    </div>
                </div>

                {/* 하단 생성 버튼 */}
                <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white/95 to-transparent z-30">
                    <button onClick={generatePlan} disabled={loading} className={`w-full py-4 rounded-2xl font-bold text-xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${isLuxury ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-200 text-white" : "bg-gradient-to-r from-[#FF5A5F] to-[#FF3D43] shadow-rose-200 text-white hover:shadow-rose-400 hover:-translate-y-1"}`}>
                        {loading ? <><Sparkles className="animate-spin" size={24} /> {isLuxury ? "💎 VIP 일정 생성 중..." : "플랜 생성 중..."}</> : (isLuxury ? "💎 초호화 플랜 받기" : "✨ 무료로 여행 플랜 받기")}
                    </button>
                    <p className="text-center text-[10px] text-gray-400 mt-2">제출 시 개인정보 수집 및 이용에 동의하게 됩니다.</p>
                </div>

                {/* 🔥 3. 웰컴 & 앱 설치 팝업 (기존 디자인 유지 + Glassmorphism 적용) */}
                <AnimatePresence>
                    {showWelcome && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 bg-black/10 backdrop-blur-md flex items-end sm:items-center justify-center p-4 sm:p-6"
                        >
                            <motion.div
                                variants={popupVariants}
                                initial="hidden" animate="visible" exit="exit"
                                className="bg-white/85 backdrop-blur-xl border border-white/40 w-full max-w-lg rounded-[40px] p-6 shadow-2xl relative text-left"
                            >
                                <button onClick={() => setShowWelcome(false)} className="absolute top-6 right-6 text-gray-300 hover:text-gray-600 transition"><X size={24} /></button>

                                <div className="mb-4">
                                    <span className="inline-flex items-center gap-1 py-1 px-3 rounded-full bg-indigo-100 text-rose-500 text-s font-extrabold mb-3 animate-pulse">
                                        <Zap size={25} fill="currentColor" /> Mytrip.Pro 앱 출시
                                    </span>
                                    <h3 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-rose-600">여행 AI Agent</span>와<br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500">매일 매일 포인트</span>로<br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-rose-600">나만의 여행 시작!</span>
                                    </h3>
                                </div>

                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-start gap-3">
                                        <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 shrink-0"><Sparkles size={20} /></div>
                                        <div>
                                            <h3 className="font-bold text-base text-gray-900">순식간에 완성되는 완벽한 일정</h3>
                                            <p className="text-gray-500 text-sm">AI가 동선, 맛집, 숙소까지 단 3초 만에 제안합니다.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="bg-amber-100 p-2 rounded-xl text-amber-600 shrink-0"><Coins size={20} /></div>
                                        <div>
                                            <h3 className="font-bold text-base text-gray-900">매일 쌓이는 여행 지원금</h3>
                                            <p className="text-gray-500 text-sm">출석체크와 퀴즈 참여로 포인트를 모으세요.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="bg-rose-100 p-2 rounded-xl text-rose-600 shrink-0"><UserPlus size={20} /></div>
                                        <div>
                                            <h3 className="font-bold text-base text-gray-900">친구 초대 시 무제한 적립</h3>
                                            <p className="text-gray-500 text-sm">함께할 친구를 초대하고 포인트를 더 받으세요.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="bg-green-100 p-2 rounded-xl text-green-600 shrink-0"><CreditCard size={20} /></div>
                                        <div>
                                            <h3 className="font-bold text-base text-gray-900">포인트로 여행 상품 결제</h3>
                                            <p className="text-gray-500 text-sm">적립된 포인트는 현금처럼 사용 가능합니다. (준비 중)</p>
                                        </div>
                                    </li>
                                </ul>

                                <button
                                    onClick={handleInstallClick}
                                    className="w-full py-4 bg-gray-900 text-white rounded-full font-bold text-lg shadow-lg flex items-center justify-center gap-2 mb-3 hover:bg-black transition transform active:scale-95 relative overflow-hidden group"
                                >
                                    <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                                    <span className="relative flex items-center gap-2">
                                        <Download size={20} /> {deferredPrompt ? "앱 설치하고 모든 혜택 받기" : "앱 설치"}
                                    </span>
                                </button>

                                <button onClick={() => setShowWelcome(false)} className="w-full text-center text-gray-400 text-sm font-medium hover:text-gray-700 underline transition mt-2">
                                    괜찮습니다, 웹으로 그냥 이용할게요.
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </motion.div>





            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .react-datepicker { border: none !important; box-shadow: 0 10px 40px rgba(0,0,0,0.1); font-family: sans-serif; border-radius: 16px !important; }
                .react-datepicker__header { border-bottom: 1px solid #f0f0f0; border-top-left-radius: 16px !important; border-top-right-radius: 16px !important; background-color: white !important; padding-top: 10px; }
                .react-datepicker__day--selected, .react-datepicker__day--in-range { background-color: #FF5A5F !important; border-radius: 50%; color: white !important; }
                .react-datepicker__day:hover { background-color: #f0f0f0 !important; border-radius: 50%; }
                .react-datepicker__day-name { color: #aaa; font-weight: bold; width: 36px; }
                .react-datepicker__day { width: 36px; line-height: 36px; }
            `}</style>
        </div>
    );
}
