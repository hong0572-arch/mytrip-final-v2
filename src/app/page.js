"use client";
// --- 라이브러리 및 설정 Import ---
import { signIn, signOut, useSession } from "next-auth/react"; // Kakao Login용
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
// 스플래시 및 훅
import SplashScreen from "../components/SplashScreen";
import useFcmToken from '../hooks/useFcmToken';
import { getApiUrl } from '../utils/api';
// 컴포넌트
import CatMascot from '../components/CatMascot';
import AIResult from "../components/AIResult";
import TravelNews from '../components/TravelNews';
import TripCoach from '../components/TripCoach';
const AroundMeMap = dynamic(() => import("../components/AroundMeMap"), { ssr: false });
// 아이콘 및 UI 라이브러리
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin, Calendar, Wallet, User, Sparkles, Users, Compass, Heart, Baby, Briefcase,
    Crown, Download, X, LogIn, Search, Mic, MessageSquare, ExternalLink, Bell, BellRing,
    RefreshCw, TrendingDown, Plane, CheckCircle, ArrowRight, Clock, ChevronRight,
    ArrowLeftRight, Trash2, Globe, Home as HomeIcon, Box, AlertCircle
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
        label_where: "어디로 안심 여행을 떠날까요?", label_when: "언제 떠나세요?", placeholder_dest: "", placeholder_date: "날짜 선택 (최대 30일)",
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
const generateFlightLinks = (iataCode, depDateStr, retDateStr) => {
    const dep = depDateStr ? depDateStr.replace(/-/g, '') : '';
    const ret = retDateStr ? retDateStr.replace(/-/g, '') : '';

    // Naver URL
    let naver = `https://m-flight.naver.com/flights/international/ICN-${iataCode}-${dep}?adult=1&fareType=Y`;
    if (ret) {
        naver = `https://m-flight.naver.com/flights/international/ICN-${iataCode}-${dep}-${ret}?adult=1&fareType=Y`;
    }

    // Trip.com URL
    let tripcom = `https://kr.trip.com/flights/`;

    // Hanatour URL
    let hanatour = `https://mflight.hanatour.com/`;

    // Modetour URL
    let modetour = `https://m.modetour.com/`;

    // Yellow Balloon URL
    let ybtour = `https://m.ybtour.co.kr/`;

    // Very Good Travel URL
    let verygood = `https://m.vaetour.co.kr/`;

    return {
        naver,
        tripcom,
        hanatour,
        modetour,
        ybtour,
        verygood
    };
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
const calculateDDayNum = (startDateStr) => {
    if (!startDateStr) return 999;
    try { const today = new Date(); today.setHours(0, 0, 0, 0); const start = new Date(startDateStr); start.setHours(0, 0, 0, 0); return Math.ceil((start - today) / (1000 * 60 * 60 * 24)); } catch (e) { return 999; }
};
const calculateDDay = (startDateStr) => {
    const diff = calculateDDayNum(startDateStr);
    if (diff === 999) return "D-?"; if (diff === 0) return "D-Day"; if (diff > 0) return `D-${diff}`; return `D+${Math.abs(diff)}`;
};
const formatTripDate = (startStr, endStr, durationStr) => {
    try {
        if (!startStr) return "날짜 미정"; const start = new Date(startStr); if (isNaN(start.getTime())) return "날짜 미정";
        const startFormatted = `${start.getFullYear()}.${String(start.getMonth() + 1).padStart(2, '0')}.${String(start.getDate()).padStart(2, '0')}`;
        let endFormatted = ""; if (endStr) { const end = new Date(endStr); if (!isNaN(end.getTime())) { endFormatted = ` - ${String(end.getMonth() + 1).padStart(2, '0')}.${String(end.getDate()).padStart(2, '0')}`; } }
        return `${startFormatted}${endFormatted}${durationStr ? ` (${durationStr})` : ""}`;
    } catch (e) { return "날짜 오류"; }
};
const GlassCard = ({ children, className = "", onClick }) => (
    <div onClick={onClick} className={`bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgba(0,0,0,0.05)] rounded-[20px] ${className}`}>{children}</div>
);
const getTripPhase = (trip) => {
    if (!trip || !trip.startDate) return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(trip.startDate);
    start.setHours(0, 0, 0, 0);
    const end = trip.endDate ? new Date(trip.endDate) : start;
    end.setHours(0, 0, 0, 0);
    if (today < start) return 'prep'; // 출발 전
    if (today >= start && today <= end) return 'during'; // 여행 중
    return 'post'; // 여행 완료
};
const getCoachingGuide = (trip) => {
    if (!trip) return "";
    const phase = getTripPhase(trip);
    if (phase === 'prep') {
        const ddayNum = calculateDDayNum(trip.startDate);
        if (ddayNum === 0) return "🎉 드디어 오늘 출발일입니다! 공항 가기 전 여권과 예약 바우처를 최종 확인하세요.";
        if (ddayNum <= 3) return `⏰ 출국 ${ddayNum}일 전입니다! 🔌 돼지코 플러그와 외화 환전 상태를 체크하세요.`;
        if (ddayNum <= 7) return `✈️ 여행 일주일 전입니다. 🛡️ 안심 여행자 보험에 가입해 안전을 확보하세요!`;
        return `🗓️ 여행 준비 코칭이 활성화되었습니다. 체크리스트를 하나씩 완료해보세요!`;
    } else if (phase === 'during') {
        return "🏃 실시간 안심 여행 코칭이 켜져 있어요! 물 섭취와 걸음 수를 기록해 신체 밸런스를 조절해보세요.";
    } else {
        return "✨ 여행 코칭이 무사히 완료되었습니다! 📸 보관함에 즐거운 추억 사진을 보관해보세요.";
    }
};
const getTripProgress = (trip) => {
    if (!trip || !trip.startDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(trip.startDate);
    start.setHours(0, 0, 0, 0);
    if (today < start) {
        // 출발 전: 30일 전을 0%, 출발 당일을 100%로 설정
        const diffTime = start - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 30) return 5;
        return Math.max(5, Math.min(100, Math.round(((30 - diffDays) / 30) * 100)));
    }
    const end = trip.endDate ? new Date(trip.endDate) : start;
    end.setHours(0, 0, 0, 0);
    if (today >= start && today <= end) {
        // 여행 중
        const totalDuration = end - start;
        const elapsed = today - start;
        if (totalDuration === 0) return 50;
        return Math.max(10, Math.min(95, Math.round((elapsed / totalDuration) * 100)));
    }
    return 100; // 여행 완료
};
const getHomeGradient = (step) => {
    switch (step) {
        case 1: return "from-[#3e2170] to-[#121212]"; // Violet/Purple (Step 1)
        case 2: return "from-[#145775] to-[#121212]"; // Cyan/Blue (Step 2)
        case 3: return "from-[#116345] to-[#121212]"; // Emerald/Green (Step 3)
        case 4: return "from-[#781b3b] to-[#121212]"; // Rose/Red (Step 4)
        default: return "from-[#165c32] to-[#121212]"; // Default Spotify Green
    }
};
// 🌟 오늘부터 3개월 내 도시별 편도 최저가 항공 정보 생성 헬퍼 (대안 2 고도화)
const getCheapestFlightInfo = (cityCode, basePrice) => {
    const today = new Date();

    // cityCode를 이용한 안정적인 의사 난수 시드 생성
    const seed = cityCode.charCodeAt(0) + (cityCode.charCodeAt(1) || 0) + (cityCode.charCodeAt(2) || 0);
    const pseudoRandom = (offset) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
    };

    // 오늘 기준 14일 후 ~ 90일 후(약 3개월 이내) 사이의 임의의 출발일 설정
    const minDays = 14;
    const maxDays = 90;
    let depOffset = Math.floor(minDays + pseudoRandom(1) * (maxDays - minDays));

    const depDate = new Date(today);
    depDate.setDate(today.getDate() + depOffset);

    // 항공권이 대체로 가장 저렴한 화요일(2) 또는 수요일(3)로 출발일 보정
    const currentDayOfWeek = depDate.getDay();
    if (currentDayOfWeek !== 2 && currentDayOfWeek !== 3) {
        const diffToCheapestDay = 2 - currentDayOfWeek;
        depDate.setDate(depDate.getDate() + diffToCheapestDay);
    }

    // 보정한 날짜가 오늘보다 이전이 되지 않도록 안전장치 설정
    if (depDate < today) {
        depDate.setDate(today.getDate() + 14);
    }

    // 요일 이름 매핑
    const weekDaysKo = ['일', '월', '화', '수', '목', '금', '토'];
    const weekDaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNameKo = weekDaysKo[depDate.getDay()];
    const dayNameEn = weekDaysEn[depDate.getDay()];

    // 요일별 가격 멀티플라이어 시뮬레이션:
    // 실제 화요일, 수요일 출발은 기본 요금의 62% ~ 74% 수준으로 대폭 할인
    // 주말(금, 토) 및 목요일은 기본 요금의 95% ~ 110% 수준
    const dayOfWeek = depDate.getDay();
    let priceMultiplier = 0.85;
    if (dayOfWeek === 2 || dayOfWeek === 3) {
        priceMultiplier = 0.62 + pseudoRandom(3) * 0.12; // 62% ~ 74%
    } else if (dayOfWeek === 5 || dayOfWeek === 6) {
        priceMultiplier = 0.95 + pseudoRandom(3) * 0.15; // 95% ~ 110%
    } else {
        priceMultiplier = 0.78 + pseudoRandom(3) * 0.12; // 78% ~ 90%
    }

    // 시즌별 극성수기 보정 (7월 15일 ~ 8월 20일 여름휴가, 12월 24일 ~ 1월 3일 연말)
    const month = depDate.getMonth() + 1;
    const date = depDate.getDate();
    const isPeakSeason = (month === 7 && date >= 15) || (month === 8 && date <= 20) || (month === 12 && date >= 24) || (month === 1 && date <= 5);
    if (isPeakSeason) {
        priceMultiplier *= 1.25; // 성수기 25% 가격 상승 적용
    }

    const cheapestPrice = Math.floor((basePrice * priceMultiplier) / 1000) * 1000;

    return {
        depDate,
        price: cheapestPrice,
        displayDate: `${depDate.getMonth() + 1}/${depDate.getDate()}(${dayNameKo}) 출발`,
        displayDateEn: `${depDate.getMonth() + 1}/${depDate.getDate()}(${dayNameEn}) Dep`
    };
};
// --- 3. 메인 Home 컴포넌트 ---
export default function Home() {
    const router = useRouter();
    const { data: session } = useSession(); // Kakao (NextAuth) 세션
    const { token, notificationPermission } = useFcmToken();
    const lowestFlightsRef = useRef(null); // 최저가 슬라이더 수동/자동 겸용 레프
    const lowestLodgingRef = useRef(null); // 최저가 숙소 슬라이더 수동/자동 겸용 레프
    const lowestRegionFlightsRef = useRef(null); // 실시간 지역별 특가 항공권 슬라이더 레프
    const youtubeVlogsRef = useRef(null); // 유튜브 브이로그 슬라이더 레프
    // 🌟 오늘부터 6개월 내 도시별 최저가 및 날짜 생성 (1회만 생성하여 가격 요동 방지)
    const promoDeals = React.useMemo(() => {
        const rawDeals = [
            { id: 'p1', city: '제주', enCity: 'Jeju', code: 'CJU', basePrice: 45000, img: '/jeju.jpg' },
            { id: 'p2', city: '도쿄', enCity: 'Tokyo', code: 'NRT', basePrice: 89000, img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=80' },
            { id: 'p3', city: '오사카', enCity: 'Osaka', code: 'KIX', basePrice: 79000, img: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=400&q=80' },
            { id: 'p4', city: '상하이', enCity: 'Shanghai', code: 'PVG', basePrice: 95000, img: 'https://images.unsplash.com/photo-1537531383496-f4749b8032cf?w=400&q=80' },
            { id: 'p5', city: '방콕', enCity: 'Bangkok', code: 'BKK', basePrice: 129000, img: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=400&q=80' },
            { id: 'p6', city: '발리', enCity: 'Bali', code: 'DPS', basePrice: 195000, img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=80' },
            { id: 'p7', city: '다낭', enCity: 'Da Nang', code: 'DAD', basePrice: 115000, img: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80' },
            { id: 'p8', city: '싱가폴', enCity: 'Singapore', code: 'SIN', basePrice: 175000, img: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&q=80' },
            { id: 'p9', city: '파리', enCity: 'Paris', code: 'CDG', basePrice: 680000, img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=80' },
            { id: 'p10', city: '런던', enCity: 'London', code: 'LHR', basePrice: 650000, img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80' },
            { id: 'p11', city: '바르셀로나', enCity: 'Barcelona', code: 'BCN', basePrice: 690000, img: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&q=80' },
            { id: 'p12', city: '로마', enCity: 'Rome', code: 'FCO', basePrice: 670000, img: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&q=80' },
            { id: 'p13', city: '밀라노', enCity: 'Milan', code: 'MXP', basePrice: 660000, img: 'https://images.unsplash.com/photo-1520440229-6469a149ac59?w=400&q=80' },
            { id: 'p14', city: '호놀룰루', enCity: 'Honolulu', code: 'HNL', basePrice: 480000, img: 'https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=400&q=80' },
            { id: 'p15', city: 'LA', enCity: 'Los Angeles', code: 'LAX', basePrice: 550000, img: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=400&q=80' },
            { id: 'p16', city: '뉴욕', enCity: 'New York', code: 'JFK', basePrice: 580000, img: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&q=80' },
            { id: 'p17', city: '멕시코시티', enCity: 'Mexico City', code: 'MEX', basePrice: 750000, img: 'https://images.unsplash.com/photo-1518659526054-190340b32735?w=400&q=80' },
            { id: 'p18', city: '두바이', enCity: 'Dubai', code: 'DXB', basePrice: 420000, img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80' }
        ];
        return rawDeals.map(deal => {
            const info = getCheapestFlightInfo(deal.code, deal.basePrice);
            return {
                ...deal,
                price: info.price,
                depDate: info.depDate,
                displayDate: info.displayDate
            };
        });
    }, []);
    const lodgingDeals = React.useMemo(() => {
        return [
            { id: 'h1', city: '일본', enCity: 'Japan', code: 'Hotel', img: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=400&q=80', url: 'https://www.google.com/travel/hotels?hl=ko&q=일본' },
            { id: 'h2', city: '동남아', enCity: 'Southeast Asia', code: 'Resort', img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&q=80', url: 'https://www.google.com/travel/hotels?hl=ko&q=동남아' },
            { id: 'h3', city: '유럽', enCity: 'Europe', code: 'Hotel', img: '/euro.jpg', url: 'https://www.google.com/travel/hotels?hl=ko&q=유럽' },
            { id: 'h4', city: '미국', enCity: 'USA', code: 'Hotel', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80', url: 'https://www.google.com/travel/hotels?hl=ko&q=미국' },
            { id: 'h5', city: '캐나다', enCity: 'Canada', code: 'Resort', img: '/canada.jpg', url: 'https://www.google.com/travel/hotels?hl=ko&q=캐나다' },
            { id: 'h6', city: '중국', enCity: 'China', code: 'Hotel', img: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400&q=80', url: 'https://www.google.com/travel/hotels?hl=ko&q=중국' },
            { id: 'h7', city: '아프리카', enCity: 'Africa', code: 'Lodge', img: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=80', url: 'https://www.google.com/travel/hotels?hl=ko&q=아프리카' },
            { id: 'h8', city: '중남미', enCity: 'Latin America', code: 'Hotel', img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&q=80', url: 'https://www.google.com/travel/hotels?hl=ko&q=중남미' },
        ];
    }, []);
    const regionFlightDeals = React.useMemo(() => {
        const rawRegionDeals = [
            { id: 'rf1', city: '일본', enCity: 'Japan', code: 'JPN', basePrice: 89000, img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=80', url: 'https://www.google.com/travel/flights/deals?hl=ko&gl=KR&tfs=CBwQBhqkARIKMjAyNi0wNy0xOWoHCAESA0lDTnIMCAMSCC9tLzA3ZGZrcgwIAxIIL20vMGRxeXdyDQgDEgkvbS8wZ3A1bDZyDQgDEgkvbS8wMzV4eXpyDAgDEggvbS8wZ3FrZHIMCAMSCC9tLzA5ZDRfcgwIAxIIL20vMGczY3dyDAgDEggvbS8wZ3FmeXIMCAMSCC9tLzA4OXdtcg0IAxIJL20vMGdwNl93GqQBEgoyMDI2LTA3LTIzagwIAxIIL20vMDdkZmtqDAgDEggvbS8wZHF5d2oNCAMSCS9tLzBncDVsNmoNCAMSCS9tLzAzNXh5emoMCAMSCC9tLzBncWtkagwIAxIIL20vMDlkNF9qDAgDEggvbS8wZzNjd2oMCAMSCC9tLzBncWZ5agwIAxIIL20vMDQ5d21qDQgDEgkvbS8wZ3A2X3dyBwgBEgNJQ05AAUgBcAGCAQsI____________AZgBAdoBBgoEMAFIAQ&q=%EC%9D%BC%EB%B3%B8&ved=0CAMQusIPahgKEwjI-pHZ-rWVAxUAAAAAHQAAAAAQhgI&uact=3' },
            { id: 'rf2', city: '동남아', enCity: 'Southeast Asia', code: 'SEA', basePrice: 129000, img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=80', url: 'https://www.google.com/travel/flights/deals?hl=ko&gl=KR&tfs=CBwQBhqyAhIKMjAyNi0wNy0xOWoMCAISCC9tLzAoc3FmcgwIAxIIL20vMGZuMmdyDwgDEgsvZy8xMjFoeGgxanINCAMSCS9tLzAyNnlxZnIMCAMSCC9tLzA2dDJ0cg0IAxIJL20vMDFqYjdncgwIAxIIL20vMGhuNGhyDQgDEgkvbS8wMXBfbHlyDAgDEggvbS8wNDlkMXIMCAMSCC9tLzBmbnZmZg0IAxIJL20vMDF5cXdncg0IAxIJL20vMDQ0Y2p2cg0IAxIJL20vMDFocjU4cg0IAxIJL20vMDFqd2Nxcg0IAxIJL20vMDI2bTVycg0IAxIJL20vMGdnZGx6cgwIAxIIL20vMGg2eHFyDQgDEgkvbS8wNW1wbjdyDQgDEgkvbS8wMTk1cGRyDAgDEggvbS8wZnRwOBqyAhIKMjAyNi0wNy0yM3oMCAMSCC9tLzBmbnJnag8IAxILL2cvMTIxaHhoMWpqDQgDEgkvbS8wMjZ5cWZqDAgDEggvbS8wNnQydGoNCAMSCS9tLzAxamI3Z2oMCAMSCC9tLzBobjRoag0IAxIJL20vMDFwX2x5agwIAxIIL20vMDQ5dDFqDAgDEggvbS8wZm5mZmoNCAMSCS9tLzAxeXF3Z2oNCAMSCS9tLzA4NGNqdmoNCAMSCS9tLzAxaHI1OGoNCAMSCS9tLzAxandjcWoNCAMSCS9tLzAyNm01cmoNCAMSCS9tLzBnZ2RsemoMCAMSCC9tLzBnNnhxag0IAxIJL20vMDVtcG43ag0IAxIJL20vMDE5NXBkagwIAxIIL20vMGZ0cDhyDAgCEggvbS8waHNxZkABSAFwAYIBCwj___________8BmAEB2gEGCgQwAUgB&q=%EB%8F%99%EB%82%A8%EC%95%84&ved=0CAMQusIPahcKEwjYsPC_h7aVAxUAAAAAHQAAAAAQKg&uact=3' },
            { id: 'rf3', city: '유럽', enCity: 'Europe', code: 'EUR', basePrice: 680000, img: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=400&q=80', url: 'https://www.google.com/travel/flights/deals?hl=ko&gl=KR&tfs=CBwQBhq_AxIKMjAyNi0wNy0xOWoMCAISCC9tLzA0anBscgwIAxIIL20vMDUxdGpyDAgDEggvbS8wNmM2MmoMCAMSCC9tLzAxZjYycgwIAxIIL20vMDF6MGpyCwgDEgcvbS8wazNwckwIAxIIL20vMDg5NjZyDAgDEggvbS8wZmhwOXIMCAMSCC9tLzA1eXdncgwIAxIIL20vMDcwdDlqDAgDEggvbS8wNGxsYmoMCAMSCC9tLzAza2huagwIAxIIL20vMDJjZnRqDAgDEggvbS8wMWxmeWoNCAMSCS9tLzA5OTQ5bWoMCAMSCC9tLzA1Nl95ag4IAxIKL20vMDJoNl82cGoMCAMSCC9tLzA3X3BmagwIAxIIL20vMDk0N2xqDAgDEggvbS8wY3A2d2oLCAMSBy9tLzBuMnpqDAgDEggvbS8wNm14c2oMCAMSCC9tLzA5NXdfagwIAxIIL20vMDJtNzdqDAgDEggvbS8wNWw2NGoMCAMSCC9tLzA4MW1fagwIAxIIL20vMDE1NnFqDAgDEggvbS8wMTc3emoMCAMSCC9tLzA2ZmxnagwIAxIIL20vMDJtNzdqDAgDEggvbS8wNWw2NGoMCAMSCC9tLzA4MW1fagwIAxIIL20vMDE1NnFqDAgDEggvbS8wMTc3emoMCAMSCC9tLzA2ZmxnagwIAxIIL20vMDMxeTJyDAgCEggvbS8waHNxZkABSAFwAYIBCwj___________8BmAEB2gEGCgQwAUgB&q=%EC%9C%A0%EB%9F%BD&ved=0CAMQusIPahgKEwjQmpW3_LWVAxUAAAAAHQAAAAAQoQQ&uact=3' },
            { id: 'rf4', city: '미국', enCity: 'USA', code: 'USA', basePrice: 550000, img: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&q=80', url: 'https://www.google.com/travel/flights/deals?hl=ko&gl=KR&tfs=CBwQBhqrARIKMjAyNi0wNy0xOWoMCAISCC9tLzAoc3FmcmcIAxIKL20vMDMwcWIzdHINCAMSCS9tLzAyXzI4NnIMCAMSCC9tLzBkNmxwcg4IAxIKL20vMDJocmgwX3IMCAMSCC9tLzBkOWpycgwIAxIIL20vMHJoNmtyDAgDEggvbS8wMV9kNHIMCAMSCC9tLzBjdjN3cgwIAxIIL20vMDEzeXFyDAgDEggvbS8wZjJycRqrARIKMjAyNi0wNy0yM3oOCAMSCi9tLzAzMHFiM3RqDQgDEgkvbS8wMl8yODZqDAgDEggvbS8wZDZscGoOCAMSCi9tLzAyaHJoMF9qDAgDEggvbS8wZDlqcmoMCAMSCC9tLzByaDZragwIAxIIL20vMDFfZDRqDAgDEggvbS8wY3Yzd2oMCAMSCC9tLzAxM3lxagwIAxIIL20vMGYycnFyDAgCEggvbS8waHNxZkABSAFwAYIBCwj___________8BmAEB2gEGCgQwAUgB&q=%EB%AF%B8%EA%B5%AD&ved=0CAMQusIPahcKEwjAnPvnjLaVAxUAAAAAHQAAAAAQGg&uact=3' },
            { id: 'rf5', city: '캐나다', enCity: 'Canada', code: 'CAN', basePrice: 590000, img: '/canada.jpg', url: 'https://www.google.com/travel/flights/deals?hl=ko&gl=KR&tfs=CBwQBhq6AhIKMjAyNi0wNy0xOWoMCAISCC9tLzAoc3FmcmcIAxIKL20vMDgwaDJyDAgDEggvbS8waHdoNnIMCAMSCC9tLzA1MnA3cgwIAxIIL20vMDFyMzJyDQgDEgkvbS8wMV82MHdyDAgDEggvbS8wcG1wMnIMCAMSCC9tLzA3eXB0cgwIAxIIL20vMDVrc2hyDQgDEgkvbS8wMzZrMHNyDQgDEgkvbS8wMjV6NHNyDQgDEgkvbS8wMXN6NGJyDQgDEgkvbS8wMXR4eThyDQgDEgkvbS8wMThsY19yDAgDEggvbS8wODFzN3IMCAMSCC9tLzBubGg3cg0IAxIJL20vMDFnYl83cg0IAxIJL20vMDliNWgwcgwIAxIIL20vMGZueDFyDAgDEggvbS8wajhwNnIMCAMSCC9tLzBwcmZnGroCEgoyMDI2LTA3LTIzagwIAxIIL20vMDgwaDJqDAgDEggvbS8waHdoNmoMCAMSCC9tLzA1MnA3agwIAxIIL20vMDFyMzJqDQgDEgkvbS8wMV82MHdqDAgDEggvbS8wcG1wMmoMCAMSCC9tLzA3eXB0agwIAxIIL20vMDVrc2hqDQgDEgkvbS8wMzZrMHNqDQgDEgkvbS8wMjV6NHNqDQgDEgkvbS8wMXN6NGJqDQgDEgkvbS8wMXR4eThqDQgDEgkvbS8wMThsY19qDAgDEggvbS8wODFzN2oMCAMSCC9tLzBubGg3ag0IAxIJL20vMDFnYl83ag0IAxIJL20vMDliNWgwagwIAxIIL20vMGZueDFqDAgDEggvbS8wajhwNmoMCAMSCC9tLzBwcmZncgwIAhIIL20vMGhzcWZAAUgBcAGCAQsI____________AZgBAdoBBgoEMAFIAQ&q=%EC%BA%90%EB%82%98%EB%8B%A4&ved=0CAMQusIPahcKEwjwvrXhjbaVAxUAAAAAHQAAAAAQGA&uact=3' },
            { id: 'rf6', city: '중국', enCity: 'China', code: 'CHN', basePrice: 99000, img: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400&q=80', url: 'https://www.google.com/travel/flights/deals?hl=ko&gl=KR&tfs=CBwQBhqqARIKMjAyNi0wNy0xOWoMCAISCC9tLzAoc3FmcmgwIAxIIL20vMDE5MTRyDAgDEggvbS8wNndqZnIMCAMSCC9tLzAzOTNncg0IAxIJL20vMDFsM3Mwcg0IAxIJL20vMDE2djQ2cgwIAxIIL20vMGt6ZDlyDAgDEggvbS8wM2g2NHIMCAMSCC9tLzBsYm12cg0IAxIJL20vMDE0dm00cg0IAxIJL20vMDE3MjM2GqoBEgoyMDI2LTA3LTIzagwIAxIIL20vMDE5MTRqDAgDEggvbS8wNndqZmoMCAMSCC9tLzAzOTNnag0IAxIJL20vMDFsM3Mwag0IAxIJL20vMDE2djQ2agwIAxIIL20vMGt6ZDlqDAgDEggvbS8wM2g2NGoMCAMSCC9tLzBsYm12ag0IAxIJL20vMDE0dm00ag0IAxIJL20vMDE3MjM2cgwIAhIIL20vMGhzcWZAAUgBcAGCAQsI____________AZgBAdoBBgoEMAFIAQ&q=%EC%A4%91%EA%B5%AD&ved=0CAMQusIPahcKEwjokOuqjraVAxUAAAAAHQAAAAAQCw&uact=3' },
            { id: 'rf7', city: '중남미', enCity: 'South America', code: 'LATAM', basePrice: 850000, img: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&q=80', url: 'https://www.google.com/travel/flights/deals?hl=ko&gl=KR&tfs=CBwQBhrzARIKMjAyNi0wNy0xOWoMCAISCC9tLzBoc3FmcgwIAxIIL20vMDRzcWpyDQgDEgkvbS8wMXE5OG1yDAgDEggvbS8wZnJfYnINCAMSCS9tLzAxZzNiMnINCAMSCS9tLzAxZHp5Y3IMCAMSCC9tLzBscGZocgwIAxIIL20vMGRscXZyDQgDEgkvbS8wMWx5NW1yDQgDEgkvbS8wMjJwZm1yDAgDEggvbS8wNmdtcnINCAMSCS9tLzAxZHRxMXIMCAMSCC9tLzA5anAzcgwIAxIIL20vMDM4NmhyDAgDEggvbS8wZnRmd3INCAMSCS9tLzAxeXF3Z2oNCAMSCS9tLzA0NGNqdmoNCAMSCS9tLzAxeHJfNnNyDAgCEggvbS8waHNxZkABSAFwAYIBCwj___________8BmAEB2gEGCgQwAUgB&q=%EC%A4%91%EB%82%A8%EB%AF%B8&ved=0CAMQusIPahgKEwjQmpW3_LWVAxUAAAAAHQAAAAAQlQQ&uact=3' },
            { id: 'rf8', city: '아프리카', enCity: 'Africa', code: 'AFR', basePrice: 920000, img: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=80', url: 'https://www.google.com/travel/flights/deals?hl=ko&gl=KR&tfs=CBwQBhqpAhIKMjAyNi0wNy0xOWoMCAISCC9tLzAxdzJ2agwIAxIIL20vMDF5ajJqDAgDEggvbS8wNWQ0OWoMCAMSCC9tLzA1NHJ3agwIAxIIL20vMGcyODRqDAgDEggvbS8wZHR0ZmoMCAMSCC9tLzA0dnM5agwIAxIIL20vMDZzdzlqDAgDEggvbS8wMjJiX2oMCAMSCC9tLzA4Y2R0agwIAxIIL20vMDU0cndqDAgDEggvbS8wZzI4NGoMCAMSCC9tLzBkdHRmagwIAxIIL20vMDR2czlqDAgDEggvbS8wNnN3OWoNCAMSCS9tLzA1dHNwN3oMCAMSCC9tLzBmbnljagwIAxIIL20vMGxuZnlyDQgDEgkvbS8wMjY2a2pyDAgCEggvbS8waHNxZkABSAFwAYIBCwj___________8BmAEB2gEGCgQwAUgB&q=%EC%95%84%ED%94%84%EB%A6%AC&ved=0CAMQusIPahcKEwjYsPC_h7aVAxUAAAAAHQAAAAAQgwI&uact=3' }
        ];
        return rawRegionDeals.map(deal => {
            const info = getCheapestFlightInfo(deal.code, deal.basePrice);
            return {
                ...deal,
                price: info.price,
                depDate: info.depDate,
                displayDate: info.displayDate
            };
        });
    }, []);
    // 상태 관리 (원본 유지 + 로그인 모달 추가)
    const [step, setStep] = useState(1);
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
    const [activeTab, setActiveTab] = useState('home');
    const [showCoachSheet, setShowCoachSheet] = useState(false);
    const [flightTo, setFlightTo] = useState("");
    const [flightDateRange, setFlightDateRange] = useState([null, null]);
    const [flightAdults, setFlightAdults] = useState(1);
    const [flightSearchError, setFlightSearchError] = useState("");
    const [showWelcome, setShowWelcome] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [mySchedules, setMySchedules] = useState([]);
    const [isButtonHovered, setIsButtonHovered] = useState(false);
    const [showFlightNotice, setShowFlightNotice] = useState(false); // ✨ 최저가 알림 커스텀 모달 상태 추가
    const [flightCache, setFlightCache] = useState({}); // ✨ 최근 14일 실조회 항공권 데이터 캐시
    const [aiRecommendations, setAiRecommendations] = useState([]); // 🤖 AI 실시간 인접 공항 추천 데이터
    const [isAiLoading, setIsAiLoading] = useState(false); // 🤖 AI 추천 로딩 상태
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [selectedPromoFlight, setSelectedPromoFlight] = useState(null); // 최저가 대행사 비교 모달용
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
    const [youtubeVideos, setYoutubeVideos] = useState([
        { id: 'y1', title: '왕복 5만원으로 다녀온 제주 동쪽 여행브이로그 ✈️', channel: '해도 HAEDO', yid: 'XiLRFEKfysE', url: 'https://www.youtube.com/watch?v=XiLRFEKfysE', likes: 15400, date: '4일 전' },
        { id: 'y2', title: '보고도 믿기지 않는, 캐나다 밴쿠버의 일상 🇨🇦', channel: '희철리즘 Heechulism', yid: 'tmow4E_F3xo', url: 'https://www.youtube.com/watch?v=tmow4E_F3xo', likes: 12800, date: '4일 전' },
        { id: 'y3', title: '1n년 친구랑 베트남 나트랑 그냥 먹고 놀기 🇻🇳', channel: '그 유미 말고', yid: '7PFcyPSpnMc', url: 'https://www.youtube.com/watch?v=7PFcyPSpnMc', likes: 8920, date: '5일 전' },
        { id: 'y4', title: '죽기전에 꼭 리스본에 가봐야 하는이유 🇵🇹', channel: '여락이들', yid: 'o3bQPvDfQGU', url: 'https://www.youtube.com/watch?v=o3bQPvDfQGU', likes: 7800, date: '6일 전' },
        { id: 'y5', title: '다낭 여행 브이로그 | 맥주로 시작해서 맥주로 끝나는 찐 알콜러들의 여행기 🍻', channel: '열매달', yid: '3SEj5jzX7BA', url: 'https://www.youtube.com/watch?v=3SEj5jzX7BA', likes: 6120, date: '2일 전' },
        { id: 'y6', title: '[삿포로 Vlog] 비에이 투어 핵심 코스 완벽 정복! ❄️', channel: '민경 Minkyung', yid: 'EjJneqNikLE', url: 'https://www.youtube.com/watch?v=EjJneqNikLE', likes: 4200, date: '6일 전' },
        { id: 'y7', title: '10년지기 친구랑 오사카 여행 브이로그 🎢', channel: '소소한 여행기', yid: 'BMp2Eqr2Pvw', url: 'https://www.youtube.com/watch?v=BMp2Eqr2Pvw', likes: 3850, date: '5일 전' },
        { id: 'y8', title: '싱가폴 마리나베이샌즈 호텔로 아기와여행하기! 🏨', channel: '싱가포르 아기여행', yid: 'tshv3hhHkRg', url: 'https://www.youtube.com/watch?v=tshv3hhHkRg', likes: 2900, date: '3일 전' },
        { id: 'y9', title: '여름 제주 동쪽 여행 브이로그 | 맛집, 카페, 소품샵 🌊', channel: '제주 여행기', yid: 'Zuh810k6nsI', url: 'https://www.youtube.com/watch?v=Zuh810k6nsI', likes: 2450, date: '5일 전' },
        { id: 'y10', title: '스위스에서 가장 예쁜 동네 : 뮤렌 🏔️', channel: '스위스에서 가장 예쁜 동네 : 뮤렌', yid: 'pTqmzCvzUOc', url: 'https://www.youtube.com/watch?v=pTqmzCvzUOc', likes: 1890, date: '4일 전' }
    ]);
    const loadFlightCache = async (currentUser) => {
        const targetUser = currentUser || auth.currentUser || user || session;
        const isMemberUser = !!targetUser;

        // 🌟 비로그인(비회원) 상태일 경우 API 호출을 원천 배제하여 로딩 속도 최적화 및 불필요한 요청 차단
        if (!isMemberUser) {
            return;
        }

        try {
            const res = await fetch(getApiUrl(`/api/flights/cache?isMember=${isMemberUser}`));
            const data = await res.json();
            if (data.cache) {
                setFlightCache(data.cache);
            }
        } catch (err) {
            console.warn("Failed to load flight cache via server API:", err);
        }
    };
    useEffect(() => {
        loadFlightCache();
    }, []);
    useEffect(() => {
        const fetchLatestVideos = async () => {
            try {
                const res = await fetch('/api/youtube/latest');
                const json = await res.json();
                if (json.data && json.data.length > 0) {
                    setYoutubeVideos(json.data);
                }
            } catch (err) {
                console.error("Error fetching latest travel vlogs:", err);
            }
        };
        fetchLatestVideos();
    }, []);
    // 🌟 실시간 최저가 항공권 무한 자동 슬라이드 및 수동 드래그/스크롤 하이브리드 연동
    useEffect(() => {
        const container = lowestFlightsRef.current;
        if (!container || activeTab !== 'home') return;
        let animationFrameId;
        let lastTime = performance.now();
        let scrollPosition = container.scrollLeft;
        let active = true;
        let resumeTimeout;
        const step = (time) => {
            if (!active) return;
            const delta = (time - lastTime) / 1000;
            lastTime = time;
            if (!container) return;
            // 1초에 15픽셀의 속도로 매우 부드럽고 느리게 자동 스크롤
            scrollPosition += 15 * delta;
            const halfWidth = container.scrollWidth / 2;
            if (scrollPosition >= halfWidth) {
                scrollPosition = 0;
            }
            container.scrollLeft = scrollPosition;
            animationFrameId = requestAnimationFrame(step);
        };
        const handleInteraction = () => {
            active = false;
            cancelAnimationFrame(animationFrameId);
            clearTimeout(resumeTimeout);
            // 사용자가 수동 조작을 멈추고 3.5초가 지나면 부드럽게 자동 스크롤 재개
            resumeTimeout = setTimeout(() => {
                active = true;
                lastTime = performance.now();
                scrollPosition = container.scrollLeft;
                animationFrameId = requestAnimationFrame(step);
            }, 3500);
        };
        // 드래그앤스크롤 상태 기록용 리스너
        const handleScroll = () => {
            if (!active) {
                scrollPosition = container.scrollLeft;
            }
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        container.addEventListener('mousedown', handleInteraction, { passive: true });
        container.addEventListener('touchstart', handleInteraction, { passive: true });
        container.addEventListener('wheel', handleInteraction, { passive: true });
        // 마우스 드래그로 수동 좌우 스크롤 지원 (Desktop)
        let isDown = false;
        let startX;
        let scrollLeftVal;
        const handleMouseDown = (e) => {
            isDown = true;
            container.classList.add('active');
            startX = e.pageX - container.offsetLeft;
            scrollLeftVal = container.scrollLeft;
        };
        const handleMouseLeaveOrUp = () => {
            isDown = false;
            container.classList.remove('active');
        };
        const handleMouseMove = (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 1.5; // 스크롤 민감도
            container.scrollLeft = scrollLeftVal - walk;
            scrollPosition = container.scrollLeft;
        };
        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('mouseleave', handleMouseLeaveOrUp);
        container.addEventListener('mouseup', handleMouseLeaveOrUp);
        container.addEventListener('mousemove', handleMouseMove);
        // 첫 프레임 시작
        animationFrameId = requestAnimationFrame(step);
        return () => {
            cancelAnimationFrame(animationFrameId);
            clearTimeout(resumeTimeout);
            if (container) {
                container.removeEventListener('scroll', handleScroll);
                container.removeEventListener('mousedown', handleInteraction);
                container.removeEventListener('touchstart', handleInteraction);
                container.removeEventListener('wheel', handleInteraction);

                container.removeEventListener('mousedown', handleMouseDown);
                container.removeEventListener('mouseleave', handleMouseLeaveOrUp);
                container.removeEventListener('mouseup', handleMouseLeaveOrUp);
                container.removeEventListener('mousemove', handleMouseMove);
            }
        };
    }, [activeTab]);
    // 🌟 실시간 지역별 특가 항공권 수동 드래그/스크롤 연동 (자동 스크롤 비활성화)
    useEffect(() => {
        const container = lowestRegionFlightsRef.current;
        if (!container || activeTab !== 'home') return;
        // 마우스 드래그로 수동 좌우 스크롤 지원 (Desktop)
        let isDown = false;
        let startX;
        let scrollLeftVal;
        const handleMouseDown = (e) => {
            isDown = true;
            container.classList.add('active');
            startX = e.pageX - container.offsetLeft;
            scrollLeftVal = container.scrollLeft;
        };
        const handleMouseLeaveOrUp = () => {
            isDown = false;
            container.classList.remove('active');
        };
        const handleMouseMove = (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 1.5; // 스크롤 민감도 배율
            container.scrollLeft = scrollLeftVal - walk;
        };
        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('mouseleave', handleMouseLeaveOrUp);
        container.addEventListener('mouseup', handleMouseLeaveOrUp);
        container.addEventListener('mousemove', handleMouseMove);
        return () => {
            if (container) {
                container.removeEventListener('mousedown', handleMouseDown);
                container.removeEventListener('mouseleave', handleMouseLeaveOrUp);
                container.removeEventListener('mouseup', handleMouseLeaveOrUp);
                container.removeEventListener('mousemove', handleMouseMove);
            }
        };
    }, [activeTab]);
    // 🌟 실시간 지역별 특가 숙박 수동 드래그/스크롤 연동 (자동 스크롤 비활성화)
    useEffect(() => {
        const container = lowestLodgingRef.current;
        if (!container || activeTab !== 'home') return;

        // 마우스 드래그로 수동 좌우 스크롤 지원 (Desktop)
        let isDown = false;
        let startX;
        let scrollLeftVal;

        const handleMouseDown = (e) => {
            isDown = true;
            container.classList.add('active');
            startX = e.pageX - container.offsetLeft;
            scrollLeftVal = container.scrollLeft;
        };

        const handleMouseLeaveOrUp = () => {
            isDown = false;
            container.classList.remove('active');
        };

        const handleMouseMove = (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 1.5;
            container.scrollLeft = scrollLeftVal - walk;
        };

        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('mouseleave', handleMouseLeaveOrUp);
        container.addEventListener('mouseup', handleMouseLeaveOrUp);
        container.addEventListener('mousemove', handleMouseMove);

        return () => {
            if (container) {
                container.removeEventListener('mousedown', handleMouseDown);
                container.removeEventListener('mouseleave', handleMouseLeaveOrUp);
                container.removeEventListener('mouseup', handleMouseLeaveOrUp);
                container.removeEventListener('mousemove', handleMouseMove);
            }
        };
    }, [activeTab]);
    // 🌟 실시간 인기 유튜브 여행 영상 무한 자동 슬라이드 및 수동 드래그/스크롤 연동 (왼쪽에서 오른쪽으로 흐름)
    useEffect(() => {
        const container = youtubeVlogsRef.current;
        if (!container || activeTab !== 'home') return;
        let animationFrameId;
        let lastTime = performance.now();
        let scrollPosition = container.scrollWidth / 2;
        let active = true;
        let resumeTimeout;
        // 스크롤 너비가 계산되면 시작 스크롤 위치를 중앙(halfWidth)으로 맞춤
        const initScroll = () => {
            const halfWidth = container.scrollWidth / 2;
            if (halfWidth > 0) {
                scrollPosition = halfWidth;
                container.scrollLeft = scrollPosition;
            }
        };
        setTimeout(initScroll, 500);
        const step = (time) => {
            if (!active) return;
            const delta = (time - lastTime) / 1000;
            lastTime = time;
            if (!container) return;
            // 1초에 15픽셀의 속도로 왼쪽에서 오른쪽으로 역방향 자동 스크롤
            scrollPosition -= 15 * delta;
            const halfWidth = container.scrollWidth / 2;
            if (scrollPosition <= 0) {
                scrollPosition = halfWidth;
            }
            container.scrollLeft = scrollPosition;
            animationFrameId = requestAnimationFrame(step);
        };
        const handleInteraction = () => {
            active = false;
            cancelAnimationFrame(animationFrameId);
            clearTimeout(resumeTimeout);
            // 사용자가 수동 조작을 멈추고 3.5초가 지나면 자동 스크롤 재개
            resumeTimeout = setTimeout(() => {
                active = true;
                lastTime = performance.now();
                scrollPosition = container.scrollLeft;
                animationFrameId = requestAnimationFrame(step);
            }, 3500);
        };
        const handleScroll = () => {
            if (!active) {
                scrollPosition = container.scrollLeft;
            }
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        container.addEventListener('mousedown', handleInteraction, { passive: true });
        container.addEventListener('touchstart', handleInteraction, { passive: true });
        container.addEventListener('wheel', handleInteraction, { passive: true });
        // 마우스 드래그로 수동 좌우 스크롤 지원 (Desktop)
        let isDown = false;
        let startX;
        let scrollLeftVal;
        const handleMouseDown = (e) => {
            isDown = true;
            container.classList.add('active');
            startX = e.pageX - container.offsetLeft;
            scrollLeftVal = container.scrollLeft;
        };
        const handleMouseLeaveOrUp = () => {
            isDown = false;
            container.classList.remove('active');
        };
        const handleMouseMove = (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 1.5;
            container.scrollLeft = scrollLeftVal - walk;
            scrollPosition = container.scrollLeft;
        };
        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('mouseleave', handleMouseLeaveOrUp);
        container.addEventListener('mouseup', handleMouseLeaveOrUp);
        container.addEventListener('mousemove', handleMouseMove);
        animationFrameId = requestAnimationFrame(step);
        return () => {
            cancelAnimationFrame(animationFrameId);
            clearTimeout(resumeTimeout);
            if (container) {
                container.removeEventListener('scroll', handleScroll);
                container.removeEventListener('mousedown', handleInteraction);
                container.removeEventListener('touchstart', handleInteraction);
                container.removeEventListener('wheel', handleInteraction);

                container.removeEventListener('mousedown', handleMouseDown);
                container.removeEventListener('mouseleave', handleMouseLeaveOrUp);
                container.removeEventListener('mouseup', handleMouseLeaveOrUp);
                container.removeEventListener('mousemove', handleMouseMove);
            }
        };
    }, [activeTab, youtubeVideos]);
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
            const queryTab = params.get("tab");
            if (queryTab && ['home', 'flights_search', 'create', 'around_me'].includes(queryTab)) {
                setActiveTab(queryTab);
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
                // 🌟 로그인 유저 확인 시점에 Firestore에서 항공 최저가 캐시 데이터 조회
                loadFlightCache(currentUser);

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
            if (currentUser) {
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);
                if (!userSnap.exists()) { setShowNicknameModal(true); }
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
        return () => { window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt); window.removeEventListener('appinstalled', handleAppInstalled); unsubscribeAuth(); if (unsubscribeTrips) unsubscribeTrips(); };
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
            setShowNicknameModal(false);
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
    const fetchAiAirportRecommendations = async (destinationStr) => {
        if (!destinationStr) return;
        setIsAiLoading(true);
        try {
            const res = await fetch(getApiUrl(`/api/flights/recommend-airport?destination=${encodeURIComponent(destinationStr)}&lang=${language}`));
            const data = await res.json();
            if (data.recommendations && data.recommendations.length > 0) {
                setAiRecommendations(data.recommendations);
            } else {
                setAiRecommendations([]);
            }
        } catch (err) {
            console.error("AI Airport Recommendation load fail:", err);
            setAiRecommendations([]);
        } finally {
            setIsAiLoading(false);
        }
    };
    const proceedFlightSearch = async (trip, arrivalCode, returnOriginCode) => {
        const depDateStr = formatDateForAPI(trip.startDate); if (!depDateStr) return;
        let retDateStr = formatDateForAPI(trip.endDate);
        if (!retDateStr) { const d = new Date(depDateStr); d.setDate(d.getDate() + 4); retDateStr = d.toISOString().split('T')[0]; }
        setSelectedTrip({ ...trip, iata: arrivalCode, returnIata: returnOriginCode, returnDateCalc: retDateStr });
        setIsSearching(true); setFlightResults([]);

        const isMemberUser = !!(auth.currentUser || user || session);

        try {
            const res = await fetch(getApiUrl('/api/flights/'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destinationCode: arrivalCode,
                    returnOriginCode,
                    departureDate: depDateStr,
                    returnDate: retDateStr,
                    language,
                    destinationName: trip.destination || trip.title,
                    isMember: isMemberUser // 🌟 회원 여부 전송
                })
            });
            const data = await res.json();
            setFlightResults(data.flights || []);

            // 🌟 [최근 14일 실조회 항공 최저가 로컬 상태 갱신]
            // 클라이언트 사이드 setDoc는 완전히 걷어내고, 사용자가 실시간 조회를 완수했을 때
            // 화면 갱신이 즉시 일어나도록 로컬 상태만 갱신해 줍니다. (DB 기록은 서버가 성공적으로 처리함)
            if (data.flights && data.flights.length > 0) {
                const validFlights = data.flights.filter(f => !f.isFallback && f.price > 0);
                if (validFlights.length > 0) {
                    validFlights.sort((a, b) => a.price - b.price);
                    const cheapestFlight = validFlights[0];

                    const parsedDate = new Date(depDateStr);
                    const weekDaysKo = ['일', '월', '화', '수', '목', '금', '토'];
                    const weekDaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const dayNameKo = weekDaysKo[parsedDate.getDay()];
                    const dayNameEn = weekDaysEn[parsedDate.getDay()];

                    setFlightCache(prev => ({
                        ...prev,
                        [arrivalCode]: {
                            price: cheapestFlight.price,
                            displayDate: `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}(${dayNameKo}) 출발`,
                            displayDateEn: `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}(${dayNameEn}) Dep`,
                            isReal: true
                        }
                    }));
                }
            }

        } catch (error) { console.error(error); } finally { setIsSearching(false); }
    };
    const handleTripClick = async (trip) => {
        let arrivalCode = findIataCode(`${trip.destination || ''} ${trip.title || ''}`);
        if (!arrivalCode) { arrivalCode = trip.arrivalIata || trip.iata; }
        if (!arrivalCode || arrivalCode.length !== 3) {
            setAiRecommendations([]);
            setManualAirport({ show: true, trip, searchStr: "", error: "" });
            fetchAiAirportRecommendations(trip.destination || trip.title);
            return;
        }
        proceedFlightSearch(trip, arrivalCode, arrivalCode);
    };
    const handleManualSubmit = () => {
        const input = manualAirport.searchStr.trim();
        let resolvedCode = /^[A-Za-z]{3}$/.test(input) ? input.toUpperCase() : findIataCode(input);
        if (resolvedCode) {
            const trip = manualAirport.trip;
            setManualAirport({ show: false, trip: null, searchStr: "", error: "" });
            if (trip && trip.isFromSearchForm) {
                let googleFlightsLink = `https://www.google.com/travel/flights?hl=ko&gl=KR&q=Flights from Seoul to ${resolvedCode} on ${trip.startDate}`;
                if (trip.endDate) {
                    googleFlightsLink += ` through ${trip.endDate}`;
                }
                googleFlightsLink += ` with ${trip.adults || 1} adults`;
                window.open(googleFlightsLink, '_blank');
            } else {
                proceedFlightSearch(trip, resolvedCode, resolvedCode);
            }
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
            {/* 닉네임 설정 모달 (스포티파이 테마) */}
            <AnimatePresence>
                {showNicknameModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm shadow-2xl relative border border-slate-200 text-slate-900">
                            <button onClick={() => setShowNicknameModal(false)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white"><X size={20} /></button>
                            <h3 className="text-xl font-black text-center text-slate-900 mb-2">{translations[language].modal_nickname_title}</h3>
                            <input type="text" placeholder={translations[language].modal_nickname_placeholder} value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-center text-lg mb-4 text-slate-950 placeholder:text-slate-400 focus:border-spotify-green" />
                            <button onClick={handleCompleteSignUp} className="w-full py-4 bg-gradient-to-r from-brand-start via-brand-middle to-brand-end text-white font-extrabold text-lg rounded-2xl active:scale-95 transition-all hover:brightness-110 shadow-lg shadow-brand-primary/20">{translations[language].modal_nickname_btn}</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* ✨ 로그인 방식 선택 모달 (스포티파이 테마) */}
            <AnimatePresence>
                {showLoginModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white/95 backdrop-blur-xl rounded-[32px] p-8 w-full max-w-sm shadow-2xl relative text-center border border-slate-200 text-slate-900">
                            <button onClick={() => setShowLoginModal(false)} className="absolute top-5 right-5 text-slate-300 hover:text-white transition"><X size={24} /></button>
                            <div className="mb-6 flex justify-center"><CatMascot width={100} /></div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">{translations[language].modal_login_title}</h3>
                            <p className="text-sm text-slate-600 mb-8 leading-relaxed">
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
            {/* 수동 공항 입력 (스포티파이 테마) */}
            <AnimatePresence>
                {manualAirport.show && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm shadow-2xl relative border border-slate-200 text-slate-900">
                            <button onClick={() => setManualAirport({ show: false, trip: null, searchStr: "", error: "" })} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white"><X size={20} /></button>
                            <h3 className="text-xl font-black text-center text-slate-900 mb-2">{translations[language].modal_airport_title}</h3>
                            <p className="text-xs text-center text-slate-300 mb-4 font-bold text-brand-danger">{translations[language].modal_airport_desc.replace('{destination}', manualAirport.trip?.destination)}</p>
                            <input type="text" placeholder={translations[language].modal_airport_placeholder} value={manualAirport.searchStr} onChange={(e) => setManualAirport({ ...manualAirport, searchStr: e.target.value, error: "" })} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-center font-bold text-slate-950 placeholder:text-slate-400 focus:border-spotify-green" />
                            {manualAirport.error && <p className="text-[10px] text-brand-danger text-center mt-2">{manualAirport.error}</p>}

                            {/* 🌟 AI 실시간 인접 대체 공항 추천 칩 섹션 */}
                            <div className="mt-4 p-3 bg-slate-50/80 border border-slate-100 rounded-2xl text-center">
                                <span className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                                    {language === 'en' ? "🤖 AI Nearby Airport Guide" : "🤖 AI 실시간 추천 공항"}
                                </span>

                                {isAiLoading ? (
                                    <div className="flex flex-col items-center justify-center py-4 space-y-2">
                                        <RefreshCw className="animate-spin text-spotify-green" size={20} />
                                        <span className="text-[9px] font-bold text-slate-400">
                                            {language === 'en' ? "Analyzing nearest airports..." : "가장 가까운 공항 분석 중..."}
                                        </span>
                                    </div>
                                ) : aiRecommendations && aiRecommendations.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 justify-center max-h-[160px] overflow-y-auto scrollbar-hide py-1">
                                        {aiRecommendations.map((rec) => (
                                            <button
                                                key={rec.code}
                                                onClick={() => {
                                                    const trip = manualAirport.trip;
                                                    setManualAirport({ show: false, trip: null, searchStr: "", error: "" });
                                                    if (trip && trip.isFromSearchForm) {
                                                        let googleFlightsLink = `https://www.google.com/travel/flights?hl=ko&gl=KR&q=Flights from Seoul to ${rec.code} on ${trip.startDate}`;
                                                        if (trip.endDate) {
                                                            googleFlightsLink += ` through ${trip.endDate}`;
                                                        }
                                                        googleFlightsLink += ` with ${trip.adults || 1} adults`;
                                                        window.open(googleFlightsLink, '_blank');
                                                    } else {
                                                        proceedFlightSearch(trip, rec.code, rec.code);
                                                    }
                                                }}
                                                className="px-3.5 py-2 bg-white hover:bg-spotify-green hover:text-black border border-slate-200 hover:border-spotify-green rounded-full text-xs font-bold text-slate-700 transition duration-200 active:scale-95 shadow-sm"
                                                title={`${rec.name} (${rec.code})`}
                                            >
                                                {rec.desc ? `${rec.name} (${rec.code}) - ${rec.desc}` : `${rec.name} (${rec.code})`}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-2 text-[10px] font-bold text-slate-400">
                                        {language === 'en' ? "No recommendations found. Try searching with a city name." : "추천된 공항이 없습니다. 아래 입력창에 도시명을 치고 AI 추천을 검색해 보세요."}
                                    </div>
                                )}

                                {/* 사용자가 직접 텍스트를 입력했을 때 AI 추천 결과를 갱신할 수 있는 스마트 트리거 */}
                                {manualAirport.searchStr && manualAirport.searchStr.trim().length >= 2 && (
                                    <button
                                        onClick={() => fetchAiAirportRecommendations(manualAirport.searchStr)}
                                        className="mt-2.5 text-xs font-black text-spotify-green hover:underline flex items-center justify-center gap-1.5 mx-auto"
                                    >
                                        <Search size={12} />
                                        <span>"{manualAirport.searchStr}" {language === 'en' ? "Search with AI" : "AI로 인근 공항 실시간 검색"}</span>
                                    </button>
                                )}
                            </div>

                            <button onClick={handleManualSubmit} className="w-full py-4 bg-gradient-to-r from-brand-start via-brand-middle to-brand-end text-white font-extrabold rounded-2xl mt-4 transition-all hover:brightness-110 shadow-lg shadow-brand-primary/20">{translations[language].modal_airport_btn}</button>
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
                {/* 비네팅 오버레이로 스포티파이 느낌의 딥 다크 그라데이션 추가 (사진이 잘 보이도록 투명도 최적화 및 상단 영역 확장) */}
                <div
                    className="absolute inset-0 transition-all duration-1000 opacity-35"
                    style={{ backgroundImage: `linear-gradient(to bottom, ${getHomeGradient(step)} 0%, ${getHomeGradient(step)} 20%, #121212 100%)` }}
                />
            </div>
            {/* 메인 박스 — 가독성을 높이기 위해 배경을 은은하고 따뜻한 샌드톤(bg-sand-light)으로 변경 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[560px] h-full bg-sand-light border-x border-slate-200 overflow-hidden relative flex flex-col z-10 shadow-2xl text-slate-800"
            >
                {/* 상단 은은한 샌드 그라데이션 */}
                <div
                    className="absolute top-0 left-0 right-0 h-48 opacity-20 pointer-events-none z-0"
                    style={{ backgroundImage: `linear-gradient(to bottom, #EADCB9 0%, transparent 100%)` }}
                />
                <div className="px-4 pt-6 pb-2 shrink-0 flex justify-between items-center bg-transparent z-20">
                    <img src="/logo1.png?v=2" alt="Logo" className="h-14 w-auto object-contain" />
                    <div className="z-50 flex items-center gap-1.5 sm:gap-2">
                        <div className="flex bg-slate-100/90 p-0.5 rounded-full text-[9px] font-black shadow-sm border border-slate-200 shrink-0">
                            <button
                                onClick={() => setLanguage('ko')}
                                className={`px-2 py-1 rounded-full transition-all duration-300 ${language === 'ko' ? 'bg-white text-black shadow-xs' : 'text-slate-500 hover:text-black'}`}
                            >
                                한국어
                            </button>
                            <button
                                onClick={() => setLanguage('en')}
                                className={`px-2 py-1 rounded-full transition-all duration-300 ${language === 'en' ? 'bg-white text-black shadow-xs' : 'text-slate-500 hover:text-black'}`}
                            >
                                English
                            </button>
                        </div>
                        {user || session ? (
                            <div onClick={() => router.push('/mypage')} className="flex items-center gap-2 cursor-pointer group hover:bg-white/10 p-1.5 rounded-full transition">
                                <div className="w-10 h-10 rounded-full border-2 border-white/20 shadow-md overflow-hidden shrink-0">
                                    <img src={userData?.profileImgBase64 || user?.photoURL || session?.user?.image || "https://via.placeholder.com/40"} alt="Profile" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowLoginModal(true)} // ✨ 모달 오픈
                                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-brand-start via-brand-middle to-brand-end text-white font-extrabold text-sm shadow-lg shadow-brand-primary/20 active:scale-95 transition-all hover:brightness-110"
                            >
                                {translations[language].btn_login}
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hide pt-2 pb-32 px-4">
                    {activeTab === 'home' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* 1. 실시간 최저가 항공권 (제안 C) */}
                            <div className="px-1 space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                        <Plane className="text-spotify-green" size={18} />
                                        {language === 'en' ? "Real-time Lowest Flights" : "실시간 최저가 항공권"}
                                        <button
                                            type="button"
                                            onClick={() => setShowFlightNotice(true)}
                                            className="text-slate-400 hover:text-spotify-green transition-colors ml-0.5 flex items-center justify-center p-1 rounded-full hover:bg-slate-100"
                                            title={language === 'en' ? "Real-time pricing notice" : "실시간 가격 변동 안내"}
                                        >
                                            <AlertCircle size={15} />
                                        </button>
                                    </h3>
                                    <button type="button" onClick={() => setActiveTab('flights_search')} className="text-xs text-spotify-green font-bold hover:underline">
                                        {language === 'en' ? "Search More" : "더 많은 공항 검색 ↗"}
                                    </button>
                                </div>
                                {/* 프로모 딜 가로 흐름(Marquee) 슬라이더 (수동 드래그 및 자동 스크롤 겸용) */}

                                <div className="relative w-full py-1">
                                    <div
                                        ref={lowestFlightsRef}
                                        className="flex gap-3 overflow-x-auto scrollbar-hide px-1 select-none cursor-grab active:cursor-grabbing w-full"
                                    >
                                        {promoDeals.concat(promoDeals).map((deal, idx) => {
                                            const cached = flightCache[deal.code];
                                            const isUserLoggedIn = !!(auth.currentUser || user || session);
                                            const isReal = isUserLoggedIn && cached && cached.isReal;

                                            // 🌟 가격 곱하기 연산 적용: 실시간 카드 1.5배, 일반 카드 2.5배 (천원 단위 올림)
                                            const basePrice = isReal ? cached.price : deal.price;
                                            const multiplier = isReal ? 1.5 : 2.5;
                                            const price = Math.floor((basePrice * multiplier) / 1000) * 1000;

                                            const displayDateText = language === 'en'
                                                ? (isReal ? cached.displayDateEn : (deal.displayDateEn || `${deal.displayDate} Dep`))
                                                : (isReal ? cached.displayDate : deal.displayDate);

                                            return (
                                                <div
                                                    key={`${deal.id}-${idx}`}
                                                    onClick={() => {
                                                        window.open(`https://www.google.com/travel/flights?hl=ko&gl=KR&q=${encodeURIComponent('ICN to ' + deal.code)}&curr=KRW`, '_blank');
                                                    }}
                                                    className="min-w-[155px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:border-spotify-green/30 transition-all group shrink-0 relative"
                                                >
                                                    <div className="h-24 relative overflow-hidden">
                                                        <img src={deal.img} alt={deal.city} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                                        <span className="absolute bottom-2 left-2.5 text-xs font-black text-white">{language === 'en' ? deal.enCity : deal.city} ({deal.code})</span>

                                                        {/* 🌟 실시간 데이터 마이크로 뱃지 */}
                                                        {isReal && (
                                                            <span className="absolute top-2 left-2 text-[8px] font-black bg-spotify-green text-black px-1.5 py-0.5 rounded-md border border-white/20 uppercase tracking-wider animate-pulse shadow-md">
                                                                {language === 'en' ? 'Live' : '실시간'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="p-3 text-left">
                                                        <span className="text-[9px] text-slate-500 font-bold block leading-tight">
                                                            {isReal
                                                                ? (language === 'en' ? "Google Flights Est." : "구글 예상가")
                                                                : (language === 'en' ? "Google Flights Est. Min" : "구글 예상 최저가")}
                                                        </span>
                                                        <span className="text-sm font-black text-spotify-green block">₩{price.toLocaleString()}~</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            {/* 1.1. 실시간 지역별 특가 항공권 */}
                            <div className="px-1 space-y-3 mt-12">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                        <Plane className="text-spotify-green" size={18} />
                                        {language === 'en' ? "Real-time Flight Deals" : "실시간 특가 항공권"}
                                    </h3>
                                </div>
                                <div className="relative w-full py-1">
                                    <div
                                        ref={lowestRegionFlightsRef}
                                        className="flex gap-3 overflow-x-auto scrollbar-hide px-1 select-none cursor-grab active:cursor-grabbing w-full"
                                    >
                                        {regionFlightDeals.concat(regionFlightDeals).map((deal, idx) => {
                                            return (
                                                <div
                                                    key={`${deal.id}-${idx}`}
                                                    onClick={() => window.open(deal.url, '_blank')}
                                                    className="min-w-[180px] h-38 rounded-xl overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-all duration-300 group shrink-0 relative border border-slate-200/60"
                                                >
                                                    <div className="w-full h-full relative overflow-hidden">
                                                        <img src={deal.img} alt={deal.city} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

                                                        <span className="absolute top-2.5 right-2.5 text-[9px] font-black text-white/95 px-1.5 py-0.5 rounded-md bg-black/45 backdrop-blur-[2px] tracking-wider">{deal.code}</span>
                                                        <div className="absolute bottom-3 left-3.5 right-3.5 text-left space-y-1">
                                                            <span className="text-sm font-black text-white block leading-tight">{language === 'en' ? deal.enCity : deal.city}</span>
                                                            <span className="text-[10px] font-bold text-spotify-green block">
                                                                {language === 'en' ? "View Live Deals ↗" : "실시간 특가 보기 ↗"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            {/* 1.2. 실시간 지역별 특가 숙박 */}
                            <div className="px-1 space-y-3 mt-12">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                        <HomeIcon className="text-spotify-green" size={18} />
                                        {language === 'en' ? "Real-time Lodging Deals" : "실시간 특가 숙박"}
                                    </h3>
                                </div>
                                <div className="relative w-full py-1">
                                    <div
                                        ref={lowestLodgingRef}
                                        className="flex gap-3 overflow-x-auto scrollbar-hide px-1 select-none cursor-grab active:cursor-grabbing w-full"
                                    >
                                        {lodgingDeals.concat(lodgingDeals).map((deal, idx) => {
                                            return (
                                                <div
                                                    key={`${deal.id}-${idx}`}
                                                    onClick={() => {
                                                        const searchLang = language === 'en' ? 'en' : 'ko';
                                                        const searchQuery = language === 'en' ? deal.enCity : deal.city;
                                                        window.open(`https://www.google.com/travel/hotels?hl=${searchLang}&q=${encodeURIComponent(searchQuery)}`, '_blank');
                                                    }}
                                                    className="min-w-[185px] h-34 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-md cursor-pointer hover:border-spotify-green/40 hover:shadow-lg transition-all duration-300 group shrink-0 relative"
                                                >
                                                    <div className="w-full h-full relative overflow-hidden">
                                                        <img src={deal.img} alt={deal.city} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                                                        <span className="absolute bottom-3 left-3.5 text-sm font-black text-white tracking-wide">{language === 'en' ? deal.enCity : deal.city} ({deal.code})</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            {/* 3. 실시간 인기 유튜브 여행 영상 */}
                            <div className="px-1 space-y-3 mt-12">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                        <span className="text-spotify-green">▶</span>
                                        {language === 'en' ? "Real-time Popular Travel Vlogs" : "실시간 인기 여행 유튜브 영상"}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => window.open('https://www.youtube.com/results?search_query=%EC%97%AC%ED%96%89&sp=CAMSBBABGAU%253D', '_blank')}
                                        className="text-xs text-spotify-green font-bold hover:underline"
                                    >
                                        {language === 'en' ? "Search More" : "더 많은 영상 검색 ↗"}
                                    </button>
                                </div>
                                <div className="relative w-full py-1">
                                    <div
                                        ref={youtubeVlogsRef}
                                        className="flex gap-3 overflow-x-auto scrollbar-hide px-1 select-none cursor-grab active:cursor-grabbing w-full"
                                    >
                                        {youtubeVideos.concat(youtubeVideos).map((video, idx) => (
                                            <div
                                                key={`${video.id}-${idx}`}
                                                onClick={() => window.open(video.url || `https://www.youtube.com/watch?v=${video.yid}`, '_blank')}
                                                className="min-w-[205px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-md cursor-pointer hover:border-brand-danger/30 transition-all shrink-0 text-left group"
                                            >
                                                <div className="h-28 relative">
                                                    <img src={`https://img.youtube.com/vi/${video.yid}/mqdefault.jpg`} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                                                        <div className="w-9 h-9 bg-brand-danger text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">▶</div>
                                                    </div>
                                                </div>
                                                <div className="p-3 space-y-1 bg-white">
                                                    <h4 className="text-[12px] font-bold text-slate-800 line-clamp-2 leading-tight h-8">{video.title}</h4>
                                                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold pt-1">
                                                        <span className="truncate max-w-[100px]">{video.channel}</span>
                                                        <span className="shrink-0">{video.date}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] text-red-500 font-black pt-0.5">
                                                        <span>{video.viewCount ? `🔥 ${video.viewCount}` : `❤️ 좋아요 ${video.likes ? video.likes.toLocaleString() : '1만'}개`}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {/* 4. 여행 새소식 */}
                            <div className="px-1">
                                <TravelNews language={language} />
                            </div>
                            {/* 🌟 진행 중이거나 가장 가까운 활성 여행에 대한 액티브 컨트롤 타워 (스포티파이 플레이어 스타일 리디자인) */}
                            {(user || session) && mySchedules.length > 0 && (() => {
                                const activeTrip = mySchedules.find(t => calculateDDayNum(t.startDate) >= 0) || mySchedules[0];
                                if (!activeTrip) return null;
                                const progress = getTripProgress(activeTrip);
                                const phase = getTripPhase(activeTrip);
                                return (
                                    <div className="mb-4 mt-4 px-1 animate-fadeIn">
                                        <div className="p-5 bg-white text-slate-800 border border-slate-200 shadow-2xl rounded-[24px] overflow-hidden relative group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                                            <div className="relative z-10 flex flex-col">
                                                <div className="flex items-center gap-3">
                                                    {/* 앨범 커버 스타일 이미지 */}
                                                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 shadow-md border border-slate-200 relative">
                                                        <img
                                                            src={activeTrip.image || "https://images.unsplash.com/photo-1506158669146-619067262a00?q=80&w=150"}
                                                            alt={activeTrip.destination || activeTrip.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <span className="absolute bottom-1 right-1 text-base bg-black/60 px-1 rounded-md text-white">{activeTrip.icon || '✈️'}</span>
                                                    </div>
                                                    {/* 타이틀 및 아티스트 스타일 정보 */}
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black bg-spotify-green text-black px-2 py-0.5 rounded-full uppercase tracking-wider">{calculateDDay(activeTrip.startDate)}</span>
                                                            <span className="text-[11px] text-slate-500 font-bold">{translations[language].schedule_trip_suffix}</span>
                                                        </div>
                                                        <h3 className="text-base font-bold text-slate-800 truncate mt-1">{activeTrip.destination || activeTrip.title}</h3>
                                                        <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{formatTripDate(activeTrip.startDate, activeTrip.endDate, activeTrip.duration)}</p>
                                                    </div>
                                                    {/* 재생/일시정지 모양 퀵 바로가기 버튼 */}
                                                    <button
                                                        onClick={() => setShowCoachSheet(true)}
                                                        className="w-10 h-10 rounded-full bg-slate-100 hover:bg-spotify-green text-black flex items-center justify-center shadow-lg active:scale-95 transition-all"
                                                        title="트립코치 바로가기"
                                                    >
                                                        {phase === 'during' ? (
                                                            <div className="flex items-center gap-0.5">
                                                                <div className="w-1 h-3 bg-black rounded-full animate-[pulse_1s_infinite]"></div>
                                                                <div className="w-1 h-3 bg-black rounded-full animate-[pulse_1s_infinite_0.2s]"></div>
                                                            </div>
                                                        ) : (
                                                            <Sparkles size={16} fill="black" />
                                                        )}
                                                    </button>
                                                </div>
                                                {/* 타임라인 프로그레스 바 */}
                                                <div className="mt-4">
                                                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden relative">
                                                        <div
                                                            className="bg-spotify-green h-full rounded-full transition-all duration-500"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mt-1.5 px-0.5">
                                                        <span>{phase === 'prep' ? `${calculateDDayNum(activeTrip.startDate)}일 전` : phase === 'during' ? '여행 중' : '여행 완료'}</span>
                                                        <span>{progress}%</span>
                                                    </div>
                                                </div>
                                                {/* 코칭 안내 문구 */}
                                                <div className="bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 mt-3 text-xs font-medium text-slate-600 leading-relaxed flex items-start gap-2 select-none">
                                                    <Sparkles size={13} className="shrink-0 mt-0.5 text-spotify-green animate-pulse" />
                                                    <span className="text-left">{getCoachingGuide(activeTrip)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                            {/* 냥프로 코칭 배너 */}
                            <div className="mb-4 px-1">
                                <div
                                    onClick={() => setShowCoachSheet(true)}
                                    className="p-5.5 bg-gradient-to-r from-[#29B6F6] via-[#0288D1] to-[#093170] border border-white/20 shadow-lg shadow-blue-500/10 rounded-3xl cursor-pointer hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 relative group overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none group-hover:scale-135 transition-transform duration-500"></div>
                                    <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
                                    <div className="relative z-10 flex items-center gap-3.5">
                                        <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                                            🐾
                                        </div>
                                        <div className="flex-1 text-left text-white">
                                            <h3 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                                                {language === 'en' ? "My AI Coach Meow Pro" : "나만의 AI 코치 냥프로"}
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-black bg-white/25 text-white border border-white/30 animate-pulse">AI</span>
                                                <Sparkles size={14} className="text-white" />
                                            </h3>
                                            <p className="text-xs text-white/90 mt-1.5 leading-relaxed font-semibold text-left">
                                                {language === 'en' ? "Get instant travel tips and safety coaching!" : "여행 중이신가요? 냥프로에게 로컬 꿀팁과 안전 가이드를 물어보세요."}
                                            </p>
                                        </div>
                                        <ChevronRight className="text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" size={20} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'flights_search' && (
                        <div className="space-y-6 animate-fadeIn px-1 text-slate-800 text-left">
                            {/* 항공권 검색 양식 */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg space-y-5">
                                <h3 className="font-black text-slate-800 text-base flex items-center gap-2 mb-1"><Plane className="text-spotify-green" size={18} /> {language === 'en' ? "Search Flights" : "실시간 최저가 항공권 검색"}</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[11px] font-black text-slate-500 block mb-1.5 text-left">{language === 'en' ? "Destination" : "도착지"}</label>
                                        <input
                                            type="text"
                                            placeholder={language === 'en' ? "e.g. Tokyo, KIX, Paris" : "예: 도쿄, NRT, 파리"}
                                            value={flightTo}
                                            onChange={(e) => setFlightTo(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-slate-800 font-bold placeholder:text-slate-400 focus:border-spotify-green focus:bg-white transition-all text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-black text-slate-500 block mb-1.5 text-left">{language === 'en' ? "Dates" : "일정 선택"}</label>
                                            <DatePicker
                                                selectsRange={true}
                                                startDate={flightDateRange[0]}
                                                endDate={flightDateRange[1]}
                                                onChange={(update) => setFlightDateRange(update)}
                                                minDate={new Date()}
                                                locale={language === 'en' ? enUS : ko}
                                                dateFormat="yyyy.MM.dd"
                                                placeholderText={language === 'en' ? "Select Dates" : "날짜 선택"}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-slate-800 font-bold text-xs cursor-pointer placeholder:text-slate-400 focus:border-spotify-green focus:bg-white transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-black text-slate-500 block mb-1.5 text-left">{language === 'en' ? "Passengers" : "탑승 인원"}</label>
                                            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl h-[46px] transition-all">
                                                <button type="button" onClick={() => setFlightAdults(prev => Math.max(1, prev - 1))} className="text-slate-600 hover:text-slate-900 font-black text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors">-</button>
                                                <span className="text-slate-800 font-extrabold text-sm">{flightAdults}명</span>
                                                <button type="button" onClick={() => setFlightAdults(prev => prev + 1)} className="text-slate-600 hover:text-slate-900 font-black text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors">+</button>
                                            </div>
                                        </div>
                                    </div>
                                    {flightSearchError && (
                                        <p className="text-xs text-brand-danger text-left font-bold">⚠️ {flightSearchError}</p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const query = flightTo.trim();
                                            let resolvedCode = /^[A-Za-z]{3}$/.test(query) ? query.toUpperCase() : findIataCode(query);
                                            if (!resolvedCode) {
                                                setAiRecommendations([]);
                                                const tempTrip = {
                                                    destination: query,
                                                    startDate: flightDateRange[0] ? flightDateRange[0].toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                                                    endDate: flightDateRange[1] ? flightDateRange[1].toISOString().split('T')[0] : null,
                                                    isFromSearchForm: true,
                                                    adults: flightAdults
                                                };
                                                setManualAirport({ show: true, trip: tempTrip, searchStr: query, error: "" });
                                                fetchAiAirportRecommendations(query);
                                                return;
                                            }
                                            setFlightSearchError("");
                                            const depDate = flightDateRange[0] ? flightDateRange[0].toISOString().split('T')[0] : '';
                                            const retDate = flightDateRange[1] ? flightDateRange[1].toISOString().split('T')[0] : '';

                                            if (!depDate) {
                                                setFlightSearchError(language === 'en' ? "Please select departure date." : "출발일을 선택해 주세요.");
                                                return;
                                            }

                                            let googleFlightsLink = `https://www.google.com/travel/flights?hl=ko&gl=KR&q=Flights from Seoul to ${resolvedCode} on ${depDate}`;
                                            if (retDate) {
                                                googleFlightsLink += ` through ${retDate}`;
                                            }
                                            googleFlightsLink += ` with ${flightAdults} adults`;

                                            window.open(googleFlightsLink, '_blank');
                                        }}
                                        className="w-full py-3.5 bg-spotify-green hover:bg-spotify-green-hover text-black font-extrabold rounded-2xl active:scale-95 transition-all text-sm mt-2 shadow-md"
                                    >
                                        {language === 'en' ? "Search Real-time Flights" : "실시간 항공권 검색하기"}
                                    </button>
                                </div>
                            </div>
                            {/* 내 일정 항공권 (기존 schedule 리스트) */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg space-y-4 text-left">
                                <h3 className="font-black text-slate-800 text-base flex items-center gap-2 mb-1"><Calendar className="text-spotify-green" size={18} /> {translations[language].tab_myflight}</h3>
                                {mySchedules.length > 0 ? (
                                    <div className="space-y-3">
                                        {mySchedules.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => {
                                                    setFlightTo(item.destination || item.title);
                                                    const start = item.startDate ? new Date(item.startDate) : null;
                                                    const end = item.endDate ? new Date(item.endDate) : null;
                                                    setFlightDateRange([start, end]);
                                                    let resolvedCode = item.iata || item.arrivalIata || findIataCode(`${item.destination || ''} ${item.title || ''}`);
                                                    if (resolvedCode) {
                                                        proceedFlightSearch(item, resolvedCode, resolvedCode);
                                                    } else {
                                                        setFlightSearchError("공항 코드를 직접 지정해 주세요.");
                                                    }
                                                }}
                                                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:border-spotify-green/30 hover:shadow-md transition-all relative group overflow-hidden"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-lg shrink-0 border border-slate-100">✈️</div>
                                                        <div>
                                                            <h4 className="font-extrabold text-slate-800 text-sm truncate">
                                                                {language === 'en' ? `Trip to ${item.destination || item.title}` : `${item.destination || item.title} 여행`}
                                                            </h4>
                                                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                                <span>{item.startDate || translations[language].schedule_tbd}</span>
                                                                {item.iata && <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold">{item.iata}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="text-slate-400 group-hover:text-spotify-green transition-all duration-300" size={16} />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200"><p className="text-xs font-medium">{translations[language].schedule_empty}</p></div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'create' && (
                        <div className="space-y-6 animate-fadeIn text-left">
                            {/* 🌟 단계 표시용 진행바 인디케이터 — 스포티파이 다크 디자인 */}
                            <div className="flex justify-between items-center px-5 py-3.5 bg-white rounded-[20px] shadow-sm border border-slate-200">
                                {[1, 2, 3, 4].map(num => (
                                    <div key={num} className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (num === 1) setStep(1);
                                                else if (num === 2 && formData.destination) setStep(2);
                                                else if (num === 3 && formData.destination && startDate && endDate) setStep(3);
                                                else if (num === 4 && formData.destination && startDate && endDate) setStep(4);
                                            }}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all cursor-pointer select-none ${step === num ? 'bg-gradient-to-br from-brand-start to-brand-middle text-white scale-110 shadow-md shadow-brand-primary/20' : step > num ? 'bg-brand-secondary/20 text-brand-secondary font-bold' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
                                        >
                                            {num}
                                        </button>
                                        {num < 4 && <div className={`w-8 sm:w-12 h-0.5 rounded-full ${step > num ? 'bg-brand-secondary/40' : 'bg-slate-200'}`} />}
                                    </div>
                                ))}
                            </div>
                            {/* 🌟 1단계: 목적지 및 지역 타입 */}
                            {step === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-left-5 fade-in duration-300">
                                    <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-200 text-slate-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><Sparkles size={16} className="text-spotify-green" /> {translations[language].label_where}</label>
                                                <button type="button" onClick={fetchUserLocation} disabled={isLocationLoading} className="p-1.5 text-spotify-green hover:bg-slate-100 rounded-full transition-all active:scale-95 flex items-center justify-center">
                                                    {isLocationLoading ? <RefreshCw size={14} className="animate-spin" /> : <MapPin size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-full px-5 py-3.5 shadow-inner transition-all duration-300 gap-3 mb-4">
                                            <Search size={22} className="text-slate-500 shrink-0" />
                                            <input
                                                type="text"
                                                name="destination"
                                                value={formData.destination}
                                                onChange={handleInputChange}
                                                placeholder={listeningField === 'destination' ? translations[language].msg_listening : translations[language].placeholder_dest}
                                                className="w-full text-lg sm:text-xl font-black text-slate-900 bg-transparent outline-none pr-2 placeholder:text-slate-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleVoiceInput('destination')}
                                                className={`p-2 rounded-full transition-all shrink-0 active:scale-95 ${listeningField === 'destination' ? 'bg-spotify-green text-black animate-pulse' : 'text-slate-600 hover:bg-slate-200'}`}
                                            >
                                                <Mic size={24} />
                                            </button>
                                        </div>
                                        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-4 gap-1.5 border border-slate-200">
                                            {['auto', 'domestic', 'international', 'daytrip'].map(type => (
                                                <button type="button" key={type} onClick={() => {
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
                                                }} className={`flex-1 text-[11px] sm:text-xs font-black py-3.5 rounded-xl transition-all duration-300 ${formData.regionType === type ? 'bg-white border border-slate-200 text-spotify-green shadow-sm scale-[1.02]' : 'text-slate-600 hover:bg-slate-200'}`}>
                                                    {type === 'auto' ? translations[language].region_auto : type === 'domestic' ? translations[language].region_domestic : type === 'international' ? translations[language].region_international : translations[language].region_daytrip}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
                                            {(language === 'en' ? QUICK_TAGS_EN : QUICK_TAGS).map((tag, idx) => (
                                                <button type="button" key={idx} onClick={() => setFormData(prev => ({ ...prev, destination: prev.destination ? `${prev.destination}, ${cleanTagText(tag, language)}` : cleanTagText(tag, language) }))} className="bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-[12px] font-bold transition hover:bg-spotify-green/10 hover:text-black active:scale-95">{tag}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* 🌟 2단계: 날짜 선택 */}
                            {step === 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right-5 fade-in duration-300">
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-slate-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><Calendar size={16} className="text-spotify-green" /> {translations[language].label_when}</label>
                                            <button type="button" onClick={() => handleVoiceInput('date')} className={`p-2 rounded-full ${listeningField === 'date' ? 'bg-spotify-green text-black animate-pulse' : 'bg-slate-100 border border-slate-200 text-slate-600'}`}><Mic size={16} /></button>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-2 text-slate-800">
                                            <DatePicker selectsRange={true} startDate={startDate} endDate={endDate} onChange={handleDateChange} minDate={new Date()} locale={language === 'en' ? enUS : ko} dateFormat="yyyy.MM.dd" placeholderText={translations[language].placeholder_date} className="w-full text-lg font-black bg-transparent outline-none cursor-pointer text-slate-800 placeholder:text-slate-400" wrapperClassName="w-full" />
                                        </div>
                                        <p className="text-[11px] text-slate-500 font-bold px-1 text-left">달력에서 출발일과 도착일을 연속 터치하여 여행 기간을 지정하세요.</p>
                                    </div>
                                </div>
                            )}
                            {/* 🌟 3단계: 동행자 및 여행 스타일 */}
                            {step === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right-5 fade-in duration-300">
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-slate-800 space-y-5">
                                        <div>
                                            <div className="flex items-center justify-between mb-3 text-left">
                                                <label className="text-sm font-bold text-slate-600 block px-1">{translations[language].label_companion}</label>
                                                <button type="button" onClick={() => handleVoiceInput('companion')} className={`p-1.5 rounded-full ${listeningField === 'companion' ? 'bg-spotify-green text-black animate-pulse' : 'bg-slate-100 border border-slate-200 text-slate-600'}`}><Mic size={14} /></button>

                                            </div>
                                            <div className="grid grid-cols-5 gap-2">
                                                {companionOptions.map((opt) => (
                                                    <button type="button" key={opt.id} onClick={() => setFormData({ ...formData, companion: opt.id })} className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all gap-1 border border-transparent ${formData.companion === opt.id ? 'bg-spotify-green text-black font-extrabold shadow-md scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'}`}>
                                                        {opt.icon} <span className="text-[10px] font-black break-keep">{language === 'en' ? opt.enLabel : opt.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="border-t border-slate-200 pt-4">
                                            <div className="flex items-center gap-2 mb-3 text-left">
                                                <label className="text-sm font-bold text-slate-600 px-1">{translations[language].label_style}</label>
                                                <button type="button" onClick={() => handleVoiceInput('tourType')} className={`p-1.5 rounded-full ${listeningField === 'tourType' ? 'bg-spotify-green text-black animate-pulse' : 'bg-slate-100 border border-slate-200 text-slate-600'}`}><Mic size={14} /></button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                {tourOptions.map((option) => (
                                                    <button type="button" key={option.id} onClick={() => setFormData({ ...formData, tourType: option.id })} className={`py-3 px-2 rounded-2xl border transition-all flex flex-col items-center text-center cursor-pointer ${formData.tourType === option.id ? 'bg-spotify-green border-spotify-green text-black font-extrabold shadow-md scale-105' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}>
                                                        <span className="font-bold text-xs sm:text-sm mb-1">{language === 'en' ? option.enLabel : option.label}</span>
                                                        <span className="text-[9px] opacity-75 leading-tight">{language === 'en' ? option.enDesc : option.desc}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <button type="button" onClick={toggleLuxuryMode} className={`w-full py-3.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border border-transparent ${isLuxury ? "bg-amber-500 text-white shadow-lg font-extrabold" : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"}`}>
                                                {isLuxury ? <><Crown size={16} fill="white" /> {translations[language].btn_luxury_on}</> : <><Crown size={16} /> {translations[language].btn_luxury_off}</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* 🌟 4단계: 예산, 인원 및 안심 요청사항 */}
                            {step === 4 && (
                                <div className="space-y-6 animate-in slide-in-from-right-5 fade-in duration-300">
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-slate-800 space-y-5">
                                        <div className={`p-4 rounded-2xl border transition-all ${isLuxury ? "bg-amber-50/50 border-amber-500/20" : "bg-slate-50 border-slate-200"}`}>
                                            <div className="flex gap-4 items-center justify-between">
                                                {isLuxury ? (
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 text-amber-500 font-bold mb-1"><Sparkles size={16} /> VIP 예산</div>
                                                        <p className="text-xs text-slate-500">무제한 (AI 최적화)</p>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 text-left">
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <label className="text-sm font-bold text-slate-600 flex items-center gap-1"><Wallet size={14} /> {translations[language].label_budget}</label>
                                                            <button type="button" onClick={() => handleVoiceInput('budget')} className={`p-1 rounded-full ${listeningField === 'budget' ? 'bg-spotify-green text-black animate-pulse' : 'bg-slate-100 border border-slate-200 text-slate-600'}`}><Mic size={12} /></button>
                                                        </div>
                                                        <div className="flex items-end gap-1 mb-2">
                                                            <span className="text-xl font-bold text-spotify-green">
                                                                {language === 'en' ? (formData.budget * 10000).toLocaleString() : formData.budget.toLocaleString()}
                                                            </span>
                                                            <span className="text-sm text-slate-500">{language === 'en' ? ' KRW' : '만원'}</span>
                                                        </div>
                                                        <input type="range" name="budget" min="50" max="1000" step="10" value={formData.budget} onChange={handleInputChange} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-spotify-green" />
                                                    </div>
                                                )}
                                                <div className="w-[1px] h-10 bg-slate-200"></div>
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <label className="text-sm font-bold text-slate-600">{translations[language].label_people}</label>
                                                        <button type="button" onClick={() => handleVoiceInput('people')} className={`p-1 rounded-full ${listeningField === 'people' ? 'bg-spotify-green text-black animate-pulse' : 'bg-slate-100 border border-slate-200 text-slate-600'}`}><Mic size={12} /></button>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button type="button" onClick={() => updatePeople(-1)} className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 active:scale-95 transition-all">-</button>
                                                        <span className="font-bold text-slate-800 w-4 text-center">{formData.people}</span>
                                                        <button type="button" onClick={() => updatePeople(1)} className="w-8 h-8 rounded-full bg-spotify-green text-black font-extrabold active:scale-95 transition-all">+</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-sm font-bold text-slate-600 flex items-center gap-1"><MessageSquare size={14} /> {translations[language].label_request}</label>
                                                <button type="button" onClick={() => handleVoiceInput('request')} className={`p-1.5 rounded-full ${listeningField === 'request' ? 'bg-spotify-green text-black animate-pulse' : 'bg-slate-100 border border-slate-200 text-slate-600'}`}><Mic size={14} /></button>
                                            </div>
                                            <textarea name="request" value={formData.request} onChange={handleInputChange} placeholder={listeningField === 'request' ? translations[language].msg_listening : translations[language].placeholder_request} className="w-full text-sm font-medium outline-none text-slate-800 resize-none h-24 bg-transparent leading-relaxed placeholder:text-slate-400 text-left" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* 단계 전환용 버튼 (인라인으로 배치하여 하단 바와 겹치지 않게 함) */}
                            <div className="flex gap-3 mt-4">
                                {step > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setStep(prev => prev - 1)}
                                        className="flex-1 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 font-bold rounded-2xl active:scale-95 transition-all text-sm cursor-pointer"
                                    >
                                        이전
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (step < 4) {
                                            if (step === 1 && !formData.destination) {
                                                alert(language === "en" ? "Please enter your destination!" : "목적지를 입력해주세요!");
                                                return;
                                            }
                                            if (step === 2 && (!startDate || !endDate)) {
                                                alert(language === "en" ? "Please select your travel dates!" : "여행 날짜를 선택해주세요!");
                                                return;
                                            }
                                            setStep(step + 1);
                                        } else {
                                            generatePlan();
                                        }
                                    }}
                                    disabled={loading}
                                    className={`flex-[2] py-3.5 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer ${isLuxury ? "bg-amber-400 text-black border border-amber-500 hover:bg-amber-500" : "bg-spotify-green hover:bg-spotify-green-hover text-black"}`}
                                >
                                    {loading ? (
                                        <><Sparkles className="animate-spin" size={16} /> {loadingText}</>
                                    ) : step < 4 ? (
                                        <>다음 단계로 <ArrowRight size={14} /></>
                                    ) : (
                                        translations[language].btn_generate
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                    {activeTab === 'around_me' && (
                        <div className="space-y-6 animate-fadeIn text-slate-800">
                            <div className="text-left px-1">
                                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-1.5"><MapPin className="text-spotify-green" size={20} /> {language === 'en' ? "Around Me" : "내 주변 탐색"}</h3>
                                <p className="text-xs text-slate-400 mt-1 font-medium text-left">{language === 'en' ? "Find local restaurants, shopping, and events near you." : "현재 위치를 중심으로 맛집, 쇼핑, 축제/행사 정보를 탐색하세요."}</p>
                            </div>
                            <AroundMeMap language={language} />
                        </div>
                    )}
                </div>
                {/* 하단 내비게이션 바 (프리미엄 반투명 유리 바다색 디자인) */}
                <div className="absolute bottom-0 left-0 right-0 w-full bg-[#0E4EA1]/80 backdrop-blur-md border-t border-white/20 shadow-2xl z-50 shrink-0">
                    <nav className="flex justify-around items-center h-[72px] px-2 text-white">
                        <button
                            type="button"
                            onClick={() => setActiveTab('home')}
                            className={`flex flex-col items-center justify-center gap-1 p-2 w-[58px] sm:w-[70px] transition-all duration-300 ${activeTab === 'home' ? 'text-white' : 'text-white/60 hover:text-white'}`}
                        >
                            <HomeIcon size={21} strokeWidth={2} className={`transition-all duration-300 ${activeTab === 'home' ? 'text-white scale-110' : 'text-white/60'}`} />
                            <span className={`break-keep whitespace-nowrap transition-all duration-300 ${activeTab === 'home' ? 'text-[12.5px] sm:text-[14px] font-black' : 'text-[10.5px] sm:text-[11.5px] font-medium'}`}>{language === 'en' ? 'Home' : '홈'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('flights_search')}
                            className={`flex flex-col items-center justify-center gap-1 p-2 w-[58px] sm:w-[70px] transition-all duration-300 ${activeTab === 'flights_search' ? 'text-white' : 'text-white/60 hover:text-white'}`}
                        >
                            <Search size={21} strokeWidth={2} className={`transition-all duration-300 ${activeTab === 'flights_search' ? 'text-white scale-110' : 'text-white/60'}`} />
                            <span className={`break-keep whitespace-nowrap transition-all duration-300 ${activeTab === 'flights_search' ? 'text-[12.5px] sm:text-[14px] font-black' : 'text-[10.5px] sm:text-[11.5px] font-medium'}`}>{language === 'en' ? 'Flights' : '항공권'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('create')}
                            className={`flex flex-col items-center justify-center gap-1 p-2 w-[58px] sm:w-[70px] transition-all duration-300 ${activeTab === 'create' ? 'text-white' : 'text-white/60 hover:text-white'}`}
                        >
                            <Sparkles size={21} strokeWidth={2} className={`transition-all duration-300 ${activeTab === 'create' ? 'text-white scale-110' : 'text-white/60'}`} />
                            <span className={`break-keep whitespace-nowrap transition-all duration-300 ${activeTab === 'create' ? 'text-[12.5px] sm:text-[14px] font-black' : 'text-[10.5px] sm:text-[11.5px] font-medium'}`}>{language === 'en' ? 'Create' : '만들기'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { if (user || session) { router.push('/mypage'); } else { setShowLoginModal(true); } }}
                            className={`flex flex-col items-center justify-center gap-1 p-2 w-[58px] sm:w-[70px] transition-all duration-300 text-white/60 hover:text-white`}
                        >
                            <Calendar size={21} strokeWidth={2} className="text-white/60" />
                            <span className="text-[10.5px] sm:text-[11.5px] font-medium break-keep whitespace-nowrap">{language === 'en' ? 'My Trips' : '내 일정'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('around_me')}
                            className={`flex flex-col items-center justify-center gap-1 p-2 w-[58px] sm:w-[70px] transition-all duration-300 ${activeTab === 'around_me' ? 'text-white' : 'text-white/60 hover:text-white'}`}
                        >
                            <Compass size={21} strokeWidth={2} className={`transition-all duration-300 ${activeTab === 'around_me' ? 'text-white scale-110' : 'text-white/60'}`} />
                            <span className={`break-keep whitespace-nowrap transition-all duration-300 ${activeTab === 'around_me' ? 'text-[12.5px] sm:text-[14px] font-black' : 'text-[10.5px] sm:text-[11.5px] font-medium'}`}>{language === 'en' ? 'Around Me' : '내 주변'}</span>
                        </button>
                    </nav>
                </div>
                {/* 냥프로 AI 코치 바텀 시트 */}
                <AnimatePresence>
                    {showCoachSheet && (
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-x-0 bottom-0 z-50 bg-[#121212] border-t border-white/10 rounded-t-[40px] shadow-2xl h-[85vh] flex flex-col overflow-hidden max-w-[560px] mx-auto text-white"
                        >
                            <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0 bg-white/5">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="text-spotify-green" size={20} />
                                    <h3 className="font-extrabold text-white text-lg">{language === 'en' ? "AI Coach Meow Pro" : "AI 코치 냥프로"}</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowCoachSheet(false)}
                                    className="p-1 rounded-full bg-white/10 text-slate-300 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto min-h-0">
                                <TripCoach
                                    itineraries={mySchedules}
                                    userData={userData}
                                    onShowToast={(msg) => console.log(msg)}
                                    language={language}
                                    onTabChange={(tab) => {
                                        setShowCoachSheet(false);
                                        if (tab === 'schedule') {
                                            router.push('/mypage');
                                        }
                                    }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 실시간 가격 변동 안내 커스텀 모달 */}
                {showFlightNotice && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => setShowFlightNotice(false)}></div>
                        <div className="bg-[#F3E5D0] border border-[#E0D0B0] w-full max-w-sm rounded-[32px] p-6 relative z-10 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200 text-slate-800 text-center">
                            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-4 shadow-inner">
                                <AlertCircle size={28} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-2">
                                {language === 'en' ? 'Flight Price Notice' : '실시간 가격 변동 안내'}
                            </h3>
                            <p className="text-sm text-slate-700 mb-6 leading-relaxed font-semibold">
                                {language === 'en'
                                    ? 'Due to real-time price fluctuations, the lowest price and date may differ from the actual ones.'
                                    : '실시간 가격 변동으로 인해 예상 최저가 및 날짜가 실제 항공사 가격과 다를 수 있습니다.'}
                            </p>
                            <button
                                onClick={() => setShowFlightNotice(false)}
                                className="w-full py-3.5 bg-spotify-green hover:bg-spotify-green-hover text-black font-extrabold rounded-2xl active:scale-95 transition-all text-sm shadow-md"
                            >
                                {language === 'en' ? 'Close' : '확인'}
                            </button>
                        </div>
                    </div>
                )}

                {/* 하단 생성 버튼 — 스포티파이 스타일 오버레이 및 둥근 초록/골드 버튼 */}
            </motion.div >
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { height: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(calc(-50% - 6px)); }
                }
                .animate-marquee {
                    display: flex;
                    width: max-content;
                    animation: marquee 80s linear infinite;
                }
            `}</style>
        </div >
    );
}
