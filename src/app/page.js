"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// 스플래시 import
import SplashScreen from "../components/SplashScreen";

import useFcmToken from '../hooks/useFcmToken'; // 경로 맞춰주세요

// 컴포넌트 import
import CatMascot from '../components/CatMascot';
import AIResult from "../components/AIResult";

// 아이콘 & 라이브러리
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin, Calendar, Wallet, User, Sparkles, Users, Compass, Heart, Baby, Briefcase,
    Crown, Download, X, LogIn, Search, Mic, MessageSquare, ExternalLink, Bell, BellRing,
    RefreshCw, TrendingDown, Plane, CheckCircle, ArrowRight, Clock, ChevronRight,
    ArrowLeftRight, Trash2, Globe // 🌍 Globe 아이콘 추가됨
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from 'date-fns/locale';

// Firebase
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
// firebase/firestore import 부분을 찾아 아래 코드로 교체하세요. (모든 기능 포함)
import {
    doc, getDoc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp,
    collection, getDocs, addDoc, query, orderBy, onSnapshot
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

const themeTags = ["#힐링🌿", "#먹방🍖", "#호캉스🏨", "#액티비티🏄", "#커플여행💑", "#가성비💰"];

// --- 공항 코드 매칭 (확장판) ---
// --- 공항 코드 매칭 (전 세계 주요 도시 & 지역명 대통합) ---
const CITY_TO_IATA = {
    // 🇰🇷 대한민국 (Korea)
    "인천": "ICN", "Incheon": "ICN", "서울": "ICN", "Seoul": "ICN",
    "김포": "GMP", "Gimpo": "GMP",
    "부산": "PUS", "Busan": "PUS", "김해": "PUS",
    "제주": "CJU", "Jeju": "CJU",
    "대구": "TAE", "Daegu": "TAE",
    "청주": "CJJ", "Cheongju": "CJJ",

    // 🇯🇵 일본 (Japan)
    "오사카": "KIX", "Osaka": "KIX", "간사이": "KIX",
    "도쿄": "NRT", "Tokyo": "NRT", "나리타": "NRT", "하네다": "HND",
    "후쿠오카": "FUK", "Fukuoka": "FUK",
    "삿포로": "CTS", "Sapporo": "CTS", "치토세": "CTS", "홋카이도": "CTS",
    "오키나와": "OKA", "Okinawa": "OKA", "나하": "OKA",
    "나고야": "NGO", "Nagoya": "NGO",
    "교토": "KIX", "Kyoto": "KIX", // 교토는 공항이 없어서 오사카로 연결

    // 🇨🇳 중화권 (China/Taiwan/HK)
    "홍콩": "HKG", "Hong Kong": "HKG",
    "마카오": "MFM", "Macau": "MFM",
    "타이베이": "TPE", "Taipei": "TPE", "대만": "TPE", "Taiwan": "TPE",
    "가오슝": "KHH", "Kaohsiung": "KHH",
    "상하이": "PVG", "Shanghai": "PVG", "푸동": "PVG",
    "베이징": "PEK", "Beijing": "PEK", "북경": "PEK",
    "칭다오": "TAO", "Qingdao": "TAO",

    // 🌏 동남아시아 (Southeast Asia)
    "다낭": "DAD", "Danang": "DAD", "Da Nang": "DAD",
    "나트랑": "CXR", "Nha Trang": "CXR",
    "하노이": "HAN", "Hanoi": "HAN",
    "호치민": "SGN", "Ho Chi Minh": "SGN", "사이공": "SGN",
    "푸꾸옥": "PQC", "Phu Quoc": "PQC",
    "베트남": "DAD", // 베트남만 입력하면 다낭으로 (인기도 기준)

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

    // 🇪🇺 유럽 (Europe) - 주요 허브 및 관광지
    // 🇫🇷 프랑스 (France)
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
    "이탈리아": "FCO", "Italy": "FCO", // 국가명 검색 시 로마로 연결

    // 🇪🇸 스페인 (Spain)
    "바르셀로나": "BCN", "Barcelona": "BCN",
    "마드리드": "MAD", "Madrid": "MAD",
    "세비야": "SVQ", "Seville": "SVQ",
    "스페인": "MAD", "Spain": "MAD",
    "그라나다": "GRX", "Granada": "GRX",

    // 🇨🇵 포르투갈 (Portugal)
    "리스본": "LIS", "Lisbon": "LIS",
    "포르투": "OPO", "Porto": "OPO",

    // 영국/독일/스위스/기타
    // 🇬🇧 영국 (UK)
    "런던": "LHR", "London": "LHR", "히드로": "LHR",
    "영국": "LHR", "UK": "LHR",
    "맨체스터": "MAN", "Manchester": "MAN",
    "에든버러": "EDI", "Edinburgh": "EDI",

    "프랑크푸르트": "FRA", "Frankfurt": "FRA",
    "뮌헨": "MUC", "Munich": "MUC",
    "베를린": "BER", "Berlin": "BER",

    // 🇨🇭 스위스 (Switzerland)
    "취리히": "ZRH", "Zurich": "ZRH",
    "제네바": "GVA", "Geneva": "GVA",
    "인터라켄": "ZRH", "Interlaken": "ZRH",
    "스위스": "ZRH", "Switzerland": "ZRH",

    "암스테르담": "AMS", "Amsterdam": "AMS", "네덜란드": "AMS",
    "브뤼셀": "BRU", "Brussels": "BRU", "벨기에": "BRU",

    "프라하": "PRG", "Prague": "PRG", "체코": "PRG",
    "비엔나": "VIE", "Vienna": "VIE", "오스트리아": "VIE",
    "부다페스트": "BUD", "Budapest": "BUD", "헝가리": "BUD",
    "동유럽": "PRG", // 동유럽 대표 -> 프라하

    "이스탄불": "IST", "Istanbul": "IST", "튀르키예": "IST", "터키": "IST",
    "아테네": "ATH", "Athens": "ATH", "그리스": "ATH",
    "산토리니": "JTR", "Santorini": "JTR",
    "자그레브": "ZAG", "Zagreb": "ZAG", "크로아티아": "ZAG",

    // 🇺🇸 미주 (Americas)
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

    // 🇦🇺 대양주 (Oceania)
    "시드니": "SYD", "Sydney": "SYD", "호주": "SYD",
    "멜버른": "MEL", "Melbourne": "MEL",
    "브리즈번": "BNE", "Brisbane": "BNE",
    "오클랜드": "AKL", "Auckland": "AKL", "뉴질랜드": "AKL",

    // 🌍 중동/아프리카 (Middle East / Africa)
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




// 🏆 관리자 추천 여행지 데이터
const RECOMMENDED_TRIPS = [
    { id: 1, city: "오사카", title: "🍜 식도락 힐링 여행", img: "https://images.unsplash.com/photo-1590559899731-a382839e5549?q=80&w=600&auto=format&fit=crop", desc: "먹다가 망한다는 오사카!" },
    { id: 2, city: "다낭", title: "🏖️ 가족과 함께 휴양", img: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=600&auto=format&fit=crop", desc: "경기도 다낭시로 초대합니다" },
    { id: 3, city: "파리", title: "🗼 낭만의 도시 산책", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop", desc: "에펠탑 보며 와인 한잔" },

];




// 🌍 다국어 번역 데이터 (추가됨)
const translations = {
    ko: {
        title_pre: "Trip Maker,",
        title_main: '"냥 프로"',
        title_sub: "나만의 여행",
        tab_schedule: "🗓️ 나만의 여행",
        tab_flight: "실시간 항공권",
        tab_myflight: "✈️ 내 일정 항공권",
        tab_choices: "냥프로의 강력 추천!",
        label_where: "어디로 가세요?",
        label_when: "언제 떠나세요?",
        placeholder_dest: "국가 또는 도시 (음성 가능)",
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
        label_where: "Where to go?",
        label_when: "When do you leave?",
        placeholder_dest: "City or Country (Voice)",
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

// [수정] AI 일정에서 첫 도시(IN)와 마지막 도시(OUT) 코드를 찾아내는 함수
// [수정] AI 일정에서 도시 코드를 꼼꼼하게 찾아내는 함수
const extractIataFromItinerary = (tripResult) => {
    let inCode = null;
    let outCode = null;

    if (!tripResult || !tripResult.itinerary) return { inCode, outCode };

    const days = tripResult.itinerary;
    const firstDay = days[0];
    const lastDay = days[days.length - 1];

    // 1. 첫날 일정에서 IN 공항 찾기
    if (firstDay) {
        // 날짜 제목 + 장소 이름 + 설명을 전부 합쳐서 영어/한글 검색
        const textToCheck = `${firstDay.day} ${tripResult.tripTitle} ${firstDay.places?.map(p => p.name + " " + (p.description || "")).join(' ')}`.toLowerCase();

        for (const [city, code] of Object.entries(CITY_TO_IATA)) {
            if (textToCheck.includes(city.toLowerCase())) {
                inCode = code;
                break; // 찾았으면 탈출
            }
        }
    }

    // 2. 마지막 날 일정에서 OUT 공항 찾기
    if (lastDay) {
        const textToCheck = `${lastDay.day} ${tripResult.tripTitle} ${lastDay.places?.map(p => p.name + " " + (p.description || "")).join(' ')}`.toLowerCase();

        for (const [city, code] of Object.entries(CITY_TO_IATA)) {
            if (textToCheck.includes(city.toLowerCase())) {
                outCode = code;
                break;
            }
        }
    }

    // 3. 만약 위에서 못 찾았으면, '여행 제목(tripTitle)'이나 'destination'에서라도 찾기
    if (!inCode) {
        const titleCheck = (tripResult.tripTitle || "").toLowerCase();
        for (const [city, code] of Object.entries(CITY_TO_IATA)) {
            if (titleCheck.includes(city.toLowerCase())) {
                inCode = code;
                if (!outCode) outCode = code; // OUT도 못 찾았으면 일단 같은 곳으로
                break;
            }
        }
    }

    return { inCode, outCode };
};

export default function Home() {
    const router = useRouter();

    const { token, notificationPermission } = useFcmToken();

    // [추가] 로딩 문구 변경을 위한 State


    // 👇 1. 이 줄을 찾으세요! (loading 변수 선언)
    const [loading, setLoading] = useState(false);

    // -----------------------------------------------------------
    // ✨ 2. 아까 그 코드를 반드시 이 밑에 붙여넣어야 합니다! ✨
    // -----------------------------------------------------------

    // [추가] 로딩 문구 변경을 위한 State
    const [loadingText, setLoadingText] = useState("AI가 여행 계획을 짜고 있어요...");

    const [recommendedTrips, setRecommendedTrips] = useState([]); // ✨ DB 추천 여행 데이터

    // [추가] 로딩 중일 때 3초마다 문구 변경하는 useEffect
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
    }, [loading]); // 이제 loading을 찾을 수 있어서 에러가 안 납니다!



    // --- 상태 관리 ---
    const [showSplash, setShowSplash] = useState(true); // ✨ 스플래시 화면 상태 (기본값 true)

    // 🌍 언어 설정 상태 (기본값 'ko')
    const [language, setLanguage] = useState('ko');

    const [result, setResult] = useState(null);
    const [bgIndex, setBgIndex] = useState(0);
    const [user, setUser] = useState(null);

    const [showIntro, setShowIntro] = useState(true);
    const [activeTab, setActiveTab] = useState('create');
    const [showWelcome, setShowWelcome] = useState(false);

    // ✨ PWA 관련 상태
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isStandalone, setIsStandalone] = useState(false); // 앱 모드 여부 체크

    const [mySchedules, setMySchedules] = useState([]);
    const [isButtonHovered, setIsButtonHovered] = useState(false);

    // ✨ 검색 결과 모달 상태
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [flightResults, setFlightResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // 폼 데이터
    const [dateRange, setDateRange] = useState([null, null]);
    const [startDate, endDate] = dateRange;
    const [isLuxury, setIsLuxury] = useState(false);
    const [listeningField, setListeningField] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [formData, setFormData] = useState({
        destination: "", startDate: "", endDate: "", companion: "연인",
        people: 2, budget: 100, hotelType: "호텔", tourType: "자유여행",
        themes: [], contact: "", request: "",
    });

    // ✨ [추가] 추천 여행 DB에서 불러오기
    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                // "recommended_trips" -> "rectrips"로 변경됨
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
        // ✨ 스플래시 처리 (기존 로직 유지)
        const hasShownSplash = sessionStorage.getItem('hasShownSplash');
        if (hasShownSplash) setShowSplash(false);

        const timer = setInterval(() => setBgIndex((prev) => (prev + 1) % backgroundImages.length), 5000);

        // PWA 관련 (기존 로직 유지)
        const checkStandalone = () => {
            const isApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
            setIsStandalone(isApp);
        };
        checkStandalone();

        const handleAppInstalled = () => { setIsStandalone(true); setDeferredPrompt(null); };
        window.addEventListener('appinstalled', handleAppInstalled);
        const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // ------------------------------------------------------------------
        // 🔥 [핵심 변경] 실시간 동기화 로직 (onSnapshot 사용)
        // ------------------------------------------------------------------
        let unsubscribeTrips = null; // DB 구독 취소 함수 저장용

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);

            // 기존 구독이 있다면 해제 (중복 방지)
            if (unsubscribeTrips) {
                unsubscribeTrips();
                unsubscribeTrips = null;
            }

            if (currentUser) {
                const tripsRef = collection(db, "users", currentUser.uid, "itineraries");
                // 마이페이지와 동일하게 작성일 역순 정렬
                const q = query(tripsRef, orderBy("createdAt", "desc"));

                // ✨ getDocs 대신 onSnapshot 사용 -> 데이터 변경 시 즉시 반영됨
                unsubscribeTrips = onSnapshot(q, (snapshot) => {
                    const loadedTrips = snapshot.docs.map(doc => {
                        const data = doc.data();
                        let iataCode = null;
                        const dest = data.destination || "";
                        Object.keys(CITY_TO_IATA).forEach(city => {
                            if (dest.includes(city)) iataCode = CITY_TO_IATA[city];
                        });
                        return {
                            id: doc.id,
                            title: dest ? dest : "나의 여행",
                            subtitle: data.startDate ? `${data.startDate} 출발` : "날짜 미정",
                            icon: "✈️",
                            iata: iataCode,
                            ...data
                        };
                    });
                    setMySchedules(loadedTrips);
                }, (error) => {
                    console.error("실시간 연동 실패:", error);
                });
            } else {
                setMySchedules([]);
            }
        });

        const params = new URLSearchParams(window.location.search);
        if (params.get('ref')) localStorage.setItem('referralCode', params.get('ref'));

        // --- 정리(Cleanup) 함수 ---
        return () => {
            clearInterval(timer);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            unsubscribeAuth(); // 인증 리스너 해제
            if (unsubscribeTrips) unsubscribeTrips(); // 🔥 데이터 리스너 해제
        };
    }, []);

    const closeIntro = () => { setShowIntro(false); const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone; if (!isStandalone) setShowWelcome(true); };
    const handleLogin = async () => { const provider = new GoogleAuthProvider(); try { await signInWithPopup(auth, provider); } catch (error) { console.error("Login failed", error); } };

    // ✨ PWA 설치 버튼 클릭 핸들러
    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else {
            alert("브라우저 상단/하단 메뉴(공유 버튼)에서 '홈 화면에 추가' 또는 '앱 설치'를 눌러주세요!");
        }
    };

    const handleDeleteTrip = async (e, tripId, destination) => {
        e.stopPropagation();
        if (!confirm(`'${destination}' 일정을 목록에서 삭제하시겠습니까?`)) return;
        try {
            if (user) {
                await deleteDoc(doc(db, "users", user.uid, "itineraries", tripId));
                setMySchedules(prev => prev.filter(trip => trip.id !== tripId));
                alert("삭제되었습니다.");
            }
        } catch (error) {
            console.error("삭제 실패:", error);
            alert("삭제 중 오류가 발생했습니다.");
        }
    };

    const handleVoiceInput = (targetField) => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("크롬 브라우저에서 사용해주세요!");
            return;
        }
        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = language === 'en' ? 'en-US' : 'ko-KR'; // 🌍 언어에 따라 음성인식 언어도 변경
        recognition.onstart = () => setListeningField(targetField);
        recognition.onend = () => setListeningField(null);
        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            if (targetField === 'search') {
                setSearchQuery(text);
                setTimeout(() => {
                    if (confirm(`'${text}'(으)로 네이버 검색을 띄울까요?`)) {
                        window.open(`https://search.naver.com/search.naver?query=${encodeURIComponent(text)}`, '_blank');
                    }
                }, 500);
                return;
            }
            setFormData(prev => {
                if (targetField === 'request' && prev.request) {
                    return { ...prev, [targetField]: prev.request + " " + text };
                }
                return { ...prev, [targetField]: text };
            });
        };
        recognition.start();
    };

    const handleNaverSearch = () => {
        if (!searchQuery.trim()) return;
        window.open(`https://search.naver.com/search.naver?query=${encodeURIComponent(searchQuery)}`, '_blank');
    };

    const formatDateForAPI = (dateString) => {
        if (!dateString) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
        const parts = dateString.match(/\d+/g);
        if (parts && parts.length >= 3) {
            const year = parts[0];
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        return null;
    };

    // handleTripClick 함수 전체 교체 또는 수정
    // [수정] handleTripClick: 도시 이름(destinationName)을 함께 전송하여 Trip.com 라벨 오류 해결
    const handleTripClick = async (trip) => {
        let arrivalCode = trip.arrivalIata || trip.iata;
        let returnOriginCode = trip.departureIata || trip.iata;

        // 코드가 없으면 destination이나 title에서 다시 찾아봄
        if (!arrivalCode && trip.destination) {
            for (const [city, code] of Object.entries(CITY_TO_IATA)) {
                if (trip.destination.includes(city) || (trip.title && trip.title.includes(city))) {
                    arrivalCode = code;
                    if (!returnOriginCode) returnOriginCode = code;
                    break;
                }
            }
        }

        if (!arrivalCode) {
            alert("공항 정보를 찾을 수 없습니다. (도시명 확인 필요: " + (trip.destination || trip.title) + ")");
            return;
        }

        const depDateStr = formatDateForAPI(trip.startDate);
        if (!depDateStr) { alert("날짜 정보 오류"); return; }
        let retDateStr = formatDateForAPI(trip.endDate);
        if (!retDateStr) { const d = new Date(depDateStr); d.setDate(d.getDate() + 4); retDateStr = d.toISOString().split('T')[0]; }

        setSelectedTrip({
            ...trip,
            iata: arrivalCode,
            returnIata: returnOriginCode,
            returnDateCalc: retDateStr
        });

        setIsSearching(true);
        setFlightResults([]);

        try {
            const res = await fetch('/api/flights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destinationCode: arrivalCode,
                    returnOriginCode: returnOriginCode,
                    departureDate: depDateStr,
                    returnDate: retDateStr,
                    language: language,
                    // ✨ [핵심] 도시 이름(예: 오사카)을 같이 보냅니다!
                    destinationName: trip.destination || trip.title
                })
            });
            const data = await res.json();
            if (data.flights && data.flights.length > 0) { setFlightResults(data.flights); } else { setFlightResults([]); }
        } catch (error) { console.error(error); alert("항공권 조회 중 오류가 발생했습니다."); } finally { setIsSearching(false); }
    };

    const toggleLuxuryMode = () => { setIsLuxury(!isLuxury); setFormData(prev => ({ ...prev, hotelType: !isLuxury ? "5성급 스위트룸/풀빌라" : "호텔" })); };
    const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleDateChange = (update) => { setDateRange(update); if (update[0] && update[1]) setFormData(prev => ({ ...prev, startDate: update[0].toISOString().split('T')[0], endDate: update[1].toISOString().split('T')[0] })); };
    const updatePeople = (delta) => setFormData(prev => ({ ...prev, people: Math.max(1, Math.min(20, prev.people + delta)) }));
    const addThemeTag = (tag) => { if (!formData.destination.includes(tag)) setFormData(prev => ({ ...prev, destination: prev.destination ? `${prev.destination} ${tag}` : tag })); };

    const generatePlan = async () => {
        if (!formData.destination) { alert("여행지를 입력해주세요!"); return; }
        if (!formData.startDate || !formData.endDate) { alert("날짜를 선택해주세요!"); return; }
        if (!formData.contact || formData.contact.trim().length < 2) { alert("연락처를 입력해주세요."); return; }

        setLoading(true);
        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, isLuxury, language }), // 🌍 language 상태 추가 전송
            });
            const data = await response.json();
            // generatePlan 함수 내부 수정
            if (data.result) {
                setResult(data.result);

                // ✨ [수정] AI 결과에서 IN/OUT 공항 코드 추출
                const { inCode, outCode } = extractIataFromItinerary(data.result);

                if (user) {
                    await addDoc(collection(db, "users", user.uid, "itineraries"), {
                        ...formData,
                        tripTitle: data.result.tripTitle, // AI가 지어준 제목도 저장
                        arrivalIata: inCode,     // ✨ IN 공항 코드 저장
                        departureIata: outCode,  // ✨ OUT 공항 코드 저장
                        createdAt: serverTimestamp()
                    });

                    // (목록 갱신 로직은 onSnapshot이 처리하므로 그대로 두시면 됩니다)
                }
            }
            else alert("오류: " + (data.error || "생성 실패"));
        } catch (error) { console.error(error); alert("서버 오류 발생"); }
        finally { setLoading(false); }
    };

    const handleRecommendedClick = (trip) => {
        // 상세 페이지(/share/[id])로 이동
        // 상세 페이지에서 rectrips ID를 조회해 원본 여행으로 자동 연결해줍니다.
        router.push(`/share/${trip.id}`);
    };

    // 🌍 결과 화면에도 언어 정보 전달
    if (result) return <AIResult data={result} userInfo={formData} language={language} onReset={() => setResult(null)} />;

    return (
        <div className="h-screen w-full flex justify-center items-center bg-gray-900 sm:p-4 font-sans relative overflow-hidden">

            {/* ✨ 스플래시 화면 (showSplash가 true일 때만 표시) */}
            <AnimatePresence>
                {showSplash && (
                    <SplashScreen onFinish={() => {
                        setShowSplash(false);
                        sessionStorage.setItem('hasShownSplash', 'true'); // ✨ "봤음" 도장 쾅!
                    }} />
                )}
            </AnimatePresence>

            <div className="absolute inset-0 z-0">
                <AnimatePresence mode='wait'><motion.img key={bgIndex} src={backgroundImages[bgIndex]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute inset-0 w-full h-full object-cover" /></AnimatePresence>
                <div className="absolute inset-0 bg-black/40" />
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[440px] h-full sm:h-[95vh] bg-white/95 backdrop-blur-md sm:rounded-[35px] shadow-2xl overflow-hidden relative flex flex-col z-10">

                <div className="px-6 pt-6 pb-2 shrink-0 flex justify-between items-center bg-white/50 backdrop-blur-sm z-20">
                    <img src="/logo1.png" alt="Logo" className="h-8 w-auto object-contain" />

                    {/* 🔥 상단 헤더 영역: PWA 버튼 & 로그인 & 언어변경 */}
                    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">

                        {/* 🌍 언어 변경 버튼 (추가됨) */}
                        <button
                            onClick={() => setLanguage(prev => prev === 'ko' ? 'en' : 'ko')}
                            className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-all"
                        >
                            <Globe size={20} className={language === 'en' ? "text-indigo-600" : "text-gray-400"} />
                            <span className="absolute -bottom-4 text-[10px] font-bold text-gray-500">
                                {language === 'ko' ? 'KR' : 'EN'}
                            </span>
                        </button>

                        {/* ✨ 앱 모드가 아닐 때만(!isStandalone) 버튼 표시 */}
                        {!isStandalone && deferredPrompt && (
                            <button
                                onClick={handleInstallClick}
                                className="px-3 py-1.5 rounded-full bg-rose-500 text-white font-bold text-xs shadow-md animate-pulse flex items-center gap-1 hover:bg-rose-600 transition-colors"
                            >
                                <Download size={12} /> 앱 설치
                            </button>
                        )}

                        {user ? (
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center text-white font-bold">{user.photoURL ? <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" /> : <span>{user.displayName?.[0]}</span>}</div>
                                <button onClick={() => router.push('/mypage')} className="text-sm font-bold text-gray-700 bg-white px-3 py-1.5 rounded-full shadow-sm">MY</button>
                            </div>
                        ) : (
                            <button onClick={handleLogin} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm shadow-lg flex items-center gap-2"><LogIn size={16} /><span>로그인</span></button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide pt-2 pb-32">
                    {/* 👇 마스코트 & 타이틀 영역 (수정됨: 가로 배치 & 다국어) */}
                    <div className="mb-8 mt-6 px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.6, ease: "backOut" }}
                            className="relative bg-gradient-to-br from-white to-rose-50/80 rounded-[1.5rem] p-5 border border-white shadow-lg shadow-indigo-100/50"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-200/20 rounded-full blur-3xl -z-10" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-200/20 rounded-full blur-3xl -z-10" />

                            <div className="flex flex-row items-center justify-center gap-4">

                                <div className="shrink-0 relative">
                                    <CatMascot width={90} />
                                    <div className="absolute inset-0 bg-white/60 blur-xl rounded-full -z-10 scale-90" />
                                </div>

                                <div className="text-left">
                                    <h2 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight">
                                        <span className="block text-gray-700 text-lg sm:text-xl font-bold mb-1 opacity-80">
                                            {translations[language].title_pre}
                                        </span>
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-indigo-800 to-gray-800">
                                            {translations[language].title_main}
                                        </span>🪄
                                        <br />
                                        <span className="relative inline-block mt-1">
                                            <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-[#FF5A5F] via-rose-500 to-amber-500">
                                                {translations[language].title_sub}
                                            </span>
                                            <span className="absolute inset-x-0 bottom-2 h-3 bg-indigo-100 -z-10 skew-x-12 rounded-sm opacity-60" />
                                        </span>
                                    </h2>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm px-6 border-b border-gray-100 flex mb-6">
                        <button onClick={() => setActiveTab('create')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'create' ? 'border-rose-500 text-gray-900' : 'border-transparent text-gray-400'}`}>{translations[language].tab_schedule}</button>
                        <button onClick={() => setActiveTab('flights')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'flights' ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-400'}`}>{translations[language].tab_myflight}</button>
                    </div>

                    <div className="px-6 pb-10">
                        {activeTab === 'create' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100"><div className="flex items-center justify-between mb-2"><label className="flex items-center gap-2 text-sm font-bold text-gray-500"><MapPin size={16} className="text-[#FF5A5F]" /> {translations[language].label_where}</label><button onClick={() => handleVoiceInput('destination')} className={`p-2 rounded-full transition-all ${listeningField === 'destination' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}><Mic size={16} /></button></div><input type="text" name="destination" value={formData.destination} onChange={handleInputChange} placeholder={listeningField === 'destination' ? translations[language].msg_listening : translations[language].placeholder_dest} className="w-full text-xl font-bold text-gray-800 placeholder-gray-300 outline-none bg-transparent mb-4" /><div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">{themeTags.map(tag => (<button key={tag} onClick={() => addThemeTag(tag)} className="px-2 py-1 bg-gray-50 rounded-lg text-xs text-gray-500 hover:bg-rose-50 hover:text-rose-500 transition-colors">{tag}</button>))}</div></div>
                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100"><label className="flex items-center gap-2 text-sm font-bold text-gray-500 mb-2"><Calendar size={16} className="text-[#FF5A5F]" /> {translations[language].label_when}</label><DatePicker selectsRange={true} startDate={startDate} endDate={endDate} onChange={handleDateChange} minDate={new Date()} locale={ko} dateFormat="yyyy.MM.dd" placeholderText={translations[language].placeholder_date} className="w-full text-lg font-bold text-gray-800 bg-transparent outline-none cursor-pointer placeholder-gray-300" wrapperClassName="w-full" /></div>
                                <div><label className="text-sm font-bold text-gray-600 mb-3 block px-1">{translations[language].label_companion}</label><div className="grid grid-cols-5 gap-2">{companionOptions.map((opt) => (<button key={opt.id} onClick={() => setFormData({ ...formData, companion: opt.id })} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all gap-1 ${formData.companion === opt.id ? 'bg-[#FF5A5F] text-white shadow-md scale-105 font-bold' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{opt.icon} <span className="text-[10px]">{language === 'en' ? opt.id : opt.label}</span></button>))}</div></div>
                                <div className={`p-5 rounded-3xl border relative transition-all ${isLuxury ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100 shadow-sm"}`}><div className="flex gap-4 items-center justify-between">{isLuxury ? (<div className="flex-1"><div className="flex items-center gap-2 text-amber-600 font-bold mb-1"><Sparkles size={16} /> VIP 예산</div><p className="text-xs text-gray-500">무제한 (AI 최적화)</p></div>) : (<div className="flex-1"><label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Wallet size={12} /> {translations[language].label_budget}</label><div className="flex items-end gap-1 mb-2"><span className="text-xl font-bold text-[#FF5A5F]">{formData.budget.toLocaleString()}</span><span className="text-sm text-gray-400">{language === 'en' ? '0,000 KRW' : '만원'}</span></div><input type="range" name="budget" min="50" max="1000" step="10" value={formData.budget} onChange={handleInputChange} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF5A5F]" /></div>)}<div className="w-[1px] h-10 bg-gray-100"></div><div className="flex flex-col items-center"><label className="text-xs font-bold text-gray-500 mb-1">{translations[language].label_people}</label><div className="flex items-center gap-2"><button onClick={() => updatePeople(-1)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-bold hover:bg-gray-200">-</button><span className="font-bold text-gray-800 w-4 text-center">{formData.people}</span><button onClick={() => updatePeople(1)} className="w-8 h-8 rounded-full bg-[#FF5A5F] text-white font-bold hover:bg-rose-600">+</button></div></div></div></div>
                                <div><div className="grid grid-cols-3 gap-2 mb-3">{tourOptions.map((option) => (<button key={option.id} onClick={() => setFormData({ ...formData, tourType: option.id })} className={`py-3 px-2 rounded-2xl border transition-all flex flex-col items-center text-center ${formData.tourType === option.id ? 'bg-white border-[#FF5A5F] text-[#FF5A5F] shadow-md ring-1 ring-[#FF5A5F]' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}><span className="font-bold text-sm mb-1">{option.label}</span><span className="text-[10px] opacity-70 break-keep">{option.desc}</span></button>))}</div><button onClick={toggleLuxuryMode} className={`w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border ${isLuxury ? "bg-amber-500 text-white border-amber-500 shadow-amber-200" : "bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100"}`}>{isLuxury ? <><Crown size={16} fill="white" /> {translations[language].btn_luxury_on}</> : <><Crown size={16} /> {translations[language].btn_luxury_off}</>}</button></div>
                                <div className="bg-white p-4 rounded-2xl border border-gray-200"><label className="text-xs font-bold text-gray-400 mb-1 block">{translations[language].label_contact}</label><input type="text" name="contact" value={formData.contact} onChange={handleInputChange} placeholder={translations[language].placeholder_contact} className="w-full text-sm font-medium outline-none text-gray-800" /></div>
                                <div className="bg-white p-4 rounded-2xl border border-gray-200"><div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-gray-400 flex items-center gap-1"><MessageSquare size={12} /> {translations[language].label_request}</label><button onClick={() => handleVoiceInput('request')} className={`p-1.5 rounded-full transition-all ${listeningField === 'request' ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}><Mic size={14} /></button></div>
                                    <textarea
                                        name="request"
                                        value={formData.request}
                                        onChange={handleInputChange}
                                        // ✨ [수정] 안내 문구를 구체적으로 변경하여 사용자가 IN/OUT 도시를 적도록 유도
                                        placeholder={listeningField === 'request' ? translations[language].msg_listening : "예: 니스 IN, 마르세유 OUT으로 짜줘. 빈티지 벼룩시장과 아울렛 쇼핑 꼭 넣어줘!"}
                                        className="w-full text-sm font-medium outline-none text-gray-800 resize-none h-20 bg-transparent"
                                    />
                                </div>
                            </div>

                        )}

                        {activeTab === 'flights' && (
                            <div className="space-y-6 animate-fadeIn">

                                {/* ✨ [추가됨] 관리자 추천 여행지 섹션 */}
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg mb-3 px-1 flex items-center gap-2">
                                        <Sparkles size={18} className="text-amber-500" />
                                        <span>{translations[language].tab_choices}</span>
                                    </h3>
                                    {/* ✨ [수정] 추천 여행 리스트 렌더링 부분 */}
                                    {/* ✨ [수정] 추천 여행 리스트 렌더링 (제목 표시 강화) */}
                                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x px-1">
                                        {recommendedTrips.map((trip) => (
                                            <motion.div
                                                key={trip.id}
                                                whileTap={{ scale: 1.0 }}
                                                onClick={() => handleRecommendedClick(trip)}
                                                className="min-w-[160px] h-[220px] rounded-2xl relative overflow-hidden shadow-md snap-center cursor-pointer group bg-gray-100"
                                            >
                                                {/* 배경 이미지 */}
                                                <img
                                                    src={trip.img || FALLBACK_IMAGE}
                                                    alt={trip.title}
                                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
                                                />

                                                {/* 그라데이션 오버레이 (텍스트 가독성 확보) */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                                                {/* 텍스트 정보 영역 */}
                                                <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                                                    {/* 도시 이름 */}
                                                    <span className="text-[10px] font-bold text-amber-400 mb-1 block tracking-wider uppercase drop-shadow-md">
                                                        {trip.city || "추천 여행"}
                                                        {trip.tripPath ? " 🔗" : ""}
                                                    </span>

                                                    {/* 여행 제목 (여기가 안 보였던 부분) */}
                                                    <h4 className="text-white font-bold text-sm leading-tight mb-1 line-clamp-2 drop-shadow-md">
                                                        {trip.title || trip.tripTitle || "제목 없음"}
                                                    </h4>

                                                    {/* 짧은 설명 */}
                                                    <p className="text-[10px] text-gray-300 line-clamp-1 opacity-90">
                                                        {trip.desc || "관리자 추천 일정"}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
                                            <Plane className="text-indigo-600" size={20} /> {translations[language].tab_flight}
                                        </h3>
                                    </div>

                                    {mySchedules.length > 0 ? (
                                        <div className="space-y-3">
                                            {mySchedules.map((item) => (
                                                <motion.div
                                                    key={item.id}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => handleTripClick(item)}
                                                    className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm cursor-pointer hover:border-indigo-300 transition-all relative overflow-hidden group"
                                                >
                                                    <button
                                                        onClick={(e) => handleDeleteTrip(e, item.id, item.destination || item.title)}
                                                        className="absolute top-4 right-4 z-20 p-2 bg-gray-50 rounded-full text-gray-400 hover:bg-rose-100 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                                        title="일정 삭제"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>

                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-xl shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">✈️</div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-800 text-sm">{item.destination || item.title} 여행</h4>
                                                                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                                    <span>{item.startDate || "날짜 미정"}</span>
                                                                    {item.iata && <span className="bg-gray-100 px-1.5 rounded text-gray-400 font-medium">{item.iata}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="text-gray-300 group-hover:text-indigo-500" size={20} />
                                                    </div>

                                                    <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
                                                        <span className="text-[10px] text-gray-400">클릭하여 최저가 확인하기</span>
                                                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">Search</span>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                                            <p className="text-xs mb-2">아직 만든 일정이 없어요.</p>
                                            <p className="text-[10px]">왼쪽 탭에서 나만의 일정을 만들어보세요!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 항공권 검색 결과 모달 */}
                <AnimatePresence>
                    {selectedTrip && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 bg-gray-100 flex flex-col"
                        >
                            {/* 모달 헤더 */}
                            <div className="bg-white px-5 py-4 flex items-center gap-3 shadow-sm z-10">
                                <button onClick={() => setSelectedTrip(null)} className="p-1 -ml-1 rounded-full hover:bg-gray-100"><ArrowRight className="rotate-180" size={24} /></button>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight">{selectedTrip.destination} 항공권</h3>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        {selectedTrip.startDate} <ArrowLeftRight size={10} /> {selectedTrip.returnDateCalc} (왕복)
                                    </p>
                                </div>
                            </div>

                            {/* 모달 바디 (검색 결과 리스트) */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {isSearching ? (
                                    [1, 2, 3].map(i => (<div key={i} className="bg-white h-32 rounded-2xl animate-pulse" />))
                                ) : flightResults.length > 0 ? (
                                    flightResults.map((flight) => (
                                        <div key={flight.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 hover:border-indigo-500 transition-all relative">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-2">
                                                    {/* ✈️ 로고 처리: Fallback(가짜 티켓)이면 돋보기, 아니면 항공사 로고 */}
                                                    {flight.isFallback || flight.carrierCode === 'ALL' ? (
                                                        <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                            <Search size={16} />
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={`https://pics.avs.io/99/36/${flight.carrierCode}.png`}
                                                            alt={flight.airline}
                                                            className="w-8 h-8 rounded object-contain bg-white border border-gray-100"
                                                            onError={(e) => { e.target.style.display = 'none' }}
                                                        />
                                                    )}
                                                    <span className="font-bold text-sm text-gray-700">
                                                        {flight.isFallback ? "전체 항공사 검색" : flight.carrierCode}
                                                    </span>
                                                </div>

                                                <div className="text-right">
                                                    {/* 💰 가격 처리: 0원이면 '최저가 확인' 텍스트 표시 */}
                                                    <span className="block text-lg font-black text-indigo-600">
                                                        {flight.price === 0 ? "최저가 확인" : `${flight.price.toLocaleString()}원~`}
                                                    </span>
                                                    {!flight.isFallback && <span className="text-[10px] text-gray-400">예상 최저가</span>}
                                                </div>
                                            </div>

                                            {/* 중간 상세 정보 (시간 등) - Fallback이 아닐 때만 표시 */}
                                            {!flight.isFallback && (
                                                <div className="flex items-center justify-between px-1 mb-2">
                                                    <div className="text-center w-10">
                                                        <div className="text-base font-bold text-gray-800">{flight.outbound.depTime}</div>
                                                        <div className="text-[10px] text-gray-400">ICN</div>
                                                    </div>
                                                    <div className="flex-1 px-3 flex flex-col items-center">
                                                        <div className="text-[10px] text-gray-400 mb-1">
                                                            {Math.floor(flight.outbound.duration / 60) > 0 ? `${Math.floor(flight.outbound.duration / 60)}시간 ` : ""}
                                                            {flight.outbound.duration % 60}분
                                                        </div>
                                                        <div className="w-full h-[1px] bg-gray-300 relative flex items-center justify-center">
                                                            <Plane size={12} className="text-gray-400 rotate-90 bg-white px-0.5" />
                                                        </div>
                                                        <div className="text-[10px] text-indigo-500 mt-1">
                                                            {flight.transfers === 0 ? "직항" : `${flight.transfers}회 경유`}
                                                        </div>
                                                    </div>
                                                    <div className="text-center w-10">
                                                        <div className="text-base font-bold text-gray-800">도착</div>
                                                        <div className="text-[10px] text-gray-400">{selectedTrip.iata}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 하단 버튼 */}
                                            {/* ✨✨ Trip.com & Aviasales 버튼 영역 ✨✨ */}
                                            <div className="flex gap-2 mt-3">
                                                {/* 1. 메인 버튼 (Trip.com 또는 기본 Aviasales) */}
                                                <button
                                                    onClick={() => {
                                                        // 📱 모바일 기기 체크 (User Agent)
                                                        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

                                                        // 한국어일 때: 모바일이면 모바일 링크, 아니면 PC 링크 사용
                                                        // 영어일 때: 글로벌 링크 사용
                                                        let targetUrl = flight.linkGlobal;

                                                        if (language === 'ko') {
                                                            targetUrl = (isMobile && flight.linkTripMobile)
                                                                ? flight.linkTripMobile
                                                                : (flight.linkTrip || flight.linkGlobal);
                                                        }

                                                        window.open(targetUrl, '_blank');
                                                    }}
                                                    className="flex-1 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                                                >
                                                    {flight.isFallback
                                                        ? (language === 'ko' ? "Trip.com 최저가 조회" : "Check Prices")
                                                        : (language === 'ko' ? "Trip.com에서 예약" : "Book Now")
                                                    }
                                                    <ExternalLink size={14} />
                                                </button>

                                                {/* 2. 서브 버튼 (한국어일 때만 보임 - Aviasales 비교용) */}
                                                {language === 'ko' && (
                                                    <button
                                                        onClick={() => window.open(flight.linkGlobal, '_blank')}
                                                        className="flex-1 py-3 bg-white text-indigo-600 border border-indigo-200 font-bold text-sm rounded-xl hover:bg-indigo-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                                                    >
                                                        글로벌 가격 비교
                                                        <Search size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-20 text-gray-400"><p>검색된 항공권이 없습니다.</p><p className="text-xs mt-1">날짜를 변경하거나 나중에 다시 시도해주세요.</p></div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {activeTab === 'create' && (
                    <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white/95 to-transparent z-30">
                        <button
                            onClick={generatePlan}
                            disabled={loading}
                            onMouseEnter={() => setIsButtonHovered(true)}
                            onMouseLeave={() => setIsButtonHovered(false)}
                            className={`w-full py-4 rounded-2xl font-bold text-xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${isLuxury ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-200 text-white" : "bg-gradient-to-r from-[#FF5A5F] to-[#FF3D43] shadow-rose-200 text-white hover:shadow-rose-400 hover:-translate-y-1"}`}
                        >
                            {loading ? (
                                // ✨ 여기가 바뀌었습니다: loadingText 변수 사용
                                <><Sparkles className="animate-spin" size={24} /> {loadingText}</>
                            ) : isLuxury ? (
                                translations[language].btn_luxury_on
                            ) : (
                                isButtonHovered ? translations[language].btn_generate : translations[language].btn_generate
                            )}
                        </button>
                    </div>
                )}

            </motion.div>
            <style jsx global>{`
              /* ✨ 기존 style 태그 안에 아래 내용을 추가하세요 */

              /* 얇고 둥근 스크롤바 디자인 */
               .custom-scrollbar::-webkit-scrollbar {
               height: 8px; /* 가로 스크롤바 두께 */
               }
               .custom-scrollbar::-webkit-scrollbar-track {
               background: transparent; /* 배경 투명 */
               }
               .custom-scrollbar::-webkit-scrollbar-thumb {
               background-color: #e2e8f0; /* 연한 회색 (slate-200) */
               border-radius: 10px;       /* 둥근 모서리 */
               border: 2px solid transparent;
               background-clip: content-box;
               }
               .custom-scrollbar::-webkit-scrollbar-thumb:hover {
               background-color: #cbd5e1; /* 마우스 올리면 진해짐 (slate-300) */
}
            `}</style>
        </div>
    );
}