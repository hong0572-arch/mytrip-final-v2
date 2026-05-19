'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // ✨ 애니메이션 추가
import { useRouter } from 'next/navigation';
import { signOut as nextAuthSignOut } from "next-auth/react";
import { auth, db, storage } from "../../lib/firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage"; // ✨ Storage 업로드용 기능 추가
import { saveVaultItem, getVaultItems, deleteVaultItem } from "../../lib/localVault";
import { onAuthStateChanged, updateProfile, signOut } from "firebase/auth";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc, updateDoc, getDocs, addDoc, serverTimestamp, increment, arrayUnion, arrayRemove, limit } from "firebase/firestore";
import {
    ArrowLeft, ArrowRight, Search, Sparkles, Plane, Bed, Utensils,
    Calendar, Share2, Wallet, Receipt, Plus, ChevronRight,
    Home as HomeIcon, Bell, UserPlus, Heart, MessageSquare,
    PiggyBank, CreditCard, Users, Compass, User, Trash2,
    X, CheckCircle, Send, Loader2, Check, ArrowRightLeft,
    Banknote, TrendingDown, Settings, Edit3, Camera, LogOut,
    Inbox, MapPin, MoreHorizontal, Download, MessageCircle as MessageCircleIcon, Map as MapIcon, AlertCircle, ShoppingBag, Coffee, Bus,
    Gem, Calculator, Target, RefreshCw, Landmark, BellRing, BrainCircuit, Link as LinkIcon, History, Copy, ChevronLeft, Box
} from 'lucide-react';
import TravelQuiz from '../../components/TravelQuiz';



const CURRENCY_RATES = { USD: 1380, JPY: 8.9, EUR: 1450 };
const TRAVEL_TAGS = ["🗓️ J형 (계획 철저)", "🏃 P형 (즉흥파)", "📸 사진에 진심", "🍜 맛집 투어", "🛍️ 쇼핑 싹쓸이", "🚶‍♂️ 뚜벅이", "🚗 렌트카", "🏖️ 호캉스/휴양", "💸 가성비 추구"];
const BACKGROUND_IMAGE = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop";

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
const getSafeDestination = (destination) => { try { return String(destination).split('#')[0].trim() || "Seoul"; } catch (e) { return "Seoul"; } };
const parseCost = (costStr) => { try { const cleanStr = String(costStr).replace(/,/g, ''); const matches = cleanStr.match(/\d+/g); if (!matches || matches.length === 0) return 0; const numbers = matches.map(num => parseInt(num, 10)); return Math.max(...numbers) || 0; } catch (e) { return 0; } };

