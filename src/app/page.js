"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// 스플래시 import
import SplashScreen from "../components/SplashScreen";
import useFcmToken from '../hooks/useFcmToken';

// 컴포넌트 import
import CatMascot from '../components/CatMascot';
import AIResult from "../components/AIResult";

// 아이콘 & 라이브러리
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
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'; // 👈 추가
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signInWithRedirect, signInWithPopup, getRedirectResult, GoogleAuthProvider, updateProfile, signInWithCredential } from "firebase/auth";
import {
    doc, getDoc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp,
    collection, getDocs, addDoc, query, orderBy, onSnapshot, where
} from "firebase/firestore";

// --- 상수 데이터 ---
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
    "🌿 퇴사기념 멍때리기",
    "🍜 관광지 말고 찐맛집",
    "🙅‍♂️ 사람 많은 곳은 패스",
    "🚶‍♂️ 계획없는 여유로운 산책",
    "👨‍👩‍👧‍👦 부모님 맞춤 효도여행",
    "🎒 돈 아끼는 짠내투어"
];

const cleanTagText = (tag) => {
    return tag.replace(/[^가-힣\s]/g, '').trim();
};

const CITY_TO_IATA = {
    "인천": "ICN", "Incheon": "ICN", "서울": "ICN", "Seoul": "ICN",
    "김포": "GMP", "Gimpo": "GMP",
    "부산": "PUS", "Busan": "PUS", "김해": "PUS",
    "제주": "CJU", "Jeju": "CJU",
    "대구": "TAE", "Daegu": "TAE",
    "청주": "CJJ", "Cheongju": "CJJ",
    "오사카": "KIX", "Osaka": "KIX", "간사이": "KIX",
    "도쿄": "NRT", "Tokyo": "NRT", "나리타": "NRT", "하네다": "HND",
    "후쿠오카": "FUK", "Fukuoka": "FUK",
    "삿포로": "CTS", "Sapporo": "CTS", "치토세": "CTS", "홋카이도": "CTS",
    "오키나와": "OKA", "Okinawa": "OKA", "나하": "OKA",
    "나고야": "NGO", "Nagoya": "NGO",
    "교토": "KIX", "Kyoto": "KIX",
    "홍콩": "HKG", "Hong Kong": "HKG",
    "마카오": "MFM", "Macau": "MFM",
    "타이베이": "TPE", "Taipei": "TPE", "대만": "TPE", "Taiwan": "TPE",
    "가오슝": "KHH", "Kaohsiung": "KHH",
    "상하이": "PVG", "Shanghai": "PVG", "푸동": "PVG",
    "베이징": "PEK", "Beijing": "PEK", "북경": "PEK",
    "칭다오": "TAO", "Qingdao": "TAO",
    "다낭": "DAD", "Danang": "DAD", "Da Nang": "DAD",
    "나트랑": "CXR", "Nha Trang": "CXR",
    "하노이": "HAN", "Hanoi": "HAN",
    "호치민": "SGN", "Ho Chi Minh": "SGN", "사이공": "SGN",
    "푸꾸옥": "PQC", "Phu Quoc": "PQC",
    "베트남": "DAD",
    "방콕": "BKK", "Bangkok": "BKK", "수완나품": "BKK",
    "치앙마이": "CNX", "Chiang Mai": "CNX",
    "푸켓": "HKT", "Phuket": "HKT",
    "태국": "BKK",
    "세부": "CEB", "Cebu": "CEB",
    "보홀": "TAG", "Bohol": "TAG",
    "마닐라": "MNL", "Manila": "MNL",
    "보라카이": "KLO", "Boracay": "KLO", "칼리보": "KLO",
    "필리핀": "CEB",
    "싱가포르": "SIN", "Singapore": "SIN",
    "발리": "DPS", "Bali": "DPS", "덴파사르": "DPS",
    "자카르타": "CGK", "Jakarta": "CGK",
    "코타키나발루": "BKI", "Kota Kinabalu": "BKI",
    "쿠알라룸푸르": "KUL", "Kuala Lumpur": "KUL",
    "파리": "CDG", "Paris": "CDG",
    "니스": "NCE", "Nice": "NCE", "남부 프랑스": "NCE", "South France": "NCE",
    "마르세유": "MRS", "Marseille": "MRS", "Marseilles": "MRS",
    "리옹": "LYS", "Lyon": "LYS",
    "프랑스": "CDG", "France": "CDG",
    "로마": "FCO", "Rome": "FCO", "Roma": "FCO",
    "밀라노": "MXP", "Milan": "MXP", "Milano": "MXP",
    "베네치아": "VCE", "Venice": "VCE", "Venezia": "VCE",
    "피렌체": "FLR", "Florence": "FLR", "Firenze": "FLR",
    "나폴리": "NAP", "Naples": "NAP", "Napoli": "NAP",
    "이탈리아": "FCO", "Italy": "FCO",
    "바르셀로나": "BCN", "Barcelona": "BCN",
    "마드리드": "MAD", "Madrid": "MAD",
    "세비야": "SVQ", "Seville": "SVQ",
    "스페인": "MAD", "Spain": "MAD",
    "그라나다": "GRX", "Granada": "GRX",
    "리스본": "LIS", "Lisbon": "LIS",
    "포르투": "OPO", "Porto": "OPO",
    "런던": "LHR", "London": "LHR", "히드로": "LHR",
    "영국": "LHR", "UK": "LHR",
    "맨체스터": "MAN", "Manchester": "MAN",
    "에든버러": "EDI", "Edinburgh": "EDI",
    "프랑크푸르트": "FRA", "Frankfurt": "FRA",
    "뮌헨": "MUC", "Munich": "MUC",
    "베를린": "BER", "Berlin": "BER",
    "취리히": "ZRH", "Zurich": "ZRH",
    "제네바": "GVA", "Geneva": "GVA",
    "인터라켄": "ZRH", "Interlaken": "ZRH",
    "스위스": "ZRH", "Switzerland": "ZRH",
    "암스테르담": "AMS", "Amsterdam": "AMS", "네덜란드": "AMS",
    "브뤼셀": "BRU", "Brussels": "BRU", "벨기에": "BRU",
    "프라하": "PRG", "Prague": "PRG", "체코": "PRG",
    "비엔나": "VIE", "Vienna": "VIE", "오스트리아": "VIE",
    "부다페스트": "BUD", "Budapest": "BUD", "헝가리": "BUD",
    "동유럽": "PRG",
    "이스탄불": "IST", "Istanbul": "IST", "튀르키예": "IST", "터키": "IST",
    "아테네": "ATH", "Athens": "ATH", "그리스": "ATH",
    "산토리니": "JTR", "Santorini": "JTR",
    "자그레브": "ZAG", "Zagreb": "ZAG", "크로아티아": "ZAG",
    "뉴욕": "JFK", "New York": "JFK",
    "로스앤젤레스": "LAX", "Los Angeles": "LAX", "LA": "LAX", "엘에이": "LAX",
    "샌프란시스코": "SFO", "San Francisco": "SFO",
    "라스베이거스": "LAS", "Las Vegas": "LAS",
    "시애틀": "SEA", "Seattle": "SEA",
    "하와이": "HNL", "Hawaii": "HNL", "호놀룰루": "HNL",
    "괌": "GUM", "Guam": "GUM",
    "사이판": "SPN", "Saipan": "SPN",
    "밴쿠버": "YVR", "Vancouver": "YVR", "캐나다": "YVR",
    "토론토": "YYZ", "Toronto": "YYZ",
    "칸쿤": "CUN", "Cancun": "CUN",
    "시드니": "SYD", "Sydney": "SYD", "호주": "SYD",
    "멜버른": "MEL", "Melbourne": "MEL",
    "브리즈번": "BNE", "Brisbane": "BNE",
    "오클랜드": "AKL", "Auckland": "AKL", "뉴질랜드": "AKL",
    "두바이": "DXB", "Dubai": "DXB",
    "아부다비": "AUH", "Abu Dhabi": "AUH",
    "리야드": "RUH", "Riyadh": "RUH", "사우디": "RUH",
    "쿠웨이트": "KWI", "Kuwait": "KWI",
    "제다": "JED", "Jeddah": "JED",
    "도하": "DOH", "Doha": "DOH",
    "카이로": "CAI", "Cairo": "CAI", "이집트": "CAI",
    "케이프타운": "CPT", "Cape Town": "CPT", "남아공": "CPT",
    "요하네스버그": "JNB", "Johannesburg": "JNB",
    "카사블랑카": "CMN", "Casablanca": "CMN", "모로코": "CMN"
};

