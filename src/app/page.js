"use client";

// --- 라이브러리 및 설정 Import ---
import { signIn, signOut, useSession } from "next-auth/react"; // Kakao Login용
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// 스플래시 및 훅
import SplashScreen from "../components/SplashScreen";
import useFcmToken from '../hooks/useFcmToken';

// 컴포넌트
import CatMascot from '../components/CatMascot';
import AIResult from "../components/AIResult";
import TravelNews from '../components/TravelNews';

// 아이콘 및 UI 라이브러리
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin, Calendar, Wallet, User, Sparkles, Users, Compass, Heart, Baby, Briefcase,
    Crown, Download, X, LogIn, Search, Mic, MessageSquare, ExternalLink, Bell, BellRing,
    RefreshCw, TrendingDown, Plane, CheckCircle, ArrowRight, Clock, ChevronRight,
    ArrowLeftRight, Trash2, Globe, Home as HomeIcon, Box
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ko, enUS } from 'date-fns/locale';

// Firebase
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth, db } from "../lib/firebase";
import {
    onAuthStateChanged, signInWithRedirect, signInWithPopup, getRedirectResult,
    GoogleAuthProvider, updateProfile, signInWithCredential, signInWithCustomToken
} from "firebase/auth";
import {
    doc, getDoc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp,
    collection, getDocs, addDoc, query, orderBy, onSnapshot, where
} from "firebase/firestore";

// --- 1. 상수 데이터 (제공해주신 모든 데이터 100% 유지) ---
const backgroundImages = [
    "/1.jpg",
    "/2.jpg",
    "/3.jpg",
    "/4.JPG",
];

const tourOptions = [
    { id: '자유여행', label: '자유여행', enLabel: 'Solo/Free', desc: '내 맘대로 자유롭게', enDesc: 'Travel at my own pace' },
    { id: '소그룹', label: '소그룹 투어', enLabel: 'Small Group', desc: '우리끼리 편안하게', enDesc: 'Cozy and comfortable' },
    { id: '패키지', label: '세미 패키지', enLabel: 'Semi-Package', desc: '핵심만 쏙쏙', enDesc: 'Core highlights only' },
];

const companionOptions = [
    { id: '혼자', label: '나홀로', enLabel: 'Solo', icon: <User size={20} /> },
    { id: '연인', label: '연인', enLabel: 'Couple', icon: <Heart size={20} /> },
    { id: '친구', label: '친구', enLabel: 'Friends', icon: <Users size={20} /> },
    { id: '가족', label: '가족', enLabel: 'Family', icon: <Baby size={20} /> },
    { id: '비즈니스', label: '출장', enLabel: 'Business', icon: <Briefcase size={20} /> },
];

const QUICK_TAGS = [
    "🌿 퇴사기념 멍때리기", "🍜 관광지 말고 찐맛집", "🙅‍♂️ 사람 많은 곳은 패스",
    "🚢 럭셔리 크루즈 여행", "🚶‍♂️ 계획없는 여유로운 산책", "👨‍👩‍👧‍👦 부모님 맞춤 효도여행", "🎒 돈 아끼는 짠내투어"
];

const QUICK_TAGS_EN = [
    "🌿 Post-resignation zoning out", "🍜 Local spots over tourist traps", "🙅‍♂️ Skip crowded places",
    "🚢 Luxury cruise trip", "🚶‍♂️ Plan-free relaxing stroll", "👨‍👩‍👧‍👦 Custom trip for parents", "🎒 Budget-saving penny-pincher tour"
];

const cleanTagText = (tag, lang) => {
    if (lang === 'en') {
        return tag.replace(/[^a-zA-Z\s]/g, '').trim();
    }
    return tag.replace(/[^가-힣\s]/g, '').trim();
};