// ✨ 찐 최종 버전: 클릭 무시 및 레이아웃 꼬임 100% 해결
const FeedCarousel = ({ feed, onClick }) => {
    const images = feed.images && feed.images.length > 0 ? feed.images : [feed.image];
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollRef = useRef(null);

    const handleScroll = () => {
        if (scrollRef.current) {
            const width = scrollRef.current.clientWidth;
            const newIndex = Math.round(scrollRef.current.scrollLeft / width);
            if (newIndex !== currentIndex) setCurrentIndex(newIndex);
        }
    };

    const handleMove = (e, direction) => {
        e.preventDefault();
        e.stopPropagation();

        const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        if (scrollRef.current && nextIndex >= 0 && nextIndex < images.length) {
            // ✨ 애매한 픽셀 계산 대신, 해당 사진 요소로 '시점 강제 이동' (가장 확실함)
            const targetSlide = scrollRef.current.children[nextIndex];
            if (targetSlide) {
                targetSlide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                setCurrentIndex(nextIndex); // 점(인디케이터) 즉시 업데이트
            }
        }
    };

    return (
        // 🚨 최상단 부모의 onClick을 제거하여 버튼 클릭과 완전히 분리했습니다.
        <div className="w-full aspect-square relative group bg-gray-100 overflow-hidden">

            {/* ✨ 버그 원인 제거: style 태그를 사진들이 있는 flex 박스 밖으로 뺐습니다! */}
            <style>{`.hide-scroll::-webkit-scrollbar { display: none; }`}</style>

            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="hide-scroll flex w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {images.map((img, idx) => (
                    <div
                        key={idx}
                        className="w-full h-full shrink-0 snap-center relative cursor-pointer"
                        onClick={onClick} // ✨ 피드 상세 보기 창은 오직 '사진'을 눌렀을 때만 열립니다!
                    >
                        <img src={img} alt={`feed-img-${idx}`} className="w-full h-full object-cover pointer-events-none" />
                        {idx === 0 && feed.type === 'auto' && (
                            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-full flex items-center gap-1 font-bold border border-white/20 shadow-lg break-keep whitespace-nowrap z-10 pointer-events-none">
                                <Sparkles size={12} className="text-amber-300 shrink-0" /> AI 자동 생성
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* 좌측 화살표 */}
            {images.length > 1 && currentIndex > 0 && (
                <button
                    type="button"
                    onClick={(e) => handleMove(e, 'prev')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-40 hover:bg-black shadow-md cursor-pointer"
                >
                    <ChevronLeft size={20} className="-ml-0.5 pointer-events-none" />
                </button>
            )}

            {/* 우측 화살표 */}
            {images.length > 1 && currentIndex < images.length - 1 && (
                <button
                    type="button"
                    onClick={(e) => handleMove(e, 'next')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-40 hover:bg-black shadow-md cursor-pointer"
                >
                    <ChevronRight size={20} className="-mr-0.5 pointer-events-none" />
                </button>
            )}

            {/* 우측 상단 다중 이미지 아이콘 */}
            {images.length > 1 && (
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md p-1.5 rounded-lg text-white z-10 shadow-sm pointer-events-none opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                    <Copy size={16} strokeWidth={2.5} />
                </div>
            )}

            {/* 하단 점(인디케이터) */}
            {images.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                    {images.map((_, idx) => (
                        <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${idx === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function MyPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('schedule');
    const [expandedDays, setExpandedDays] = useState({});
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [itineraries, setItineraries] = useState([]);
    const [matchRequests, setMatchRequests] = useState([]);
    const [feeds, setFeeds] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [pointHistory, setPointHistory] = useState([]);
    const [totalBudget, setTotalBudget] = useState(0);
    const [currentAsset, setCurrentAsset] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);
    const [foreignWallets, setForeignWallets] = useState({ JPY: 0, USD: 0, EUR: 0 });
    const [loading, setLoading] = useState(true);
    const [recommendedMates, setRecommendedMates] = useState([]);

    // UI/Modal States
    const [searchQuery, setSearchQuery] = useState('');
    const [searchStatus, setSearchStatus] = useState('idle');
    const [searchResults, setSearchResults] = useState([]);

    // ✨ Feed Interaction States (Comments & Forking)
    const [feedToFork, setFeedToFork] = useState(null);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [activeCommentFeed, setActiveCommentFeed] = useState(null);
    const [comments, setComments] = useState([]);
    const [newCommentText, setNewCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const fileInputRef = useRef(null);
    const [viewingFeed, setViewingFeed] = useState(null);

    const [showInboxModal, setShowInboxModal] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [showExchangeModal, setShowExchangeModal] = useState(false);
    const [exchangeSubscribed, setExchangeSubscribed] = useState(false);
    const [exchangePhone, setExchangePhone] = useState('');
    const handleSubscribeExchange = () => {
        if (!exchangePhone) return;
        setExchangeSubscribed(true);
    };
    const [showPointModal, setShowPointModal] = useState(false);
    const [showAssetModal, setShowAssetModal] = useState(false);
    const [showGroupManageModal, setShowGroupManageModal] = useState(false);
    const [showAssetHistoryModal, setShowAssetHistoryModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [quizData, setQuizData] = useState([]);
    const [isQuizLoading, setIsQuizLoading] = useState(false);

    const [inviteTrip, setInviteTrip] = useState(null);
    const [inviteSearchQuery, setInviteSearchQuery] = useState('');
    const [inviteSearchStatus, setInviteSearchStatus] = useState('idle');
    const [inviteSearchResults, setInviteSearchResults] = useState([]);

    const [selectedTrip, setSelectedTrip] = useState(null);
    const [exchangeStep, setExchangeStep] = useState('input');
    const [exchangeAmount, setExchangeAmount] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState('JPY');

    const [newExpenseName, setNewExpenseName] = useState('');
    const [newExpenseCost, setNewExpenseCost] = useState('');
    const [newExpenseCurrency, setNewExpenseCurrency] = useState('KRW');

    const [tempAssetInput, setTempAssetInput] = useState('');
    const [targetTotalCostInput, setTargetTotalCostInput] = useState('');
    const [myDepositInput, setMyDepositInput] = useState('');
    const [tripExchangeAmount, setTripExchangeAmount] = useState('');
    const [tripExchangeCurrency, setTripExchangeCurrency] = useState('JPY');

    const [editingFeed, setEditingFeed] = useState(null);
    const [editFeedTitle, setEditFeedTitle] = useState('');
    const [editFeedImages, setEditFeedImages] = useState([]); // ✨ 배열로 변경: { url: string, isNew: boolean }
    const [isFeedSaving, setIsFeedSaving] = useState(false);
    const feedFileInputRef = useRef(null);

    const [feedSort, setFeedSort] = useState('latest'); // 'latest'(최신순) or 'popular'(인기순)
    const [feedLimit, setFeedLimit] = useState(5); // 처음엔 5개만 보여줌
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' }); 

    // Vault States
    const [vaultItems, setVaultItems] = useState([]);
    const [vaultCategory, setVaultCategory] = useState('ticket'); 
    const [showVaultUpload, setShowVaultUpload] = useState(false);
    const [vaultTitle, setVaultTitle] = useState('');
    const [vaultImageBase64, setVaultImageBase64] = useState('');
    const [viewVaultImage, setViewVaultImage] = useState(null);
    const vaultFileInputRef = useRef(null);

    // ? 佺Ʈ ˸ Լ
    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
    };

    const actualPointsHistory = pointHistory.filter(item =>
        item.reason?.includes('보상') || item.reason?.includes('좋아요') ||
        item.reason?.includes('출석') || item.reason?.includes('포인트')
    );

    // ✨ [푸시 초기화 함수] 호이스팅 에러 방지를 위해 컴포넌트 상단에 배치
    // ✨ [완성된 웹 푸시 알림 초기화 함수]
    const initPushNotifications = async () => {
        try {
            // 브라우저가 알림 기능을 지원하는지 확인
            if (typeof window !== 'undefined' && 'Notification' in window) {
                // 유저에게 "알림을 보내도 될까요?" 권한 묻기
                const permission = await Notification.requestPermission();

                if (permission === 'granted') {
                    const supported = await isSupported();
                    if (supported) {
                        const messaging = getMessaging();
                        // 🔑 대표님이 발급받은 VAPID Key를 여기에 넣습니다!
                        const token = await getToken(messaging, {
                            vapidKey: "BGbHmsiKlsaSkfEQiOYQz5R17r6DLgykoKNq22WE8CDRzG1BF8OFI09U21SiFS363Q7X4XtXKqdw_XfPxfZrrHk"
                        });

                        if (token && auth.currentUser?.uid) {
                            // 발급받은 내 폰의 고유 토큰을 DB 유저 정보에 저장
                            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                                fcmToken: token,
                                lastTokenUpdate: serverTimestamp()
                            });
                            console.log("✅ 웹 푸시 알림 세팅 완료!");
                        }
                    }
                }
            }
        } catch (error) {
            console.error("푸시 알림 설정 실패:", error);
        }
    };

    useEffect(() => {
        if (!user) return;
        const fetchRecommended = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "users"));
                const users = [];
                querySnapshot.forEach(doc => {
                    if (doc.id !== user.uid) users.push({ id: doc.id, ...doc.data() });
                });
                const shuffled = users.sort(() => 0.5 - Math.random());
                setRecommendedMates(shuffled.slice(0, 2));
            } catch (error) { console.error(error); }
        };
        fetchRecommended();
    }, [user]);

    // ✨ [핵심 수정] 인증 감시 및 로딩 해제 로직
    useEffect(() => {
        let unsubscribeUser, unsubscribeTrips, unsubscribeMatches, unsubscribeFeeds, unsubscribePoints;

        // 🚨 안전장치: 데이터 로드가 늦어져도 1.5초 후에는 무조건 로딩 해제
        const fallbackTimer = setTimeout(() => {
            setLoading(false);
        }, 1500);

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                if (unsubscribeUser) unsubscribeUser();
                if (unsubscribeTrips) unsubscribeTrips();
                if (unsubscribeMatches) unsubscribeMatches();
                if (unsubscribeFeeds) unsubscribeFeeds();
                if (unsubscribePoints) unsubscribePoints();
                router.push('/');
                return;
            }

            setUser(currentUser);
            initPushNotifications();
            getVaultItems().then(items => setVaultItems(items)).catch(e => console.error("Vault load error", e));

            // 1. 유저 정보 구독 (여기서 로딩을 해제합니다!)
            const userDocRef = doc(db, "users", currentUser.uid);
            unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserData(data);
                    if (data.profileImgBase64) setPreviewImage(data.profileImgBase64);
                    setCurrentAsset(data.currentAsset || 0);
                    setForeignWallets(data.foreignWallets || { JPY: 0, USD: 0, EUR: 0 });
                }
                clearTimeout(fallbackTimer); // 데이터 받으면 타이머 취소
                setLoading(false); // 🎯 덮개 치우기!
            });

            // 2. 기타 데이터 구독 (로딩과 무관하게 백그라운드에서 가져옴)
            const tripsQ = query(collection(db, "trips"), where("memberIds", "array-contains", currentUser.uid), orderBy("createdAt", "desc"));
            unsubscribeTrips = onSnapshot(tripsQ, (snapshot) => {
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setItineraries(list);
                setTotalBudget(list.reduce((acc, curr) => acc + parseCost(curr.estimatedCost), 0));
                if (selectedTrip) {
                    const updatedSelected = list.find(t => t.id === selectedTrip.id);
                    if (updatedSelected) setSelectedTrip(updatedSelected);
                }
            });

            const pointsQ = query(collection(db, "users", currentUser.uid, "point_history"), orderBy("createdAt", "desc"));
            unsubscribePoints = onSnapshot(pointsQ, (snapshot) => setPointHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

            const matchesQ = collection(db, "match_requests");
            unsubscribeMatches = onSnapshot(matchesQ, (snapshot) => {
                const mList = [];
                snapshot.forEach(doc => {
                    const d = doc.data();
                    if (d.targetMateId === currentUser.uid || d.senderId === currentUser.uid) mList.push({ id: doc.id, ...d });
                });
                setMatchRequests(mList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
            });


        });

        return () => {
            clearTimeout(fallbackTimer);
            unsubscribeAuth();
            if (unsubscribeUser) unsubscribeUser();
            if (unsubscribeTrips) unsubscribeTrips();
            if (unsubscribeMatches) unsubscribeMatches();
            if (unsubscribePoints) unsubscribePoints();
        };
    }, [router, selectedTrip?.id]);

    // Vault logic
    const handleVaultUpload = async () => {
        if (!vaultTitle || !vaultImageBase64) return showToast("제목과 이미지를 모두 입력해주세요.", "error");
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
        await saveVaultItem({ id, title: vaultTitle, image: vaultImageBase64, category: vaultCategory, createdAt: Date.now() });
        const items = await getVaultItems();
        setVaultItems(items);
        setShowVaultUpload(false);
        setVaultTitle('');
        setVaultImageBase64('');
        showToast("보관함에 저장되었습니다.", "success");
    };

    const handleVaultImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setVaultImageBase64(reader.result);
        reader.readAsDataURL(file);
    };

    const deleteVault = async (id) => {
        if (confirm("삭제할까요?")) {
            await deleteVaultItem(id);
            const items = await getVaultItems();
            setVaultItems(items);
        }
    };

    // 퀴즈 데이터 가져오기 (Gemini API 연동)
    const renderVault = () => {
        const filteredItems = vaultItems.filter(item => item.category === vaultCategory);
        return (
            <div className="animate-in fade-in duration-500 p-4 pt-10">
                <div className="flex items-center justify-between mb-6 px-2">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">내 보관함</h1>
                </div>
                <div className="flex gap-2 mb-6 px-2 overflow-x-auto custom-scrollbar pb-2">
                    {[ { id: 'ticket', label: '🎟️ 예약/티켓' }, { id: 'coupon', label: '🎫 쿠폰' }, { id: 'photo', label: '📸 사진첩' } ].map(cat => (
                        <button key={cat.id} onClick={() => setVaultCategory(cat.id)} className={`px-5 py-2.5 rounded-[20px] font-bold text-sm whitespace-nowrap transition-all shadow-sm ${vaultCategory === cat.id ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white scale-105' : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'}`}>{cat.label}</button>
                    ))}
                </div>
                {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4"><Box className="text-gray-400 w-10 h-10" /></div>
                        <p className="text-gray-500 font-bold mb-1">아직 보관된 항목이 없습니다</p>
                        <p className="text-xs text-gray-400">우측 하단의 + 버튼을 눌러 추가해보세요!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 px-2">
                        {filteredItems.map(item => (
                            <div key={item.id} className="bg-white p-2 rounded-[24px] shadow-sm border border-gray-100 relative group transition-all hover:shadow-md">
                                <div className="aspect-[4/5] rounded-[18px] overflow-hidden bg-gray-100 mb-3 relative cursor-pointer" onClick={() => setViewVaultImage(item.image)}>
                                    <img src={item.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={item.title} />
                                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-sm font-black text-gray-800 px-2 pb-1 truncate">{item.title}</p>
                                <button onClick={() => deleteVault(item.id)} className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full text-rose-500 flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-all"><Trash2 size={16} strokeWidth={2.5} /></button>
                            </div>
                        ))}
                    </div>
                )}
                {showVaultUpload && (
                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col justify-end">
                        <div className="bg-white w-full rounded-t-[40px] p-8 pb-safe animate-in slide-in-from-bottom-full duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-gray-900">새 항목 추가</h3>
                                <button onClick={() => {setShowVaultUpload(false); setVaultImageBase64(''); setVaultTitle('');}} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600"><X size={20} strokeWidth={2.5} /></button>
                            </div>
                            <div className="space-y-5">
                                <div className="flex gap-2">
                                    {[ { id: 'ticket', label: '🎟️ 예약/티켓' }, { id: 'coupon', label: '🎫 쿠폰' }, { id: 'photo', label: '📸 사진첩' } ].map(cat => (
                                        <button key={cat.id} onClick={() => setVaultCategory(cat.id)} className={`flex-1 py-3 rounded-[16px] text-sm font-bold transition-all border ${vaultCategory === cat.id ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white text-gray-500 border-gray-200'}`}>{cat.label}</button>
                                    ))}
                                </div>
                                <input type="text" placeholder="제목이나 메모를 입력하세요" value={vaultTitle} onChange={e => setVaultTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-200 px-5 py-4 rounded-[20px] font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-400 transition" />
                                <div>
                                    <input type="file" accept="image/*" className="hidden" ref={vaultFileInputRef} onChange={handleVaultImageChange} />
                                    {vaultImageBase64 ? (
                                        <div className="relative w-full aspect-video rounded-[24px] overflow-hidden shadow-sm group">
                                            <img src={vaultImageBase64} className="w-full h-full object-cover" alt="preview" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => vaultFileInputRef.current.click()}><p className="text-white font-bold flex items-center gap-2"><Camera size={20} /> 사진 변경</p></div>
                                        </div>
                                    ) : (
                                        <div onClick={() => vaultFileInputRef.current.click()} className="w-full aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-[24px] flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors">
                                            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400"><Camera size={24} /></div>
                                            <p className="text-sm font-bold text-gray-500">사진 업로드</p>
                                        </div>
                                    )}
                                </div>
                                <button onClick={handleVaultUpload} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black py-5 rounded-[24px] shadow-lg flex items-center justify-center gap-2"><CheckCircle size={20} /> 저장하기</button>
                            </div>
                        </div>
                    </div>
                )}
                {viewVaultImage && (
                    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
                        <div className="flex justify-end p-6"><button onClick={() => setViewVaultImage(null)} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white"><X size={24} /></button></div>
                        <div className="flex-1 flex items-center justify-center p-4"><img src={viewVaultImage} className="max-w-full max-h-full object-contain rounded-[12px]" alt="fullscreen" /></div>
                    </div>
                )}
                <button onClick={() => {setShowVaultUpload(true); setVaultCategory('ticket');}} className="fixed bottom-32 right-6 w-[60px] h-[60px] bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full text-white shadow-xl flex items-center justify-center z-40"><Plus size={28} strokeWidth={3} /></button>
            </div>
        );
    };

    const handleOpenQuiz = async () => {
        if (isQuizLoading) return;

        setIsQuizLoading(true);
        try {
            // 유저의 최신 여행지를 기반으로 퀴즈 생성
            const latestDest = itineraries.length > 0
                ? getSafeDestination(itineraries[0].destination)
                : "서울";

            const response = await fetch('/api/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destination: latestDest })
            });
            const data = await response.json();

            if (data.result) {
                setQuizData(data.result);
                setShowQuizModal(true);
            } else {
                alert("퀴즈를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.");
            }
        } catch (error) {
            console.error("Quiz Fetch Error:", error);
            alert("네트워크 오류로 퀴즈를 가져오지 못했습니다.");
        } finally {
            setIsQuizLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;

        // 파이어베이스에서 필요한 만큼만 정렬해서 가져오기 (limit 적용)
        const feedsRef = collection(db, "feeds");
        const q = feedSort === 'popular'
            ? query(feedsRef, orderBy("likes", "desc"), limit(feedLimit)) // 좋아요순 
            : query(feedsRef, orderBy("createdAt", "desc"), limit(feedLimit)); // 최신순

        const unsubscribeFeeds = onSnapshot(q, (snapshot) => {
            const feedList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFeeds(feedList); // 이제 클라이언트에서 억지로 정렬하지 않습니다!
        });

        return () => unsubscribeFeeds();
    }, [user, feedSort, feedLimit]); // 정렬이나 개수가 바뀌면 자동으로 다시 불러옴

    useEffect(() => {
        let unsubscribeExpenses;
        if (selectedTrip && showBudgetModal && user) {
            const expensesRef = collection(db, "trips", selectedTrip.id, "expenses");
            unsubscribeExpenses = onSnapshot(query(expensesRef, orderBy("createdAt", "desc")), (snapshot) => {
                const expList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setExpenses(expList);
                setTotalSpent(expList.reduce((acc, curr) => acc + (parseInt(curr.amount) || 0), 0));
            });
        }
        return () => { if (unsubscribeExpenses) unsubscribeExpenses(); };
    }, [selectedTrip, showBudgetModal, user]);

    // --- Actions (기존 로직 100% 보존) ---
    const handleToggleDDayNotify = async (trip) => {
        if (!user) return;
        
        const isCurrentDDay = userData?.dDayTripId === trip.id;
        
        try {
            if (isCurrentDDay) {
                // 이미 설정된 경우 해제
                await updateDoc(doc(db, "users", user.uid), {
                    dDayTripId: null,
                    dDayTripTitle: null,
                    dDayStartDate: null
                });
                showToast("🔔 D-Day 알림이 해제되었습니다.", "info");
            } else {
                // 새로운 일정으로 설정
                if (!trip.startDate) {
                    showToast("⚠️ 시작 날짜가 설정된 일정만 알림이 가능합니다.", "error");
                    return;
                }
                
                await updateDoc(doc(db, "users", user.uid), {
                    dDayTripId: trip.id,
                    dDayTripTitle: trip.destination || trip.title || "여행",
                    dDayStartDate: trip.startDate,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                });
                showToast(`🔔 '${trip.destination || "여행"}' 일정이 D-Day 알림으로 설정되었습니다!`, "success");
            }
        } catch (error) {
            console.error("D-Day 설정 실패:", error);
            showToast("설정 중 오류가 발생했습니다.", "error");
        }
    };

    const handleDeleteTrip = async (e, tripId, dest) => { e.stopPropagation(); if (confirm(`'${dest}' 일정을 삭제할까요?`)) { try { await deleteDoc(doc(db, "trips", tripId)); } catch (e) { showToast("삭제 중 오류가 발생했습니다.", "error"); } } };
    const handleLikeFeed = async (feedId) => { try { await updateDoc(doc(db, "feeds", feedId), { likes: increment(1) }); } catch (e) { console.error("좋아요 실패"); } };
    const handleDeleteRequest = async (id) => { if (confirm('삭제하시겠습니까?')) { try { await deleteDoc(doc(db, "match_requests", id)); } catch (e) { } } };
    const handleRejectRequest = async (id) => { if (confirm('거절하시겠습니까?')) { try { await updateDoc(doc(db, "match_requests", id), { status: 'rejected' }); } catch (e) { } } };
    const handleAcceptRequest = async (id) => { try { await updateDoc(doc(db, "match_requests", id), { status: 'accepted' }); showToast("수락 완료!", "success"); } catch (e) { } };

    const handleRequestDeposit = async () => {
        const targetTotal = selectedTrip.targetTotalCost || parseCost(selectedTrip.estimatedCost) || 0;
        if (!targetTotal) return showToast("먼저 총 여행 경비를 설정해주세요.", "info");
        const actualMembers = selectedTrip.membersInfo || [];
        const amountPerPerson = Math.ceil(targetTotal / actualMembers.length);
        const membersToRequest = actualMembers.filter(m => m.uid !== user?.uid);
        if (membersToRequest.length === 0) return showToast("동행자가 없습니다.", "info");
        try {
            const promises = membersToRequest.map(member => addDoc(collection(db, "match_requests"), {
                type: "deposit_request", senderId: user.uid, senderName: userData?.name || user.displayName,
                targetMateId: member.uid, targetMateName: member.name, tripId: selectedTrip.id,
                destination: selectedTrip.destination || selectedTrip.title || "여행", amount: amountPerPerson,
                status: "pending", message: `💸 "${selectedTrip.destination || "여행"}" 총경비 정산! ${amountPerPerson.toLocaleString()}원 입금 요청.`,
                createdAt: serverTimestamp()
            }));
            await Promise.all(promises);
            showToast("요청을 보냈습니다! 💌", "success");
        } catch (e) { showToast("발송 실패", "error"); }
    };

    const handlePayDeposit = async (req) => {
        const amount = req.amount;
        if (currentAsset < amount) return showToast("잔액이 부족합니다.", "error");
        if (!confirm(`${amount.toLocaleString()}원을 입금할까요?`)) return;
        try {
            await updateDoc(doc(db, "users", user.uid), { currentAsset: increment(-amount) });
            await updateDoc(doc(db, "trips", req.tripId), { tripWalletBalance: increment(amount), [`depositStatus.${user.uid}`]: increment(amount) });
            await addDoc(collection(db, "users", user.uid, "point_history"), { reason: `'${req.destination}' 송금`, amount: -amount, createdAt: serverTimestamp() });
            await updateDoc(doc(db, "match_requests", req.id), { status: 'accepted' });
            showToast("입금 완료! 🎉", "success");
        } catch (e) { showToast("입금 실패", "error"); }
    };

    const handleAddExpense = async () => {
        if (!newExpenseName || !newExpenseCost) return;
        const amount = parseInt(newExpenseCost);
        try {
            const tripRef = doc(db, "trips", selectedTrip.id);
            if (newExpenseCurrency === 'KRW') await updateDoc(tripRef, { tripWalletBalance: increment(-amount) });
            else await updateDoc(tripRef, { [`foreignWallets.${newExpenseCurrency}`]: increment(-amount) });
            await addDoc(collection(db, "trips", selectedTrip.id, "expenses"), { name: newExpenseName, amount, currency: newExpenseCurrency, category: "기타", createdAt: serverTimestamp(), by: userData?.name || user.displayName });
            setNewExpenseName(''); setNewExpenseCost('');
        } catch (e) { showToast("지출 등록에 실패했습니다.", "error"); }
    };

    const handleDeleteExpense = async (exp) => {
        if (confirm("삭제하고 잔고를 복구할까요?")) {
            try {
                const tripRef = doc(db, "trips", selectedTrip.id);
                if (exp.currency === 'KRW') await updateDoc(tripRef, { tripWalletBalance: increment(exp.amount) });
                else await updateDoc(tripRef, { [`foreignWallets.${exp.currency}`]: increment(exp.amount) });
                await deleteDoc(doc(db, "trips", selectedTrip.id, "expenses", exp.id));
            } catch (e) { showToast("삭제 실패", "error"); }
        }
    };

    const handleDepositAsset = async () => {
        const amount = parseInt(tempAssetInput);
        if (!amount || amount <= 0) return;
        try {
            await updateDoc(doc(db, "users", user.uid), { currentAsset: increment(amount) });
            await addDoc(collection(db, "users", user.uid, "point_history"), { reason: "지갑 입금", amount, createdAt: serverTimestamp() });
            showToast("입금되었습니다! 💰", "success"); setShowAssetModal(false); setTempAssetInput('');
        } catch (e) { showToast("입금 실패", "error"); }
    };

    const handleSetTargetCost = async () => {
        if (!targetTotalCostInput) return;
        try {
            await updateDoc(doc(db, "trips", selectedTrip.id), { targetTotalCost: parseInt(targetTotalCostInput), estimatedCost: `${parseInt(targetTotalCostInput).toLocaleString()}원` });
            showToast("목표 경비 설정 완료!", "success"); setTargetTotalCostInput('');
        } catch (e) { showToast("설정 실패", "error"); }
    };

    const handleDepositToTrip = async () => {
        const amount = parseInt(myDepositInput);
        if (!amount || amount <= 0) return;
        if (currentAsset < amount) return showToast("잔액이 부족합니다.", "error");
        try {
            await updateDoc(doc(db, "users", user.uid), { currentAsset: increment(-amount) });
            await updateDoc(doc(db, "trips", selectedTrip.id), { tripWalletBalance: increment(amount), [`depositStatus.${user.uid}`]: increment(amount) });
            await addDoc(collection(db, "users", user.uid, "point_history"), { reason: "이체", amount: -amount, createdAt: serverTimestamp() });
            showToast("입금 완료! 🎉", "success"); setMyDepositInput('');
        } catch (e) { showToast("입금 실패", "error"); }
    };

    const handleTripExchange = async () => {
        const amount = parseInt(tripExchangeAmount);
        if (!amount || amount <= 0) return;
        const costKRW = Math.floor(amount * CURRENCY_RATES[tripExchangeCurrency]);
        const currentBalance = selectedTrip.tripWalletBalance || 0;
        if (currentBalance < costKRW) return showToast(`잔액 부족 (${costKRW.toLocaleString()}원 필요)`, "error");
        try {
            await updateDoc(doc(db, "trips", selectedTrip.id), { tripWalletBalance: increment(-costKRW), [`foreignWallets.${tripExchangeCurrency}`]: increment(amount) });
            await addDoc(collection(db, "trips", selectedTrip.id, "expenses"), { name: `[환전] ${tripExchangeCurrency}`, amount: costKRW, currency: 'KRW', category: "환전", createdAt: serverTimestamp(), by: userData?.name || user.displayName });
            showToast("환전 완료! 💱", "success"); setTripExchangeAmount('');
        } catch (e) { showToast("환전 실패", "error"); }
    };

    // ✨ 일정별 예산/지출 업데이트 핸들러
    const handleUpdateItemBudget = async (dayIndex, placeIndex, field, value) => {
        if (!selectedTrip) return;
        
        try {
            const newItinerary = [...selectedTrip.itinerary];
            const newPlaces = [...newItinerary[dayIndex].places];
            newPlaces[placeIndex] = { 
                ...newPlaces[placeIndex], 
                [field]: parseInt(value) || 0 
            };
            newItinerary[dayIndex] = { ...newItinerary[dayIndex], places: newPlaces };

            // 로컬 상태 즉시 업데이트 (낙관적 UI)
            const updatedTrip = { ...selectedTrip, itinerary: newItinerary };
            setSelectedTrip(updatedTrip);
            setItineraries(prev => prev.map(t => t.id === selectedTrip.id ? updatedTrip : t));

            // Firestore 업데이트
            await updateDoc(doc(db, "trips", selectedTrip.id), { 
                itinerary: newItinerary 
            });
        } catch (error) {
            console.error("Budget Update Error:", error);
        }
    };

    const openBudgetModal = (trip) => { setSelectedTrip(trip); setNewExpenseCurrency('KRW'); setShowBudgetModal(true); };
    const openProfileModal = () => { setEditName(userData?.name || user?.displayName || ""); setEditBio(userData?.bio || ""); setSelectedTags(userData?.travelTags || []); setShowProfileModal(true); };
    const openAssetModal = () => { setTempAssetInput(''); setShowAssetModal(true); };

    const handleSearchUser = async (e) => {
        e.preventDefault(); const queryText = searchQuery.trim(); if (!queryText) return;
        setSearchStatus('loading');
        try {
            const usersRef = collection(db, "users");
            const qEmail = query(usersRef, where("email", "==", queryText));
            const qName = query(usersRef, where("name", "==", queryText));
            const [emailSnap, nameSnap] = await Promise.all([getDocs(qEmail), getDocs(qName)]);
            const resultsMap = new Map();
            emailSnap.forEach(doc => { if (doc.id !== user.uid) resultsMap.set(doc.id, { id: doc.id, ...doc.data() }); });
            nameSnap.forEach(doc => { if (doc.id !== user.uid) resultsMap.set(doc.id, { id: doc.id, ...doc.data() }); });
            const results = Array.from(resultsMap.values());
            setSearchResults(results); setSearchStatus(results.length > 0 ? 'result' : 'no-result');
        } catch (error) { setSearchStatus('idle'); }
    };

    const handleRequestMate = async (targetUser) => { try { await addDoc(collection(db, "match_requests"), { senderId: user.uid, senderName: userData?.name || user.displayName, targetMateId: targetUser.id, targetMateName: targetUser.name, destination: "동행 요청", status: "pending", message: "같이 여행 가요! 👋", createdAt: serverTimestamp() }); setSearchStatus('requested'); } catch (e) { alert("실패"); } };
    const closeSearchModal = () => { setShowSearchModal(false); setSearchQuery(''); setSearchStatus('idle'); setSearchResults([]); };
    const toggleTag = (tag) => { if (selectedTags.includes(tag)) setSelectedTags(selectedTags.filter(t => t !== tag)); else if (selectedTags.length < 3) setSelectedTags([...selectedTags, tag]); };
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = (ev) => {
                const img = new Image(); img.src = ev.target.result;
                img.onload = () => {
                    const canvas = document.createElement("canvas"); let w = img.width, h = img.height;
                    if (w > h) { if (w > 400) { h *= 400 / w; w = 400; } } else { if (h > 400) { w *= 400 / h; h = 400; } }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                    setPreviewImage(canvas.toDataURL("image/jpeg", 0.7));
                }
            }; reader.readAsDataURL(file);
        }
    };
    const handleSaveProfile = async () => {
        if (!editName.trim()) return; setIsSaving(true);
        try {
            await updateProfile(auth.currentUser, { displayName: editName });
            const uData = { name: editName, bio: editBio, travelTags: selectedTags };
            if (previewImage) uData.profileImgBase64 = previewImage;
            await updateDoc(doc(db, "users", auth.currentUser.uid), uData);
            setUserData(prev => ({ ...prev, ...uData })); setShowProfileModal(false);
        } catch (e) { alert("오류"); } finally { setIsSaving(false); }
    };
    const handleLogout = async () => { if (confirm("로그아웃 하시겠습니까?")) { await signOut(auth); await nextAuthSignOut({ redirect: false }); router.push('/'); } };
    const handleShareTrip = async (trip) => {
        const shareText = `[Trip Maker] 일정 공유\n${trip.destination}\n${trip.startDate} ~ ${trip.endDate}`;
        const shareUrl = `${window.location.origin}/share/${trip.id}`;
        if (navigator.share) { try { await navigator.share({ title: "여행 일정", text: shareText, url: shareUrl }); } catch (error) { } }
        else { navigator.clipboard.writeText(`${shareText}\n${shareUrl}`); alert("링크 복사됨!"); }
    };
    const handleForkClick = (feed) => {
        setFeedToFork(feed);
    };
    const confirmForkItinerary = async () => {
        if (!feedToFork) return;
        setIsSaving(true);
        try {
            await addDoc(collection(db, "trips"), { ...feedToFork.mockTripData, memberIds: [user.uid], membersInfo: [{ uid: user.uid, name: user.displayName, avatar: user.photoURL }], isForked: true, originalAuthor: feedToFork.author, createdAt: serverTimestamp() });
            await updateDoc(doc(db, "feeds", feedToFork.id), { forks: increment(1) });
            if (feedToFork.authorUid && feedToFork.authorUid !== user.uid) { await updateDoc(doc(db, "users", feedToFork.authorUid), { points: increment(30) }); await addDoc(collection(db, "users", feedToFork.authorUid, "point_history"), { reason: "일정 공유됨", amount: 30, createdAt: serverTimestamp() }); }
            setFeedToFork(null); setViewingFeed(null);
            alert("일정 가져오기 완료");
        } catch (e) { alert("오류"); } finally { setIsSaving(false); }
    };

    // ✨ 댓글 기능 함수
    const openCommentModal = (feed) => {
        setActiveCommentFeed(feed);
        setShowCommentModal(true);
        const commentsRef = collection(db, "feeds", feed.id, "comments");
        const q = query(commentsRef, orderBy("createdAt", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setComments(data);
        });
        return unsubscribe;
    };

    const closeCommentModal = () => {
        setShowCommentModal(false);
        setActiveCommentFeed(null);
        setComments([]);
    };

    const handleAddComment = async () => {
        if (!newCommentText.trim() || !activeCommentFeed || !user) return;
        setIsSubmittingComment(true);
        try {
            await addDoc(collection(db, "feeds", activeCommentFeed.id, "comments"), {
                uid: user.uid,
                name: user.displayName || userData?.name || '익명',
                avatar: user.photoURL || "https://i.pravatar.cc/150?u=default",
                text: newCommentText.trim(),
                createdAt: serverTimestamp()
            });
            await updateDoc(doc(db, "feeds", activeCommentFeed.id), {
                commentCount: increment(1)
            });
            setNewCommentText('');
        } catch (error) {
            console.error("댓글 작성 실패", error);
            alert("댓글 작성 실패");
        } finally {
            setIsSubmittingComment(false);
        }
    };
    const handleToggleLike = async (feed) => {
        if (!user) return; const feedRef = doc(db, "feeds", feed.id); const isLiked = feed.likedBy?.includes(user.uid);
        try {
            if (isLiked) await updateDoc(feedRef, { likes: increment(-1), likedBy: arrayRemove(user.uid) });
            else { await updateDoc(feedRef, { likes: increment(1), likedBy: arrayUnion(user.uid) }); if (feed.authorUid && feed.authorUid !== user.uid) { await updateDoc(doc(db, "users", feed.authorUid), { points: increment(10) }); await addDoc(collection(db, "users", feed.authorUid, "point_history"), { reason: "좋아요 받음", amount: 10, createdAt: serverTimestamp() }); } }
        } catch (e) { }
    };
    const handleDeleteFeed = async (feed) => { if (feed.author !== (userData?.name || user?.displayName)) return alert("본인 글만 삭제 가능"); if (confirm("삭제?")) { try { await deleteDoc(doc(db, "feeds", feed.id)); alert("삭제됨"); } catch (e) { alert("오류"); } } };

    // ✨ 1. 모달 열 때 데이터 세팅
    const openEditFeedModal = (feed) => {
        setEditingFeed(feed);
        setEditFeedTitle(feed.title || '');

        // 기존 1장짜리 데이터가 있으면 배열로 변환해서 호환성 유지
        let existingImages = [];
        if (feed.images && Array.isArray(feed.images)) {
            existingImages = feed.images.map(url => ({ url, isNew: false }));
        } else if (feed.image) {
            existingImages = [{ url: feed.image, isNew: false }];
        }
        setEditFeedImages(existingImages);
    };

    // ✨ 2. 사진 여러 장 선택 및 압축 로직
    const handleFeedImageChange = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        // 최대 5장 제한 (원하시면 늘리셔도 됩니다)
        if (editFeedImages.length + files.length > 5) {
            return alert("사진은 대표 지도 포함 최대 5장까지 올릴 수 있습니다.");
        }

        const newImages = await Promise.all(files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = (ev) => {
                    const img = new Image();
                    img.src = ev.target.result;
                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        let w = img.width, h = img.height;
                        // 다중 이미지이므로 용량을 더 줄입니다 (최대 가로 800px)
                        if (w > h) { if (w > 800) { h *= 800 / w; w = 800; } }
                        else { if (h > 800) { w *= 800 / h; h = 800; } }
                        canvas.width = w; canvas.height = h;
                        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                        // isNew: true = 아직 서버에 안 올라간 방금 고른 사진
                        resolve({ url: canvas.toDataURL("image/jpeg", 0.7), isNew: true });
                    }
                };
                reader.readAsDataURL(file);
            });
        }));
        setEditFeedImages(prev => [...prev, ...newImages]);
    };

    // ✨ 3. 선택한 사진 삭제 로직 (대표 지도는 삭제 불가)
    const handleRemoveImage = (indexToRemove) => {
        if (indexToRemove === 0) return alert("첫 번째 사진(대표 지도)은 지울 수 없습니다.");
        setEditFeedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    // ✨ 4. Firebase Storage 업로드 및 저장 로직
    const handleSaveFeed = async () => {
        if (!editFeedTitle.trim()) return alert("내용을 입력해주세요.");
        if (editFeedImages.length === 0) return alert("최소 1장의 사진(지도)이 필요합니다.");

        setIsFeedSaving(true);
        try {
            const finalUrls = [];

            // 사진들을 하나씩 확인하며 새 사진이면 Storage에 업로드
            for (let i = 0; i < editFeedImages.length; i++) {
                const imgObj = editFeedImages[i];
                if (imgObj.isNew) {
                    // 고유한 파일명 생성
                    const fileName = `feeds/${editingFeed.id}_${Date.now()}_${i}.jpg`;
                    const storageRef = ref(storage, fileName);
                    // Base64를 이미지 파일로 변환하여 업로드
                    await uploadString(storageRef, imgObj.url, 'data_url');
                    const downloadUrl = await getDownloadURL(storageRef);
                    finalUrls.push(downloadUrl);
                } else {
                    // 이미 있는 사진이면 기존 URL 그대로 사용
                    finalUrls.push(imgObj.url);
                }
            }

            // DB 업데이트 (images 배열로 저장, 하위 호환을 위해 image 필드도 남김)
            await updateDoc(doc(db, "feeds", editingFeed.id), {
                title: editFeedTitle,
                images: finalUrls,          // ✨ 배열 저장 (인스타용)
                image: finalUrls[0]         // ✨ 대표 이미지 보존
            });

            alert("수정 완료!");
            setEditingFeed(null);
        } catch (e) {
            console.error(e);
            alert("저장 실패");
        } finally {
            setIsFeedSaving(false);
        }
    };

    const openInviteModal = (trip) => { setInviteTrip(trip); setInviteSearchQuery(''); setInviteSearchStatus('idle'); setInviteSearchResults([]); setShowInviteModal(true); };
    const handleInviteSearch = async (e) => {
        e.preventDefault(); const queryText = inviteSearchQuery.trim(); if (!queryText) return;
        setInviteSearchStatus('loading');
        try {
            const usersRef = collection(db, "users");
            const [emailSnap, nameSnap] = await Promise.all([getDocs(query(usersRef, where("email", "==", queryText))), getDocs(query(usersRef, where("name", "==", queryText)))]);
            const resultsMap = new Map();
            emailSnap.forEach(doc => { if (doc.id !== user.uid) resultsMap.set(doc.id, { id: doc.id, ...doc.data() }); });
            nameSnap.forEach(doc => { if (doc.id !== user.uid) resultsMap.set(doc.id, { id: doc.id, ...doc.data() }); });
            setInviteSearchResults(Array.from(resultsMap.values())); setInviteSearchStatus(resultsMap.size > 0 ? 'result' : 'no-result');
        } catch (error) { setInviteSearchStatus('idle'); alert("검색 오류"); }
    };
    const handleSendWorkspaceInvite = async (targetUser) => { try { await addDoc(collection(db, "match_requests"), { type: "workspace_invite", senderId: user.uid, senderName: userData?.name || user.displayName, targetMateId: targetUser.id, targetMateName: targetUser.name, tripId: inviteTrip.id, destination: inviteTrip.destination || inviteTrip.title, status: "pending", message: `초대합니다!`, createdAt: serverTimestamp() }); setInviteSearchStatus('sent'); } catch (error) { alert("실패"); } };
    const handleCopyInviteLink = () => {
        const inviteUrl = `${window.location.origin}/join/${inviteTrip.id}`;
        if (navigator.share) { navigator.share({ title: "초대", url: inviteUrl }).catch(console.error); }
        else { navigator.clipboard.writeText(inviteUrl); alert("복사됨"); }
    };
    const handleDailyCheckIn = async () => {
        if (!user || !userData) return;

        const today = new Date().toISOString().split('T')[0];
        if (userData.lastCheckInDate === today) {
            alert("오늘 이미 출석 체크를 완료했습니다! 📅");
            return;
        }

        try {
            await updateDoc(doc(db, "users", user.uid), {
                points: increment(50),
                lastCheckInDate: today
            });
            await addDoc(collection(db, "users", user.uid, "point_history"), {
                reason: "출석 체크",
                amount: 50,
                createdAt: serverTimestamp()
            });
            alert("출석 완료! 50P가 적립되었습니다. 🎉");
        } catch (e) {
            console.error("출석 체크 실패:", e);
        }
    };

    // --- 안전 로딩 덮개 ---
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 relative">
                <div className="text-center relative z-10">
                    <Loader2 className="animate-spin text-rose-500 mb-4 mx-auto" size={40} />
                    <p className="text-white font-bold animate-pulse">동기화 중입니다...</p>
                </div>
            </div>
        );
    }

    const GlassCard = ({ children, className = "", onClick }) => (
        <div onClick={onClick} className={`bg-white/60 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgba(0,0,0,0.05)] rounded-[20px] ${className}`}>{children}</div>
    );



    // --- UI 렌더 시작 ---
    const renderSchedule = () => (
        <div className="animate-in fade-in duration-500">
            <header className="flex justify-between items-center px-3 pt-12 pb-4 sticky top-0 z-40 bg-gradient-to-b from-white/60 to-transparent backdrop-blur-md border-b border-white/30">
                <button onClick={() => router.push('/?mode=new')} className="text-gray-900 bg-white/50 backdrop-blur-md p-2 rounded-full shadow-sm transition hover:bg-white/80"><ArrowLeft size={22} strokeWidth={2.5} /></button>
                <h1 className="text-lg font-black text-gray-900 tracking-tight break-keep whitespace-nowrap">내 여행 일정</h1>
                <button onClick={() => setShowSearchModal(true)} className="text-gray-900 bg-white/50 backdrop-blur-md p-2 rounded-full shadow-sm transition hover:bg-white/80"><Search size={22} strokeWidth={2.5} /></button>
            </header>
            <div className="px-3 pt-4 pb-6">
                <div className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-700 text-xs font-black tracking-wide mb-2 px-3 py-1.5 rounded-full backdrop-blur-md border border-rose-500/20 shadow-sm break-keep whitespace-nowrap"><Sparkles size={14} className="fill-rose-600" /> AI TRIPS & WORKSPACE</div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight break-keep whitespace-nowrap">다가오는<br />여행 일정</h2>
            </div>
            <main className="px-3 space-y-6 pb-6">
                {itineraries.length === 0 ? (
                    <GlassCard className="text-center py-12 text-gray-500 font-medium"><p>다가오는 여행이 없습니다.</p></GlassCard>
                ) : (
                    itineraries.map((trip) => {
                        const safeDest = getSafeDestination(trip.destination);
                        const actualMembers = trip.membersInfo || [{ name: userData?.name || "나", avatar: previewImage || user?.photoURL || "https://i.pravatar.cc/150?u=me" }];
                        const isHost = trip.hostId === user?.uid;

                        return (
                            <GlassCard key={trip.id} className="overflow-hidden group">
                                <div className="h-40 bg-cover bg-center relative" style={{ backgroundImage: `url('https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(safeDest)}&zoom=11&size=600x300&maptype=roadmap&markers=color:red%7C${encodeURIComponent(safeDest)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}')`, backgroundColor: '#e5e7eb' }}>
                                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold tracking-wider shadow-lg border border-white/20 break-keep whitespace-nowrap">{calculateDDay(trip.startDate)}</div>
                                    <div className="absolute top-4 left-4 flex gap-2">
                                        <button onClick={(e) => handleDeleteTrip(e, trip.id, trip.destination)} className="text-white bg-black/40 hover:bg-rose-500 p-2.5 rounded-full backdrop-blur-md transition shadow-md z-10 shrink-0" title="일정 삭제"><Trash2 size={16} strokeWidth={2.5} /></button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleToggleDDayNotify(trip); }} 
                                            className={`p-2.5 rounded-full backdrop-blur-md transition shadow-md z-10 shrink-0 border ${userData?.dDayTripId === trip.id ? 'bg-rose-500 text-white border-rose-400' : 'bg-black/40 text-white border-white/20 hover:bg-white/20'}`}
                                            title={userData?.dDayTripId === trip.id ? "D-Day 알림 해제" : "D-Day 알림 설정"}
                                        >
                                            <BellRing size={16} strokeWidth={2.5} className={userData?.dDayTripId === trip.id ? "animate-bounce" : ""} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-[24px] font-black text-gray-900 break-keep">{trip.destination || "여행지"}</h3>
                                        <div className="flex items-center gap-1.5 text-rose-600/70 bg-rose-50/60 px-2 py-1 rounded-lg mt-1 shrink-0"><Plane size={16} strokeWidth={2.5} /><Bed size={16} strokeWidth={2.5} /><Utensils size={16} strokeWidth={2.5} /></div>
                                    </div>
                                    <p className="text-gray-600 text-sm font-semibold mb-4 break-keep whitespace-nowrap">{formatTripDate(trip.startDate, trip.endDate, trip.duration)}</p>
                                    <div className="flex items-center justify-between bg-gray-50/80 p-3 rounded-[16px] mb-5 border border-gray-100 shadow-inner">
                                        <div className="flex items-center gap-3 w-full pr-4 overflow-hidden">
                                            <div className="flex -space-x-2 shrink-0">
                                                {actualMembers.slice(0, 3).map((m, i) => (<img key={i} src={m.avatar || "https://i.pravatar.cc/150"} alt={m.name} title={m.name} className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" />))}
                                                {actualMembers.length > 3 && (<div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm z-10">+{actualMembers.length - 3}</div>)}
                                                <button onClick={() => openInviteModal(trip)} className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 bg-white flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition shadow-sm z-10" title="동행자 초대하기"><Plus size={14} strokeWidth={3} /></button>
                                            </div>
                                            <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider break-keep whitespace-nowrap">Members</span><span className="text-xs font-bold text-gray-700 break-keep whitespace-nowrap">{actualMembers.length}명 참여 중</span></div>
                                        </div>
                                        <span className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-1 rounded-md font-bold shadow-sm shrink-0 break-keep whitespace-nowrap">{isHost ? '관리자(나)' : '동행인'}</span>
                                    </div>
                                    <div className="flex gap-2.5">
                                        <button onClick={() => {
                                            if (trip?.id) {
                                                router.push(`/trip/?id=${trip.id}`);
                                            } else {
                                                console.error("일정 ID를 찾을 수 없습니다.");
                                            }
                                        }} className="flex-1 bg-gradient-to-r from-slate-800 to-gray-900 text-white py-3.5 rounded-[16px] flex items-center justify-center gap-2 font-bold text-sm hover:from-slate-900 hover:to-black shadow-md active:scale-[0.98] transition break-keep whitespace-nowrap"><Calendar size={16} strokeWidth={2.5} className="shrink-0" /> 일정 보기</button>
                                        <button onClick={() => handleShareTrip(trip)} className="flex-1 bg-white border border-gray-200 text-gray-800 py-3.5 rounded-[16px] flex items-center justify-center gap-2 font-bold text-sm hover:bg-gray-50 transition active:scale-[0.98] shadow-sm break-keep whitespace-nowrap"><Share2 size={16} strokeWidth={2.5} className="shrink-0" /> 외부 공유</button>
                                    </div>
                                </div>
                            </GlassCard>
                        );
                    })
                )}
                <GlassCard className="mt-6 p-5 flex items-center justify-between cursor-pointer hover:bg-white/80 transition group active:scale-[0.98]" onClick={() => router.push('/?mode=new')}>
                    <div className="flex items-center gap-4"><div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-orange-400 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform shrink-0"><Plus size={24} strokeWidth={3} /></div><div className="overflow-hidden"><h4 className="font-bold text-gray-900 text-base mb-0.5 break-keep whitespace-nowrap truncate w-full">새로운 일정 만들기</h4><p className="text-xs text-gray-500 font-medium break-keep whitespace-nowrap">AI가 취향에 맞게 짜드려요</p></div></div><ChevronRight size={20} className="text-gray-300 group-hover:text-gray-600 transition shrink-0" />
                </GlassCard>
            </main>
        </div>
    );

    const renderSocial = () => (
        <div className="animate-in fade-in duration-500">
            <header className="flex justify-between items-center px-3 pt-12 pb-4 sticky top-0 z-40 bg-gradient-to-b from-white/60 to-transparent backdrop-blur-md border-b border-white/30">
                <div onClick={openProfileModal} className="flex items-center gap-3 cursor-pointer group hover:bg-white/40 p-2 -ml-2 rounded-2xl transition w-full pr-4 overflow-hidden">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600 flex items-center justify-center overflow-hidden border-2 border-white shadow-md shrink-0">
                        {previewImage || user?.photoURL ? (<img src={previewImage || user?.photoURL} alt="Profile" className="w-full h-full object-cover" />) : (<User size={20} />)}
                    </div>
                    <div className="overflow-hidden">
                        <h1 className="text-lg font-black text-gray-900 flex items-center gap-1 drop-shadow-sm break-keep whitespace-nowrap truncate w-full">
                            {userData?.name || user?.displayName || "여행자"} <ChevronRight size={16} className="text-gray-600 group-hover:text-rose-600 transition shrink-0" />
                        </h1>
                        <div className="text-[10px] text-gray-800 font-bold mt-0.5 flex gap-1">
                            {userData?.travelTags?.length > 0 ? userData.travelTags.slice(0, 2).map((tag, i) => <span key={i} className="bg-white/60 backdrop-blur-sm border border-white/50 px-2 py-0.5 rounded-full shadow-sm break-keep whitespace-nowrap">{tag}</span>) : <span className="text-gray-600 bg-white/50 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm break-keep whitespace-nowrap"><Edit3 size={10} className="shrink-0" /> 프로필 꾸미기</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-gray-900 shrink-0">
                    <button onClick={() => setShowSearchModal(true)} className="bg-white/50 backdrop-blur-md p-2 rounded-full shadow-sm transition hover:bg-white/80"><Search size={20} /></button>
                    <div onClick={() => setShowInboxModal(true)} className="relative bg-white/50 backdrop-blur-md p-2 rounded-full shadow-sm transition hover:bg-white/80 cursor-pointer">
                        <Bell size={20} />
                        {matchRequests.filter(r => r.status === 'pending').length > 0 && (<span className="absolute top-1 right-1 w-2.5 h-2.5 bg-gradient-to-r from-rose-400 to-pink-500 rounded-full border-2 border-white animate-pulse"></span>)}
                    </div>
                </div>
            </header>

            <div className="px-3 pt-2 space-y-6 pb-8">
                <div onClick={() => setShowInboxModal(true)} className="bg-white/60 backdrop-blur-xl border border-rose-200 shadow-lg shadow-rose-500/10 rounded-[20px] p-5 flex items-center justify-between cursor-pointer hover:bg-white/80 transition active:scale-95">
                    <div className="flex items-center gap-4 w-full pr-4 overflow-hidden">
                        <div className="relative shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center text-white shadow-md"><Inbox size={22} strokeWidth={2.5} /></div>
                            {matchRequests.filter(r => r.status === 'pending').length > 0 && (<div className="absolute -top-1 -right-1 bg-gray-900 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{matchRequests.filter(r => r.status === 'pending').length}</div>)}
                        </div>
                        <div className="overflow-hidden"><h3 className="font-black text-gray-900 text-lg mb-0.5 break-keep whitespace-nowrap truncate w-full">내 동행 요청함</h3><p className="text-xs text-gray-600 font-medium break-keep whitespace-nowrap truncate w-full">{matchRequests.filter(r => r.status === 'pending').length > 0 ? `새로운 요청이 도착했어요!` : `아직 주고받은 찌르기가 없어요.`}</p></div>
                    </div>
                    <ChevronRight size={20} className="text-rose-400 shrink-0" />
                </div>

                <section className="mb-8">
                    <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center justify-between break-keep whitespace-nowrap">
                        AI 동행 추천 <button className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 shrink-0">전체보기</button>
                    </h3>
                    <div className="space-y-3">
                        {recommendedMates.length === 0 ? (
                            <div className="bg-white p-8 rounded-[20px] border border-gray-100 shadow-sm text-center">
                                <div className="text-4xl mb-2 opacity-50">👻</div>
                                <p className="text-gray-400 font-bold text-sm break-keep">현재 추천할 만한 동행자가 없어요.</p>
                                <p className="text-gray-400 text-xs mt-1 break-keep">조금만 기다리면 새로운 메이트가 나타날 거예요!</p>
                            </div>
                        ) : (
                            recommendedMates.map((mate, idx) => {
                                const randomMatch = Math.floor(Math.random() * 20) + 80;
                                return (
                                    <div key={mate.id} className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-indigo-100 hover:shadow-md transition">
                                        <div className="flex items-center gap-4 w-full pr-4 overflow-hidden">
                                            <div className="relative shrink-0">
                                                <img src={mate.profileImgBase64 || `https://i.pravatar.cc/150?u=${mate.id}`} alt="avatar" className="w-14 h-14 rounded-full object-cover border-2 border-indigo-50" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="font-bold text-gray-900 text-base break-keep whitespace-nowrap truncate max-w-[100px] sm:max-w-[150px]">{mate.name}</span>
                                                    <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold shrink-0">{randomMatch}% 일치</span>
                                                </div>
                                                <p className="text-xs text-gray-400 font-medium truncate w-full">
                                                    {mate.travelTags && mate.travelTags.length > 0 ? mate.travelTags.join(' · ') : (mate.bio || "새로운 여행자입니다 👋")}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { handleRequestMate(mate); alert(`${mate.name}님에게 동행 신청을 보냈습니다! 💌`); }}
                                            className="bg-gray-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-black active:scale-95 transition flex items-center gap-1 shadow-sm shrink-0 break-keep whitespace-nowrap"
                                        >
                                            <UserPlus size={14} className="shrink-0" /> 신청
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                <section className="pt-4 border-t border-white/40">
                    <div className="flex justify-between items-end mb-6">
                        <h2 className="text-2xl font-black text-gray-900 drop-shadow-sm break-keep whitespace-nowrap">여행자 피드</h2>

                        {/* ✨ [추가] 정렬 필터 버튼 */}
                        <div className="flex gap-2 bg-white/50 p-1 rounded-xl backdrop-blur-md shadow-inner border border-white/60">
                            <button
                                onClick={() => { setFeedSort('latest'); setFeedLimit(5); }}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${feedSort === 'latest' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                최신순
                            </button>
                            <button
                                onClick={() => { setFeedSort('popular'); setFeedLimit(5); }}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${feedSort === 'popular' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-500 hover:text-rose-500'}`}
                            >
                                <Sparkles size={12} /> 인기순
                            </button>
                        </div>
                    </div>

                    <div className="space-y-8 pb-10">
                        {feeds.length === 0 ? (
                            <div className="text-center py-20 text-gray-400"><p className="break-keep">아직 등록된 피드가 없어요.<br />첫 번째 게시글의 주인공이 되어보세요!</p></div>
                        ) : (
                            <>
                                {feeds.map(feed => {
                                    const isLiked = feed.likedBy?.includes(user?.uid);
                                    const isMyFeed = feed.author === (userData?.name || user?.displayName);
                                    return (
                                        <div key={feed.id} className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[32px] overflow-hidden shadow-lg">
                                            {/* 기존 피드 헤더 */}
                                            <div className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3 w-full pr-4 overflow-hidden"><img src={feed.avatar || "https://i.pravatar.cc/150?u=default"} alt="avatar" className="w-11 h-11 rounded-full border-2 border-rose-100 object-cover shrink-0" /><div className="overflow-hidden"><div className="flex items-center gap-2 mb-0.5"><span className="font-bold text-gray-900 text-[15px] truncate max-w-[100px] sm:max-w-[150px]">{feed.author}</span></div><p className="text-[11px] text-gray-500 font-medium break-keep whitespace-nowrap">{feed.createdAt ? new Date(feed.createdAt.seconds * 1000).toLocaleDateString() : '방금 전'}</p></div></div>
                                                {isMyFeed && (
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button onClick={() => openEditFeedModal(feed)} className="text-gray-400 hover:text-indigo-500 p-2 transition" title="피드 수정"><Edit3 size={18} /></button>
                                                        <button onClick={() => handleDeleteFeed(feed)} className="text-gray-400 hover:text-rose-500 p-2 transition" title="피드 삭제"><Trash2 size={18} /></button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 기존 아까 만든 FeedCarousel 사용 */}
                                            <FeedCarousel feed={feed} onClick={() => setViewingFeed(feed)} />

                                            {/* 기존 피드 하단 내용 */}
                                            <div className="p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <button onClick={() => handleToggleLike(feed)} className={`transition-transform active:scale-75 ${isLiked ? 'text-rose-500' : 'text-gray-800'}`}><Heart size={28} className={isLiked ? "fill-rose-500" : ""} /></button>
                                                        <button onClick={() => openCommentModal(feed)} className="text-gray-800 hover:text-gray-500 transition relative">
                                                            <MessageCircleIcon size={28} />
                                                            {feed.commentCount > 0 && <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{feed.commentCount}</span>}
                                                        </button>
                                                    </div>
                                                    <button onClick={() => handleForkClick(feed)} disabled={isSaving} className="bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white px-4 py-2.5 rounded-2xl text-[12px] font-black transition-all active:scale-95 flex items-center gap-1.5 shadow-sm shrink-0 break-keep whitespace-nowrap"><Download size={16} className="shrink-0" /> 일정 가져오기 ({feed.forks || 0})</button>
                                                </div>
                                                <p className="font-bold text-sm text-gray-900 mb-2 break-keep whitespace-nowrap">좋아요 {(feed.likes || 0).toLocaleString()}개</p>
                                                <p className="text-[14px] text-gray-800 leading-relaxed break-keep"><span className="font-black mr-2 text-gray-900">{feed.author}</span>{feed.title}</p>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* ✨ [추가] 수동 무한 스크롤 (더보기 버튼) */}
                                {feeds.length >= feedLimit && (
                                    <div className="pt-4 flex justify-center">
                                        <button
                                            onClick={() => setFeedLimit(prev => prev + 5)}
                                            className="bg-white border border-gray-200 text-gray-600 font-bold text-sm px-6 py-3 rounded-full shadow-sm hover:bg-gray-50 active:scale-95 transition flex items-center gap-2"
                                        >
                                            <Loader2 size={16} className="text-gray-400" /> 피드 5개 더 보기
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );

    const renderWallet = () => {
        const getFundingAdvice = () => {
            const upcomingTrips = itineraries.map(t => ({ ...t, daysLeft: calculateDDayNum(t.startDate) })).filter(t => t.daysLeft > 0).sort((a, b) => a.daysLeft - b.daysLeft);
            const nearestTrip = upcomingTrips[0];
            if (!nearestTrip) return { title: "새로운 여행 목표를 세워볼까요?", message: "AI가 예산을 계산하고 저축 플랜을 짜드릴게요.", action: "여행 만들기" };
            const people = nearestTrip.membersInfo?.length || 1;
            const targetTotal = nearestTrip.targetDepositPerPerson ? nearestTrip.targetDepositPerPerson * people : parseCost(nearestTrip.estimatedCost);
            const dailySave = Math.ceil(targetTotal / nearestTrip.daysLeft);
            if (people > 1) { return { title: `✨ ${nearestTrip.destination} 모임통장 제안`, message: `D-${nearestTrip.daysLeft} 남았어요! ${people}명이서 한 달에 ${Math.floor(dailySave * 30 / people).toLocaleString()}원씩 모으면 충분해요.`, action: "모임통장 관리하기", isGroup: true, trip: nearestTrip }; }
            return { title: `✨ ${nearestTrip.destination} 펀딩 목표`, message: `D-${nearestTrip.daysLeft} 남았어요! 오늘부터 하루 ${dailySave.toLocaleString()}원씩 저축하면 완벽해요.`, action: "여행 지갑 관리", isGroup: false, trip: nearestTrip };
        };
        const advice = getFundingAdvice();
        const pendingDeposits = matchRequests.filter(r => r.type === 'deposit_request' && r.status === 'pending');

        return (
            <div className="animate-in fade-in duration-500 pb-10">
                <header className="flex justify-between items-center px-3 pt-12 pb-4 sticky top-0 z-40 bg-gradient-to-b from-gray-50 to-transparent backdrop-blur-md">
                    <div className="flex items-center gap-2 shrink-0"><div className="w-10 h-10 bg-gradient-to-br from-indigo-800 to-purple-900 rounded-[14px] flex items-center justify-center text-white shadow-lg shrink-0"><Wallet size={20} /></div><h1 className="text-xl font-black text-gray-900 tracking-tight break-keep whitespace-nowrap">Trip Money</h1></div>
                    <div className="flex items-center gap-3 text-gray-900 shrink-0"><button className="bg-white/50 backdrop-blur-md p-2 rounded-full shadow-sm transition hover:bg-white/80"><Search size={20} /></button><div className="relative bg-white/50 backdrop-blur-md p-2 rounded-full shadow-sm transition hover:bg-white/80 cursor-pointer" onClick={() => alert("현재 엔화(JPY) 환율이 많이 내렸어요! 📉")}><BellRing size={20} className="text-indigo-600 animate-pulse" /><span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span></div></div>
                </header>

                <div className="px-3 pt-4 space-y-6">
                    {/* ✨ 미납 정산금(N빵) 알림 배너 */}
                    {pendingDeposits.map(req => (
                        <div key={req.id} className="bg-rose-50 border border-rose-100 rounded-[20px] p-5 flex items-center justify-between shadow-sm animate-pulse mb-4">
                            <div className="flex items-center gap-3 overflow-hidden mr-2">
                                <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-200">
                                    <AlertCircle size={20} />
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="text-[13px] font-black text-rose-900 leading-tight">정산금 미납 알림 🚨</h4>
                                    <p className="text-[11px] text-rose-700 font-bold leading-normal truncate">{req.destination}: {req.amount?.toLocaleString()}원</p>
                                </div>
                            </div>
                            <button onClick={() => handlePayDeposit(req)} className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 shrink-0 flex items-center gap-1.5">
                                <Wallet size={14} className="shrink-0" /> 바로 송금
                            </button>
                        </div>
                    ))}
                    <div className="flex justify-between items-end mb-2 px-1"><h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest break-keep whitespace-nowrap">Total Assets</h3></div>
                    <GlassCard className="p-6 bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                        <div className="relative z-10">
                            <p className="text-gray-300 text-sm font-bold mb-1 break-keep">여행을 위해 모은 돈 (전체 지갑)</p>
                            <div className="flex items-end gap-2 mb-6">
                                <h2 className="text-4xl font-black tracking-tighter truncate max-w-[200px] sm:max-w-[300px]">{currentAsset.toLocaleString()}</h2>
                                <span className="text-lg font-bold text-gray-400 mb-1 shrink-0">원</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={openAssetModal} className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold backdrop-blur-md transition flex items-center justify-center gap-1.5 break-keep whitespace-nowrap"><PiggyBank size={16} className="shrink-0" /> 채우기</button>
                                <button onClick={() => setShowAssetHistoryModal(true)} className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold backdrop-blur-md transition flex items-center justify-center gap-1.5 break-keep whitespace-nowrap"><History size={16} className="shrink-0" /> 입출 내역</button>
                            </div>
                        </div>
                    </GlassCard>

                    <div className="bg-indigo-50 border border-indigo-100 rounded-[20px] p-5 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 text-indigo-100 opacity-50"><BrainCircuit size={100} /></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-1.5 mb-2"><Sparkles size={16} className="text-indigo-600 shrink-0" /><span className="text-xs font-black text-indigo-600 tracking-wider break-keep whitespace-nowrap">AI FUNDING COACH</span></div>
                            <h3 className="text-lg font-black text-gray-900 leading-tight mb-1 break-keep">{advice.title}</h3>
                            <p className="text-sm text-gray-600 font-medium leading-relaxed mb-4 break-keep">{advice.message}</p>
                            <button onClick={() => { if (advice.trip) { setSelectedTrip(advice.trip); setShowGroupManageModal(true); } }} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 break-keep whitespace-nowrap">
                                {advice.isGroup ? <Users size={18} className="shrink-0" /> : <TrendingDown size={18} className="shrink-0" />} {advice.action}
                            </button>
                        </div>
                    </div>

                    <section>
                        <div className="flex justify-between items-end mb-4 px-1"><h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest break-keep whitespace-nowrap">My Travel Funds</h3></div>
                        <div className="space-y-4">
                            {itineraries.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 bg-white/50 rounded-2xl border border-dashed border-gray-300"><ShoppingBag size={32} className="mx-auto mb-2 opacity-50" /><p className="text-sm break-keep">목표로 할 여행이 없어요.</p></div>
                            ) : (
                                    itineraries.map((trip) => {
                                        const actualMembers = trip.membersInfo || [{ avatar: user?.photoURL || "https://i.pravatar.cc/150", name: user?.displayName || "나" }];
                                        const isGroup = actualMembers.length > 1;
                                        const isHost = trip.hostId === user?.uid;
                                        const targetCost = trip.targetTotalCost || parseCost(trip.estimatedCost) || 0;
                                        const savedAmount = trip.tripWalletBalance || 0;
                                        const percent = targetCost > 0 ? Math.min(Math.floor((savedAmount / targetCost) * 100), 100) : 0;
                                        const dDay = calculateDDay(trip.startDate);
                                        const dDayNum = calculateDDayNum(trip.startDate);
                                        
                                        // ✨ 상태 메시지 로직
                                        let statusMsg = "여행 계획을 세워보세요! 🌱";
                                        if (percent >= 100) statusMsg = "축하해요! 목표 달성! 🎉 코앞으로 다가온 여행!";
                                        else if (percent >= 80) statusMsg = "거의 다 왔어요! 조금만 더! 🔥";
                                        else if (percent >= 50) statusMsg = "절반이나 모았어요! 대단해요! 👍";
                                        else if (percent > 0) statusMsg = "차곡차곡 모으는 중이에요! 💪";

                                        return (
                                            <GlassCard key={trip.id} className="p-6 flex flex-col group transition-all hover:ring-2 hover:ring-indigo-400/30 hover:shadow-2xl relative overflow-hidden backdrop-blur-3xl border-white/40 mb-4">
                                                {/* ✨ 상단 장식 오버레이 */}
                                                <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 transition-all group-hover:opacity-40 ${isGroup ? 'bg-rose-400' : 'bg-indigo-400'}`}></div>
                                                
                                                <div className="flex justify-between items-start mb-5 relative z-10">
                                                    <div className="flex items-center gap-4 w-full pr-4 overflow-hidden">
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl shrink-0 transform transition-transform group-hover:scale-110 group-hover:rotate-3 ${isGroup ? 'bg-linear-to-br from-rose-500 to-rose-400 shadow-rose-200' : 'bg-linear-to-br from-indigo-600 to-indigo-400 shadow-indigo-200'}`}>
                                                            {isGroup ? <Users size={28} strokeWidth={2.5} /> : <Plane size={28} strokeWidth={2.5} />}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                                <h4 className="font-black text-gray-900 text-xl tracking-tight truncate max-w-[150px]">{trip.destination || "여행"}</h4>
                                                                <div className="flex gap-1.5">
                                                                    {isGroup && <span className="bg-rose-50 text-rose-500 text-[10px] font-black px-2.5 py-1 rounded-full border border-rose-100 uppercase tracking-tighter">Group</span>}
                                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-tighter shadow-xs ${dDayNum <= 7 ? 'bg-rose-500 text-white border-rose-400 animate-pulse' : 'bg-gray-900 text-white border-gray-800'}`}>
                                                                        {dDay}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 cursor-help">
                                                                <Target size={12} className="text-gray-400" />
                                                                <p className="text-[11px] text-gray-500 font-bold tracking-tight">목표: <span className="text-gray-900">{targetCost.toLocaleString()}원</span></p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => { setSelectedTrip(trip); setShowGroupManageModal(true); }} className="w-10 h-10 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shrink-0"><ChevronRight size={20} strokeWidth={3} /></button>
                                                </div>

                                                <div className="bg-white/40 backdrop-blur-md rounded-[24px] p-5 border border-white/60 shadow-inner relative z-10">
                                                    <div className="flex justify-between items-end text-xs font-black mb-3">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-gray-400 text-[10px] uppercase tracking-widest">Available Balance</span>
                                                            <span className={`text-lg font-black tracking-tight ${isGroup ? "text-rose-500" : "text-indigo-600"}`}>{savedAmount.toLocaleString()}원</span>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-0.5">
                                                            <span className="text-gray-400 text-[10px] uppercase tracking-widest">Progress</span>
                                                            <span className="text-gray-900 text-sm">{percent}%</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="h-3 w-full bg-gray-200/50 rounded-full overflow-hidden mb-4 p-0.5 border border-gray-100">
                                                        <div className={`h-full rounded-full transition-all duration-1000 ease-out relative ${isGroup ? "bg-linear-to-r from-rose-500 to-rose-300" : "bg-linear-to-r from-indigo-600 to-indigo-400"}`} style={{ width: `${percent}%` }}>
                                                            {percent > 5 && <div className="absolute top-0 right-0 w-4 h-full bg-white/30 blur-xs"></div>}
                                                        </div>
                                                    </div>

                                                    <p className={`text-[10px] font-bold mb-4 flex items-center gap-1 ${percent >= 100 ? 'text-emerald-600' : 'text-gray-500'}`}>
                                                        {percent >= 100 ? <CheckCircle size={12} /> : <Sparkles size={12} className="text-amber-400" />}
                                                        {statusMsg}
                                                    </p>

                                                    {isGroup && (
                                                        <div className="flex items-center justify-between mt-1 pt-4 border-t border-gray-100/50">
                                                            <div className="flex -space-x-2.5 shrink-0">
                                                                {actualMembers.slice(0, 4).map((m, i) => (
                                                                    <div key={i} className="relative group/avatar">
                                                                        <img src={m.avatar} alt="member" title={m.name} className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm transition-transform group-hover/avatar:-translate-y-1" />
                                                                    </div>
                                                                ))}
                                                                {actualMembers.length > 4 && (
                                                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-900 flex items-center justify-center text-[10px] font-black text-white shadow-sm">+{actualMembers.length - 4}</div>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => openBudgetModal(trip)} className="text-[11px] font-black bg-white border border-gray-200 text-gray-800 px-3.5 py-2.5 rounded-xl shadow-xs hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-1.5 break-keep whitespace-nowrap">
                                                                    <Plus size={14} className="text-rose-500 shrink-0" /> 지출 추가
                                                                </button>
                                                                <button onClick={() => { setSelectedTrip(trip); setShowGroupManageModal(true); }} className={`text-[11px] font-black px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 ${isHost ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200' : 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 shadow-gray-100'}`}>
                                                                    {isHost ? <><Settings size={14} className="shrink-0" /> 관리</> : <><Wallet size={14} className="shrink-0" /> 입금</>}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {!isGroup && (
                                                        <div className="mt-1 pt-4 border-t border-gray-100/50 flex justify-end gap-2">
                                                            <button onClick={() => openBudgetModal(trip)} className="text-[11px] font-black bg-white border border-gray-200 text-gray-800 px-3.5 py-2.5 rounded-xl shadow-xs hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-1.5 break-keep whitespace-nowrap">
                                                                <Plus size={14} className="text-indigo-500 shrink-0" /> 지출 추가
                                                            </button>
                                                            <button onClick={() => { setSelectedTrip(trip); setShowGroupManageModal(true); }} className="text-[11px] font-black bg-gray-900 text-white px-5 py-2.5 rounded-xl shadow-xl hover:bg-black transition-all active:scale-95 flex items-center gap-2">
                                                                <Wallet size={14} className="shrink-0 text-indigo-400" /> 지갑 관리
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </GlassCard>
                                        );
                                    })
                            )}
                        </div>
                    </section>

                    <section className="mb-6">
                        <div className="flex justify-between items-end mb-4 px-1">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest break-keep whitespace-nowrap">Trip Points</h3>
                        </div>
                        <GlassCard className="p-5 bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white relative overflow-hidden group shadow-lg shadow-purple-500/20">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl"></div>
                            <div className="relative z-10">
                                <p className="text-purple-100 text-xs font-bold mb-1 flex items-center gap-1.5 break-keep whitespace-nowrap"><Gem size={14} className="shrink-0" /> 내 트립 포인트</p>
                                <div className="flex items-end gap-2 mb-6">
                                    <h2 className="text-3xl font-black tracking-tighter truncate max-w-[200px] sm:max-w-[300px]">{(userData?.points || 0).toLocaleString()}</h2>
                                    <span className="text-sm font-bold text-purple-200 mb-1 shrink-0">P</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowExchangeModal(true)} className="flex-[1.2] py-4 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold backdrop-blur-md transition flex flex-col items-center justify-center gap-2 shadow-sm break-keep whitespace-nowrap">
                                        <Banknote size={24} className="shrink-0" /> 환전하기
                                    </button>
                                    <div className="flex-1 flex flex-col gap-2">
                                        <button 
                                            onClick={handleOpenQuiz} 
                                            disabled={isQuizLoading}
                                            className="flex-1 py-2.5 bg-white hover:bg-white/90 text-purple-600 rounded-xl text-[13px] font-bold shadow-md transition flex items-center justify-center gap-1.5 break-keep whitespace-nowrap"
                                        >
                                            {isQuizLoading ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} className="shrink-0 text-purple-600" />} 퀴즈 풀기
                                        </button>
                                        <button onClick={() => setShowPointModal(true)} className="flex-1 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-[13px] font-bold backdrop-blur-md transition flex items-center justify-center gap-1.5 shadow-sm break-keep whitespace-nowrap">
                                            <History size={14} className="shrink-0" /> 적립 내역
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </section>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen relative font-sans selection:bg-rose-100 overflow-x-hidden flex justify-center">
            <div className="fixed inset-0 z-[-2]"><img src={BACKGROUND_IMAGE} alt="background" className="w-full h-full object-cover" /></div>
            <div className="fixed inset-0 z-[-1] bg-white/40 backdrop-blur-[20px]"></div>

            {/* ✨ 메인 래퍼 박스 확장 (w-full max-w-[500px])-->max-w-[560px] */}
            <div className="w-full max-w-[560px] h-full relative bg-white/60 shadow-2xl overflow-hidden flex flex-col">
                <div className="pb-32 flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'schedule' && renderSchedule()}
                    {activeTab === 'social' && renderSocial()}
                    {activeTab === 'wallet' && renderWallet()}
                    {activeTab === 'vault' && renderVault()}
                </div>

                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[570px] px-6 z-50">
                    <nav className="bg-white/70 backdrop-blur-2xl border border-white/50 shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-[32px] px-2 py-2.5 flex justify-around items-center">
                        <button onClick={() => router.push('/?mode=new')} className="flex flex-col items-center gap-1 p-2 w-[70px] text-gray-500 hover:text-rose-600 transition"><HomeIcon size={24} strokeWidth={2} /><span className="text-[10px] font-bold break-keep whitespace-nowrap">홈</span></button>
                        <button onClick={() => setActiveTab('social')} className={`flex flex-col items-center gap-1 p-2 w-[70px] transition ${activeTab === 'social' ? 'text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-500 scale-110' : 'text-gray-500 hover:text-rose-600'}`}><Users size={24} strokeWidth={activeTab === 'social' ? 2.5 : 2} className={activeTab === 'social' ? 'text-rose-500' : ''} /><span className="text-[10px] font-bold break-keep whitespace-nowrap">동행</span></button>
                        <button onClick={() => setActiveTab('schedule')} className={`flex flex-col items-center gap-1 p-2 w-[70px] transition ${activeTab === 'schedule' ? 'text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-500 scale-110' : 'text-gray-500 hover:text-rose-600'}`}><Calendar size={24} strokeWidth={activeTab === 'schedule' ? 2.5 : 2} className={activeTab === 'schedule' ? 'text-rose-500' : ''} /><span className="text-[10px] font-bold break-keep whitespace-nowrap">일정</span></button>
                        <button onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center gap-1 p-2 w-[70px] transition ${activeTab === 'wallet' ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 scale-110' : 'text-gray-500 hover:text-indigo-600'}`}><Wallet size={24} strokeWidth={activeTab === 'wallet' ? 2.5 : 2} className={activeTab === 'wallet' ? 'text-indigo-500' : ''} /><span className="text-[10px] font-bold break-keep whitespace-nowrap">트립머니</span></button>
                        <button onClick={() => setActiveTab('vault')} className={`flex flex-col items-center gap-1 p-2 w-[70px] transition ${activeTab === 'vault' ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500 scale-110' : 'text-gray-500 hover:text-emerald-600'}`}><Box size={24} strokeWidth={activeTab === 'vault' ? 2.5 : 2} className={activeTab === 'vault' ? 'text-emerald-500' : ''} /><span className="text-[10px] font-bold break-keep whitespace-nowrap">보관함</span></button>
                    </nav>
                </div>
            </div>

            {/* 내 개인 자산 입출 내역 모달 */}
            {showAssetHistoryModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowAssetHistoryModal(false)}></div>
                    <div className="bg-white/90 backdrop-blur-2xl border border-white/60 w-full max-w-md h-[80vh] rounded-t-[40px] sm:rounded-[40px] p-8 pb-safe relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 break-keep whitespace-nowrap"><History className="text-indigo-500" /> 입출금 내역</h3>
                            <button onClick={() => setShowAssetHistoryModal(false)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition shrink-0"><X size={20} strokeWidth={2.5} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {pointHistory.length === 0 ? (
                                <div className="text-center py-20 text-gray-400"><p className="break-keep whitespace-nowrap">최근 입출금 내역이 없습니다.</p></div>
                            ) : (
                                <div className="space-y-3">
                                    {pointHistory.map((item) => {
                                        const isPositive = item.amount > 0;
                                        return (
                                            <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-[20px] border border-gray-100 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPositive ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'}`}>
                                                        <Receipt size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm break-keep whitespace-nowrap">{item.reason}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold break-keep whitespace-nowrap">{item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : "방금"}</p>
                                                    </div>
                                                </div>
                                                <span className={`font-black shrink-0 break-keep whitespace-nowrap ${isPositive ? 'text-indigo-600' : 'text-rose-500'}`}>
                                                    {isPositive ? '+' : ''}{item.amount.toLocaleString()} 원
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 모임통장(여행 지갑) 관리 모달 */}
            {showGroupManageModal && selectedTrip && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowGroupManageModal(false)}></div>
                    <div className="bg-white/90 backdrop-blur-2xl border border-white/60 w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-0 pb-safe relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl h-[90vh] flex flex-col overflow-hidden">
                        <div className="bg-gradient-to-br from-indigo-900 to-gray-900 p-6 pt-10 text-white shrink-0 relative">
                            <button onClick={() => setShowGroupManageModal(false)} className="absolute top-6 right-6 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition shrink-0"><X size={18} strokeWidth={2.5} /></button>
                            <span className="bg-indigo-500 text-[10px] font-bold px-2 py-1 rounded mb-2 inline-block break-keep whitespace-nowrap">Trip Wallet</span>
                            <h3 className="text-2xl font-black mb-6 break-keep">{selectedTrip.destination || "여행"}</h3>
                            <p className="text-xs text-gray-300 mb-1 break-keep whitespace-nowrap">모임통장 잔고 (KRW)</p>
                            <div className="flex items-end gap-2 mb-4">
                                <h2 className="text-4xl font-black tracking-tighter truncate max-w-[200px] sm:max-w-[300px]">{(selectedTrip.tripWalletBalance || 0).toLocaleString()}</h2>
                                <span className="text-base font-bold text-gray-400 mb-1 shrink-0">원</span>
                            </div>
                            {selectedTrip.foreignWallets && Object.keys(selectedTrip.foreignWallets).length > 0 && (
                                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                                    {Object.entries(selectedTrip.foreignWallets).map(([cur, amt]) => {
                                        if (amt <= 0) return null;
                                        return (
                                            <div key={cur} className="bg-white/10 p-3 rounded-xl min-w-[100px] border border-white/10 backdrop-blur-md shrink-0">
                                                <p className="text-[10px] text-gray-400 font-bold mb-1 break-keep whitespace-nowrap">{cur}</p>
                                                <p className="font-bold truncate w-full">{amt.toLocaleString()}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50 space-y-6">
                            <section>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-black text-gray-900 text-base break-keep whitespace-nowrap">멤버 입금 현황</h4>
                                    {selectedTrip.hostId === user?.uid && <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-1 rounded font-bold shrink-0 break-keep whitespace-nowrap">내가 방장 👑</span>}
                                </div>
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
                                    {selectedTrip.hostId === user?.uid && (
                                        <div className="flex gap-2 mb-4 pb-4 border-b border-gray-100 flex-col">
                                            <div className="flex gap-2 w-full items-end">
                                                <div className="flex-1">
                                                    <p className="text-[10px] text-gray-500 font-bold mb-1 break-keep whitespace-nowrap">총 여행 경비 설정 (현재: {(selectedTrip.targetTotalCost || parseCost(selectedTrip.estimatedCost) || 0).toLocaleString()}원)</p>
                                                    <input type="number" value={targetTotalCostInput} onChange={e => setTargetTotalCostInput(e.target.value)} placeholder="총 모금할 금액 입력" className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm font-bold outline-none" />
                                                </div>
                                                <button onClick={handleSetTargetCost} className="bg-gray-900 text-white font-bold text-xs px-4 py-2 rounded-lg active:scale-95 transition h-[36px] shrink-0 break-keep whitespace-nowrap">수정</button>
                                            </div>
                                            {(selectedTrip.targetTotalCost || parseCost(selectedTrip.estimatedCost)) > 0 && (
                                                <button onClick={handleRequestDeposit} className="w-full mt-2 bg-rose-50 text-rose-600 font-bold text-xs py-3 rounded-lg flex items-center justify-center gap-1.5 hover:bg-rose-100 active:scale-95 transition border border-rose-100 break-keep whitespace-nowrap">
                                                    <BellRing size={14} className="shrink-0" /> {Math.ceil((selectedTrip.targetTotalCost || parseCost(selectedTrip.estimatedCost)) / (selectedTrip.membersInfo?.length || 1)).toLocaleString()}원씩 N빵 입금 알림 보내기
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {(selectedTrip.membersInfo || []).map(m => {
                                        const deposited = selectedTrip.depositStatus?.[m.uid] || 0;
                                        const target = selectedTrip.targetDepositPerPerson || 0;
                                        const isComplete = target > 0 && deposited >= target;
                                        return (
                                            <div key={m.uid} className="flex justify-between items-center">
                                                <div className="flex items-center gap-3 w-full pr-4 overflow-hidden">
                                                    <img src={m.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0" />
                                                    <div className="overflow-hidden">
                                                        <p className="font-bold text-sm text-gray-900 truncate w-full break-keep whitespace-nowrap">{m.name} {m.uid === user?.uid && "(나)"}</p>
                                                        {target > 0 && <p className="text-[10px] text-gray-400 break-keep whitespace-nowrap">목표: {target.toLocaleString()}원</p>}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className={`font-black text-sm break-keep whitespace-nowrap ${isComplete ? 'text-emerald-500' : 'text-gray-900'}`}>{deposited.toLocaleString()}원</p>
                                                    {isComplete && <span className="text-[9px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-bold break-keep whitespace-nowrap">완료</span>}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="flex items-center justify-between gap-2 mb-4 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                                            <div className="text-center flex-1">
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">내 지갑</p>
                                                <p className="text-sm font-black text-gray-900 truncate">{currentAsset.toLocaleString()}원</p>
                                            </div>
                                            <div className="flex flex-col items-center justify-center text-indigo-500 animate-pulse shrink-0 px-2">
                                                <ArrowRight size={16} strokeWidth={3} className="rotate-90 sm:rotate-0" />
                                                <span className="text-[8px] font-black text-indigo-600 mt-0.5">송금</span>
                                            </div>
                                            <div className="text-center flex-1">
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">모임 통장</p>
                                                <p className="text-sm font-black text-indigo-600 truncate">{(selectedTrip.tripWalletBalance || 0).toLocaleString()}원</p>
                                            </div>
                                        </div>
                                        <div className="relative flex items-center w-full">
                                            <input 
                                                type="number" 
                                                value={myDepositInput} 
                                                onChange={e => setMyDepositInput(e.target.value)} 
                                                placeholder="입금할 금액 입력" 
                                                className="w-full bg-gray-50 border border-gray-200 pl-4 pr-16 py-3.5 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition" 
                                            />
                                            <button 
                                                onClick={handleDepositToTrip} 
                                                className="absolute right-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-lg shadow-md active:scale-95 transition shrink-0 break-keep whitespace-nowrap"
                                            >
                                                입금
                                            </button>
                                        </div>
                                    </div>
                                </div>
                             </section>

                             {selectedTrip.hostId === user?.uid && (
                                 <section>
                                     <h4 className="font-black text-gray-900 text-base mb-3 flex items-center gap-1 break-keep whitespace-nowrap"><RefreshCw size={16} className="text-indigo-500 shrink-0" /> 여행 자금 환전 (방장)</h4>
                                     <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                         <div className="flex gap-2 mb-3">
                                             {['JPY', 'USD', 'EUR'].map(c => (
                                                 <button key={c} onClick={() => setTripExchangeCurrency(c)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition break-keep whitespace-nowrap ${tripExchangeCurrency === c ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-gray-50 text-gray-500'}`}>{c}</button>
                                             ))}
                                         </div>
                                         <div className="relative flex items-center w-full">
                                             <input 
                                                 type="number" 
                                                 value={tripExchangeAmount} 
                                                 onChange={e => setTripExchangeAmount(e.target.value)} 
                                                 placeholder={`${tripExchangeCurrency} 금액 입력`} 
                                                 className="w-full bg-gray-50 border border-gray-200 pl-4 pr-16 py-3.5 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition" 
                                             />
                                             <button 
                                                 onClick={handleTripExchange} 
                                                 className="absolute right-2 px-4 py-2 bg-gray-900 hover:bg-slate-800 text-white font-black text-xs rounded-lg shadow-md active:scale-95 transition shrink-0 break-keep whitespace-nowrap"
                                             >
                                                 환전
                                             </button>
                                         </div>
                                        {tripExchangeAmount > 0 && (
                                            <p className="text-[10px] text-rose-500 font-bold mt-2 text-right break-keep whitespace-nowrap">모임통장에서 -{Math.floor(tripExchangeAmount * CURRENCY_RATES[tripExchangeCurrency]).toLocaleString()} KRW 차감</p>
                                        )}
                                    </div>
                                </section>
                            )}

                            <button onClick={() => { setShowGroupManageModal(false); openBudgetModal(selectedTrip); }} className="w-full bg-white border border-gray-200 text-gray-900 font-bold py-4 rounded-2xl shadow-sm hover:bg-gray-50 transition flex items-center justify-center gap-2 mb-3 break-keep whitespace-nowrap">
                                <Receipt size={18} className="shrink-0" /> 이 여행의 상세 지출(가계부) 보기
                            </button>

                            <button onClick={(e) => { setShowGroupManageModal(false); handleDeleteTrip(e, selectedTrip.id, selectedTrip.destination || "여행"); }} className="w-full bg-rose-50 border border-rose-100 text-rose-500 font-bold py-4 rounded-2xl shadow-sm hover:bg-rose-100 transition flex items-center justify-center gap-2 break-keep whitespace-nowrap">
                                <Trash2 size={18} className="shrink-0" /> 이 일정 삭제하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Inbox Modal */}
            {showInboxModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowInboxModal(false)}></div>
                    <div className="bg-white/90 backdrop-blur-2xl border border-white/60 w-full max-w-md h-[85vh] sm:h-[600px] rounded-t-[40px] sm:rounded-[40px] p-8 flex flex-col relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 break-keep whitespace-nowrap"><Inbox size={24} className="text-rose-500" /> 내 동행 요청함</h3>
                            <button onClick={() => setShowInboxModal(false)} className="w-10 h-10 bg-gray-200/50 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition shrink-0"><X size={20} strokeWidth={2.5} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                            {matchRequests.length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center text-center text-gray-400">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300"><Inbox size={40} /></div>
                                    <p className="font-bold text-lg mb-1 text-gray-500 break-keep whitespace-nowrap">아직 요청 내역이 없어요</p>
                                    <p className="text-sm break-keep">마음에 드는 메이트에게 동행을 신청해보세요!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {matchRequests.map(req => {
                                        const isSender = req.senderId === user?.uid;
                                        const isWorkspaceInvite = req.type === "workspace_invite";
                                        const isAlreadyJoined = isWorkspaceInvite && itineraries.some(t => t.id === req.tripId);
                                        const isAccepted = req.status === 'accepted' || isAlreadyJoined;
                                        const isRejected = req.status === 'rejected';
                                        const isCompleted = isAccepted || isRejected;

                                        return (
                                            <div key={req.id} className={`border rounded-[20px] p-5 shadow-sm transition-all ${isCompleted ? 'bg-gray-100 border-gray-200 opacity-80' : 'bg-white/80 border-rose-100'}`}>
                                                <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-3">
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md break-keep whitespace-nowrap ${isCompleted ? 'bg-gray-200 text-gray-500' : (isWorkspaceInvite && !isSender ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600')}`}>
                                                        {isSender ? '내가 보낸 요청' : (isWorkspaceInvite ? '초대장 도착! 💌' : '받은 요청')}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-medium break-keep whitespace-nowrap">{req.createdAt ? new Date(req.createdAt.seconds * 1000).toLocaleDateString() : '방금 전'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 mb-4 w-full overflow-hidden">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-gray-600 font-black text-lg border-2 border-white shadow-sm overflow-hidden shrink-0">
                                                        {isSender ? (req.targetMateName?.[0] || "?") : (req.senderName?.[0] || "?")}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <h4 className={`font-bold text-base truncate w-full break-keep whitespace-nowrap ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>{isSender ? `${req.targetMateName} 님에게` : `${req.senderName} 님이 나에게`}</h4>
                                                        <p className="text-xs text-gray-500 font-medium truncate w-full break-keep whitespace-nowrap"><MapPin size={10} className="inline mr-0.5 text-gray-400" />{req.destination}</p>
                                                    </div>
                                                </div>
                                                <div className={`p-3 rounded-xl border text-xs font-medium mb-4 italic break-keep ${isCompleted ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                                                    "{req.message}"
                                                </div>
                                                <div className="flex gap-2">
                                                    {isCompleted ? (
                                                        <>
                                                            <div className="flex-1 bg-gray-200 text-gray-500 py-3 rounded-xl text-xs font-bold cursor-default flex items-center justify-center gap-1 break-keep whitespace-nowrap">
                                                                {isAccepted ? <><Check size={14} className="shrink-0" /> {req.type === 'deposit_request' ? '송금 완료' : '수락 완료'}</> : <><X size={14} className="shrink-0" /> 거절됨</>}
                                                            </div>
                                                            <button onClick={() => handleDeleteRequest(req.id)} className="bg-gray-200 text-gray-500 px-4 py-3 rounded-xl hover:bg-rose-100 hover:text-rose-500 transition active:scale-95 shrink-0" title="내역 삭제">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    ) : isSender ? (
                                                        <>
                                                            <button onClick={() => handleDeleteRequest(req.id)} className="flex-1 bg-white border border-gray-200 text-gray-500 py-3 rounded-xl text-xs font-bold hover:bg-gray-50 transition active:scale-95 break-keep whitespace-nowrap">요청 취소</button>
                                                            <button className="flex-1 bg-gray-50 text-gray-400 py-3 rounded-xl text-xs font-bold cursor-default flex items-center justify-center gap-1 break-keep whitespace-nowrap"><Loader2 size={12} className="animate-spin shrink-0" /> 대기중</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => handleRejectRequest(req.id)} className="flex-1 bg-white border border-gray-200 text-gray-500 py-3 rounded-xl text-xs font-bold hover:bg-gray-50 transition active:scale-95 break-keep whitespace-nowrap">거절하기</button>
                                                            {req.type === "workspace_invite" ? (
                                                                <button onClick={() => router.push(`/join/${req.tripId}`)} className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-3 rounded-xl text-xs font-bold shadow-md hover:from-indigo-600 hover:to-violet-700 transition active:scale-95 break-keep whitespace-nowrap">초대장 열기</button>
                                                            ) : req.type === "deposit_request" ? (
                                                                <button onClick={() => handlePayDeposit(req)} className="flex-1 bg-gray-900 text-white py-3 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 hover:bg-black transition active:scale-95 break-keep whitespace-nowrap"><Wallet size={14} className="shrink-0" /> {req.amount?.toLocaleString()}원 송금하기</button>
                                                            ) : (
                                                                <button onClick={() => handleAcceptRequest(req.id)} className="flex-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white py-3 rounded-xl text-xs font-bold shadow-md hover:from-rose-600 hover:to-pink-700 transition active:scale-95 break-keep whitespace-nowrap">수락 및 채팅</button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 워크스페이스 초대 모달 */}
            {showInviteModal && inviteTrip && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowInviteModal(false)}></div>
                    <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 pb-safe relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl flex flex-col h-[85vh] sm:h-auto">
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 break-keep whitespace-nowrap"><UserPlus className="text-indigo-500" /> 동행자 초대</h3>
                            <button onClick={() => setShowInviteModal(false)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition shrink-0"><X size={20} strokeWidth={2.5} /></button>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-[20px] p-4 mb-6 flex items-center gap-4 shadow-inner shrink-0">
                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 shrink-0"><Plane size={24} /></div>
                            <div className="overflow-hidden w-full">
                                <p className="text-xs font-bold text-gray-400 mb-0.5 break-keep whitespace-nowrap">이 여행에 초대합니다</p>
                                <h4 className="font-black text-gray-900 leading-tight truncate w-full break-keep whitespace-nowrap">{inviteTrip.destination || inviteTrip.title}</h4>
                            </div>
                        </div>
                        <form onSubmit={handleInviteSearch} className="relative mb-6 shrink-0">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-400"><Search size={20} strokeWidth={2.5} /></div>
                            <input type="text" value={inviteSearchQuery} onChange={(e) => setInviteSearchQuery(e.target.value)} placeholder="정확한 이름 또는 이메일 검색" className="w-full bg-white border border-gray-200 text-gray-900 placeholder-gray-400 font-bold text-[15px] rounded-[20px] py-4 pl-14 pr-5 outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm" autoFocus />
                        </form>
                        <div className="flex-1 min-h-[160px] overflow-y-auto custom-scrollbar pb-4">
                            {inviteSearchStatus === 'idle' && (
                                <div className="text-center py-10 flex flex-col items-center justify-center text-gray-400">
                                    <Users size={32} className="mb-3 opacity-50" />
                                    <p className="font-bold text-sm break-keep whitespace-nowrap">트립메이커를 함께 쓰는 친구를 찾아보세요!</p>
                                </div>
                            )}
                            {inviteSearchStatus === 'loading' && (
                                <div className="flex flex-col items-center justify-center py-12 text-indigo-500"><Loader2 className="animate-spin mb-3" size={32} /><p className="font-bold text-sm break-keep whitespace-nowrap">회원 검색 중...</p></div>
                            )}
                            {inviteSearchStatus === 'result' && (
                                <div className="animate-in fade-in duration-300 space-y-3">
                                    <h4 className="text-[10px] font-bold text-gray-400 mb-2 pl-1 uppercase tracking-widest break-keep whitespace-nowrap">검색 결과</h4>
                                    {inviteSearchResults.map(resultUser => (
                                        <div key={resultUser.id} className="bg-white border border-gray-200 shadow-sm rounded-[20px] p-4 flex items-center justify-between hover:border-indigo-200 transition group">
                                            <div className="flex items-center gap-3 w-full pr-4 overflow-hidden">
                                                <img src={resultUser.photoURL || resultUser.profileImgBase64 || "https://i.pravatar.cc/150?u=user"} alt="found user" className="w-12 h-12 rounded-full object-cover shadow-sm shrink-0" />
                                                <div className="overflow-hidden">
                                                    <h3 className="font-black text-gray-900 text-base truncate w-full break-keep whitespace-nowrap">{resultUser.name}</h3>
                                                    <p className="text-[10px] text-gray-400 font-bold truncate w-full break-keep whitespace-nowrap">{resultUser.email}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleSendWorkspaceInvite(resultUser)} className="bg-indigo-50 text-indigo-600 font-bold text-xs px-4 py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition active:scale-95 shrink-0 break-keep whitespace-nowrap">초대하기</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {inviteSearchStatus === 'no-result' && (
                                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                    <p className="font-bold text-sm break-keep whitespace-nowrap">검색 결과가 없습니다.</p>
                                </div>
                            )}
                            {inviteSearchStatus === 'sent' && (
                                <div className="animate-in zoom-in-95 duration-300 flex flex-col items-center justify-center py-10 text-center">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-sm"><Check size={32} strokeWidth={3} /></div>
                                    <h3 className="font-black text-gray-900 text-lg mb-1 break-keep whitespace-nowrap">초대장 발송 완료!</h3>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 pt-6 border-t border-gray-100 w-full text-center shrink-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 break-keep whitespace-nowrap">또는 외부 링크로 초대하기</p>
                            <button onClick={handleCopyInviteLink} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-sm py-4 rounded-[20px] transition flex items-center justify-center gap-2 border border-gray-200 break-keep whitespace-nowrap">
                                <LinkIcon size={16} className="shrink-0" /> 카카오톡으로 초대 링크 보내기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 일반 동행 검색 모달 */}
            {showSearchModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-300" onClick={closeSearchModal}></div>
                    <div className="bg-white/90 backdrop-blur-2xl border border-white/60 w-full max-w-md h-[85vh] sm:h-[600px] rounded-t-[40px] sm:rounded-[40px] p-8 flex flex-col relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
                        <div className="flex items-center justify-between mb-8"><h3 className="text-2xl font-black text-gray-900 tracking-tight break-keep whitespace-nowrap">메이트 검색</h3><button onClick={closeSearchModal} className="w-10 h-10 bg-gray-200/50 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition shrink-0"><X size={20} strokeWidth={2.5} /></button></div>
                        <form onSubmit={handleSearchUser} className="relative mb-6"><div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-400"><Search size={22} strokeWidth={2.5} /></div><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="정확한 이름 또는 이메일 검색" className="w-full bg-white/60 border border-gray-200 text-gray-900 placeholder-gray-400 font-bold text-lg rounded-[20px] py-5 pl-14 pr-5 outline-none focus:ring-2 focus:ring-gray-900 transition shadow-sm" autoFocus /></form>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {searchStatus === 'idle' && (<div className="text-center py-20 flex flex-col items-center justify-center h-full"><div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center text-rose-400 mb-6"><Users size={40} /></div><p className="text-gray-500 font-bold text-lg mb-2 break-keep whitespace-nowrap">실제 가입된 회원을 검색해보세요!</p></div>)}
                            {searchStatus === 'loading' && (<div className="flex flex-col items-center justify-center h-full py-20 text-gray-400"><Loader2 className="animate-spin mb-4" size={40} /><p className="font-bold text-lg break-keep whitespace-nowrap">회원 검색 중...</p></div>)}
                            {searchStatus === 'result' && (
                                <div className="animate-in fade-in duration-300 space-y-3">
                                    <h4 className="text-xs font-bold text-gray-500 mb-3 pl-1 uppercase tracking-widest break-keep whitespace-nowrap">검색 결과</h4>
                                    {searchResults.map(resultUser => (
                                        <div key={resultUser.id} className="bg-white/60 border border-white/50 shadow-sm rounded-[20px] p-5 flex items-center justify-between">
                                            <div className="flex items-center gap-4 w-full pr-4 overflow-hidden">
                                                <img src={resultUser.photoURL || resultUser.profileImgBase64 || "https://i.pravatar.cc/150"} alt="found user" className="w-14 h-14 rounded-full object-cover border-[3px] border-white shadow-sm shrink-0" />
                                                <div className="overflow-hidden">
                                                    <h3 className="font-black text-gray-900 text-lg truncate w-full break-keep whitespace-nowrap">{resultUser.name}</h3>
                                                    <p className="text-[11px] text-gray-500 font-bold truncate w-full break-keep whitespace-nowrap">{resultUser.email}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleRequestMate(resultUser)} className="bg-gradient-to-r from-slate-800 to-gray-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md hover:from-slate-900 hover:to-black active:scale-95 transition shrink-0 break-keep whitespace-nowrap">동행 찌르기</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {searchStatus === 'no-result' && (<div className="text-center py-20 text-gray-400"><p className="font-bold break-keep whitespace-nowrap">검색 결과가 없습니다.</p></div>)}
                            {searchStatus === 'requested' && (<div className="animate-in zoom-in-95 duration-300 flex flex-col items-center justify-center h-full text-center"><div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4"><Check size={40} strokeWidth={3} /></div><h3 className="font-black text-gray-900 text-xl mb-2 break-keep whitespace-nowrap">요청 완료!</h3></div>)}
                        </div>
                    </div>
                </div>
            )}

            {/* 자산 채우기 모달 */}
            {showAssetModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowAssetModal(false)}></div>
                    <div className="bg-white/90 backdrop-blur-2xl border border-white/60 w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 pb-safe relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
                        <button onClick={() => setShowAssetModal(false)} className="absolute top-6 right-6 w-10 h-10 bg-gray-200/50 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition"><X size={20} strokeWidth={2.5} /></button>
                        <div className="pt-2 mt-4">
                            <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight break-keep whitespace-nowrap">내 지갑 채우기</h3>
                            <p className="text-gray-500 font-medium mb-6 break-keep">여행을 위해 저축할 금액을 입력해주세요.</p>
                            <div className="bg-white/60 rounded-[20px] p-6 mb-6 border border-white/50 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-black text-gray-900">₩</span>
                                    <input type="number" value={tempAssetInput} onChange={(e) => setTempAssetInput(e.target.value)} placeholder="0" className="w-full bg-transparent text-4xl font-black text-gray-900 outline-none placeholder-gray-300 tracking-tighter" autoFocus />
                                </div>
                            </div>
                            <button onClick={handleDepositAsset} className="w-full bg-gray-900 text-white font-black text-lg py-5 rounded-[20px] shadow-xl hover:bg-black active:scale-[0.98] transition break-keep whitespace-nowrap">
                                추가 입금
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Modal */}
            {showProfileModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowProfileModal(false)}></div>
                    <div className="bg-white/90 backdrop-blur-2xl border border-white/60 w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 pb-safe relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl h-[90vh] sm:h-auto overflow-y-auto custom-scrollbar flex flex-col">
                        <div className="flex items-center justify-between mb-8"><h3 className="text-2xl font-black text-gray-900 tracking-tight break-keep whitespace-nowrap">프로필 꾸미기</h3><button onClick={() => setShowProfileModal(false)} className="w-10 h-10 bg-gray-200/50 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition shrink-0"><X size={20} strokeWidth={2.5} /></button></div>
                        <div className="flex flex-col items-center justify-center mb-8">
                            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                            <div onClick={() => fileInputRef.current.click()} className="relative cursor-pointer group mb-3">
                                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 text-rose-500 flex items-center justify-center overflow-hidden border-[4px] border-white shadow-xl group-hover:scale-105 transition-transform">{previewImage || user?.photoURL ? (<img src={previewImage || user?.photoURL} alt="Profile" className="w-full h-full object-cover" />) : (<User size={48} strokeWidth={2} />)}</div>
                                <div className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-br from-slate-800 to-gray-900 text-white rounded-full flex items-center justify-center shadow-lg border-[3px] border-white group-hover:from-rose-500 group-hover:to-pink-600 transition-all"><Camera size={18} /></div>
                            </div>
                        </div>
                        <div className="space-y-6 flex-1">
                            <div><label className="block text-xs font-bold text-gray-500 mb-2 pl-1 uppercase tracking-wider break-keep whitespace-nowrap">Nickname</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="멋진 닉네임을 입력해주세요" className="w-full bg-white/50 border border-gray-200 px-5 py-4 rounded-[20px] font-bold text-gray-900 outline-none focus:ring-2 focus:ring-rose-400 transition shadow-sm" /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-2 pl-1 uppercase tracking-wider break-keep whitespace-nowrap">Bio</label><input type="text" value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="예: 낯선 골목길을 걷는 걸 좋아해요!" className="w-full bg-white/50 border border-gray-200 px-5 py-4 rounded-[20px] text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-rose-400 transition shadow-sm" /></div>
                            <div>
                                <div className="flex items-center justify-between mb-3 pl-1"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider break-keep whitespace-nowrap">Travel Style (Max 3)</label><span className="text-[11px] text-gray-900 font-black bg-gray-100 px-2 py-1 rounded-full shrink-0">{selectedTags.length} / 3</span></div>
                                <div className="flex flex-wrap gap-2.5">
                                    {TRAVEL_TAGS.map(tag => {
                                        const isSelected = selectedTags.includes(tag);
                                        return (<button key={tag} onClick={() => toggleTag(tag)} className={`px-4 py-2.5 rounded-[16px] text-sm font-bold transition-all shadow-sm break-keep whitespace-nowrap ${isSelected ? 'bg-gradient-to-r from-slate-800 to-gray-900 text-white scale-105' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{tag}</button>);
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="mt-10 mb-4 shrink-0">
                            <button onClick={handleSaveProfile} disabled={isSaving} className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-lg py-5 rounded-[20px] hover:from-rose-600 hover:to-pink-700 active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(244,63,94,0.3)] disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none break-keep whitespace-nowrap">
                                {isSaving ? <Loader2 className="animate-spin shrink-0" size={22} /> : <Check size={22} strokeWidth={3} className="shrink-0" />} 프로필 저장 완료
                            </button>
                            <button onClick={handleLogout} className="w-full mt-4 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1.5 transition active:scale-95 break-keep whitespace-nowrap"><LogOut size={16} className="shrink-0" /> 로그아웃</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Point Modal */}
            {showPointModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowPointModal(false)}></div>
                    <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 pb-safe relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl h-[80vh] flex flex-col">
                        <button onClick={() => setShowPointModal(false)} className="absolute top-6 right-6 w-10 h-10 bg-gray-200/50 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition shrink-0"><X size={20} strokeWidth={2.5} /></button>
                        <div className="text-center pt-6 mb-8 shrink-0">
                            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner"><Gem size={40} className="text-purple-600 fill-purple-600/20" /></div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-1 truncate px-4">{(userData?.points || 0).toLocaleString()} P</h2>
                            <p className="text-sm text-gray-500 font-bold break-keep whitespace-nowrap">나의 여행 포인트</p>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 pl-1 break-keep whitespace-nowrap">History</h3>
                            {actualPointsHistory.length === 0 ? (
                                <div className="text-center py-10 text-gray-400"><p className="text-sm break-keep whitespace-nowrap">아직 적립 내역이 없습니다.</p></div>
                            ) : (
                                <div className="space-y-3">
                                    {actualPointsHistory.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <div className="overflow-hidden pr-2"><p className="font-bold text-gray-900 text-sm truncate w-full break-keep whitespace-nowrap">{item.reason}</p><p className="text-[10px] text-gray-400 font-bold break-keep whitespace-nowrap">{item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : "방금"}</p></div>
                                            <span className="font-black text-purple-600 shrink-0 break-keep whitespace-nowrap">+{item.amount} P</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 shrink-0">
                            {userData?.lastCheckInDate === new Date().toISOString().split('T')[0] ? (
                                <div className="w-full bg-gray-100 text-gray-500 font-bold py-4 rounded-2xl text-center flex items-center justify-center gap-2 cursor-default break-keep whitespace-nowrap">
                                    <Check size={18} className="text-emerald-500" /> 오늘 출석 완료
                                </div>
                            ) : (
                                <button onClick={handleDailyCheckIn} className="w-full bg-purple-600 text-white font-bold py-4 rounded-2xl hover:bg-purple-700 transition active:scale-95 shadow-lg shadow-purple-500/30 break-keep whitespace-nowrap">📅 출석체크하고 포인트 받기 (+50P)</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ✨ [신규] 포인트 환전 신청 모달 (alert 대체용) */}
            {showExchangeModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowExchangeModal(false)}></div>
                    <div className="bg-white/95 backdrop-blur-2xl border border-white/60 w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 pb-safe relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl flex flex-col overflow-hidden">
                        
                        {/* Decorative Gradient Background */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-600"></div>
                        <button onClick={() => setShowExchangeModal(false)} className="absolute top-6 right-6 w-10 h-10 bg-gray-200/50 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition z-20 shrink-0"><X size={20} strokeWidth={2.5} /></button>
                        
                        <div className="text-center pt-6 mb-6 shrink-0">
                            <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-fuchsia-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20 text-white animate-bounce flex items-center justify-center"><Banknote size={32} /></div>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight break-keep">실시간 현금 환전 서비스</h3>
                            <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">Point to Cash Exchange</p>
                        </div>

                        <div className="space-y-5 flex-1 py-2">
                            {/* Point Conversion Card */}
                            <div className="bg-gray-900 text-white rounded-[24px] p-5 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>
                                <p className="text-[10px] font-bold text-purple-300 mb-1 uppercase tracking-widest">환전 가능 포인트</p>
                                <div className="flex items-baseline gap-1.5 mb-4">
                                    <span className="text-3xl font-black text-white">{(userData?.points || 0).toLocaleString()}</span>
                                    <span className="text-sm font-bold text-gray-400">P</span>
                                </div>
                                <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs font-bold text-gray-300">
                                    <span>예상 환전 금액</span>
                                    <span className="text-purple-400 text-sm font-black">₩ {((userData?.points || 0) * 10).toLocaleString()} 원 <span className="text-[9px] font-normal text-gray-400">(1P = 10원)</span></span>
                                </div>
                            </div>

                            {/* Service Status Notice */}
                            <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-4 text-center">
                                <p className="text-xs font-bold text-purple-800 leading-relaxed break-keep">
                                    현재 현금 환전 모듈 최종 조율 및 본인인증(KCB) 연동 작업 중입니다. 조금만 기다려주세요! 🛠️
                                </p>
                            </div>

                            {/* Launch Reservation Form */}
                            {!exchangeSubscribed ? (
                                <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
                                    <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-wider pl-1">환전 기능 오픈 사전 예약</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={exchangePhone} 
                                            onChange={e => setExchangePhone(e.target.value)} 
                                            placeholder="알림받을 휴대폰 번호 입력" 
                                            className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 transition" 
                                        />
                                        <button 
                                            onClick={handleSubscribeExchange}
                                            disabled={!exchangePhone}
                                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 text-white font-black text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-purple-100 active:scale-95 shrink-0 break-keep whitespace-nowrap"
                                        >
                                            신청
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center animate-in zoom-in-95 duration-300">
                                    <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-md shadow-emerald-100 animate-pulse"><Check size={16} strokeWidth={3} /></div>
                                    <p className="text-[11px] font-black text-emerald-800 break-keep">사전 예약 신청이 완료되었습니다! 🎉</p>
                                    <p className="text-[9px] font-bold text-emerald-600/80 mt-0.5 break-keep">서비스가 활성화되는 즉시 휴대폰 알림을 전송해 드립니다.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2 shrink-0">
                            <button onClick={() => setShowExchangeModal(false)} className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-sm rounded-2xl transition active:scale-95 text-center break-keep">돌아가기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 가계부 (지출 등록) Modal */}
            {showBudgetModal && selectedTrip && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowBudgetModal(false)}></div>
                    <div className="bg-white/90 backdrop-blur-2xl border border-white/60 w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 pb-safe relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl h-[95vh] sm:h-[85vh] flex flex-col">
                        <button onClick={() => setShowBudgetModal(false)} className="absolute top-6 right-6 w-10 h-10 bg-gray-200/50 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition z-20 shrink-0"><X size={20} strokeWidth={2.5} /></button>
                        
                        <div className="pt-2 mt-4 shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight break-keep whitespace-nowrap">{selectedTrip.destination || "여행"} 가계부</h3>
                                <div className="flex gap-2">
                                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full border border-indigo-200 uppercase tracking-tighter">Finance Admin</span>
                                </div>
                            </div>
                            
                            {/* ✨ 통합 예산 요약 카드 */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-gray-900 rounded-[24px] p-5 shadow-xl text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                                    <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">모임통장 잔고</p>
                                    <h2 className="text-xl font-black tracking-tight truncate">{(selectedTrip.tripWalletBalance || 0).toLocaleString()} <span className="text-[10px] text-gray-400 font-bold">원</span></h2>
                                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 overflow-x-auto hide-scroll">
                                        {Object.entries(selectedTrip.foreignWallets || {}).map(([cur, amt]) => amt > 0 && (
                                            <span key={cur} className="text-[9px] font-bold text-indigo-300 break-keep whitespace-nowrap">{cur} {amt.toLocaleString()}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">현재 총 지출</p>
                                        <h2 className="text-xl font-black text-rose-500 tracking-tight">{(totalSpent || 0).toLocaleString()} <span className="text-[10px] text-gray-400 font-bold">원</span></h2>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-3">
                                        <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${Math.min((totalSpent / (selectedTrip.targetTotalCost || 1)) * 100, 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-1 pb-6">
                            {/* 1. 새로운 영수증 등록 (Moved to Very Top for 1-step depth) */}
                            <section className="bg-white border border-indigo-100 rounded-3xl p-5 shadow-sm">
                                <p className="text-[11px] font-black text-indigo-500 mb-3 uppercase tracking-wider flex items-center gap-1">
                                    <Receipt size={14} className="shrink-0 text-indigo-500" /> 새로운 지출 / 영수증 등록
                                </p>
                                <div className="flex w-full gap-2">
                                    <input type="text" value={newExpenseName} onChange={(e) => setNewExpenseName(e.target.value)} placeholder="지출 사용처 입력" className="flex-[2] min-w-0 bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-400 text-[13px] transition" />
                                    <select value={newExpenseCurrency} onChange={e => setNewExpenseCurrency(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-black text-gray-700 outline-none px-2 shrink-0">
                                        <option value="KRW">KRW</option>
                                        <option value="JPY">JPY</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                    <input type="number" value={newExpenseCost} onChange={(e) => setNewExpenseCost(e.target.value)} placeholder="금액" className="flex-[1.5] min-w-0 bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-xl font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-400 text-[13px] transition" />
                                    <button onClick={handleAddExpense} disabled={!newExpenseName || !newExpenseCost} className="bg-indigo-600 hover:bg-indigo-700 text-white w-12 shrink-0 rounded-xl flex items-center justify-center active:scale-95 disabled:bg-gray-200 transition shadow-lg shadow-indigo-100"><Plus size={20} strokeWidth={3} /></button>
                                </div>
                            </section>

                            {/* 2. 일정별 상세 예산 관리 (Accordion Style) */}
                            <section>
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <h4 className="font-black text-gray-900 text-base flex items-center gap-1.5"><Calendar size={18} className="text-indigo-500" /> 일정별 상세 예산</h4>
                                    <span className="text-[10px] font-bold text-gray-400">Day 카드 터치로 접기/펴기</span>
                                </div>
                                <div className="space-y-4">
                                    {(selectedTrip.itinerary || []).map((day, dIdx) => {
                                        const isExpanded = expandedDays[dIdx] ?? (dIdx === 0);
                                        return (
                                            <div key={dIdx} className="bg-gray-50/50 rounded-[28px] border border-gray-100/80 overflow-hidden shadow-xs">
                                                {/* Accordion Trigger Header */}
                                                <button 
                                                    onClick={() => setExpandedDays(prev => ({ ...prev, [dIdx]: !isExpanded }))}
                                                    className="w-full flex justify-between items-center p-5 bg-white border-b border-gray-100 hover:bg-gray-50/80 transition"
                                                >
                                                    <h5 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${isExpanded ? 'bg-indigo-500 animate-pulse' : 'bg-gray-300'}`}></span> Day {dIdx + 1}
                                                    </h5>
                                                    <ChevronRight size={16} strokeWidth={3} className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                                </button>
                                                
                                                {isExpanded && (
                                                    <div className="p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                        {day.places.map((place, pIdx) => {
                                                            const expected = parseFloat(place.expectedBudget) || 0;
                                                            const actual = parseFloat(place.actualExpense) || 0;
                                                            const isExceeded = actual > expected && expected > 0;
                                                            
                                                            return (
                                                                <div key={pIdx} className={`p-4 rounded-2xl border transition-all hover:border-indigo-100 shadow-xs bg-white ${isExceeded ? 'border-rose-200 bg-rose-50/30' : 'border-gray-100'}`}>
                                                                    <div className="flex items-center justify-between gap-3 mb-3">
                                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 border ${isExceeded ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-indigo-50 text-indigo-500 border-indigo-100'}`}>{pIdx + 1}</div>
                                                                            <p className="font-bold text-gray-900 text-sm truncate">{place.name}</p>
                                                                        </div>
                                                                        {isExceeded && (
                                                                            <span className="text-[10px] text-rose-500 font-black shrink-0 flex items-center gap-0.5 bg-rose-100/50 px-2 py-0.5 rounded-full animate-bounce">
                                                                                ⚠️ 초과 (+{(actual - expected).toLocaleString()}원)
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div className="relative group">
                                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase pointer-events-none group-focus-within:text-indigo-500">Exp</div>
                                                                            <input 
                                                                                type="number" 
                                                                                value={place.expectedBudget || ''} 
                                                                                onChange={(e) => handleUpdateItemBudget(dIdx, pIdx, 'expectedBudget', e.target.value)}
                                                                                placeholder="0" 
                                                                                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
                                                                            />
                                                                        </div>
                                                                        <div className="relative group text-right">
                                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase pointer-events-none group-focus-within:text-rose-500">Act</div>
                                                                            <input 
                                                                                type="number" 
                                                                                value={place.actualExpense || ''} 
                                                                                onChange={(e) => handleUpdateItemBudget(dIdx, pIdx, 'actualExpense', e.target.value)}
                                                                                placeholder="0" 
                                                                                className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-black outline-none focus:ring-2 focus:bg-white transition ${isExceeded ? 'text-rose-600 focus:ring-rose-500 font-black' : 'text-gray-950 focus:ring-indigo-400 font-medium'}`}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* 3. 공통 지출 내역 목록 */}
                            <section>
                                <div className="flex items-center justify-between mb-4 px-1 pb-2 border-b border-gray-100">
                                    <h4 className="font-black text-gray-900 text-base flex items-center gap-1.5"><Receipt size={18} className="text-gray-400" /> 공통 지출 내역</h4>
                                    <span className="text-[10px] font-bold text-gray-400">영수증 및 환전 기록</span>
                                </div>

                                <div className="space-y-3">
                                    {expenses.length === 0 ? (
                                        <div className="text-center py-10 text-gray-300 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200"><p className="text-[11px] font-bold break-keep">등록된 공통 지출 내역이 없습니다.</p></div>
                                    ) : (
                                        expenses.map(exp => (
                                            <div key={exp.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-50 shadow-xs group hover:border-rose-100 transition">
                                                <div className="flex items-center gap-3 overflow-hidden pr-2">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">{exp.category === "환전" ? <RefreshCw size={18} /> : <Receipt size={18} />}</div>
                                                    <div className="overflow-hidden">
                                                        <p className="font-bold text-gray-900 text-sm truncate">{exp.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold truncate">{exp.by} · {exp.createdAt ? new Date(exp.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "방금"}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="font-black text-rose-500 text-sm">-{exp.amount.toLocaleString()} <span className="text-[9px] font-normal text-gray-400">{exp.currency}</span></span>
                                                    <button onClick={() => handleDeleteExpense(exp)} className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-400 opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition shrink-0"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* 하단 요약 및 닫기 */}
                        <div className="pt-6 shrink-0 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setShowBudgetModal(false)} className="flex-1 bg-gray-900 text-white font-black text-lg py-5 rounded-[24px] shadow-xl hover:bg-black active:scale-[0.98] transition">확인 완료</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Exchange Modal (개인 지갑) */}
            {showExchangeModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowExchangeModal(false)}></div>
                    <div className="bg-white/90 backdrop-blur-2xl border border-white/60 w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 pb-safe relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
                        <button onClick={() => setShowExchangeModal(false)} className="absolute top-6 right-6 w-10 h-10 bg-gray-200/50 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition shrink-0"><X size={20} strokeWidth={2.5} /></button>
                        {exchangeStep === 'input' && (
                            <div className="pt-2 mt-4">
                                <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight break-keep whitespace-nowrap">개인 지갑 환전</h3>
                                <p className="text-sm text-emerald-600 font-bold mb-8 flex items-center gap-1.5 break-keep whitespace-nowrap"><Sparkles size={16} className="animate-pulse shrink-0" /> 100% 환율 우대 적용 중</p>
                                <div className="flex gap-2 mb-6">{['USD', 'JPY', 'EUR'].map(cur => (<button key={cur} onClick={() => setSelectedCurrency(cur)} className={`flex-1 py-3 rounded-xl text-sm font-bold transition break-keep whitespace-nowrap ${selectedCurrency === cur ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{cur}</button>))}</div>
                                <div className="bg-white/60 rounded-[32px] p-7 mb-6 border border-white/50 shadow-sm relative">
                                    <div className="flex justify-between items-center mb-4"><span className="text-gray-500 font-bold uppercase tracking-wider text-xs break-keep whitespace-nowrap">환전할 금액</span><span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md break-keep whitespace-nowrap">내 잔고: {currentAsset.toLocaleString()}원</span></div>
                                    <div className="flex items-center gap-3 mb-6"><span className="text-4xl font-black text-gray-900 shrink-0">{selectedCurrency === 'USD' ? '$' : selectedCurrency === 'JPY' ? '¥' : '€'}</span><input type="number" value={exchangeAmount} onChange={(e) => setExchangeAmount(e.target.value)} placeholder="0" className="w-full bg-transparent text-5xl font-black text-gray-900 outline-none placeholder-gray-300 tracking-tighter" autoFocus /></div>
                                    {exchangeAmount > 0 && (<div className="pt-5 border-t border-gray-200 animate-in fade-in duration-300"><div className="flex justify-between items-center mb-2"><span className="text-sm text-gray-500 font-bold break-keep whitespace-nowrap">예상 결제 금액</span><span className="text-base font-black text-gray-900 break-keep whitespace-nowrap">{Math.floor(exchangeAmount * CURRENCY_RATES[selectedCurrency]).toLocaleString()} 원</span></div><div className="flex justify-between items-center"><span className="text-sm text-gray-500 font-bold break-keep whitespace-nowrap">적용 환율</span><span className="text-sm font-bold text-gray-500 break-keep whitespace-nowrap">{CURRENCY_RATES[selectedCurrency]}</span></div></div>)}
                                </div>
                                <button onClick={() => setExchangeStep('loading')} disabled={!exchangeAmount} className={`w-full font-black text-lg py-5 rounded-[20px] transition flex items-center justify-center gap-2 break-keep whitespace-nowrap ${exchangeAmount ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xl shadow-rose-500/30 hover:from-rose-600 hover:to-pink-700 active:scale-[0.98]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}><ArrowRightLeft size={20} strokeWidth={3} className="shrink-0" /> 환전하기</button>
                            </div>
                        )}
                        {exchangeStep === 'loading' && (<div className="py-20 flex flex-col items-center justify-center text-center"><div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 border-t-emerald-500 mb-6 shrink-0"></div><h3 className="text-xl font-bold text-gray-900 break-keep whitespace-nowrap">환전 중...</h3></div>)}
                        {exchangeStep === 'success' && (<div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500"><div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-500/30 shrink-0"><Banknote size={48} strokeWidth={2.5} /></div><h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight break-keep whitespace-nowrap">환전 완료!</h3><div className="bg-white/60 rounded-[20px] p-6 w-full mb-10 border border-white/50 shadow-sm"><p className="text-sm text-gray-500 font-bold mb-2 uppercase tracking-widest break-keep whitespace-nowrap">내 외화 지갑 ({selectedCurrency})</p><p className="text-4xl font-black text-gray-900 tracking-tighter truncate w-full">{Number(exchangeAmount).toLocaleString()}</p></div><button onClick={() => setShowExchangeModal(false)} className="w-full bg-gray-900 text-white font-black text-lg py-5 rounded-[20px] shadow-xl hover:bg-gray-800 active:scale-[0.98] transition break-keep whitespace-nowrap">확인</button></div>)}
                    </div>
                </div>
            )}

            {/* 피드 수정 및 다중 사진 업로드 모달 */}
            {editingFeed && (
                <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !isFeedSaving && setEditingFeed(null)}></div>
                    <div className="bg-white/90 backdrop-blur-2xl border border-white/60 w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 pb-safe relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl h-[85vh] sm:h-auto overflow-y-auto custom-scrollbar flex flex-col">
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 break-keep whitespace-nowrap"><Edit3 className="text-indigo-500" /> 피드 수정</h3>
                            <button onClick={() => !isFeedSaving && setEditingFeed(null)} className="w-10 h-10 bg-gray-200/50 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition shrink-0"><X size={20} strokeWidth={2.5} /></button>
                        </div>

                        <div className="flex-1 space-y-6">
                            <div>
                                <div className="flex justify-between items-end mb-2 pl-1">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider break-keep whitespace-nowrap">Photos ({editFeedImages.length}/5)</p>
                                </div>

                                {/* ✨ 다중 이미지 선택 인풋 (multiple 추가) */}
                                <input type="file" accept="image/*" multiple className="hidden" ref={feedFileInputRef} onChange={handleFeedImageChange} />

                                {/* ✨ 가로 스크롤 이미지 리스트 */}
                                <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2 pt-1 px-1">
                                    {/* 이미지 추가 버튼 */}
                                    {editFeedImages.length < 5 && (
                                        <div onClick={() => feedFileInputRef.current.click()} className="w-28 h-28 shrink-0 bg-gray-100 rounded-[20px] border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
                                            <Plus size={28} className="text-gray-400 mb-1" />
                                            <span className="text-[10px] font-bold text-gray-500">사진 추가</span>
                                        </div>
                                    )}

                                    {/* 선택된 이미지 미리보기 */}
                                    {editFeedImages.map((imgObj, idx) => (
                                        <div key={idx} className="w-28 h-28 shrink-0 relative rounded-[20px] overflow-hidden shadow-sm group">
                                            <img src={imgObj.url} alt={`preview ${idx}`} className="w-full h-full object-cover" />

                                            {/* 첫 번째 사진은 '대표(지도)' 뱃지 표시 */}
                                            {idx === 0 && (
                                                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white flex items-center gap-1">
                                                    <MapIcon size={10} /> 대표
                                                </div>
                                            )}

                                            {/* 첫 번째 사진이 아닐 때만 삭제 버튼 표시 */}
                                            {idx !== 0 && (
                                                <button onClick={() => handleRemoveImage(idx)} className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-rose-500">
                                                    <X size={14} strokeWidth={3} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-2 pl-1 uppercase tracking-wider break-keep whitespace-nowrap">Description</p>
                                <textarea value={editFeedTitle} onChange={(e) => setEditFeedTitle(e.target.value)} placeholder="여행의 감상을 자유롭게 남겨보세요!" rows={4} className="w-full bg-white/50 border border-gray-200 px-5 py-4 rounded-[20px] text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-400 transition shadow-sm resize-none custom-scrollbar break-keep" />
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-gray-100 shrink-0">
                            <button onClick={handleSaveFeed} disabled={isFeedSaving || !editFeedTitle.trim() || editFeedImages.length === 0} className="w-full bg-gray-900 text-white font-black text-lg py-5 rounded-[20px] shadow-xl hover:bg-black active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:shadow-none break-keep whitespace-nowrap">
                                {isFeedSaving ? (
                                    <><Loader2 className="animate-spin shrink-0" size={22} /> 사진 업로드 중...</>
                                ) : (
                                    <><Check size={22} strokeWidth={3} className="shrink-0" /> 피드 수정 완료</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 퀴즈 모달 */}
            {showQuizModal && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center pointer-events-auto">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowQuizModal(false)}></div>
                    <div className="bg-white w-full sm:max-w-md h-[85vh] sm:h-[650px] rounded-t-[32px] sm:rounded-[32px] flex flex-col relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white/90 backdrop-blur-md sticky top-0 z-20 shrink-0">
                            <div>
                                <h3 className="font-black text-xl text-gray-900 flex items-center gap-2">
                                    <BrainCircuit size={22} className="text-indigo-600" />
                                    여행지 능력고사
                                </h3>
                                <p className="text-xs text-gray-500 font-bold mt-0.5">매일 퀴즈를 풀고 트립 포인트를 적립하세요!</p>
                            </div>
                            <button onClick={() => setShowQuizModal(false)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition shrink-0"><X size={20} strokeWidth={2.5} /></button>
                        </div>
                        <div className="p-5 flex-1 overflow-y-auto bg-gray-50 custom-scrollbar">
                            <TravelQuiz aiQuizData={quizData} /> 
                        </div>
                    </div>
                </div>
            )}
            {/* ✨ 일정 가져오기 모달 */}
            {feedToFork && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFeedToFork(null)}></div>
                    <div className="bg-white w-full max-w-sm rounded-[32px] p-6 relative z-10 shadow-2xl flex flex-col items-center animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-500 mb-4 shadow-sm"><Download size={32} /></div>
                        <h3 className="text-xl font-black text-gray-900 mb-2 text-center">일정 가져오기</h3>
                        <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed">이 여행 일정을 내 일정으로<br />복사하시겠습니까?</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setFeedToFork(null)} className="flex-1 py-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">취소</button>
                            <button onClick={confirmForkItinerary} disabled={isSaving} className="flex-1 py-4 rounded-xl font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors shadow-md disabled:bg-gray-400">
                                {isSaving ? <Loader2 size={20} className="animate-spin mx-auto" /> : '가져오기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✨ 댓글 모달 / 바텀 시트 */}
            {showCommentModal && (
                <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={closeCommentModal}></div>
                    <div className="bg-white w-full sm:max-w-md h-[70vh] sm:h-[600px] rounded-t-[32px] sm:rounded-[32px] relative z-10 flex flex-col animate-in slide-in-from-bottom-full shadow-2xl">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/90 backdrop-blur-md rounded-t-[32px] shrink-0">
                            <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                                <MessageCircleIcon size={20} className="text-indigo-500" /> 댓글
                            </h3>
                            <button onClick={closeCommentModal} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"><X size={18} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-gray-50/50">
                            {comments.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                                    <MessageSquare size={40} className="text-gray-200 mb-2" />
                                    <p className="text-sm font-bold">첫 번째 댓글을 남겨보세요!</p>
                                </div>
                            ) : (
                                comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3">
                                        <img src={comment.avatar || "https://i.pravatar.cc/150"} alt="avatar" className="w-8 h-8 rounded-full border border-gray-200 shrink-0" />
                                        <div className="bg-white p-3 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm w-full">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-xs text-gray-900">{comment.name}</span>
                                                <span className="text-[10px] text-gray-400">{comment.createdAt ? new Date(comment.createdAt.seconds * 1000).toLocaleDateString() : '방금 전'}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed break-words">{comment.text}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-white shrink-0 sm:rounded-b-[32px]">
                            <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 p-2 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                                <textarea
                                    value={newCommentText}
                                    onChange={(e) => setNewCommentText(e.target.value)}
                                    placeholder="댓글을 입력하세요..."
                                    className="w-full bg-transparent text-sm p-2 outline-none resize-none max-h-24 min-h-[40px] custom-scrollbar"
                                    rows={1}
                                />
                                <button 
                                    onClick={handleAddComment} 
                                    disabled={!newCommentText.trim() || isSubmittingComment}
                                    className="mb-1 w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0 disabled:bg-gray-300 transition-colors"
                                >
                                    {isSubmittingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="-ml-0.5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ✨ 커스텀 토스트 알림창 */}
            <AnimatePresence>
                {toast.show && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
                    >
                        <div className={`
                            backdrop-blur-xl border border-white/40 shadow-2xl rounded-[24px] p-4 flex items-center gap-3
                            ${toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 
                              toast.type === 'error' ? 'bg-rose-500/90 text-white' : 
                              'bg-gray-900/80 text-white'}
                        `}>
                            <div className="bg-white/20 p-2 rounded-full shrink-0">
                                {toast.type === 'success' ? <CheckCircle size={20} /> : 
                                 toast.type === 'error' ? <AlertCircle size={20} /> : 
                                 <Bell size={20} />}
                            </div>
                            <p className="font-bold text-[14px] leading-tight break-keep">{toast.message}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}