const RECOMMENDED_TRIPS = [
    { id: 1, city: "오사카", title: "🍜 식도락 힐링 여행", img: "https://images.unsplash.com/photo-1590559899731-a382839e5549?q=80&w=600&auto=format&fit=crop", desc: "먹다가 망한다는 오사카!" },
    { id: 2, city: "다낭", title: "🏖️ 가족과 함께 휴양", img: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=600&auto=format&fit=crop", desc: "경기도 다낭시로 초대합니다" },
    { id: 3, city: "파리", title: "🗼 낭만의 도시 산책", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop", desc: "에펠탑 보며 와인 한잔" },
];

const translations = {
    ko: {
        title_pre: "Trip Maker,",
        title_main: '"냥 프로"',
        title_sub: "나만의 여행",
        tab_schedule: "🗓️ 나만의 여행",
        tab_flight: "실시간 항공권",
        tab_myflight: "✈️ 내 일정 항공권",
        tab_choices: "냥프로의 강력 추천!",
        label_where: "어떤 여행을 떠나고 싶나요?",
        label_when: "언제 떠나세요?",
        placeholder_dest: "예: 조용히 멍때리고 싶어 (음성 가능)",
        placeholder_date: "날짜 선택 (최대 30일)",
        label_companion: "동행자",
        label_budget: "1인 예산",
        label_people: "인원",
        label_contact: "연락처 (필수)",
        placeholder_contact: "카톡ID 또는 이메일",
        label_request: "추가 요청사항",
        placeholder_request: "예: 부모님이 계셔서 걷는 건 줄여주세요.",
        btn_generate: "✨ 나만의 여행 만들기!",
        btn_luxury_off: "👑 럭셔리 여행 체험하기",
        btn_luxury_on: "💎 VIP 플랜 생성",
        msg_loading: "AI가 당신의 여행을 만들고 있어요...",
        msg_listening: "듣고 있어요...",
    },
    en: {
        title_pre: "Trip Maker,",
        title_main: "Meow AI",
        title_sub: "My Own Trip",
        tab_schedule: "🗓️ My Trip",
        tab_flight: "Real-time Flights",
        tab_myflight: "✈️ Flights of my trips",
        tab_choices: "Meow Pro's Choices!",
        label_where: "What kind of trip do you want?",
        label_when: "When do you leave?",
        placeholder_dest: "e.g. A quiet walk in Kyoto",
        placeholder_date: "Select dates (Max 30 days)",
        label_companion: "Companion",
        label_budget: "Budget (per person)",
        label_people: "Travelers",
        label_contact: "Contact (Required)",
        placeholder_contact: "Email or Messenger ID",
        label_request: "Special Requests",
        placeholder_request: "ex: Less walking for parents.",
        btn_generate: "✨ Make My Trip!",
        btn_luxury_off: "👑 Try Luxury Mode",
        btn_luxury_on: "💎 Create VIP Plan",
        msg_loading: "AI is creating your trip...",
        msg_listening: "Listening...",
    }
};

const findIataCode = (text) => {
    if (!text) return null;
    const lowerText = text.toLowerCase();
    for (const [city, code] of Object.entries(CITY_TO_IATA)) {
        const isKorean = /[가-힣]/.test(city);
        if (isKorean) {
            if (lowerText.includes(city)) return code;
        } else {
            const regex = new RegExp(`\\b${city.toLowerCase()}\\b`);
            if (regex.test(lowerText)) return code;
        }
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

export default function Home() {
    const router = useRouter();
    const { token, notificationPermission } = useFcmToken();

    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("AI가 여행 계획을 짜고 있어요...");
    const [recommendedTrips, setRecommendedTrips] = useState([]);

    const [showNicknameModal, setShowNicknameModal] = useState(false);
    const [nicknameInput, setNicknameInput] = useState("");

    useEffect(() => {
        if (!loading) return;
        const messages = [
            "AI가 여행지를 분석하고 있어요... 🧐",
            "최적의 항공권을 찾고 있습니다... ✈️",
            "현지 맛집 리스트를 훑어보는 중... 🍜",
            "동선을 최적화하고 있어요... 🗺️",
            "가성비 좋은 숙소를 찾고 있습니다... 🏨",
            "거의 다 됐습니다! 냥냥! 🐾"
        ];
        let index = 0;
        setLoadingText(messages[0]);
        const interval = setInterval(() => {
            index = (index + 1) % messages.length;
            setLoadingText(messages[index]);
        }, 3000);
        return () => clearInterval(interval);
    }, [loading]);

    const [manualAirport, setManualAirport] = useState({ show: false, trip: null, searchStr: "", error: "" });
    const [showSplash, setShowSplash] = useState(true);
    const [language, setLanguage] = useState('ko');
    const [result, setResult] = useState(null);
    const [bgIndex, setBgIndex] = useState(0);
    const [user, setUser] = useState(null);
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

    // ✨ regionType (국내/해외/알아서) 추가
    const [formData, setFormData] = useState({
        destination: "", startDate: "", endDate: "", companion: "연인",
        people: 2, budget: 100, hotelType: "호텔", tourType: "자유여행",
        themes: [], request: "", regionType: "auto", // 기본값: AI 알아서
    });

    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                const q = query(collection(db, "rectrips"), orderBy("createdAt", "desc"));
                const snapshot = await getDocs(q);
                const recList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setRecommendedTrips(recList);
            } catch (error) {
                console.error("추천 여행 로딩 실패:", error);
            }
        };
        fetchRecommendations();
    }, []);

    useEffect(() => {
        const hasShownSplash = sessionStorage.getItem('hasShownSplash');
        if (hasShownSplash) setShowSplash(false);

        const timer = setInterval(() => setBgIndex((prev) => (prev + 1) % backgroundImages.length), 5000);

        const checkStandalone = () => {
            const isApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
            setIsStandalone(isApp);
        };
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
                if (userDoc.exists()) {
                    setUserData(userDoc.data());
                }
            }

            const params = new URLSearchParams(window.location.search);
            if (currentUser && params.get('mode') !== 'new') {
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    router.push('/mypage');
                } else {
                    setShowNicknameModal(true);
                }
                return;
            }
            if (currentUser) {
                const tripsQ = query(
                    collection(db, "trips"),
                    where("memberIds", "array-contains", currentUser.uid),
                    orderBy("createdAt", "desc")
                );

                unsubscribeTrips = onSnapshot(tripsQ, (snapshot) => {
                    const loadedTrips = snapshot.docs.map(doc => {
                        const data = doc.data();
                        let iataCode = null;
                        const dest = data.destination || "";
                        Object.keys(CITY_TO_IATA).forEach(city => {
                            if (dest.includes(city)) iataCode = CITY_TO_IATA[city];
                        });
                        return {
                            id: doc.id, title: dest ? dest : "나의 여행",
                            subtitle: data.startDate ? `${data.startDate} 출발` : "날짜 미정",
                            icon: "✈️", iata: iataCode, ...data
                        };
                    });
                    setMySchedules(loadedTrips);
                }, (error) => { console.error("실시간 연동 실패:", error); });
            } else { setMySchedules([]); }
        });

        const params = new URLSearchParams(window.location.search);
        if (params.get('ref')) localStorage.setItem('referralCode', params.get('ref'));

        return () => {
            clearInterval(timer);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            unsubscribeAuth();
            if (unsubscribeTrips) unsubscribeTrips();
        };
    }, []);

    const handleLoginClick = async () => {
        // 1. 로딩 시작 (onAuthStateChanged가 페이지를 이동시킬 때까지 유지)
        setLoading(true);
        setLoadingText("구글 계정 연결 중... 🔐");

        try {
            const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform();

            if (isNative) {
                console.log("네이티브 구글 로그인 시도...");
                // 💡 [중요] 이미 PushInitializer에서 initialize를 했다면 여기서 또 할 필요가 없습니다.
                // 만약 에러가 지속되면 아래처럼 signIn 직전에 아주 짧은 대기를 주면 브릿지가 안정화됩니다.
                const googleUser = await GoogleAuth.signIn();

                const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
                await signInWithCredential(auth, credential);
                console.log("네이티브 로그인 성공!");
            } else {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
            }
            // ✅ 성공 시: 메인/마이페이지의 onAuthStateChanged가 감지하여 자동으로 이동시킵니다.
        } catch (error) {
            console.error("로그인 에러 상세:", error);
            setLoading(false); // ❌ 에러 발생 시엔 로딩창을 걷어줘야 합니다.

            if (error.message?.includes('disallowed_useragent')) {
                alert("여전히 웹뷰 방식으로 인식됩니다. npx cap sync를 확인해주세요.");
            } else if (error.message?.includes('12501')) {
                // 사용자가 계정 선택창을 그냥 닫았을 때 (Canceled)
                console.log("로그인이 취소되었습니다.");
            } else {
                alert("🚨 로그인 중 문제가 발생했습니다: " + error.message);
            }
        }
    };

    const handleCompleteSignUp = async () => {
        if (!nicknameInput.trim()) { alert("앱에서 사용할 멋진 닉네임을 먼저 입력해주세요!"); return; }
        if (!auth.currentUser) return;

        try {
            await updateProfile(auth.currentUser, { displayName: nicknameInput });
            const userRef = doc(db, "users", auth.currentUser.uid);
            await setDoc(userRef, {
                uid: auth.currentUser.uid,
                email: auth.currentUser.email,
                name: nicknameInput,
                photoURL: auth.currentUser.photoURL,
                points: 1000,
                createdAt: serverTimestamp()
            });
            setShowNicknameModal(false);
            router.push('/mypage');
        } catch (error) {
            console.error(error);
            alert("가입 처리 중 문제가 발생했습니다.");
        }
    };

    const handleDeleteTrip = async (e, tripId, destination) => {
        e.stopPropagation();
        if (!confirm(`'${destination}' 일정을 목록에서 삭제하시겠습니까?`)) return;
        try {
            if (user) {
                await deleteDoc(doc(db, "trips", tripId));
                setMySchedules(prev => prev.filter(trip => trip.id !== tripId));
                alert("삭제되었습니다.");
            }
        } catch (error) { alert("삭제 중 오류가 발생했습니다."); }
    };

    const parseSpokenDate = (text) => {
        const today = new Date();
        const year = today.getFullYear();
        let start = null; let end = null;
        if (text.includes('내일')) { start = new Date(today); start.setDate(today.getDate() + 1); }
        else if (text.includes('모레')) { start = new Date(today); start.setDate(today.getDate() + 2); }
        else if (text.includes('글피')) { start = new Date(today); start.setDate(today.getDate() + 3); }
        else if (text.includes('오늘')) { start = new Date(today); }

        const dateMatches = [...text.matchAll(/(\d+)월\s*(\d+)일/g)];
        if (dateMatches.length > 0) {
            const m1 = parseInt(dateMatches[0][1]) - 1;
            const d1 = parseInt(dateMatches[0][2]);
            start = new Date(year, m1, d1);
            if (start < today) { start.setFullYear(year + 1); }
            if (dateMatches.length > 1) {
                const m2 = parseInt(dateMatches[1][1]) - 1;
                const d2 = parseInt(dateMatches[1][2]);
                end = new Date(year, m2, d2);
                if (end < start) end.setFullYear(year + 1);
            }
        }
        return [start, end];
    };

    const VOICE_SEQUENCE = ['destination', 'date', 'companion', 'budget', 'people', 'tourType', 'request'];
    const handleVoiceInput = (targetField) => {
        if (!('webkitSpeechRecognition' in window)) { alert("크롬 브라우저에서 사용해주세요!"); return; }
        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = language === 'en' ? 'en-US' : 'ko-KR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        setListeningField(targetField);

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            if (targetField === 'date') {
                const [newStart, newEnd] = parseSpokenDate(text);
                if (newStart) {
                    setDateRange([newStart, newEnd]);
                    setFormData(prev => ({
                        ...prev,
                        startDate: newStart.toISOString().split('T')[0],
                        endDate: newEnd ? newEnd.toISOString().split('T')[0] : newStart.toISOString().split('T')[0]
                    }));
                }
            } else {
                setFormData(prev => {
                    if (targetField === 'budget') { const num = text.replace(/[^0-9]/g, ''); return num ? { ...prev, budget: parseInt(num) } : prev; }
                    else if (targetField === 'people') {
                        let num = text.replace(/[^0-9]/g, '');
                        if (!num) {
                            if (text.includes('한') || text.includes('1')) num = 1;
                            else if (text.includes('두') || text.includes('둘') || text.includes('2')) num = 2;
                            else if (text.includes('세') || text.includes('셋') || text.includes('3')) num = 3;
                            else if (text.includes('네') || text.includes('넷') || text.includes('4')) num = 4;
                        }
                        return num ? { ...prev, people: Math.max(1, Math.min(20, parseInt(num))) } : prev;
                    }
                    else if (targetField === 'companion') {
                        if (text.includes('혼자') || text.includes('나홀로')) return { ...prev, companion: '혼자' };
                        if (text.includes('연인') || text.includes('커플')) return { ...prev, companion: '연인' };
                        if (text.includes('친구')) return { ...prev, companion: '친구' };
                        if (text.includes('가족') || text.includes('부모') || text.includes('아이')) return { ...prev, companion: '가족' };
                        if (text.includes('출장') || text.includes('비즈니스')) return { ...prev, companion: '비즈니스' };
                        return prev;
                    }
                    else if (targetField === 'tourType') {
                        if (text.includes('자유')) return { ...prev, tourType: '자유여행' };
                        if (text.includes('소그룹')) return { ...prev, tourType: '소그룹' };
                        if (text.includes('패키지')) return { ...prev, tourType: '패키지' };
                        return prev;
                    }
                    else if (targetField === 'request' && prev.request) { return { ...prev, [targetField]: prev.request + " " + text }; }
                    return { ...prev, [targetField]: text };
                });
            }
        };

        recognition.onend = () => {
            setListeningField(null);
            const currentIndex = VOICE_SEQUENCE.indexOf(targetField);
            if (currentIndex !== -1 && currentIndex < VOICE_SEQUENCE.length - 1) {
                const nextField = VOICE_SEQUENCE[currentIndex + 1];
                setTimeout(() => {
                    try {
                        const confirmNext = confirm(`다음 단계인 '${nextField}'(으)로 넘어갈까요? (확인을 누르면 마이크가 켜집니다)`);
                        if (confirmNext) handleVoiceInput(nextField);
                    } catch (e) { console.log("연속 실행 차단됨"); }
                }, 500);
            }
        };
        recognition.start();
    };

    const formatDateForAPI = (dateString) => {
        if (!dateString) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
        const parts = dateString.match(/\d+/g);
        if (parts && parts.length >= 3) { return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`; }
        return null;
    };

    const proceedFlightSearch = async (trip, arrivalCode, returnOriginCode) => {
        const depDateStr = formatDateForAPI(trip.startDate);
        if (!depDateStr) return;
        let retDateStr = formatDateForAPI(trip.endDate);
        if (!retDateStr) { const d = new Date(depDateStr); d.setDate(d.getDate() + 4); retDateStr = d.toISOString().split('T')[0]; }
        setSelectedTrip({ ...trip, iata: arrivalCode, returnIata: returnOriginCode, returnDateCalc: retDateStr });
        setIsSearching(true); setFlightResults([]);
        try {
            const res = await fetch('/api/flights/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destinationCode: arrivalCode, returnOriginCode: returnOriginCode, departureDate: depDateStr, returnDate: retDateStr, language: language, destinationName: trip.destination || trip.title }) });
            const data = await res.json();
            if (data.flights) { setFlightResults(data.flights); } else { setFlightResults([]); }
        } catch (error) { console.error(error); } finally { setIsSearching(false); }
    };

    const handleTripClick = async (trip) => {
        const searchText = `${trip.destination || ''} ${trip.title || ''}`;
        let arrivalCode = findIataCode(searchText);
        let returnOriginCode = arrivalCode;
        if (!arrivalCode) { arrivalCode = trip.arrivalIata || trip.iata; returnOriginCode = trip.departureIata || trip.iata; }
        if (!arrivalCode || arrivalCode.length !== 3) { setManualAirport({ show: true, trip: trip, searchStr: "", error: "" }); return; }
        proceedFlightSearch(trip, arrivalCode, returnOriginCode);
    };

    const handleManualSubmit = () => {
        const input = manualAirport.searchStr.trim();
        if (!input) { setManualAirport(prev => ({ ...prev, error: "도시명이나 공항 코드를 입력해주세요." })); return; }
        let resolvedCode = null;
        if (/^[A-Za-z]{3}$/.test(input)) { resolvedCode = input.toUpperCase(); } else { resolvedCode = findIataCode(input); }
        if (resolvedCode) {
            const trip = manualAirport.trip;
            setManualAirport({ show: false, trip: null, searchStr: "", error: "" });
            proceedFlightSearch(trip, resolvedCode, resolvedCode);
        } else { setManualAirport(prev => ({ ...prev, error: "공항을 찾을 수 없습니다. (예: 발리, DPS)" })); }
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
            } else alert("오류: " + (data.error || "생성 실패"));
        } catch (error) { alert("서버 오류 발생"); } finally { setLoading(false); }
    };

    const handleRecommendedClick = (trip) => { router.push(`/share/${trip.id}`); };

    if (result) return <AIResult data={result} userInfo={formData} language={language} onReset={() => setResult(null)} />;

    return (
        <div className="h-screen w-full flex justify-center items-center bg-gray-900 sm:p-4 font-sans relative overflow-hidden">

            {/* ✨ 스플래시 화면 */}
            <AnimatePresence>
                {showSplash && (
                    <SplashScreen onFinish={() => {
                        setShowSplash(false);
                        sessionStorage.setItem('hasShownSplash', 'true');
                    }} />
                )}
            </AnimatePresence>

            {/* ✨ 닉네임 입력 모달 */}
            <AnimatePresence>
                {showNicknameModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
                            <button onClick={() => setShowNicknameModal(false)} className="absolute top-4 right-4 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>

                            <div className="flex justify-center mb-4 mt-2">
                                <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center shadow-inner"><User size={28} /></div>
                            </div>

                            <h3 className="text-xl font-black text-center text-gray-800 mb-2">닉네임 설정</h3>
                            <p className="text-sm text-center text-gray-500 mb-6 leading-relaxed">
                                여행 메이트에게 보여질<br />멋진 닉네임을 입력해주세요!
                            </p>

                            <div className="mb-5 relative">
                                <input
                                    type="text"
                                    placeholder="예: 냥프로123"
                                    value={nicknameInput}
                                    onChange={(e) => setNicknameInput(e.target.value)}
                                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-bold text-center text-lg placeholder-gray-300"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCompleteSignUp()}
                                    autoFocus
                                />
                            </div>

                            <button
                                onClick={handleCompleteSignUp}
                                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-lg rounded-2xl shadow-lg hover:bg-indigo-600 transition active:scale-95 flex items-center justify-center gap-2"
                            >
                                가입 완료하고 1,000P 받기 ✨
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 수동 공항 모달 */}
            <AnimatePresence>
                {manualAirport.show && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
                            <button onClick={() => setManualAirport({ show: false, trip: null, searchStr: "", error: "" })} className="absolute top-4 right-4 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"><X size={20} /></button>
                            <div className="flex justify-center mb-4 mt-2"><div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shadow-inner"><MapPin size={28} /></div></div>
                            <h3 className="text-xl font-black text-center text-gray-800 mb-2">도착 공항 직접 입력</h3>
                            <p className="text-sm text-center text-gray-500 mb-6 break-keep leading-relaxed">'<span className="font-bold text-rose-500">{manualAirport.trip?.destination || manualAirport.trip?.title}</span>' 지역의 공항 정보를 찾지 못했어요.<br />가까운 도시명이나 공항 코드(3자리)를 입력해 주세요.</p>
                            <div className="mb-5 relative">
                                <input type="text" placeholder="예: 발리, 롬복, DPS" value={manualAirport.searchStr} onChange={(e) => setManualAirport({ ...manualAirport, searchStr: e.target.value, error: "" })} className={`w-full px-4 py-4 bg-gray-50 border rounded-2xl outline-none transition-all font-bold text-center text-lg placeholder-gray-300 ${manualAirport.error ? 'border-rose-400 focus:ring-rose-100' : 'border-gray-200 focus:border-slate-800 focus:ring-2 focus:ring-slate-100'}`} onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()} />
                                {manualAirport.error && <p className="text-[11px] text-rose-500 text-center mt-2 font-bold animate-pulse">{manualAirport.error}</p>}
                            </div>
                            <button onClick={handleManualSubmit} className="w-full py-4 bg-slate-900 text-white font-bold text-lg rounded-2xl shadow-lg hover:bg-slate-800 transition active:scale-95 flex items-center justify-center gap-2"><Plane size={18} /> 공항 검색 및 적용</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute inset-0 z-0">
                <AnimatePresence mode='wait'><motion.img key={bgIndex} src={backgroundImages[bgIndex]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0 w-full h-full object-cover" /></AnimatePresence>
                <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* ✨ 메인 콘텐츠 박스 확장 (max-w-[440px] -> max-w-[500px] -> max-w-[560px]) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[560px] h-full sm:h-[95vh] bg-white/95 backdrop-blur-md sm:rounded-[35px] shadow-2xl overflow-hidden relative flex flex-col z-10">

                <div className="px-2 pt-6 pb-2 shrink-0 flex justify-between items-center bg-white/50 backdrop-blur-sm z-20">
                    <img src="/logo1.png" alt="Logo" className="h-8 w-auto object-contain" />

                    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                        <button
                            onClick={() => setLanguage(prev => prev === 'ko' ? 'en' : 'ko')}
                            className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-all"
                        >
                            <Globe size={20} className={language === 'en' ? "text-indigo-600" : "text-gray-400"} />
                            <span className="absolute -bottom-4 text-[10px] font-bold text-gray-500">{language === 'ko' ? 'KR' : 'EN'}</span>
                        </button>

                        {user ? (
                            <div
                                onClick={() => router.push('/mypage')}
                                className="flex items-center gap-2.5 cursor-pointer group hover:bg-white/60 p-1.5 -ml-1.5 rounded-[20px] transition backdrop-blur-sm"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600 flex items-center justify-center overflow-hidden border-2 border-white shadow-md shrink-0">
                                    {userData?.profileImgBase64 || user?.photoURL ? (
                                        <img src={userData?.profileImgBase64 || user?.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={18} />
                                    )}
                                </div>
                                <div className="hidden sm:block">
                                    <h1 className="text-sm font-black text-gray-900 flex items-center gap-0.5 drop-shadow-sm break-keep whitespace-nowrap">
                                        {userData?.name || user?.displayName || "여행자"} <ChevronRight size={14} className="text-gray-600 group-hover:text-rose-600 transition" />
                                    </h1>
                                    <div className="text-[9px] text-gray-800 font-bold mt-0.5 flex gap-1">
                                        {userData?.travelTags?.length > 0
                                            ? userData.travelTags.slice(0, 1).map((tag, i) => <span key={i} className="bg-white/80 border border-gray-100 px-1.5 py-0.5 rounded-md shadow-sm break-keep whitespace-nowrap">{tag}</span>)
                                            : <span className="text-gray-500 bg-white/80 px-1.5 py-0.5 rounded-md shadow-sm break-keep whitespace-nowrap">프로필 설정</span>
                                        }
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative flex flex-col items-end">
                                <button
                                    onClick={handleLoginClick}
                                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm shadow-lg shadow-rose-500/30 flex items-center gap-2 hover:from-rose-600 hover:to-pink-600 transition-all active:scale-95 break-keep whitespace-nowrap"
                                >
                                    <LogIn size={16} /><span>로그인</span>
                                </button>

                                <div className="absolute top-[125%] right-0 mt-1 w-[180px] z-50 pointer-events-none animate-[bounce_2s_infinite]">
                                    <div className="relative bg-white/95 backdrop-blur-sm border border-gray-100 text-gray-800 text-[11px] font-bold px-3 py-2 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.1)] text-center leading-tight">
                                        <div className="absolute -top-1 right-8 w-3 h-3 bg-white border-t border-l border-gray-100 rotate-45"></div>
                                        <span className="text-[#FF5A5F] break-keep">지금 로그인</span>해서 취향이 맞는<br />여행 메이트를 만나보세요.✨
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide pt-2 pb-32">
                    <div className="mb-8 mt-6 px-2">
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.6, ease: "backOut" }}
                            className="relative bg-gradient-to-br from-white to-rose-50/80 rounded-[1.5rem] p-4 border border-white shadow-lg shadow-indigo-100/50"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-200/20 rounded-full blur-3xl -z-10" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-200/20 rounded-full blur-3xl -z-10" />
                            <div className="flex flex-row items-center justify-center gap-4">
                                <div className="shrink-0 relative">
                                    <CatMascot width={90} />
                                    <div className="absolute inset-0 bg-white/60 blur-xl rounded-full -z-10 scale-90" />
                                </div>
                                <div className="text-left">
                                    {/* ✨ 단어 잘림 방지: break-keep 클래스 추가 */}
                                    <h2 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight break-keep">
                                        <span className="block text-gray-700 text-lg sm:text-xl font-bold mb-1 opacity-80">{translations[language].title_pre}</span>
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-indigo-800 to-gray-800 whitespace-nowrap">{translations[language].title_main}</span>🪄<br />
                                        <span className="relative inline-block mt-1">
                                            <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-[#FF5A5F] via-rose-500 to-amber-500 whitespace-nowrap">{translations[language].title_sub}</span>
                                            <span className="absolute inset-x-0 bottom-2 h-3 bg-indigo-100 -z-10 skew-x-12 rounded-sm opacity-60" />
                                        </span>
                                    </h2>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm px-2 border-b border-gray-100 flex mb-6">
                        {/* ✨ 단어 잘림 방지: whitespace-nowrap 클래스 추가 */}
                        <button onClick={() => setActiveTab('create')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors break-keep whitespace-nowrap ${activeTab === 'create' ? 'border-rose-500 text-gray-900' : 'border-transparent text-gray-400'}`}>{translations[language].tab_schedule}</button>
                        <button onClick={() => setActiveTab('flights')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors break-keep whitespace-nowrap ${activeTab === 'flights' ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-400'}`}>{translations[language].tab_myflight}</button>
                    </div>

                    <div className="px-2 pb-10">
                        {activeTab === 'create' && (
                            <div className="space-y-6 animate-fadeIn">

                                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-500 break-keep">
                                            <Sparkles size={16} className="text-[#FF5A5F]" />
                                            {language === 'en' ? "What kind of trip do you want?" : "어떤 여행을 떠나고 싶나요?"}
                                        </label>
                                        <button onClick={() => handleVoiceInput('destination')} className={`p-2 rounded-full transition-all ${listeningField === 'destination' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                                            <Mic size={16} />
                                        </button>
                                    </div>

                                    <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                                        <button
                                            onClick={() => setFormData({ ...formData, regionType: 'auto' })}
                                            className={`flex-1 text-xs font-bold py-2 rounded-lg transition break-keep whitespace-nowrap ${formData.regionType === 'auto' ? 'bg-white text-rose-500 shadow-sm' : 'text-gray-500'}`}
                                        >
                                            🤖 AI 알아서
                                        </button>
                                        <button
                                            onClick={() => setFormData({ ...formData, regionType: 'domestic' })}
                                            className={`flex-1 text-xs font-bold py-2 rounded-lg transition break-keep whitespace-nowrap ${formData.regionType === 'domestic' ? 'bg-white text-rose-500 shadow-sm' : 'text-gray-500'}`}
                                        >
                                            🇰🇷 국내만
                                        </button>
                                        <button
                                            onClick={() => setFormData({ ...formData, regionType: 'international' })}
                                            className={`flex-1 text-xs font-bold py-2 rounded-lg transition break-keep whitespace-nowrap ${formData.regionType === 'international' ? 'bg-white text-rose-500 shadow-sm' : 'text-gray-500'}`}
                                        >
                                            ✈️ 해외로
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        name="destination"
                                        value={formData.destination}
                                        onChange={handleInputChange}
                                        placeholder={listeningField === 'destination' ? translations[language].msg_listening : (language === 'en' ? "e.g. A quiet walk in Kyoto" : "예: 조용히 멍때리고 싶어")}
                                        className="w-full text-xl font-bold text-gray-800 placeholder-gray-300 outline-none bg-transparent mb-4"
                                    />

                                    {/* 빠른 취향 태그 */}
                                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-50">
                                        {QUICK_TAGS.map((tag, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    const cleanTag = cleanTagText(tag);
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        destination: prev.destination ? `${prev.destination}, 그리고 ${cleanTag}` : cleanTag
                                                    }));
                                                }}
                                                className="bg-gray-50 border border-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-[12px] font-bold transition hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 active:scale-95 break-keep whitespace-nowrap"
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-500 break-keep">
                                            <Calendar size={16} className="text-[#FF5A5F]" /> {translations[language].label_when}
                                        </label>
                                        <button onClick={() => handleVoiceInput('date')} className={`p-2 rounded-full transition-all ${listeningField === 'date' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}><Mic size={16} /></button>
                                    </div>
                                    <DatePicker selectsRange={true} startDate={startDate} endDate={endDate} onChange={handleDateChange} minDate={new Date()} locale={ko} dateFormat="yyyy.MM.dd" placeholderText={listeningField === 'date' ? "말씀해주세요 (예: 3월 5일)" : translations[language].placeholder_date} className="w-full text-lg font-bold text-gray-800 bg-transparent outline-none cursor-pointer placeholder-gray-300" wrapperClassName="w-full" />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-bold text-gray-600 block px-1 break-keep">{translations[language].label_companion}</label>
                                        <button onClick={() => handleVoiceInput('companion')} className={`p-1.5 rounded-full transition-all ${listeningField === 'companion' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}><Mic size={14} /></button>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2">
                                        {companionOptions.map((opt) => (
                                            <button key={opt.id} onClick={() => setFormData({ ...formData, companion: opt.id })} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all gap-1 ${formData.companion === opt.id ? 'bg-[#FF5A5F] text-white shadow-md scale-105 font-bold' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                                {opt.icon} <span className="text-[10px] break-keep whitespace-nowrap">{language === 'en' ? opt.id : opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className={`p-4 rounded-3xl border relative transition-all ${isLuxury ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100 shadow-sm"}`}>
                                    <div className="flex gap-4 items-center justify-between">
                                        {isLuxury ? (
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 text-amber-600 font-bold mb-1 break-keep whitespace-nowrap"><Sparkles size={16} /> VIP 예산</div>
                                                <p className="text-xs text-gray-500 break-keep">무제한 (AI 최적화)</p>
                                            </div>
                                        ) : (
                                            <div className="flex-1">
                                                <div className="flex items-center gap-1 mb-1">
                                                    <label className="text-xs font-bold text-gray-500 flex items-center gap-1 break-keep whitespace-nowrap"><Wallet size={12} /> {translations[language].label_budget}</label>
                                                    <button onClick={() => handleVoiceInput('budget')} className={`p-1 rounded-full transition-all ${listeningField === 'budget' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}><Mic size={12} /></button>
                                                </div>
                                                <div className="flex items-end gap-1 mb-2">
                                                    <span className="text-xl font-bold text-[#FF5A5F]">{formData.budget.toLocaleString()}</span>
                                                    <span className="text-sm text-gray-400 break-keep whitespace-nowrap">{language === 'en' ? '0,000 KRW' : '만원'}</span>
                                                </div>
                                                <input type="range" name="budget" min="50" max="1000" step="10" value={formData.budget} onChange={handleInputChange} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF5A5F]" />
                                            </div>
                                        )}
                                        <div className="w-[1px] h-10 bg-gray-100"></div>
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center gap-1 mb-1">
                                                <label className="text-xs font-bold text-gray-500 break-keep whitespace-nowrap">{translations[language].label_people}</label>
                                                <button onClick={() => handleVoiceInput('people')} className={`p-1 rounded-full transition-all ${listeningField === 'people' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}><Mic size={12} /></button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => updatePeople(-1)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 shrink-0">-</button>
                                                <span className="font-bold text-gray-800 w-4 text-center">{formData.people}</span>
                                                <button onClick={() => updatePeople(1)} className="w-8 h-8 rounded-full bg-[#FF5A5F] text-white font-bold hover:bg-rose-600 shrink-0">+</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className="text-sm font-bold text-gray-600 px-1 break-keep">여행 스타일</label>
                                        <button onClick={() => handleVoiceInput('tourType')} className={`p-1.5 rounded-full transition-all ${listeningField === 'tourType' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}><Mic size={14} /></button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {tourOptions.map((option) => (
                                            <button key={option.id} onClick={() => setFormData({ ...formData, tourType: option.id })} className={`py-3 px-2 rounded-2xl border transition-all flex flex-col items-center text-center ${formData.tourType === option.id ? 'bg-white border-[#FF5A5F] text-[#FF5A5F] shadow-md ring-1 ring-[#FF5A5F]' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                                                <span className="font-bold text-sm mb-1 break-keep whitespace-nowrap">{option.label}</span>
                                                <span className="text-[10px] opacity-70 break-keep">{option.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={toggleLuxuryMode} className={`w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border break-keep whitespace-nowrap ${isLuxury ? "bg-amber-500 text-white border-amber-500 shadow-amber-200" : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"}`}>
                                        {isLuxury ? <><Crown size={16} fill="white" /> {translations[language].btn_luxury_on}</> : <><Crown size={16} /> {translations[language].btn_luxury_off}</>}
                                    </button>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-gray-400 flex items-center gap-1 break-keep whitespace-nowrap"><MessageSquare size={12} /> {translations[language].label_request}</label>
                                        <button onClick={() => handleVoiceInput('request')} className={`p-1.5 rounded-full transition-all ${listeningField === 'request' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}><Mic size={14} /></button>
                                    </div>
                                    <textarea name="request" value={formData.request} onChange={handleInputChange} placeholder={listeningField === 'request' ? translations[language].msg_listening : "예: 니스 IN, 마르세유 OUT으로 짜줘. 빈티지 벼룩시장과 아울렛 쇼핑 꼭 넣어줘! (음성으로 길게 말씀하셔도 됩니다)"} className="w-full text-sm font-medium outline-none text-gray-800 resize-none h-40 bg-transparent custom-scrollbar leading-relaxed break-keep" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'flights' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg mb-3 px-1 flex items-center gap-2 break-keep whitespace-nowrap"><Sparkles size={18} className="text-amber-500" /><span>{translations[language].tab_choices}</span></h3>
                                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x px-1">
                                        {recommendedTrips.map((trip) => (
                                            <motion.div key={trip.id} whileTap={{ scale: 1.0 }} onClick={() => handleRecommendedClick(trip)} className="min-w-[160px] h-[220px] rounded-2xl relative overflow-hidden shadow-md snap-center cursor-pointer group bg-gray-100 shrink-0">
                                                <img src={trip.img} alt={trip.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                                <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                                                    <span className="text-[10px] font-bold text-amber-400 mb-1 block tracking-wider uppercase drop-shadow-md break-keep whitespace-nowrap">{trip.city || "추천 여행"} {trip.tripPath ? " 🔗" : ""}</span>
                                                    <h4 className="text-white font-bold text-sm leading-tight mb-1 line-clamp-2 drop-shadow-md break-keep">{trip.title || trip.tripTitle || "제목 없음"}</h4>
                                                    <p className="text-[10px] text-gray-300 line-clamp-1 opacity-90 break-keep">{trip.desc || "관리자 추천 일정"}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-indigo-900 text-lg flex items-center gap-2 break-keep whitespace-nowrap"><Plane className="text-indigo-600" size={20} /> {translations[language].tab_flight}</h3>
                                    </div>
                                    {mySchedules.length > 0 ? (
                                        <div className="space-y-3">
                                            {mySchedules.map((item) => (
                                                <motion.div key={item.id} whileTap={{ scale: 0.98 }} onClick={() => handleTripClick(item)} className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm cursor-pointer hover:border-indigo-300 transition-all relative overflow-hidden group">
                                                    <button onClick={(e) => handleDeleteTrip(e, item.id, item.destination || item.title)} className="absolute top-4 right-4 z-20 p-2 bg-gray-50 rounded-full text-gray-400 hover:bg-rose-100 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0" title="일정 삭제"><Trash2 size={16} /></button>
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-3 w-full pr-8">
                                                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-xl shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">✈️</div>
                                                            <div className="overflow-hidden">
                                                                <h4 className="font-bold text-gray-800 text-sm truncate break-keep whitespace-nowrap w-full">{item.destination || item.title} 여행</h4>
                                                                <div className="text-[10px] text-gray-500 flex items-center gap-1 break-keep whitespace-nowrap"><span>{item.startDate || "날짜 미정"}</span>{item.iata && <span className="bg-gray-100 px-1.5 rounded text-gray-400 font-medium">{item.iata}</span>}</div>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="text-gray-300 group-hover:text-indigo-500 shrink-0" size={20} />
                                                    </div>
                                                    <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center"><span className="text-[10px] text-gray-400 break-keep whitespace-nowrap">클릭하여 최저가 확인하기</span><span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full break-keep whitespace-nowrap">Search</span></div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200"><p className="text-xs mb-2 break-keep">아직 참여중인 일정이 없어요.</p><p className="text-[10px] break-keep">왼쪽 탭에서 나만의 일정을 만들어보세요!</p></div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {selectedTrip && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-gray-100 flex flex-col">
                            <div className="bg-white px-5 py-4 flex items-center gap-3 shadow-sm z-10 shrink-0">
                                <button onClick={() => setSelectedTrip(null)} className="p-1 -ml-1 rounded-full hover:bg-gray-100 shrink-0"><ArrowRight className="rotate-180" size={24} /></button>
                                <div className="overflow-hidden"><h3 className="font-bold text-lg leading-tight truncate break-keep whitespace-nowrap w-full">{selectedTrip.destination} 항공권</h3><p className="text-xs text-gray-500 flex items-center gap-1 break-keep whitespace-nowrap">{selectedTrip.startDate} <ArrowLeftRight size={10} /> {selectedTrip.returnDateCalc} (왕복)</p></div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {isSearching ? (
                                    [1, 2, 3].map(i => (<div key={i} className="bg-white h-32 rounded-2xl animate-pulse" />))
                                ) : flightResults.length > 0 ? (
                                    flightResults.map((flight) => (
                                        <div key={flight.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 hover:border-indigo-500 transition-all relative">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-2">
                                                    {flight.isFallback || flight.carrierCode === 'ALL' ? (
                                                        <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0"><Search size={16} /></div>
                                                    ) : (
                                                        <img src={`https://pics.avs.io/99/36/${flight.carrierCode}.png`} alt={flight.airline} className="w-8 h-8 rounded object-contain bg-white border border-gray-100 shrink-0" onError={(e) => { e.target.style.display = 'none' }} />
                                                    )}
                                                    <span className="font-bold text-sm text-gray-700 break-keep whitespace-nowrap">{flight.isFallback ? "전체 항공사 검색" : flight.carrierCode}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-lg font-black text-indigo-600 break-keep whitespace-nowrap">{flight.price === 0 ? "최저가 확인" : `${flight.price.toLocaleString()}원~`}</span>
                                                    {!flight.isFallback && <span className="text-[10px] text-gray-400 break-keep whitespace-nowrap">예상 최저가</span>}
                                                </div>
                                            </div>
                                            {!flight.isFallback && (
                                                <div className="flex items-center justify-between px-1 mb-2">
                                                    <div className="text-center w-10 shrink-0"><div className="text-base font-bold text-gray-800 break-keep whitespace-nowrap">{flight.outbound.depTime}</div><div className="text-[10px] text-gray-400">ICN</div></div>
                                                    <div className="flex-1 px-3 flex flex-col items-center">
                                                        <div className="text-[10px] text-gray-400 mb-1 break-keep whitespace-nowrap">{Math.floor(flight.outbound.duration / 60) > 0 ? `${Math.floor(flight.outbound.duration / 60)}시간 ` : ""}{flight.outbound.duration % 60}분</div>
                                                        <div className="w-full h-[1px] bg-gray-300 relative flex items-center justify-center"><Plane size={12} className="text-gray-400 rotate-90 bg-white px-0.5" /></div>
                                                        <div className="text-[10px] text-indigo-500 mt-1 break-keep whitespace-nowrap">{flight.transfers === 0 ? "직항" : `${flight.transfers}회 경유`}</div>
                                                    </div>
                                                    <div className="text-center w-10 shrink-0"><div className="text-base font-bold text-gray-800 break-keep whitespace-nowrap">도착</div><div className="text-[10px] text-gray-400">{selectedTrip.iata}</div></div>
                                                </div>
                                            )}
                                            <div className="flex gap-2 mt-3">
                                                <button onClick={() => { const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent); let targetUrl = flight.linkGlobal; if (language === 'ko') { targetUrl = (isMobile && flight.linkTripMobile) ? flight.linkTripMobile : (flight.linkTrip || flight.linkGlobal); } window.open(targetUrl, '_blank'); }} className="flex-1 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2 break-keep whitespace-nowrap">
                                                    {flight.isFallback ? (language === 'ko' ? "Trip.com 최저가 조회" : "Check Prices") : (language === 'ko' ? "Trip.com에서 예약" : "Book Now")} <ExternalLink size={14} className="shrink-0" />
                                                </button>
                                                {language === 'ko' && (
                                                    <button onClick={() => window.open(flight.linkGlobal, '_blank')} className="flex-1 py-3 bg-rose-500 text-white border border-indigo-200 font-bold text-sm rounded-xl hover:bg-rose-600 transition-colors shadow-sm flex items-center justify-center gap-2 break-keep whitespace-nowrap">
                                                        글로벌 최저가 조회 <Search size={14} className="shrink-0" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-16 text-gray-400 flex flex-col items-center justify-center">
                                        <p className="font-bold text-gray-600 mb-2 break-keep whitespace-nowrap">검색된 항공권이 없습니다.</p>
                                        <p className="text-xs mb-6 leading-relaxed break-keep">해당 공항(<span className="font-bold text-rose-500">{selectedTrip?.iata}</span>)으로 가는 노선이 없거나,<br />AI가 엉뚱한 공항을 지정했을 수 있습니다.</p>
                                        <button onClick={() => { const tripToRetry = selectedTrip; setSelectedTrip(null); setManualAirport({ show: true, trip: tripToRetry, searchStr: "", error: "" }); }} className="px-2 py-3 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-xl hover:bg-indigo-100 transition-colors shadow-sm flex items-center gap-2 active:scale-95 break-keep whitespace-nowrap">
                                            <Search size={16} className="shrink-0" /> 다른 공항으로 직접 검색하기
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {activeTab === 'create' && (
                    <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white/95 to-transparent z-30">
                        <button onClick={generatePlan} disabled={loading} onMouseEnter={() => setIsButtonHovered(true)} onMouseLeave={() => setIsButtonHovered(false)} className={`w-full py-4 rounded-2xl font-bold text-xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 break-keep whitespace-nowrap ${isLuxury ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-200 text-white" : "bg-gradient-to-r from-[#FF5A5F] to-[#FF3D43] shadow-rose-200 text-white hover:shadow-rose-400 hover:-translate-y-1"}`}>
                            {loading ? <><Sparkles className="animate-spin" size={24} /> {loadingText}</> : isLuxury ? translations[language].btn_luxury_on : (isButtonHovered ? translations[language].btn_generate : translations[language].btn_generate)}
                        </button>
                    </div>
                )}

            </motion.div>
            <style jsx global>{`
               .custom-scrollbar::-webkit-scrollbar { height: 8px; }
               .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
               .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
               .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #cbd5e1; }
            `}</style>
        </div>
    );
}