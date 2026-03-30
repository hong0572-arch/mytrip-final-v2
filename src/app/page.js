"use client";

// --- 라이브러리 및 설정 Import ---
import { signIn, signOut, useSession } from "next-auth/react"; // Kakao Login용
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// 스플래시 및 훅
import SplashScreen from "../components/SplashScreen";
import useFcmToken from '../hooks/useFcmToken';

// 컴포넌트
import CatMascot from '../components/CatMascot';
import AIResult from "../components/AIResult";

// 아이콘 및 UI 라이브러리
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin, Calendar, Wallet, User, Sparkles, Users, Compass, Heart, Baby, Briefcase,
    Crown, Download, X, LogIn, Search, Mic, MessageSquare, ExternalLink, Bell, BellRing,
    RefreshCw, TrendingDown, Plane, CheckCircle, ArrowRight, Clock, ChevronRight,
    ArrowLeftRight, Trash2, Globe
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from 'date-fns/locale';

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
    { id: '비즈니스', label: '출장', icon: <Briefcase size={20} /> },
];

const QUICK_TAGS = [
    "🌿 퇴사기념 멍때리기", "🍜 관광지 말고 찐맛집", "🙅‍♂️ 사람 많은 곳은 패스",
    "🚶‍♂️ 계획없는 여유로운 산책", "👨‍👩‍👧‍👦 부모님 맞춤 효도여행", "🎒 돈 아끼는 짠내투어"
];

const cleanTagText = (tag) => tag.replace(/[^가-힣\s]/g, '').trim();