const RECOMMENDED_TRIPS = [
    { id: 'rec-tokyo', city: "도쿄", enCity: "Tokyo", title: "🍱 도쿄 미식 & 쇼핑 투어", enTitle: "🍱 Tokyo Gourmet & Shopping Tour", img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=600&auto=format&fit=crop", desc: "도심 속 미식과 트렌디한 스트릿", enDesc: "Urban gourmet and trendy streets", isHot: true },
    { id: 'rec-bali', city: "발리", enCity: "Bali", title: "🌿 우붓 정글 휴양 & 요가", enTitle: "🌿 Ubud Jungle Retreat & Yoga", img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=600&auto=format&fit=crop", desc: "완벽한 휴식을 위한 지상낙원", enDesc: "A paradise for perfect relaxation", isPremium: true },
    { id: 'rec-zrh', city: "취리히", enCity: "Zurich", title: "🏔️ 만년설과 알프스 기차 여행", enTitle: "🏔️ Snow Caps & Alpine Train Tour", img: "https://images.unsplash.com/photo-1534067783941-51c9c23ecefd?q=80&w=600&auto=format&fit=crop", desc: "그림 같은 대자연 속으로", enDesc: "Into the picturesque nature", isPremium: true },
    { id: 'rec-hkg', city: "홍콩", enCity: "Hong Kong", title: "🏮 화려한 야경과 딤섬 투어", enTitle: "🏮 Stunning Night Views & Dim Sum Tour", img: "https://images.unsplash.com/photo-1506158669146-619067262a00?q=80&w=600&auto=format&fit=crop", desc: "동양의 진주, 잠들지 않는 도시", enDesc: "Pearl of the Orient, the city that never sleeps", isHot: true },
    { id: 'rec-han', city: "하노이", enCity: "Hanoi", title: "☕ 베트남 올드쿼터 산책", enTitle: "☕ Vietnam Old Quarter Stroll", img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=600&auto=format&fit=crop", desc: "진한 커피향과 정겨운 풍경", enDesc: "Rich coffee aroma and cozy streets" },
];

const translations = {
    ko: {
        title_pre: "Trip Maker,", title_main: '"냥 프로"', title_sub: "안전하고 편안한 여행",
        tab_schedule: "🗓️ 안심 여행", tab_flight: "실시간 항공권", tab_myflight: "✈️ 내 일정 항공권", tab_choices: "냥프로의 안심 추천!",
        label_where: "어디로 안심 여행을 떠날까요?", label_when: "언제 떠나세요?", placeholder_dest: "예: 혼자 조용히 쉬고 싶어 (음성 가능)", placeholder_date: "날짜 선택 (최대 30일)",
        label_companion: "동행자", label_budget: "1인 예산", label_people: "인원", label_contact: "연락처 (필수)", placeholder_contact: "카톡ID 또는 이메일",
        label_request: "추가 요청사항 (안전 등)", placeholder_request: "예: 여성 혼자 가기 안전한 곳으로 추천해주세요.",
        btn_generate: "✨ 여행 일정 만들기!", btn_luxury_off: "👑 럭셔리 여행 체험하기", btn_luxury_on: "💎 VIP 플랜 생성",
        msg_loading: "AI가 가장 안전한 여행을 설계하고 있어요...", msg_listening: "듣고 있어요...",
        label_style: "여행 스타일",
        region_auto: "🤖 AI 알아서", region_domestic: "🇰🇷 국내만", region_international: "✈️ 해외로", region_daytrip: "🌞 당일여행",
        btn_login: "로그인",
        modal_nickname_title: "닉네임 설정",
        modal_nickname_placeholder: "예: 냥프로123",
        modal_nickname_btn: "가입 완료 ✨",
        modal_login_title: "반가워요! 🐾",
        modal_login_desc: "어떤 방식으로 로그인을 도와드릴까요?\n지금 시작하면 1,000P를 드려요!",
        modal_login_kakao: "카카오로 계속하기",
        modal_login_google: "구글로 계속하기",
        modal_airport_title: "도착 공항 직접 입력",
        modal_airport_desc: "'{destination}' 공항을 입력해주세요.",
        modal_airport_placeholder: "예: 발리, DPS",
        modal_airport_error: "공항을 찾을 수 없습니다.",
        modal_airport_btn: "검색 및 적용",
        flight_title: "항공권",
        flight_btn_trip: "Trip.com 최저가",
        flight_btn_avia: "Aviasales 예약",
        flight_empty: "검색된 항공권이 없습니다.",
        flight_empty_btn: "공항 직접 검색하기",
        schedule_empty: "참여중인 일정이 없어요. 일정을 먼저 만들어보세요!",
        schedule_trip_suffix: "여행",
        schedule_departs: "출발",
        schedule_tbd: "날짜 미정"
    },
    en: {
        title_pre: "Trip Maker,", title_main: "Meow AI", title_sub: "Safe & Worry-free Trip",
        tab_schedule: "🗓️ Safe Trip", tab_flight: "Real-time Flights", tab_myflight: "✈️ Flights of my trips", tab_choices: "Meow Pro's Safe Picks!",
        label_where: "Where would you like to travel safely?", label_when: "When do you leave?", placeholder_dest: "e.g. Quiet rest in Kyoto", placeholder_date: "Select dates (Max 30 days)",
        label_companion: "Companion", label_budget: "Budget (per person)", label_people: "Travelers", label_contact: "Contact (Required)", placeholder_contact: "Email or Messenger ID",
        label_request: "Special Requests (Safety, etc.)", placeholder_request: "ex: Recommend safe places for solo female travelers.",
        btn_generate: "✨ Create my trip!", msg_loading: "AI is designing your safest trip...", msg_listening: "Listening...",
        btn_luxury_off: "👑 Try Luxury Mode", btn_luxury_on: "💎 Create VIP Plan",
        label_style: "Travel Style",
        region_auto: "🤖 AI Auto", region_domestic: "🇰🇷 Domestic", region_international: "✈️ International", region_daytrip: "🌞 Day Trip",
        btn_login: "Login",
        modal_nickname_title: "Set Nickname",
        modal_nickname_placeholder: "e.g. MeowPro123",
        modal_nickname_btn: "Complete Sign Up ✨",
        modal_login_title: "Welcome! 🐾",
        modal_login_desc: "How would you like to sign in?\nGet 1,000P instantly!",
        modal_login_kakao: "Continue with Kakao",
        modal_login_google: "Continue with Google",
        modal_airport_title: "Enter Arrival Airport",
        modal_airport_desc: "Please enter the airport for '{destination}'.",
        modal_airport_placeholder: "e.g. Bali, DPS",
        modal_airport_error: "Airport not found.",
        modal_airport_btn: "Search & Apply",
        flight_title: "Flights",
        flight_btn_trip: "Trip.com Best Deal",
        flight_btn_avia: "Aviasales Booking",
        flight_empty: "No flights found.",
        flight_empty_btn: "Search Airport Manually",
        schedule_empty: "No upcoming trips. Let's create one first!",
        schedule_trip_suffix: "Trip",
        schedule_departs: "Departs",
        schedule_tbd: "TBD"
    }
};

// --- 2. 유틸리티 함수 (원본 100% 유지) ---
const findIataCode = (text) => {
    if (!text) return null;
    const lowerText = text.toLowerCase();
    for (const [city, code] of Object.entries(CITY_TO_IATA)) {
        const isKorean = /[가-힣]/.test(city);
        if (isKorean) { if (lowerText.includes(city)) return code; }
        else { const regex = new RegExp(`\\b${city.toLowerCase()}\\b`); if (regex.test(lowerText)) return code; }
    }
    return null;
};

const extractIataFromItinerary = (tripResult) => {
    let inCode = null; let outCode = null;
    if (!tripResult || !tripResult.itinerary) return { inCode, outCode };
    const days = tripResult.itinerary;
    const firstDay = days[0];
    const lastDay = days[days.length - 1];
    if (firstDay) {
        const textToCheck = `${firstDay.day} ${tripResult.tripTitle} ${firstDay.places?.map(p => p.name + " " + (p.description || "")).join(' ')}`;
        inCode = findIataCode(textToCheck);
    }
    if (lastDay) {
        const textToCheck = `${lastDay.day} ${tripResult.tripTitle} ${lastDay.places?.map(p => p.name + " " + (p.description || "")).join(' ')}`;
        outCode = findIataCode(textToCheck);
    }
    if (!inCode) {
        inCode = findIataCode(tripResult.tripTitle || tripResult.destination || "");
        if (!outCode) outCode = inCode;
    }
    return { inCode, outCode };
};

// --- 3. 메인 Home 컴포넌트 ---
export default function Home() {
    const router = useRouter();
    const { data: session } = useSession(); // Kakao (NextAuth) 세션
    const { token, notificationPermission } = useFcmToken();

    // 상태 관리 (원본 유지 + 로그인 모달 추가)
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("AI가 여행 계획을 짜고 있어요...");
    const [recommendedTrips, setRecommendedTrips] = useState([]);
    const [showNicknameModal, setShowNicknameModal] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false); // ✨ 로그인 방식 선택 모달
    const [nicknameInput, setNicknameInput] = useState("");
    const [manualAirport, setManualAirport] = useState({ show: false, trip: null, searchStr: "", error: "" });
    const [showSplash, setShowSplash] = useState(false);
    const [language, setLanguage] = useState('ko');
    const [result, setResult] = useState(null);
    const [bgIndex, setBgIndex] = useState(0);
    const [user, setUser] = useState(null); // Firebase (Google) 유저
    const [userData, setUserData] = useState(null);
    const [showIntro, setShowIntro] = useState(true);
    const [showBannerNews, setShowBannerNews] = useState(false);
    const [activeTab, setActiveTab] = useState('create');
    const [showWelcome, setShowWelcome] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [mySchedules, setMySchedules] = useState([]);
    const [isButtonHovered, setIsButtonHovered] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [flightResults, setFlightResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [dateRange, setDateRange] = useState([null, null]);
    const [startDate, endDate] = dateRange;
    const [isLuxury, setIsLuxury] = useState(false);
    const [listeningField, setListeningField] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [userLocation, setUserLocation] = useState(null);
    const [isLocationLoading, setIsLocationLoading] = useState(false);
    const [formData, setFormData] = useState({
        destination: "", startDate: "", endDate: "", companion: "연인",
        people: 2, budget: 100, hotelType: "호텔", tourType: "자유여행",
        themes: [], request: "", regionType: "auto",
    });

    // ✅ 언어/위치(GEO) SEO 자동 감지
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const queryLang = params.get("lang");
            if (queryLang === "en" || queryLang === "ko") {
                setLanguage(queryLang);
            } else {
                const savedLang = localStorage.getItem('language');
                if (savedLang === 'en' || savedLang === 'ko') {
                    setLanguage(savedLang);
                } else {
                    const browserLang = navigator.language || navigator.userLanguage;
                    if (browserLang && browserLang.toLowerCase().startsWith("en")) {
                        setLanguage("en");
                    }
                }
            }
        }
    }, []);

    // ✅ 언어 상태 변화 감지 및 localStorage 동기화 + 이벤트 전송
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem('language', language);
            window.dispatchEvent(new Event('languageChanged'));
        }
    }, [language]);

    // --- Effect 로직 (원본 100% 유지) ---
    useEffect(() => {
        if (!loading) return;
        const messages = ["AI가 여행지를 분석하고 있어요... 🧐", "최적의 항공권을 찾고 있습니다... ✈️", "현지 맛집 리스트를 훑어보는 중... 🍜", "동선을 최적화하고 있어요... 🗺️", "가성비 좋은 숙소를 찾고 있습니다... 🏨", "거의 다 됐습니다! 냥냥! 🐾"];
        const messagesEn = ["AI is analyzing the destination... 🧐", "Searching for the best flights... ✈️", "Scanning local restaurants... 🍜", "Optimizing the routes... 🗺️", "Finding budget-friendly stays... 🏨", "Almost done! Meow! 🐾"];
        const activeMessages = language === 'en' ? messagesEn : messages;
        let index = 0; setLoadingText(activeMessages[0]);
        const interval = setInterval(() => { index = (index + 1) % activeMessages.length; setLoadingText(activeMessages[index]); }, 3000);
        return () => clearInterval(interval);
    }, [loading, language]);

    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                const q = query(collection(db, "rectrips"), orderBy("createdAt", "desc"));
                const snapshot = await getDocs(q);
                const firestoreTrips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // ✨ Firestore 데이터와 기본 고화질 추천 상품 통합
                setRecommendedTrips([...RECOMMENDED_TRIPS, ...firestoreTrips].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i));
            } catch (error) {
                console.error("추천 여행 로딩 실패:", error);
                setRecommendedTrips(RECOMMENDED_TRIPS); // 실패 시 기본 데이터 로드
            }
        };
        fetchRecommendations();
    }, []);

    useEffect(() => {
        const hasShownSplash = sessionStorage.getItem('hasShownSplash');
        if (!hasShownSplash) setShowSplash(true);
        const timer = setInterval(() => setBgIndex((prev) => (prev + 1) % backgroundImages.length), 5000);
        const checkStandalone = () => { setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true); };
        checkStandalone();
        const handleAppInstalled = async () => {
            setIsStandalone(true);
            setDeferredPrompt(null);
            // 앱 설치 직후 알림 권한을 자동으로 요청 (설치 버튼 클릭 직후라 브라우저가 차단하지 않을 확률이 높음)
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
                try {
                    await Notification.requestPermission();
                    console.log('앱 설치 시 알림 권한을 요청했습니다.');
                } catch (e) {
                    console.error('알림 권한 요청 실패:', e);
                }
            }
        };
        window.addEventListener('appinstalled', handleAppInstalled);
        const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        let unsubscribeTrips = null;
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (unsubscribeTrips) { unsubscribeTrips(); unsubscribeTrips = null; }

            if (currentUser) {
                // ✨ [추가] FCM 토큰이 있고 유저가 있으면 DB에 업데이트 (푸시 알림용)
                if (token) {
                    try {
                        await updateDoc(doc(db, "users", currentUser.uid), {
                            fcmToken: token,
                            lastTokenUpdate: serverTimestamp()
                        });
                        console.log("✅ FCM 토큰이 유저 정보에 업데이트되었습니다.");
                    } catch (e) {
                        console.warn("FCM 토큰 업데이트 실패 (필드가 없을 수 있음):", e);
                    }
                }

                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists()) setUserData(userDoc.data());
            }
            const params = new URLSearchParams(window.location.search);
            if (currentUser && params.get('mode') !== 'new') {
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) { router.push('/mypage'); } else { setShowNicknameModal(true); }
                return;
            }
            if (currentUser) {
                const tripsQ = query(collection(db, "trips"), where("memberIds", "array-contains", currentUser.uid), orderBy("createdAt", "desc"));
                unsubscribeTrips = onSnapshot(tripsQ, (snapshot) => {
                    setMySchedules(snapshot.docs.map(doc => {
                        const data = doc.data(); let iataCode = null;
                        Object.keys(CITY_TO_IATA).forEach(city => { if (data.destination?.includes(city)) iataCode = CITY_TO_IATA[city]; });
                        return { id: doc.id, title: data.destination || (language === 'en' ? "My Trip" : "나의 여행"), subtitle: data.startDate ? (language === 'en' ? `Departs ${data.startDate}` : `${data.startDate} 출발`) : (language === 'en' ? "TBD" : "날짜 미정"), icon: "✈️", iata: iataCode, ...data };
                    }));
                });
            } else { setMySchedules([]); }
        });
        return () => { clearInterval(timer); window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt); window.removeEventListener('appinstalled', handleAppInstalled); unsubscribeAuth(); if (unsubscribeTrips) unsubscribeTrips(); };
    }, [router, token]); // ✨ token을 의존성 배열에 추가

    // ✨ NextAuth (카카오) 로그인 상태를 감지하여 Firebase Custom Token 연동 및 마이페이지 리다이렉트
    useEffect(() => {
        if (session) {
            if (session.firebaseToken) {
                // 파이어베이스 계정에 카카오 정보로 로그인 연동
                if (!auth.currentUser) {
                    signInWithCustomToken(auth, session.firebaseToken)
                        .then(() => {
                            const params = new URLSearchParams(window.location.search);
                            if (params.get('mode') !== 'new') {
                                router.push('/mypage');
                            }
                        })
                        .catch(err => {
                            console.error("Firebase Custom Token Login Failed:", err);
                            let debugInfo = "";
                            try {
                                const payload = JSON.parse(atob(session.firebaseToken.split('.')[1]));
                                debugInfo = `\n[디버그]\n발급자: ${payload.iss}\n프로젝트: ${payload.aud}`;
                            } catch (e) { }
                            alert(language === "en" ? "Firebase Token Login Error: " + (err.code || "unknown") + " / " + (err.message || err) + debugInfo + "\n\nResetting session. Please log in again!" : "Firebase 토큰 로그인 에러: " + (err.code || "unknown") + " / " + (err.message || err) + debugInfo + "\n\n오손된 세션을 초기화합니다. 다시 로그인해주세요!");
                            signOut({ redirect: false });
                        });
                } else {
                    // 이미 연동되어 로그인 상태일 때
                    const params = new URLSearchParams(window.location.search);
                    if (params.get('mode') !== 'new') {
                        router.push('/mypage');
                    }
                }
            } else {
                // 구형 세션 캐시 제거 유도
                console.warn("Firebase Token 누락. 카카오 세션을 초기화합니다.");
                alert(language === "en" ? "Session conflict error (Token Missing). Session initialized. Please click the Login button again!" : "구형 세션 충돌 오류 (Token Missing). 세션을 초기화했습니다. 다시 로그인 버튼을 눌러주세요!");
                signOut({ redirect: false });
            }
        }
    }, [session, router]);

    // --- ✨ 로그인 핸들러 (통합 모달용) ---
    const handleGoogleLogin = async () => {
        setShowLoginModal(false);
        setLoading(true);
        setLoadingText(language === "en" ? "Connecting Google account... 🔐" : "구글 계정 연결 중... 🔐");
        try {
            const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform();
            if (isNative) {
                const googleUser = await GoogleAuth.signIn();
                const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
                await signInWithCredential(auth, credential);
            } else {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
            }
        } catch (error) {
            console.error("구글 로그인 에러:", error); setLoading(false);
            if (!error.message?.includes('12501')) alert(language === "en" ? "An error occurred during login: " + error.message : "로그인 중 문제가 발생했습니다: " + error.message);
        }
    };

    const handleKakaoLogin = () => {
        setShowLoginModal(false);
        signIn("kakao", { callbackUrl: '/' }); // 반드시 메인 페이지로 와서 signInWithCustomToken을 먼저 실행해야 함
    };

    // --- 기존 핸들러 로직 (원본 100% 유지) ---
    const handleCompleteSignUp = async () => {
        if (!nicknameInput.trim()) { alert(language === "en" ? "Please enter a nickname!" : "닉네임을 입력해주세요!"); return; }
        if (!auth.currentUser) return;
        try {
            await updateProfile(auth.currentUser, { displayName: nicknameInput });
            await setDoc(doc(db, "users", auth.currentUser.uid), {
                uid: auth.currentUser.uid, email: auth.currentUser.email, name: nicknameInput, photoURL: auth.currentUser.photoURL, points: 1000, createdAt: serverTimestamp()
            });
            setShowNicknameModal(false); router.push('/mypage');
        } catch (error) { alert(language === "en" ? "An error occurred during registration." : "가입 처리 중 문제가 발생했습니다."); }
    };

    const handleDeleteTrip = async (e, tripId, destination) => {
        e.stopPropagation();
        if (!confirm(language === "en" ? `Are you sure you want to delete the itinerary for '${destination}'?` : `'${destination}' 일정을 삭제하시겠습니까?`)) return;
        try { if (user) await deleteDoc(doc(db, "trips", tripId)); } catch (error) { alert(language === "en" ? "An error occurred during deletion." : "삭제 오류 발생"); }
    };

    const parseSpokenDate = (text) => {
        const today = new Date(); const year = today.getFullYear(); let start = null; let end = null;
        if (text.includes('내일')) { start = new Date(today); start.setDate(today.getDate() + 1); }
        else if (text.includes('모레')) { start = new Date(today); start.setDate(today.getDate() + 2); }
        else if (text.includes('오늘')) { start = new Date(today); }
        const dateMatches = [...text.matchAll(/(\d+)월\s*(\d+)일/g)];
        if (dateMatches.length > 0) {
            const m1 = parseInt(dateMatches[0][1]) - 1; const d1 = parseInt(dateMatches[0][2]);
            start = new Date(year, m1, d1); if (start < today) start.setFullYear(year + 1);
            if (dateMatches.length > 1) {
                const m2 = parseInt(dateMatches[1][1]) - 1; const d2 = parseInt(dateMatches[1][2]);
                end = new Date(year, m2, d2); if (end < start) end.setFullYear(year + 1);
            }
        }
        return [start, end];
    };

    const VOICE_SEQUENCE = ['destination', 'date', 'companion', 'budget', 'people', 'tourType', 'request'];
    const handleVoiceInput = (targetField) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { alert(language === "en" ? "Your browser does not support speech recognition. Chrome or Safari is recommended!" : "현재 브라우저는 음성 인식을 지원하지 않습니다. 크롬(Chrome)이나 사파리(Safari)를 권장합니다!"); return; }
        const recognition = new SpeechRecognition();
        recognition.lang = language === 'en' ? 'en-US' : 'ko-KR';
        setListeningField(targetField);
        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            if (targetField === 'date') {
                const [newStart, newEnd] = parseSpokenDate(text);
                if (newStart) {
                    setDateRange([newStart, newEnd]);
                    setFormData(prev => ({ ...prev, startDate: newStart.toISOString().split('T')[0], endDate: newEnd ? newEnd.toISOString().split('T')[0] : newStart.toISOString().split('T')[0] }));
                }
            } else {
                setFormData(prev => {
                    if (targetField === 'budget') { const num = text.replace(/[^0-9]/g, ''); return num ? { ...prev, budget: parseInt(num) } : prev; }
                    else if (targetField === 'people') {
                        let num = text.replace(/[^0-9]/g, '');
                        if (!num) { if (text.includes('한') || text.includes('1')) num = 1; else if (text.includes('두') || text.includes('2')) num = 2; else if (text.includes('세') || text.includes('3')) num = 3; }
                        return num ? { ...prev, people: Math.max(1, Math.min(20, parseInt(num))) } : prev;
                    }
                    else if (targetField === 'companion') {
                        if (text.includes('혼자')) return { ...prev, companion: '혼자' };
                        if (text.includes('연인')) return { ...prev, companion: '연인' };
                        if (text.includes('친구')) return { ...prev, companion: '친구' };
                        if (text.includes('가족')) return { ...prev, companion: '가족' };
                        return prev;
                    }
                    return { ...prev, [targetField]: text };
                });
            }
        };
        recognition.onend = () => {
            setListeningField(null);
            const currentIndex = VOICE_SEQUENCE.indexOf(targetField);
            if (currentIndex !== -1 && currentIndex < VOICE_SEQUENCE.length - 1) {
                const nextField = VOICE_SEQUENCE[currentIndex + 1];
                const fieldNames = {
                    destination: language === 'en' ? 'destination' : '목적지',
                    date: language === 'en' ? 'dates' : '날짜',
                    companion: language === 'en' ? 'companion' : '동행자',
                    budget: language === 'en' ? 'budget' : '예산',
                    people: language === 'en' ? 'travelers' : '인원',
                    tourType: language === 'en' ? 'travel style' : '여행 스타일',
                    request: language === 'en' ? 'requests' : '요청사항'
                };
                const nextFieldName = fieldNames[nextField] || nextField;
                setTimeout(() => { if (confirm(language === 'en' ? `Would you like to proceed to the next step '${nextFieldName}'?` : `다음 '${nextFieldName}' 단계로 넘어갈까요?`)) handleVoiceInput(nextField); }, 500);
            }
        };
        recognition.start();
    };

    const formatDateForAPI = (dateString) => {
        if (!dateString) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
        const parts = dateString.match(/\d+/g);
        if (parts && parts.length >= 3) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        return null;
    };

    const proceedFlightSearch = async (trip, arrivalCode, returnOriginCode) => {
        const depDateStr = formatDateForAPI(trip.startDate); if (!depDateStr) return;
        let retDateStr = formatDateForAPI(trip.endDate);
        if (!retDateStr) { const d = new Date(depDateStr); d.setDate(d.getDate() + 4); retDateStr = d.toISOString().split('T')[0]; }
        setSelectedTrip({ ...trip, iata: arrivalCode, returnIata: returnOriginCode, returnDateCalc: retDateStr });
        setIsSearching(true); setFlightResults([]);
        try {
            const res = await fetch('/api/flights/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destinationCode: arrivalCode, returnOriginCode, departureDate: depDateStr, returnDate: retDateStr, language, destinationName: trip.destination || trip.title }) });
            const data = await res.json(); setFlightResults(data.flights || []);
        } catch (error) { console.error(error); } finally { setIsSearching(false); }
    };

    const handleTripClick = async (trip) => {
        let arrivalCode = findIataCode(`${trip.destination || ''} ${trip.title || ''}`);
        if (!arrivalCode) { arrivalCode = trip.arrivalIata || trip.iata; }
        if (!arrivalCode || arrivalCode.length !== 3) { setManualAirport({ show: true, trip, searchStr: "", error: "" }); return; }
        proceedFlightSearch(trip, arrivalCode, arrivalCode);
    };

    const handleManualSubmit = () => {
        const input = manualAirport.searchStr.trim();
        let resolvedCode = /^[A-Za-z]{3}$/.test(input) ? input.toUpperCase() : findIataCode(input);
        if (resolvedCode) {
            const trip = manualAirport.trip; setManualAirport({ show: false, trip: null, searchStr: "", error: "" });
            proceedFlightSearch(trip, resolvedCode, resolvedCode);
        } else { setManualAirport(prev => ({ ...prev, error: translations[language].modal_airport_error })); }
    };

    const toggleLuxuryMode = () => { setIsLuxury(!isLuxury); setFormData(prev => ({ ...prev, hotelType: !isLuxury ? "5성급 스위트룸/풀빌라" : "호텔" })); };
    const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleDateChange = (update) => {
        setDateRange(update);
        if (update[0] && update[1]) {
            const isDay = update[0].getTime() === update[1].getTime();
            setFormData(prev => {
                let newRequest = prev.request;
                if (isDay) {
                    if (!newRequest.includes('당일치기')) {
                        newRequest = newRequest ? `${newRequest}, 당일치기 여행` : '당일치기 여행';
                    }
                } else {
                    newRequest = newRequest.replace(', 당일치기 여행', '').replace('당일치기 여행', '').trim();
                }
                return {
                    ...prev,
                    startDate: update[0].toISOString().split('T')[0],
                    endDate: update[1].toISOString().split('T')[0],
                    regionType: isDay ? 'daytrip' : (prev.regionType === 'daytrip' ? 'auto' : prev.regionType),
                    request: newRequest
                };
            });
        }
    };
    const updatePeople = (delta) => setFormData(prev => ({ ...prev, people: Math.max(1, Math.min(20, prev.people + delta)) }));

    // 📍 현재 위치 가져오기 (OpenStreetMap Nominatim 사용)
    const fetchUserLocation = () => {
        if (!navigator.geolocation) {
            alert(language === "en" ? "Your browser does not support location services." : "브라우저가 위치 정보를 지원하지 않습니다.");
            return;
        }
        setIsLocationLoading(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ko`);
                const data = await res.json();
                const city = data.address.city || data.address.town || data.address.village || data.address.province || "내 위치";
                setUserLocation(city);
                setFormData(prev => ({ ...prev, destination: city }));
            } catch (err) {
                console.error("위치 변환 실패:", err);
                setUserLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
                setFormData(prev => ({ ...prev, destination: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}` }));
            } finally {
                setIsLocationLoading(false);
            }
        }, (err) => {
            console.error("위치 획득 실패:", err);
            alert(language === "en" ? "Unable to retrieve location. Please check your permissions." : "위치 정보를 가져올 수 없습니다. 권한을 확인해주세요.");
            setIsLocationLoading(false);
        });
    };

    const generatePlan = async () => {
        if (!formData.destination) { alert(language === "en" ? "Please tell us where you want to travel!" : "어떤 여행을 원하시는지 알려주세요!"); return; }
        if (!formData.startDate || !formData.endDate) { alert(language === "en" ? "Please select your travel dates!" : "날짜를 선택해주세요!"); return; }
        setLoading(true);

        // 현재 시간 및 날짜 체크 (오늘일 경우 시간 전달)
        const today = new Date().toISOString().split('T')[0];
        const currentTime = (formData.startDate === today) ? new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : null;

        try {
            const response = await fetch("/api/generate/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    isLuxury,
                    language,
                    currentTime,
                    startLocation: userLocation || null
                })
            });
            const data = await response.json();
            if (data.result) {
                const { inCode, outCode } = extractIataFromItinerary(data.result);
                data.result.arrivalIata = inCode || data.result.arrivalIata;
                data.result.departureIata = outCode || data.result.departureIata;
                setResult(data.result);
            } else alert(language === "en" ? "Generation failed: " + data.error : "생성 실패: " + data.error);
        } catch (error) { alert(language === "en" ? "Server Error" : "서버 오류"); } finally { setLoading(false); }
    };

    const handleRecommendedClick = (trip) => { router.push(`/share/${trip.id}`); };

    if (result) return <AIResult data={result} userInfo={formData} language={language} onReset={() => setResult(null)} />;

    // --- 4. UI 렌더링 ---
    return (
        <div className="h-dvh w-full flex justify-center items-center bg-gray-900 sm:p-4 font-sans relative overflow-hidden">
            {/* 스플래시 */}
            <AnimatePresence>{showSplash && <SplashScreen language={language} onFinish={() => { setShowSplash(false); sessionStorage.setItem('hasShownSplash', 'true'); }} />}</AnimatePresence>

            {/* 닉네임 설정 모달 */}
            <AnimatePresence>
                {showNicknameModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
                            <button onClick={() => setShowNicknameModal(false)} className="absolute top-4 right-4 p-2 text-gray-400"><X size={20} /></button>
                            <h3 className="text-xl font-black text-center text-gray-800 mb-2">{translations[language].modal_nickname_title}</h3>
                            <input type="text" placeholder={translations[language].modal_nickname_placeholder} value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} className="w-full px-4 py-4 bg-gray-50 border rounded-2xl outline-none font-bold text-center text-lg mb-4" />
                            <button onClick={handleCompleteSignUp} className="w-full py-4 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold text-lg rounded-2xl active:scale-95">{translations[language].modal_nickname_btn}</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ✨ 로그인 방식 선택 모달 (통합 로그인을 위해 추가됨) */}
            <AnimatePresence>
                {showLoginModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl relative text-center">
                            <button onClick={() => setShowLoginModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition"><X size={24} /></button>
                            <div className="mb-6 flex justify-center"><CatMascot width={100} /></div>
                            <h3 className="text-2xl font-black text-gray-800 mb-2">{translations[language].modal_login_title}</h3>
                            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                                {translations[language].modal_login_desc.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>)}
                            </p>

                            <div className="space-y-3">
                                <button onClick={handleKakaoLogin} className="w-full py-4 bg-[#FEE500] text-[#3c1e1e] font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition shadow-sm">
                                    <MessageSquare size={20} fill="#3c1e1e" /> {translations[language].modal_login_kakao}
                                </button>
                                <button onClick={handleGoogleLogin} className="w-full py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition shadow-sm">
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" /> {translations[language].modal_login_google}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 수동 공항 입력 */}
            <AnimatePresence>
                {manualAirport.show && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
                            <button onClick={() => setManualAirport({ show: false, trip: null, searchStr: "", error: "" })} className="absolute top-4 right-4 p-2 text-gray-400"><X size={20} /></button>
                            <h3 className="text-xl font-black text-center text-gray-800 mb-2">{translations[language].modal_airport_title}</h3>
                            <p className="text-xs text-center text-gray-500 mb-4 font-bold text-brand-danger">{translations[language].modal_airport_desc.replace('{destination}', manualAirport.trip?.destination)}</p>
                            <input type="text" placeholder={translations[language].modal_airport_placeholder} value={manualAirport.searchStr} onChange={(e) => setManualAirport({ ...manualAirport, searchStr: e.target.value, error: "" })} className="w-full px-4 py-4 bg-gray-50 border rounded-2xl outline-none text-center font-bold" />
                            {manualAirport.error && <p className="text-[10px] text-brand-danger text-center mt-2">{manualAirport.error}</p>}
                            <button onClick={handleManualSubmit} className="w-full py-4 bg-brand-accent text-white font-bold rounded-2xl mt-4">{translations[language].modal_airport_btn}</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 배경 — 프리미엄 켄 번 효과 */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <AnimatePresence mode='wait'>
                    <motion.img
                        key={bgIndex}
                        src={backgroundImages[bgIndex]}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1.0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                </AnimatePresence>
                {/* 비네팅 오버레이로 고급스러움 추가 */}
                <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black/40" />
            </div>

            {/* 메인 박스 — 독립형 플로팅 카드 UI로 변경 (배경 투명화) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[560px] h-full sm:h-[95vh] bg-transparent sm:rounded-[35px] overflow-hidden relative flex flex-col z-10">
                <div className="px-4 pt-6 pb-2 shrink-0 flex justify-between items-center bg-transparent z-20">
                    <img src="/logo1.png" alt="Logo" className="h-8 w-auto object-contain" />
                    <div className="z-50 flex items-center gap-1.5 sm:gap-2">
                        <div className="flex bg-white/80 backdrop-blur-sm p-0.5 rounded-full text-[9px] font-black shadow-sm border border-white/50 shrink-0">
                            <button
                                onClick={() => setLanguage('ko')}
                                className={`px-2 py-1 rounded-full transition-all duration-300 ${language === 'ko' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                한국어
                            </button>
                            <button
                                onClick={() => setLanguage('en')}
                                className={`px-2 py-1 rounded-full transition-all duration-300 ${language === 'en' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                English
                            </button>
                        </div>
                        {user || session ? (
                            <div onClick={() => router.push('/mypage')} className="flex items-center gap-2 cursor-pointer group hover:bg-white/60 p-1.5 rounded-full transition">
                                <div className="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden shrink-0">
                                    <img src={userData?.profileImgBase64 || user?.photoURL || session?.user?.image || "https://via.placeholder.com/40"} alt="Profile" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowLoginModal(true)} // ✨ 모달 오픈
                                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold text-sm shadow-lg shadow-brand-secondary/20 active:scale-95 transition-all"
                            >
                                {translations[language].btn_login}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide pt-2 pb-32">
                    {/* 상단 배너 — 냥프로 인사 → 여행 소식 자동 전환 */}
                    <div className="mb-8 mt-6 px-2">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative bg-gradient-to-br from-white to-brand-primary/5 rounded-[1.5rem] p-5 border border-white shadow-lg overflow-hidden min-h-[160px]">
                            <AnimatePresence mode="wait">
                                {!showBannerNews ? (
                                    <motion.div
                                        key="cat-greeting"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        transition={{ duration: 0.4 }}
                                        className="flex flex-row items-center justify-center gap-6"
                                        onAnimationComplete={() => {
                                            setTimeout(() => setShowBannerNews(true), 3000);
                                        }}
                                    >
                                        <CatMascot width={90} />
                                        <div className="text-left">
                                            <h2 className="text-3xl sm:text-4xl font-black leading-tight break-keep">
                                                <span className="block text-gray-700 text-lg font-bold mb-1 opacity-80">{translations[language].title_pre}</span>
                                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-brand-accent to-gray-800">{translations[language].title_main}</span>🪄<br />
                                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent">{translations[language].title_sub}</span>
                                            </h2>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="travel-news"
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <TravelNews language={language} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>

                    {/* 탭 메뉴 — 프리미엄 슬라이딩 탭 디자인 */}
                    <div className="sticky top-2 z-30 bg-white/90 backdrop-blur-md mx-4 p-1.5 rounded-[1.25rem] shadow-xl border border-white/40 flex mb-8 gap-1">
                        <button onClick={() => setActiveTab('create')} className="relative flex-1 py-3.5 outline-none transition-all duration-300">
                            {activeTab === 'create' && (
                                <motion.div layoutId="activeTab" className="absolute inset-0 bg-brand-primary rounded-xl shadow-lg shadow-brand-primary/20" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                            )}
                            <span className={`relative z-10 text-sm font-black transition-colors duration-300 ${activeTab === 'create' ? 'text-white' : 'text-gray-400'}`}>
                                {translations[language].tab_schedule}
                            </span>
                        </button>
                        <button onClick={() => setActiveTab('flights')} className="relative flex-1 py-3.5 outline-none transition-all duration-300">
                            {activeTab === 'flights' && (
                                <motion.div layoutId="activeTab" className="absolute inset-0 bg-brand-accent rounded-xl shadow-lg shadow-brand-accent/20" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                            )}
                            <span className={`relative z-10 text-sm font-black transition-colors duration-300 ${activeTab === 'flights' ? 'text-white' : 'text-gray-400'}`}>
                                {translations[language].tab_myflight}
                            </span>
                        </button>
                    </div>

                    <div className="px-4 pb-12">
                        {activeTab === 'create' && (
                            <div className="space-y-8 animate-fadeIn">
                                {/* 목적지 — 그림자 강화된 화이트 카드 */}
                                <div className="bg-white/95 p-6 rounded-[2rem] shadow-2xl border border-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <label className="flex items-center gap-2 text-sm font-bold text-gray-500"><Sparkles size={16} className="text-brand-primary" /> {translations[language].label_where}</label>
                                            <button onClick={fetchUserLocation} disabled={isLocationLoading} className="p-1.5 text-brand-primary hover:bg-brand-primary/10 rounded-full transition-all active:scale-95 flex items-center justify-center">
                                                {isLocationLoading ? <RefreshCw size={14} className="animate-spin" /> : <MapPin size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    {/* 네이버/다음 스타일의 프리미엄 통합 검색바 */}
                                    <div className="relative flex items-center bg-white border-2 border-brand-primary rounded-full px-5 py-3.5 shadow-[0_4px_16px_rgba(22,163,74,0.06)] focus-within:shadow-[0_4px_20px_rgba(22,163,74,0.18)] focus-within:border-brand-primary transition-all duration-300 gap-3 mb-4">
                                        <Search size={20} className="text-brand-primary shrink-0" />
                                        <input 
                                            type="text" 
                                            name="destination" 
                                            value={formData.destination} 
                                            onChange={handleInputChange} 
                                            placeholder={listeningField === 'destination' ? translations[language].msg_listening : translations[language].placeholder_dest} 
                                            className="w-full text-base sm:text-lg font-black text-gray-800 bg-transparent outline-none pr-2 placeholder:text-gray-400" 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => handleVoiceInput('destination')} 
                                            className={`p-2 rounded-full transition-all shrink-0 hover:bg-gray-100 active:scale-95 ${listeningField === 'destination' ? 'bg-brand-secondary text-white animate-pulse' : 'text-gray-400'}`}
                                        >
                                            <Mic size={18} />
                                        </button>
                                    </div>
                                    <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-4 gap-1.5 shadow-inner">
                                        {['auto', 'domestic', 'international', 'daytrip'].map(type => (
                                            <button key={type} onClick={() => {
                                                if (type === 'daytrip') {
                                                    const baseDate = startDate || new Date();
                                                    setDateRange([baseDate, baseDate]);
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        regionType: 'daytrip',
                                                        startDate: baseDate.toISOString().split('T')[0],
                                                        endDate: baseDate.toISOString().split('T')[0],
                                                        request: prev.request ? (prev.request.includes('당일치기') || prev.request.includes('day trip') ? prev.request : `${prev.request}, ${language === 'en' ? 'day trip' : '당일치기 여행'}`) : (language === 'en' ? 'day trip' : '당일치기 여행')
                                                    }));
                                                } else {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        regionType: type,
                                                        request: prev.request.replace(', 당일치기 여행', '').replace('당일치기 여행', '').replace(', day trip', '').replace('day trip', '').trim()
                                                    }));
                                                }
                                            }} className={`flex-1 text-xs sm:text-sm font-black py-3.5 rounded-xl transition-all duration-300 ${formData.regionType === type ? 'bg-white text-brand-primary shadow-md scale-[1.02]' : 'text-gray-500 hover:bg-white/50'}`}>
                                                {type === 'auto' ? translations[language].region_auto : type === 'domestic' ? translations[language].region_domestic : type === 'international' ? translations[language].region_international : translations[language].region_daytrip}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-50">
                                        {(language === 'en' ? QUICK_TAGS_EN : QUICK_TAGS).map((tag, idx) => (
                                            <button key={idx} onClick={() => setFormData(prev => ({ ...prev, destination: prev.destination ? `${prev.destination}, ${cleanTagText(tag, language)}` : cleanTagText(tag, language) }))} className="bg-gray-50 border border-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-[12px] font-bold transition hover:bg-brand-primary/10 active:scale-95">{tag}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* 날짜/인원/예산 (원본 유지) */}
                                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-500"><Calendar size={16} className="text-brand-primary" /> {translations[language].label_when}</label>
                                        <button onClick={() => handleVoiceInput('date')} className={`p-2 rounded-full ${listeningField === 'date' ? 'bg-brand-secondary text-white animate-pulse' : 'bg-gray-100'}`}><Mic size={16} /></button>
                                    </div>
                                    <DatePicker selectsRange={true} startDate={startDate} endDate={endDate} onChange={handleDateChange} minDate={new Date()} locale={language === 'en' ? enUS : ko} dateFormat="yyyy.MM.dd" placeholderText={translations[language].placeholder_date} className="w-full text-lg font-bold bg-transparent outline-none cursor-pointer" wrapperClassName="w-full" />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-bold text-gray-600 block px-1">{translations[language].label_companion}</label>
                                        <button onClick={() => handleVoiceInput('companion')} className={`p-1.5 rounded-full ${listeningField === 'companion' ? 'bg-brand-secondary text-white animate-pulse' : 'bg-gray-100'}`}><Mic size={14} /></button>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2">
                                        {companionOptions.map((opt) => (
                                            <button key={opt.id} onClick={() => setFormData({ ...formData, companion: opt.id })} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all gap-1 ${formData.companion === opt.id ? 'bg-brand-primary text-white shadow-md scale-105' : 'bg-gray-50 text-gray-400'}`}>
                                                {opt.icon} <span className="text-[10px] break-keep">{language === 'en' ? opt.enLabel : opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className={`p-4 rounded-3xl border transition-all ${isLuxury ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100 shadow-sm"}`}>
                                    <div className="flex gap-4 items-center justify-between">
                                        {isLuxury ? (
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 text-amber-600 font-bold mb-1"><Sparkles size={16} /> VIP 예산</div>
                                                <p className="text-xs text-gray-500">무제한 (AI 최적화)</p>
                                            </div>
                                        ) : (
                                            <div className="flex-1">
                                                <div className="flex items-center gap-1 mb-1">
                                                    <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><Wallet size={12} /> {translations[language].label_budget}</label>
                                                    <button onClick={() => handleVoiceInput('budget')} className={`p-1 rounded-full ${listeningField === 'budget' ? 'bg-brand-secondary text-white animate-pulse' : 'bg-gray-100'}`}><Mic size={12} /></button>
                                                </div>
                                                <div className="flex items-end gap-1 mb-2">
                                                    <span className="text-xl font-bold text-brand-primary">
                                                        {language === 'en' ? (formData.budget * 10000).toLocaleString() : formData.budget.toLocaleString()}
                                                    </span>
                                                    <span className="text-sm text-gray-400">{language === 'en' ? ' KRW' : '만원'}</span>
                                                </div>
                                                <input type="range" name="budget" min="50" max="1000" step="10" value={formData.budget} onChange={handleInputChange} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-primary" />
                                            </div>
                                        )}
                                        <div className="w-[1px] h-10 bg-gray-100"></div>
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center gap-1 mb-1">
                                                <label className="text-xs font-bold text-gray-500">{translations[language].label_people}</label>
                                                <button onClick={() => handleVoiceInput('people')} className={`p-1 rounded-full ${listeningField === 'people' ? 'bg-brand-secondary text-white animate-pulse' : 'bg-gray-100'}`}><Mic size={12} /></button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => updatePeople(-1)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-bold">-</button>
                                                <span className="font-bold text-gray-800 w-4 text-center">{formData.people}</span>
                                                <button onClick={() => updatePeople(1)} className="w-8 h-8 rounded-full bg-brand-primary text-white font-bold">+</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className="text-sm font-bold text-gray-600 px-1">{translations[language].label_style}</label>
                                        <button onClick={() => handleVoiceInput('tourType')} className={`p-1.5 rounded-full ${listeningField === 'tourType' ? 'bg-brand-secondary text-white animate-pulse' : 'bg-gray-100'}`}><Mic size={14} /></button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {tourOptions.map((option) => (
                                            <button key={option.id} onClick={() => setFormData({ ...formData, tourType: option.id })} className={`py-3 px-2 rounded-2xl border transition-all flex flex-col items-center text-center ${formData.tourType === option.id ? 'bg-white border-brand-primary text-brand-primary shadow-md ring-1 ring-brand-primary' : 'bg-white border-gray-100 text-gray-400'}`}>
                                                <span className="font-bold text-sm mb-1">{language === 'en' ? option.enLabel : option.label}</span>
                                                <span className="text-[10px] opacity-70">{language === 'en' ? option.enDesc : option.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={toggleLuxuryMode} className={`w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border ${isLuxury ? "bg-amber-500 text-white shadow-lg" : "bg-gray-50 text-gray-500"}`}>
                                        {isLuxury ? <><Crown size={16} fill="white" /> {translations[language].btn_luxury_on}</> : <><Crown size={16} /> {translations[language].btn_luxury_off}</>}
                                    </button>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-gray-400 flex items-center gap-1"><MessageSquare size={12} /> {translations[language].label_request}</label>
                                        <button onClick={() => handleVoiceInput('request')} className={`p-1.5 rounded-full ${listeningField === 'request' ? 'bg-brand-secondary text-white animate-pulse' : 'bg-gray-100'}`}><Mic size={14} /></button>
                                    </div>
                                    <textarea name="request" value={formData.request} onChange={handleInputChange} placeholder={listeningField === 'request' ? translations[language].msg_listening : translations[language].placeholder_request} className="w-full text-sm font-medium outline-none text-gray-800 resize-none h-32 bg-transparent leading-relaxed" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'flights' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2 px-1"><Sparkles size={18} className="text-amber-500" /> {translations[language].tab_choices}</h3>
                                    <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar snap-x px-1">
                                        {recommendedTrips.map((trip) => (
                                            <motion.div key={trip.id} whileTap={{ scale: 0.98 }} onClick={() => handleRecommendedClick(trip)} className="min-w-[180px] h-[260px] rounded-[1.75rem] relative overflow-hidden shadow-2xl cursor-pointer group shrink-0 border border-white/10">
                                                <img src={trip.img} alt={trip.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                                                {/* 배지 표시 */}
                                                <div className="absolute top-3 left-3 flex gap-1">
                                                    {trip.isHot && <span className="bg-brand-danger text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">HOT</span>}
                                                    {trip.isPremium && <span className="bg-brand-accent text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">PREMIUM</span>}
                                                </div>

                                                <div className="absolute bottom-0 left-0 right-0 p-5 text-left">
                                                    <span className="text-[10px] font-black text-amber-400 mb-1.5 block uppercase tracking-wider">{language === 'en' ? (trip.enCity || trip.city) : trip.city}</span>
                                                    <h4 className="text-white font-bold text-base leading-snug mb-1.5 line-clamp-2">{language === 'en' ? (trip.enTitle || trip.title) : trip.title}</h4>
                                                    <p className="text-[10px] text-gray-300 font-medium line-clamp-2 opacity-80 leading-relaxed">{language === 'en' ? (trip.enDesc || trip.desc || "Meow Pro Special") : (trip.desc || "냥프로 전용 일정")}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-brand-primary/5 p-4 rounded-3xl border border-brand-primary/10">
                                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2 mb-4"><Plane className="text-brand-primary" size={20} /> {translations[language].tab_flight}</h3>
                                    {mySchedules.length > 0 ? (
                                        <div className="space-y-3">
                                            {mySchedules.map((item) => (
                                                <motion.div key={item.id} whileTap={{ scale: 0.98 }} onClick={() => handleTripClick(item)} className="bg-white p-4 rounded-2xl border border-brand-primary/10 shadow-sm cursor-pointer hover:border-brand-primary/30 transition-all relative group overflow-hidden">
                                                    <button onClick={(e) => handleDeleteTrip(e, item.id, item.destination || item.title)} className="absolute top-4 right-4 z-20 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-brand-danger opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-xl shrink-0">✈️</div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-800 text-sm truncate">
                                                                    {language === 'en' ? `Trip to ${item.destination || item.title}` : `${item.destination || item.title} 여행`}
                                                                </h4>
                                                                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                                    <span>{item.startDate || translations[language].schedule_tbd}</span>
                                                                    {item.iata && <span className="bg-gray-100 px-1.5 rounded text-gray-400 font-medium">{item.iata}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="text-gray-300 group-hover:text-brand-primary transition-colors" size={20} />
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200"><p className="text-xs">{translations[language].schedule_empty}</p></div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 항공권 오버레이 */}
                <AnimatePresence>
                    {selectedTrip && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-gray-100 flex flex-col">
                            <div className="bg-white px-5 py-4 flex items-center gap-3 shadow-sm z-10 shrink-0">
                                <button onClick={() => setSelectedTrip(null)} className="p-1 rounded-full hover:bg-gray-100"><ArrowRight className="rotate-180" size={24} /></button>
                                <h3 className="font-bold text-lg">{language === 'en' ? `Flights to ${selectedTrip.destination}` : `${selectedTrip.destination} 항공권`}</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {isSearching ? (
                                    [1, 2, 3].map(i => (<div key={i} className="bg-white h-32 rounded-2xl animate-pulse" />))
                                ) : flightResults.length > 0 ? (
                                    flightResults.map((flight) => (
                                        <div key={flight.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 relative">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-2"><span className="font-bold text-sm text-gray-700">{flight.carrierCode}</span></div>
                                                <div className="text-right">
                                                    <span className="block text-lg font-black text-brand-primary">
                                                        {language === 'en' ? `from ₩${flight.price.toLocaleString()}` : `${flight.price.toLocaleString()}원~`}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-4">
                                                <button onClick={() => window.open(flight.linkTripMobile || flight.linkTrip || flight.linkGlobal, '_blank')} className="flex-1 py-3 bg-[#2467F5] text-white font-bold rounded-xl shadow-sm hover:scale-[1.02] active:scale-95 transition-all text-sm sm:text-base">{translations[language].flight_btn_trip}</button>
                                                <button onClick={() => window.open(flight.linkGlobal, '_blank')} className="flex-1 py-3 bg-brand-accent text-white font-bold rounded-xl shadow-sm hover:scale-[1.02] active:scale-95 transition-all text-sm sm:text-base">{translations[language].flight_btn_avia}</button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-16 text-gray-400 flex flex-col items-center">
                                        <p className="font-bold mb-2">{translations[language].flight_empty}</p>
                                        <button onClick={() => { const t = selectedTrip; setSelectedTrip(null); setManualAirport({ show: true, trip: t, searchStr: "", error: "" }); }} className="px-4 py-2 bg-brand-primary/10 text-brand-primary font-bold rounded-xl mt-4">{translations[language].flight_empty_btn}</button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 하단 생성 버튼 */}
                {activeTab === 'create' && (
                    <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white/95 to-transparent z-30">
                        <button onClick={generatePlan} disabled={loading} onMouseEnter={() => setIsButtonHovered(true)} onMouseLeave={() => setIsButtonHovered(false)} className={`w-full py-4 rounded-2xl font-bold text-xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${isLuxury ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white" : "bg-gradient-to-r from-brand-primary to-brand-secondary text-white"}`}>
                            {loading ? <><Sparkles className="animate-spin" size={24} /> {loadingText}</> : translations[language].btn_generate}
                        </button>
                    </div>
                )}
            </motion.div>

            {/* 전역 하단 네비게이션바 (로그인 유저 기준) */}
            {(user || session) && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[570px] px-6 z-50 animate-fadeIn">
                    <nav className="bg-white/70 backdrop-blur-2xl border border-white/50 shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-[32px] px-2 py-2.5 flex justify-around items-center">
                        <button onClick={() => {
                            if (activeTab !== 'create') setActiveTab('create');
                        }} className={`flex flex-col items-center gap-1 p-2 w-[58px] sm:w-[70px] transition ${activeTab === 'create' ? 'text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary scale-110' : 'text-gray-500 hover:text-brand-primary'}`}><HomeIcon size={24} strokeWidth={activeTab === 'create' ? 2.5 : 2} className={activeTab === 'create' ? 'text-brand-primary' : ''} /><span className="text-[9px] sm:text-[10px] font-bold break-keep whitespace-nowrap">홈</span></button>
                        <button onClick={() => router.push('/mypage?tab=social')} className="flex flex-col items-center gap-1 p-2 w-[58px] sm:w-[70px] text-gray-500 hover:text-brand-primary transition"><Users size={24} strokeWidth={2} /><span className="text-[9px] sm:text-[10px] font-bold break-keep whitespace-nowrap">동행</span></button>
                        <button onClick={() => router.push('/mypage?tab=schedule')} className="flex flex-col items-center gap-1 p-2 w-[58px] sm:w-[70px] text-gray-500 hover:text-brand-primary transition"><Calendar size={24} strokeWidth={2} /><span className="text-[9px] sm:text-[10px] font-bold break-keep whitespace-nowrap">일정</span></button>
                        <button onClick={() => router.push('/mypage?tab=coach')} className="flex flex-col items-center gap-1 p-2 w-[58px] sm:w-[70px] text-gray-500 hover:text-brand-primary transition"><Sparkles size={24} strokeWidth={2} /><span className="text-[9px] sm:text-[10px] font-bold break-keep whitespace-nowrap">코치</span></button>
                        <button onClick={() => router.push('/mypage?tab=wallet')} className="flex flex-col items-center gap-1 p-2 w-[58px] sm:w-[70px] text-gray-500 hover:text-brand-primary transition"><Wallet size={24} strokeWidth={2} /><span className="text-[9px] sm:text-[10px] font-bold break-keep whitespace-nowrap">트립머니</span></button>
                        <button onClick={() => router.push('/mypage?tab=vault')} className="flex flex-col items-center gap-1 p-2 w-[58px] sm:w-[70px] text-gray-500 hover:text-brand-primary transition"><Box size={24} strokeWidth={2} /><span className="text-[9px] sm:text-[10px] font-bold break-keep whitespace-nowrap">보관함</span></button>
                    </nav>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { height: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}