const CITY_TO_IATA = {
    "인천": "ICN", "Incheon": "ICN", "서울": "ICN", "Seoul": "ICN", "김포": "GMP", "Gimpo": "GMP",
    "부산": "PUS", "Busan": "PUS", "김해": "PUS", "제주": "CJU", "Jeju": "CJU", "대구": "TAE", "Daegu": "TAE",
    "청주": "CJJ", "Cheongju": "CJJ", "오사카": "KIX", "Osaka": "KIX", "간사이": "KIX", "도쿄": "NRT", "Tokyo": "NRT",
    "나리타": "NRT", "하네다": "HND", "후쿠오카": "FUK", "Fukuoka": "FUK", "삿포로": "CTS", "Sapporo": "CTS",
    "치토세": "CTS", "홋카이도": "CTS", "오키나와": "OKA", "Okinawa": "OKA", "나하": "OKA", "나고야": "NGO", "Nagoya": "NGO",
    "교토": "KIX", "Kyoto": "KIX", "홍콩": "HKG", "Hong Kong": "HKG", "마카오": "MFM", "Macau": "MFM",
    "타이베이": "TPE", "Taipei": "TPE", "대만": "TPE", "Taiwan": "TPE", "가오슝": "KHH", "Kaohsiung": "KHH",
    "상하이": "PVG", "Shanghai": "PVG", "푸동": "PVG", "베이징": "PEK", "Beijing": "PEK", "북경": "PEK",
    "칭다오": "TAO", "Qingdao": "TAO", "다낭": "DAD", "Danang": "DAD", "Da Nang": "DAD", "나트랑": "CXR",
    "Nha Trang": "CXR", "하노이": "HAN", "Hanoi": "HAN", "호치민": "SGN", "Ho Chi Minh": "SGN", "사이공": "SGN",
    "푸꾸옥": "PQC", "Phu Quoc": "PQC", "베트남": "DAD", "방콕": "BKK", "Bangkok": "BKK", "수완나품": "BKK",
    "치앙마이": "CNX", "Chiang Mai": "CNX", "푸켓": "HKT", "Phuket": "HKT", "태국": "BKK", "세부": "CEB", "Cebu": "CEB",
    "보홀": "TAG", "Bohol": "TAG", "마닐라": "MNL", "Manila": "MNL", "보라카이": "KLO", "Boracay": "KLO",
    "칼리보": "KLO", "필리핀": "CEB", "싱가포르": "SIN", "Singapore": "SIN", "발리": "DPS", "Bali": "DPS",
    "덴파사르": "DPS", "자카르타": "CGK", "Jakarta": "CGK", "코타키나발루": "BKI", "Kota Kinabalu": "BKI",
    "쿠알라룸푸르": "KUL", "Kuala Lumpur": "KUL", "파리": "CDG", "Paris": "CDG", "니스": "NCE", "Nice": "NCE",
    "남부 프랑스": "NCE", "South France": "NCE", "마르세유": "MRS", "Marseille": "MRS", "Marseilles": "MRS",
    "리옹": "LYS", "Lyon": "LYS", "프랑스": "CDG", "France": "CDG", "로마": "FCO", "Rome": "FCO", "Roma": "FCO",
    "밀라노": "MXP", "Milan": "MXP", "Milano": "MXP", "베네치아": "VCE", "Venice": "VCE", "Venezia": "VCE",
    "피렌체": "FLR", "Florence": "FLR", "Firenze": "FLR", "나폴리": "NAP", "Naples": "NAP", "Napoli": "NAP",
    "이탈리아": "FCO", "Italy": "FCO", "바르셀로나": "BCN", "Barcelona": "BCN", "마드리드": "MAD", "Madrid": "MAD",
    "세비야": "SVQ", "Seville": "SVQ", "스페인": "MAD", "Spain": "MAD", "그라나다": "GRX", "Granada": "GRX",
    "리스본": "LIS", "Lisbon": "LIS", "포르투": "OPO", "Porto": "OPO", "런던": "LHR", "London": "LHR",
    "히드로": "LHR", "영국": "LHR", "UK": "LHR", "맨체스터": "MAN", "Manchester": "MAN", "에든버러": "EDI",
    "Edinburgh": "EDI", "프랑크푸르트": "FRA", "Frankfurt": "FRA", "뮌헨": "MUC", "Munich": "MUC",
    "베를린": "BER", "Berlin": "BER", "취리히": "ZRH", "Zurich": "ZRH", "제네바": "GVA", "Geneva": "GVA",
    "인터라켄": "ZRH", "Interlaken": "ZRH", "스위스": "ZRH", "Switzerland": "ZRH", "암스테르담": "AMS",
    "Amsterdam": "AMS", "네덜란드": "AMS", "브뤼셀": "BRU", "Brussels": "BRU", "벨기에": "BRU",
    "프라하": "PRG", "Prague": "PRG", "체코": "PRG", "비엔나": "VIE", "Vienna": "VIE", "오스트리아": "VIE",
    "부다페스트": "BUD", "Budapest": "BUD", "헝가리": "BUD", "동유럽": "PRG", "이스탄불": "IST", "Istanbul": "IST",
    "튀르키예": "IST", "터키": "IST", "아테네": "ATH", "Athens": "ATH", "그리스": "ATH", "산토리니": "JTR",
    "Santorini": "JTR", "자그레브": "ZAG", "Zagreb": "ZAG", "크로아티아": "ZAG", "뉴욕": "JFK", "New York": "JFK",
    "로스앤젤레스": "LAX", "Los Angeles": "LAX", "LA": "LAX", "엘에이": "LAX", "샌프란시스코": "SFO",
    "San Francisco": "SFO", "라스베이거스": "LAS", "Las Vegas": "LAS", "시애틀": "SEA", "Seattle": "SEA",
    "하와이": "HNL", "Hawaii": "HNL", "호놀룰루": "HNL", "괌": "GUM", "Guam": "GUM", "사이판": "SPN",
    "Saipan": "SPN", "밴쿠버": "YVR", "Vancouver": "YVR", "캐나다": "YVR", "토론토": "YYZ", "Toronto": "YYZ",
    "칸쿤": "CUN", "Cancun": "CUN", "시드니": "SYD", "Sydney": "SYD", "호주": "SYD", "멜버른": "MEL",
    "Melbourne": "MEL", "브리즈번": "BNE", "Brisbane": "BNE", "오클랜드": "AKL", "Auckland": "AKL",
    "뉴질랜드": "AKL", "두바이": "DXB", "Dubai": "DXB", "아부다비": "AUH", "Abu Dhabi": "AUH",
    "리야드": "RUH", "Riyadh": "RUH", "사우디": "RUH", "쿠웨이트": "KWI", "Kuwait": "KWI", "제다": "JED",
    "Jeddah": "JED", "도하": "DOH", "Doha": "DOH", "카이로": "CAI", "Cairo": "CAI", "이집트": "CAI",
    "케이프타운": "CPT", "Cape Town": "CPT", "남아공": "CPT", "요하네스버그": "JNB", "Johannesburg": "JNB",
    "카사블랑카": "CMN", "Casablanca": "CMN", "모로코": "CMN"
};

const RECOMMENDED_TRIPS = [
    { id: 1, city: "오사카", title: "🍜 식도락 힐링 여행", img: "https://images.unsplash.com/photo-1590559899731-a382839e5549?q=80&w=600&auto=format&fit=crop", desc: "먹다가 망한다는 오사카!" },
    { id: 2, city: "다낭", title: "🏖️ 가족과 함께 휴양", img: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=600&auto=format&fit=crop", desc: "경기도 다낭시로 초대합니다" },
    { id: 3, city: "파리", title: "🗼 낭만의 도시 산책", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop", desc: "에펠탑 보며 와인 한잔" },
];

const translations = {
    ko: {
        title_pre: "Trip Maker,", title_main: '"냥 프로"', title_sub: "나만의 여행",
        tab_schedule: "🗓️ 나만의 여행", tab_flight: "실시간 항공권", tab_myflight: "✈️ 내 일정 항공권", tab_choices: "냥프로의 강력 추천!",
        label_where: "어떤 여행을 떠나고 싶나요?", label_when: "언제 떠나세요?", placeholder_dest: "예: 조용히 멍때리고 싶어 (음성 가능)", placeholder_date: "날짜 선택 (최대 30일)",
        label_companion: "동행자", label_budget: "1인 예산", label_people: "인원", label_contact: "연락처 (필수)", placeholder_contact: "카톡ID 또는 이메일",
        label_request: "추가 요청사항", placeholder_request: "예: 부모님이 계셔서 걷는 건 줄여주세요.",
        btn_generate: "✨ 나만의 여행 만들기!", btn_luxury_off: "👑 럭셔리 여행 체험하기", btn_luxury_on: "💎 VIP 플랜 생성",
        msg_loading: "AI가 당신의 여행을 만들고 있어요...", msg_listening: "듣고 있어요...",
    },
    en: {
        title_pre: "Trip Maker,", title_main: "Meow AI", title_sub: "My Own Trip",
        tab_schedule: "🗓️ My Trip", tab_flight: "Real-time Flights", tab_myflight: "✈️ Flights of my trips", tab_choices: "Meow Pro's Choices!",
        label_where: "What kind of trip do you want?", label_when: "When do you leave?", placeholder_dest: "e.g. A quiet walk in Kyoto", placeholder_date: "Select dates (Max 30 days)",
        label_companion: "Companion", label_budget: "Budget (per person)", label_people: "Travelers", label_contact: "Contact (Required)", placeholder_contact: "Email or Messenger ID",
        label_request: "Special Requests", placeholder_request: "ex: Less walking for parents.",
        btn_generate: "✨ Make My Trip!", btn_luxury_off: "👑 Try Luxury Mode", btn_luxury_on: "💎 Create VIP Plan",
        msg_loading: "AI is creating your trip...", msg_listening: "Listening...",
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
    const [formData, setFormData] = useState({
        destination: "", startDate: "", endDate: "", companion: "연인",
        people: 2, budget: 100, hotelType: "호텔", tourType: "자유여행",
        themes: [], request: "", regionType: "auto",
    });

    // --- Effect 로직 (원본 100% 유지) ---
    useEffect(() => {
        if (!loading) return;
        const messages = ["AI가 여행지를 분석하고 있어요... 🧐", "최적의 항공권을 찾고 있습니다... ✈️", "현지 맛집 리스트를 훑어보는 중... 🍜", "동선을 최적화하고 있어요... 🗺️", "가성비 좋은 숙소를 찾고 있습니다... 🏨", "거의 다 됐습니다! 냥냥! 🐾"];
        let index = 0; setLoadingText(messages[0]);
        const interval = setInterval(() => { index = (index + 1) % messages.length; setLoadingText(messages[index]); }, 3000);
        return () => clearInterval(interval);
    }, [loading]);

    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                const q = query(collection(db, "rectrips"), orderBy("createdAt", "desc"));
                const snapshot = await getDocs(q);
                setRecommendedTrips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) { console.error("추천 여행 로딩 실패:", error); }
        };
        fetchRecommendations();
    }, []);

    useEffect(() => {
        const hasShownSplash = sessionStorage.getItem('hasShownSplash');
        if (!hasShownSplash) setShowSplash(true);
        const timer = setInterval(() => setBgIndex((prev) => (prev + 1) % backgroundImages.length), 5000);
        const checkStandalone = () => { setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true); };
        checkStandalone();
        const handleAppInstalled = () => { setIsStandalone(true); setDeferredPrompt(null); };
        window.addEventListener('appinstalled', handleAppInstalled);
        const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        let unsubscribeTrips = null;
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (unsubscribeTrips) { unsubscribeTrips(); unsubscribeTrips = null; }
            if (currentUser) {
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
                        return { id: doc.id, title: data.destination || "나의 여행", subtitle: data.startDate ? `${data.startDate} 출발` : "날짜 미정", icon: "✈️", iata: iataCode, ...data };
                    }));
                });
            } else { setMySchedules([]); }
        });
        return () => { clearInterval(timer); window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt); window.removeEventListener('appinstalled', handleAppInstalled); unsubscribeAuth(); if (unsubscribeTrips) unsubscribeTrips(); };
    }, [router]);

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
                            } catch (e) {}
                            alert("Firebase 토큰 로그인 에러: " + (err.code || "unknown") + " / " + (err.message || err) + debugInfo + "\n\n오손된 세션을 초기화합니다. 다시 로그인해주세요!");
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
                alert("구형 세션 충돌 오류 (Token Missing). 세션을 초기화했습니다. 다시 로그인 버튼을 눌러주세요!");
                signOut({ redirect: false });
            }
        }
    }, [session, router]);

    // --- ✨ 로그인 핸들러 (통합 모달용) ---
    const handleGoogleLogin = async () => {
        setShowLoginModal(false);
        setLoading(true);
        setLoadingText("구글 계정 연결 중... 🔐");
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
            if (!error.message?.includes('12501')) alert("로그인 중 문제가 발생했습니다: " + error.message);
        }
    };

    const handleKakaoLogin = () => {
        setShowLoginModal(false);
        signIn("kakao", { callbackUrl: '/' }); // 반드시 메인 페이지로 와서 signInWithCustomToken을 먼저 실행해야 함
    };

    // --- 기존 핸들러 로직 (원본 100% 유지) ---
    const handleCompleteSignUp = async () => {
        if (!nicknameInput.trim()) { alert("닉네임을 입력해주세요!"); return; }
        if (!auth.currentUser) return;
        try {
            await updateProfile(auth.currentUser, { displayName: nicknameInput });
            await setDoc(doc(db, "users", auth.currentUser.uid), {
                uid: auth.currentUser.uid, email: auth.currentUser.email, name: nicknameInput, photoURL: auth.currentUser.photoURL, points: 1000, createdAt: serverTimestamp()
            });
            setShowNicknameModal(false); router.push('/mypage');
        } catch (error) { alert("가입 처리 중 문제가 발생했습니다."); }
    };

    const handleDeleteTrip = async (e, tripId, destination) => {
        e.stopPropagation();
        if (!confirm(`'${destination}' 일정을 삭제하시겠습니까?`)) return;
        try { if (user) await deleteDoc(doc(db, "trips", tripId)); } catch (error) { alert("삭제 오류 발생"); }
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
        if (!('webkitSpeechRecognition' in window)) { alert("크롬 브라우저를 사용해주세요!"); return; }
        const recognition = new window.webkitSpeechRecognition();
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
                setTimeout(() => { if (confirm(`다음 '${nextField}' 단계로 넘어갈까요?`)) handleVoiceInput(nextField); }, 500);
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
        } else { setManualAirport(prev => ({ ...prev, error: "공항을 찾을 수 없습니다." })); }
    };

    const toggleLuxuryMode = () => { setIsLuxury(!isLuxury); setFormData(prev => ({ ...prev, hotelType: !isLuxury ? "5성급 스위트룸/풀빌라" : "호텔" })); };
    const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleDateChange = (update) => { setDateRange(update); if (update[0] && update[1]) setFormData(prev => ({ ...prev, startDate: update[0].toISOString().split('T')[0], endDate: update[1].toISOString().split('T')[0] })); };
    const updatePeople = (delta) => setFormData(prev => ({ ...prev, people: Math.max(1, Math.min(20, prev.people + delta)) }));

    const generatePlan = async () => {
        if (!formData.destination) { alert("어떤 여행을 원하시는지 알려주세요!"); return; }
        if (!formData.startDate || !formData.endDate) { alert("날짜를 선택해주세요!"); return; }
        setLoading(true);
        try {
            const response = await fetch("/api/generate/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formData, isLuxury, language }) });
            const data = await response.json();
            if (data.result) {
                const { inCode, outCode } = extractIataFromItinerary(data.result);
                data.result.arrivalIata = inCode || data.result.arrivalIata;
                data.result.departureIata = outCode || data.result.departureIata;
                setResult(data.result);
            } else alert("생성 실패: " + data.error);
        } catch (error) { alert("서버 오류"); } finally { setLoading(false); }
    };

    const handleRecommendedClick = (trip) => { router.push(`/share/${trip.id}`); };

    if (result) return <AIResult data={result} userInfo={formData} language={language} onReset={() => setResult(null)} />;

    // --- 4. UI 렌더링 ---
    return (
        <div className="h-screen w-full flex justify-center items-center bg-gray-900 sm:p-4 font-sans relative overflow-hidden">
            {/* 스플래시 */}
            <AnimatePresence>{showSplash && <SplashScreen onFinish={() => { setShowSplash(false); sessionStorage.setItem('hasShownSplash', 'true'); }} />}</AnimatePresence>

            {/* 닉네임 설정 모달 */}
            <AnimatePresence>
                {showNicknameModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
                            <button onClick={() => setShowNicknameModal(false)} className="absolute top-4 right-4 p-2 text-gray-400"><X size={20} /></button>
                            <h3 className="text-xl font-black text-center text-gray-800 mb-2">닉네임 설정</h3>
                            <input type="text" placeholder="예: 냥프로123" value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} className="w-full px-4 py-4 bg-gray-50 border rounded-2xl outline-none font-bold text-center text-lg mb-4" />
                            <button onClick={handleCompleteSignUp} className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-lg rounded-2xl active:scale-95">가입 완료 ✨</button>
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
                            <h3 className="text-2xl font-black text-gray-800 mb-2">반가워요! 🐾</h3>
                            <p className="text-sm text-gray-500 mb-8 leading-relaxed">어떤 방식으로 로그인을 도와드릴까요?<br />지금 시작하면 <span className="text-rose-500 font-bold">1,000P</span>를 드려요!</p>

                            <div className="space-y-3">
                                <button onClick={handleKakaoLogin} className="w-full py-4 bg-[#FEE500] text-[#3c1e1e] font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition shadow-sm">
                                    <MessageSquare size={20} fill="#3c1e1e" /> 카카오로 계속하기
                                </button>
                                <button onClick={handleGoogleLogin} className="w-full py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition shadow-sm">
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" /> 구글로 계속하기
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
                            <h3 className="text-xl font-black text-center text-gray-800 mb-2">도착 공항 직접 입력</h3>
                            <p className="text-xs text-center text-gray-500 mb-4 font-bold text-rose-500">'{manualAirport.trip?.destination}' 공항을 입력해주세요.</p>
                            <input type="text" placeholder="예: 발리, DPS" value={manualAirport.searchStr} onChange={(e) => setManualAirport({ ...manualAirport, searchStr: e.target.value, error: "" })} className="w-full px-4 py-4 bg-gray-50 border rounded-2xl outline-none text-center font-bold" />
                            {manualAirport.error && <p className="text-[10px] text-rose-500 text-center mt-2">{manualAirport.error}</p>}
                            <button onClick={handleManualSubmit} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl mt-4">검색 및 적용</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 배경 */}
            <div className="absolute inset-0 z-0">
                <AnimatePresence mode='wait'><motion.img key={bgIndex} src={backgroundImages[bgIndex]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0 w-full h-full object-cover" /></AnimatePresence>
                <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* 메인 박스 */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[560px] h-full sm:h-[95vh] bg-white/95 backdrop-blur-md sm:rounded-[35px] shadow-2xl overflow-hidden relative flex flex-col z-10">
                {/* 헤더 */}
                <div className="px-2 pt-6 pb-2 shrink-0 flex justify-between items-center bg-white/50 backdrop-blur-sm z-20">
                    <img src="/logo1.png" alt="Logo" className="h-8 w-auto object-contain" />
                    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                        <button onClick={() => setLanguage(prev => prev === 'ko' ? 'en' : 'ko')} className="w-9 h-9 rounded-full bg-white/80 shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-100 transition">
                            <Globe size={20} className={language === 'en' ? "text-indigo-600" : "text-gray-400"} />
                        </button>
                        {user || session ? (
                            <div onClick={() => router.push('/mypage')} className="flex items-center gap-2 cursor-pointer group hover:bg-white/60 p-1.5 rounded-full transition">
                                <div className="w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden shrink-0">
                                    <img src={userData?.profileImgBase64 || user?.photoURL || session?.user?.image || "https://via.placeholder.com/40"} alt="Profile" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowLoginModal(true)} // ✨ 모달 오픈
                                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm shadow-lg shadow-rose-500/30 active:scale-95 transition-all"
                            >
                                로그인
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide pt-2 pb-32">
                    {/* 상단 배너 */}
                    <div className="mb-8 mt-6 px-2">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative bg-gradient-to-br from-white to-rose-50/80 rounded-[1.5rem] p-6 border border-white shadow-lg flex flex-row items-center justify-center gap-6">
                            <CatMascot width={90} />
                            <div className="text-left">
                                <h2 className="text-3xl sm:text-4xl font-black leading-tight break-keep">
                                    <span className="block text-gray-700 text-lg font-bold mb-1 opacity-80">{translations[language].title_pre}</span>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-indigo-800 to-gray-800">{translations[language].title_main}</span>🪄<br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5A5F] via-rose-500 to-amber-500">{translations[language].title_sub}</span>
                                </h2>
                            </div>
                        </motion.div>
                    </div>

                    {/* 탭 메뉴 */}
                    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm px-2 border-b flex mb-6">
                        <button onClick={() => setActiveTab('create')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'create' ? 'border-rose-500 text-gray-900' : 'border-transparent text-gray-400'}`}>{translations[language].tab_schedule}</button>
                        <button onClick={() => setActiveTab('flights')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'flights' ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-400'}`}>{translations[language].tab_myflight}</button>
                    </div>

                    <div className="px-2 pb-10">
                        {activeTab === 'create' && (
                            <div className="space-y-6 animate-fadeIn">
                                {/* 목적지 (원본 로직 유지) */}
                                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-500"><Sparkles size={16} className="text-[#FF5A5F]" /> {translations[language].label_where}</label>
                                        <button onClick={() => handleVoiceInput('destination')} className={`p-2 rounded-full ${listeningField === 'destination' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100'}`}><Mic size={16} /></button>
                                    </div>
                                    <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-5 gap-1.5 shadow-inner">
                                        {['auto', 'domestic', 'international', 'daytrip'].map(type => {
                                            const isDayTripActive = startDate && endDate && startDate.getTime() === endDate.getTime();
                                            const isActive = type === 'daytrip' ? isDayTripActive : (formData.regionType === type && !isDayTripActive);

                                            return (
                                                <button key={type} onClick={() => {
                                                    if (type === 'daytrip') {
                                                        if (isDayTripActive) {
                                                            // 토글 해제: 요청 사항만 제거하고 날짜는 그대로 유지
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                request: prev.request.replace(', 당일치기 여행', '').replace('당일치기 여행', '').trim()
                                                            }));
                                                            // 날짜 선택기를 다시 유연하게 만들기 위해 (필요시)
                                                            // 여기서는 단순히 텍스트만 지우는 것으로 충분할 수 있습니다.
                                                        } else {
                                                            // 토글 활성화: 당일치기로 설정
                                                            const baseDate = startDate || new Date();
                                                            setDateRange([baseDate, baseDate]);
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                startDate: baseDate.toISOString().split('T')[0],
                                                                endDate: baseDate.toISOString().split('T')[0],
                                                                request: prev.request ? (prev.request.includes('당일치기') ? prev.request : `${prev.request}, 당일치기 여행`) : '당일치기 여행'
                                                            }));
                                                        }
                                                    } else {
                                                        setFormData({ ...formData, regionType: type });
                                                    }
                                                }} className={`flex-1 text-xs sm:text-sm font-black py-3.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-white text-rose-500 shadow-md scale-[1.02]' : 'text-gray-500 hover:bg-white/50'}`}>
                                                    {type === 'auto' ? '🤖 AI 알아서' : type === 'domestic' ? '🇰🇷 국내만' : type === 'international' ? '✈️ 해외로' : '🌞 당일여행'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <input type="text" name="destination" value={formData.destination} onChange={handleInputChange} placeholder={listeningField === 'destination' ? translations[language].msg_listening : translations[language].placeholder_dest} className="w-full text-xl font-bold text-gray-800 bg-transparent outline-none mb-4" />
                                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-50">
                                        {QUICK_TAGS.map((tag, idx) => (
                                            <button key={idx} onClick={() => setFormData(prev => ({ ...prev, destination: prev.destination ? `${prev.destination}, ${cleanTagText(tag)}` : cleanTagText(tag) }))} className="bg-gray-50 border border-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-[12px] font-bold transition hover:bg-rose-50 active:scale-95">{tag}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* 날짜/인원/예산 (원본 유지) */}
                                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-500"><Calendar size={16} className="text-[#FF5A5F]" /> {translations[language].label_when}</label>
                                        <button onClick={() => handleVoiceInput('date')} className={`p-2 rounded-full ${listeningField === 'date' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100'}`}><Mic size={16} /></button>
                                    </div>
                                    <DatePicker selectsRange={true} startDate={startDate} endDate={endDate} onChange={handleDateChange} minDate={new Date()} locale={ko} dateFormat="yyyy.MM.dd" placeholderText={translations[language].placeholder_date} className="w-full text-lg font-bold bg-transparent outline-none cursor-pointer" wrapperClassName="w-full" />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-bold text-gray-600 block px-1">{translations[language].label_companion}</label>
                                        <button onClick={() => handleVoiceInput('companion')} className={`p-1.5 rounded-full ${listeningField === 'companion' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100'}`}><Mic size={14} /></button>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2">
                                        {companionOptions.map((opt) => (
                                            <button key={opt.id} onClick={() => setFormData({ ...formData, companion: opt.id })} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all gap-1 ${formData.companion === opt.id ? 'bg-[#FF5A5F] text-white shadow-md scale-105' : 'bg-gray-50 text-gray-400'}`}>
                                                {opt.icon} <span className="text-[10px] break-keep">{language === 'en' ? opt.id : opt.label}</span>
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
                                                    <button onClick={() => handleVoiceInput('budget')} className={`p-1 rounded-full ${listeningField === 'budget' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100'}`}><Mic size={12} /></button>
                                                </div>
                                                <div className="flex items-end gap-1 mb-2">
                                                    <span className="text-xl font-bold text-[#FF5A5F]">{formData.budget.toLocaleString()}</span>
                                                    <span className="text-sm text-gray-400">{language === 'en' ? '0,000 KRW' : '만원'}</span>
                                                </div>
                                                <input type="range" name="budget" min="50" max="1000" step="10" value={formData.budget} onChange={handleInputChange} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF5A5F]" />
                                            </div>
                                        )}
                                        <div className="w-[1px] h-10 bg-gray-100"></div>
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center gap-1 mb-1">
                                                <label className="text-xs font-bold text-gray-500">{translations[language].label_people}</label>
                                                <button onClick={() => handleVoiceInput('people')} className={`p-1 rounded-full ${listeningField === 'people' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100'}`}><Mic size={12} /></button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => updatePeople(-1)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-bold">-</button>
                                                <span className="font-bold text-gray-800 w-4 text-center">{formData.people}</span>
                                                <button onClick={() => updatePeople(1)} className="w-8 h-8 rounded-full bg-[#FF5A5F] text-white font-bold">+</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className="text-sm font-bold text-gray-600 px-1">여행 스타일</label>
                                        <button onClick={() => handleVoiceInput('tourType')} className={`p-1.5 rounded-full ${listeningField === 'tourType' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100'}`}><Mic size={14} /></button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {tourOptions.map((option) => (
                                            <button key={option.id} onClick={() => setFormData({ ...formData, tourType: option.id })} className={`py-3 px-2 rounded-2xl border transition-all flex flex-col items-center text-center ${formData.tourType === option.id ? 'bg-white border-[#FF5A5F] text-[#FF5A5F] shadow-md ring-1 ring-[#FF5A5F]' : 'bg-white border-gray-100 text-gray-400'}`}>
                                                <span className="font-bold text-sm mb-1">{option.label}</span>
                                                <span className="text-[10px] opacity-70">{option.desc}</span>
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
                                        <button onClick={() => handleVoiceInput('request')} className={`p-1.5 rounded-full ${listeningField === 'request' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100'}`}><Mic size={14} /></button>
                                    </div>
                                    <textarea name="request" value={formData.request} onChange={handleInputChange} placeholder={listeningField === 'request' ? translations[language].msg_listening : translations[language].placeholder_request} className="w-full text-sm font-medium outline-none text-gray-800 resize-none h-32 bg-transparent leading-relaxed" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'flights' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg mb-3 flex items-center gap-2"><Sparkles size={18} className="text-amber-500" /> {translations[language].tab_choices}</h3>
                                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x px-1">
                                        {recommendedTrips.map((trip) => (
                                            <motion.div key={trip.id} whileTap={{ scale: 1.0 }} onClick={() => handleRecommendedClick(trip)} className="min-w-[160px] h-[220px] rounded-2xl relative overflow-hidden shadow-md cursor-pointer group bg-gray-100 shrink-0">
                                                <img src={trip.img} alt={trip.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                                <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                                                    <span className="text-[10px] font-bold text-amber-400 mb-1 block uppercase">{trip.city || "추천 여행"}</span>
                                                    <h4 className="text-white font-bold text-sm leading-tight mb-1 line-clamp-2">{trip.title || trip.tripTitle}</h4>
                                                    <p className="text-[10px] text-gray-300 line-clamp-1 opacity-90">{trip.desc || "냥프로 추천 일정"}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100">
                                    <h3 className="font-bold text-indigo-900 text-lg flex items-center gap-2 mb-4"><Plane className="text-indigo-600" size={20} /> {translations[language].tab_flight}</h3>
                                    {mySchedules.length > 0 ? (
                                        <div className="space-y-3">
                                            {mySchedules.map((item) => (
                                                <motion.div key={item.id} whileTap={{ scale: 0.98 }} onClick={() => handleTripClick(item)} className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm cursor-pointer hover:border-indigo-300 transition-all relative group overflow-hidden">
                                                    <button onClick={(e) => handleDeleteTrip(e, item.id, item.destination || item.title)} className="absolute top-4 right-4 z-20 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-xl shrink-0">✈️</div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-800 text-sm truncate">{item.destination || item.title} 여행</h4>
                                                                <div className="text-[10px] text-gray-500 flex items-center gap-1"><span>{item.startDate || "날짜 미정"}</span>{item.iata && <span className="bg-gray-100 px-1.5 rounded text-gray-400 font-medium">{item.iata}</span>}</div>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="text-gray-300 group-hover:text-indigo-500 transition-colors" size={20} />
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200"><p className="text-xs">참여중인 일정이 없어요. 일정을 먼저 만들어보세요!</p></div>
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
                                <h3 className="font-bold text-lg">{selectedTrip.destination} 항공권</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {isSearching ? (
                                    [1, 2, 3].map(i => (<div key={i} className="bg-white h-32 rounded-2xl animate-pulse" />))
                                ) : flightResults.length > 0 ? (
                                    flightResults.map((flight) => (
                                        <div key={flight.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 relative">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-2"><span className="font-bold text-sm text-gray-700">{flight.carrierCode}</span></div>
                                                <div className="text-right"><span className="block text-lg font-black text-indigo-600">{flight.price.toLocaleString()}원~</span></div>
                                            </div>
                                            <div className="flex gap-2 mt-4">
                                                <button onClick={() => window.open(flight.linkTripMobile || flight.linkTrip || flight.linkGlobal, '_blank')} className="flex-1 py-3 bg-[#2467F5] text-white font-bold rounded-xl shadow-sm hover:scale-[1.02] active:scale-95 transition-all text-sm sm:text-base">Trip.com 최저가</button>
                                                <button onClick={() => window.open(flight.linkGlobal, '_blank')} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:scale-[1.02] active:scale-95 transition-all text-sm sm:text-base">Aviasales 예약</button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-16 text-gray-400 flex flex-col items-center">
                                        <p className="font-bold mb-2">검색된 항공권이 없습니다.</p>
                                        <button onClick={() => { const t = selectedTrip; setSelectedTrip(null); setManualAirport({ show: true, trip: t, searchStr: "", error: "" }); }} className="px-4 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-xl mt-4">공항 직접 검색하기</button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 하단 생성 버튼 */}
                {activeTab === 'create' && (
                    <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white/95 to-transparent z-30">
                        <button onClick={generatePlan} disabled={loading} onMouseEnter={() => setIsButtonHovered(true)} onMouseLeave={() => setIsButtonHovered(false)} className={`w-full py-4 rounded-2xl font-bold text-xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${isLuxury ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white" : "bg-gradient-to-r from-[#FF5A5F] to-[#FF3D43] text-white"}`}>
                            {loading ? <><Sparkles className="animate-spin" size={24} /> {loadingText}</> : translations[language].btn_generate}
                        </button>
                    </div>
                )}
            </motion.div>

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