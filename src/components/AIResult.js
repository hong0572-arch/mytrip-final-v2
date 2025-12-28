'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    MessageCircle, Share2, Download, ExternalLink, BedDouble, Loader2,
    Sun, Lightbulb, RotateCcw, Pencil, Check, Trash2, Plus,
    ArrowUp, ArrowDown, MapPin, Search, Wand2, Navigation,
    Calendar, BrainCircuit, Save, User, RefreshCw // 👈 RefreshCw 아이콘 추가됨
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, setDoc, increment, getDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import TravelQuiz from './TravelQuiz';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const DAY_COLORS = ['#FF4B4B', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

export default function AIResult({ data, userInfo, tripId }) {
    const router = useRouter();

    // 🏗️ State 관리
    const [tripPlan, setTripPlan] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [error, setError] = useState(null);
    const [loadingAction, setLoadingAction] = useState(null);
    const [shareUrl, setShareUrl] = useState(null);
    const [activeTab, setActiveTab] = useState('itinerary');
    const [isSaving, setIsSaving] = useState(false);
    const [mapHeight, setMapHeight] = useState(40);

    // 🧠 퀴즈 관련 State 추가 (새로고침 기능용)
    const [currentQuizData, setCurrentQuizData] = useState(null);
    const [isQuizLoading, setIsQuizLoading] = useState(false);

    const isDragging = useRef(false);
    const hasAutoFixed = useRef(false);
    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    const markersRef = useRef([]);
    const polylineRef = useRef([]);
    const scrollContainerRef = useRef(null);
    const observerRef = useRef(null);

    // 1. 초기 데이터 파싱
    useEffect(() => {
        if (!data) return;
        try {
            let initialData = data;
            if (typeof data === 'string') {
                const cleanData = data.replace(/```json/g, '').replace(/```/g, '').trim();
                initialData = JSON.parse(cleanData);
            }
            if (!initialData.budgetBreakdown) initialData.budgetBreakdown = [];

            setTripPlan(initialData);
            // 🔥 초기 퀴즈 데이터 설정 (처음엔 AI가 만들어준 일정 속 퀴즈 사용)
            if (initialData.quiz) {
                setCurrentQuizData(initialData.quiz);
            }
        } catch (e) {
            console.error("JSON Error:", e);
            setError(e.message);
        }
    }, [data]);

    // 🔄 새로운 퀴즈 생성 함수 (API 연동)
    const handleRefreshQuiz = async () => {
        // 여행지 정보가 없으면 실행하지 않음
        const destination = tripPlan?.tripTitle?.split(' ')[0] || userInfo?.destination; // 제목의 첫 단어(지역명) 또는 입력값 사용
        if (!destination) return;

        setIsQuizLoading(true);

        try {
            const response = await fetch('/api/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destination })
            });
            const newData = await response.json();

            if (newData.result) {
                setCurrentQuizData(newData.result); // 퀴즈 데이터 교체
                // alert("새로운 문제가 도착했습니다! 🧠"); // 너무 자주 뜨면 귀찮으니 생략 가능
            } else {
                throw new Error("퀴즈 생성 실패");
            }
        } catch (error) {
            console.error("Quiz Refresh Error:", error);
            alert("퀴즈를 불러오는 중 오류가 발생했습니다.");
        } finally {
            setIsQuizLoading(false);
        }
    };

    // 📏 거리 계산 함수
    const calculateDistance = (place1, place2) => {
        if (!place1?.coordinates || !place2?.coordinates) return null;
        const lat1 = place1.coordinates.lat;
        const lon1 = place1.coordinates.lng;
        const lat2 = place2.coordinates.lat;
        const lon2 = place2.coordinates.lng;
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance.toFixed(1);
    };

    // 2. 구글 맵 렌더링
    useEffect(() => {
        if (!tripPlan || !tripPlan.itinerary) return;

        const loadMap = () => {
            if (!window.google) return;
            if (!mapRef.current) return;

            if (!googleMapRef.current) {
                const startLocation = tripPlan.itinerary[0]?.places[0]?.coordinates || { lat: 35.6895, lng: 139.6917 };
                googleMapRef.current = new google.maps.Map(mapRef.current, {
                    center: startLocation, zoom: 13, disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy',
                    styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
                });
            }

            const map = googleMapRef.current;
            markersRef.current.forEach(m => m.setMap(null));
            polylineRef.current.forEach(p => p.setMap(null));
            markersRef.current = [];
            polylineRef.current = [];
            const bounds = new google.maps.LatLngBounds();

            tripPlan.itinerary.forEach((dayItem, index) => {
                const dayColor = DAY_COLORS[index % DAY_COLORS.length];
                const path = [];
                dayItem.places.forEach((place, placeIdx) => {
                    if (place.coordinates?.lat && place.coordinates?.lng) {
                        path.push(place.coordinates);
                        bounds.extend(place.coordinates);
                        const marker = new google.maps.Marker({
                            position: place.coordinates, map,
                            icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: dayColor, fillOpacity: 1, strokeColor: "white", strokeWeight: 2, scale: 12 },
                            label: { text: (placeIdx + 1).toString(), color: "white", fontWeight: "bold", fontSize: "12px" },
                            zIndex: 100 + index
                        });
                        markersRef.current.push(marker);
                    }
                });
                if (path.length > 1) {
                    const line = new google.maps.Polyline({ path, geodesic: true, strokeColor: dayColor, strokeOpacity: 0.8, strokeWeight: 4, map });
                    polylineRef.current.push(line);
                }
            });

            tripPlan.recommendedHotels?.forEach((hotel) => {
                if (hotel.coordinates?.lat && hotel.coordinates?.lng) {
                    bounds.extend(hotel.coordinates);
                    const marker = new google.maps.Marker({
                        position: hotel.coordinates, map,
                        label: { text: "H", color: "white", fontWeight: "bold", fontSize: "10px" },
                        icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: "#111827", fillOpacity: 1, strokeColor: "white", strokeWeight: 2, scale: 10 },
                        title: hotel.name, zIndex: 200
                    });
                    markersRef.current.push(marker);
                }
            });

            if (!bounds.isEmpty()) map.fitBounds(bounds);
            if (!tripId && !hasAutoFixed.current) {
                hasAutoFixed.current = true;
                performSilentAutoFix(map);
            }
        };

        if (!window.google) {
            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = loadMap;
            document.head.appendChild(script);
        } else {
            loadMap();
        }
    }, [tripPlan]);

    // 좌표 보정 (안전장치 포함)
    const performSilentAutoFix = async (mapInstance) => {
        if (!mapInstance || !tripPlan) return;
        const service = new google.maps.places.PlacesService(mapInstance);
        const newPlan = { ...tripPlan };
        const region = tripPlan.destination || "";
        let isUpdated = false;
        const updates = [];

        newPlan.itinerary.forEach((dayItem, dayIdx) => {
            dayItem.places.forEach((place, placeIdx) => {
                const promise = new Promise((resolve) => {
                    setTimeout(() => {
                        let searchQuery = place.name;
                        if (region && !searchQuery.includes(region)) {
                            searchQuery = `${region} ${searchQuery}`;
                        }
                        service.findPlaceFromQuery({
                            query: searchQuery,
                            fields: ['geometry']
                        }, (results, status) => {
                            if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
                                const location = results[0].geometry.location;
                                const currentPlace = newPlan.itinerary[dayIdx].places[placeIdx];
                                const oldLat = currentPlace.coordinates ? currentPlace.coordinates.lat : null;
                                const newLat = location.lat();
                                if (oldLat === null || Math.abs(oldLat - newLat) > 0.0001) {
                                    currentPlace.coordinates = {
                                        lat: location.lat(),
                                        lng: location.lng()
                                    };
                                    isUpdated = true;
                                }
                            }
                            resolve();
                        });
                    }, dayIdx * 200 + placeIdx * 200);
                });
                updates.push(promise);
            });
        });

        await Promise.all(updates);

        if (isUpdated) {
            setTripPlan({ ...newPlan });
            if (!tripId) setShareUrl(null);
        }
    };

    useEffect(() => {
        if (!tripPlan || !scrollContainerRef.current) return;
        if (observerRef.current) observerRef.current.disconnect();

        const callback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const lat = parseFloat(entry.target.getAttribute('data-lat'));
                    const lng = parseFloat(entry.target.getAttribute('data-lng'));
                    if (googleMapRef.current && !isNaN(lat) && !isNaN(lng)) {
                        googleMapRef.current.panTo({ lat, lng });
                        if (googleMapRef.current.getZoom() < 14) googleMapRef.current.setZoom(15);
                    }
                }
            });
        };

        observerRef.current = new IntersectionObserver(callback, {
            root: scrollContainerRef.current, threshold: 0.6, rootMargin: '-20% 0px -20% 0px'
        });

        setTimeout(() => {
            const cards = document.querySelectorAll('.place-card');
            cards.forEach((card) => observerRef.current.observe(card));
        }, 500);

        return () => { if (observerRef.current) observerRef.current.disconnect(); };
    }, [tripPlan, activeTab]);


    const handleUpdateLocation = (dayIndex, placeIndex, queryName) => {
        if (!window.google || !googleMapRef.current) return;
        if (!queryName) return;
        const region = tripPlan.destination || "";
        let finalQuery = queryName;
        if (region && !queryName.includes(region)) {
            finalQuery = `${region} ${queryName}`;
        }
        const service = new google.maps.places.PlacesService(googleMapRef.current);
        service.findPlaceFromQuery({ query: finalQuery, fields: ['name', 'geometry'] }, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
                const location = results[0].geometry.location;
                const newCoords = { lat: location.lat(), lng: location.lng() };
                const newPlan = { ...tripPlan };
                newPlan.itinerary[dayIndex].places[placeIndex].coordinates = newCoords;
                setTripPlan(newPlan);
                if (!tripId) setShareUrl(null);
                googleMapRef.current.panTo(newCoords);
                googleMapRef.current.setZoom(16);
                alert(`✅ '${results[0].name}' 위치로 보정했습니다!`);
            } else {
                alert(`❌ '${finalQuery}'를 찾을 수 없습니다.`);
            }
        });
    };

    const handleAutoFixAll = async () => {
        if (!window.google || !googleMapRef.current) { alert("지도가 로딩되지 않았습니다."); return; }
        if (!confirm("모든 장소의 위치를 여행지 기준으로 재설정하시겠습니까?")) return;
        setLoadingAction('autoFix');
        hasAutoFixed.current = false;
        await performSilentAutoFix(googleMapRef.current);
        setLoadingAction(null);
        alert("전체 위치 보정이 완료되었습니다.");
    };

    // --- 편집 관련 핸들러들 ---
    const handleBudgetChange = (index, value) => {
        const newPlan = { ...tripPlan };
        newPlan.budgetBreakdown[index] = value;
        setTripPlan(newPlan);
        if (!tripId) setShareUrl(null);
    };
    const handleAddBudget = () => {
        const newPlan = { ...tripPlan };
        if (!newPlan.budgetBreakdown) newPlan.budgetBreakdown = [];
        newPlan.budgetBreakdown.push("새 항목: 0원");
        setTripPlan(newPlan);
        if (!tripId) setShareUrl(null);
    };
    const handleDeleteBudget = (index) => {
        const newPlan = { ...tripPlan };
        newPlan.budgetBreakdown.splice(index, 1);
        setTripPlan(newPlan);
        if (!tripId) setShareUrl(null);
    };
    const handleEditChange = (dayIndex, placeIndex, field, value) => {
        const newPlan = { ...tripPlan };
        newPlan.itinerary[dayIndex].places[placeIndex][field] = value;
        setTripPlan(newPlan);
        if (!tripId) setShareUrl(null);
    };
    const handleDeletePlace = (dayIndex, placeIndex) => {
        if (!confirm("이 장소를 삭제하시겠습니까?")) return;
        const newPlan = { ...tripPlan };
        newPlan.itinerary[dayIndex].places.splice(placeIndex, 1);
        newPlan.itinerary[dayIndex].places.forEach((p, i) => p.order = i + 1);
        setTripPlan(newPlan);
        if (!tripId) setShareUrl(null);
    };
    const handleAddPlace = (dayIndex) => {
        const newPlan = { ...tripPlan };
        const newOrder = newPlan.itinerary[dayIndex].places.length + 1;
        newPlan.itinerary[dayIndex].places.push({
            order: newOrder, name: "새로운 장소", category: "기타", description: "설명을 입력해주세요.",
            coordinates: { lat: 35.6895, lng: 139.6917 }
        });
        setTripPlan(newPlan);
        if (!tripId) setShareUrl(null);
    };
    const handleMovePlace = (dayIndex, placeIndex, direction) => {
        const newPlan = { ...tripPlan };
        const places = newPlan.itinerary[dayIndex].places;
        const targetIndex = placeIndex + direction;
        if (targetIndex < 0 || targetIndex >= places.length) return;
        [places[placeIndex], places[targetIndex]] = [places[targetIndex], places[placeIndex]];
        places.forEach((p, i) => p.order = i + 1);
        setTripPlan(newPlan);
        if (!tripId) setShareUrl(null);
    };

    // --- 기존 공유 로직 ---
    const getOrSaveShareUrl = async () => {
        if (shareUrl && !isEditMode) return shareUrl;
        if (window.location.pathname.includes('/share/') && !isEditMode) return window.location.href;
        try {
            const saveData = {
                ...tripPlan,
                contactInfo: userInfo?.contact || "정보 없음",
                isEdited: Boolean(isEditMode || tripPlan.isEdited)
            };
            let generatedUrl;
            if (tripId) {
                const docRef = doc(db, "trips", tripId);
                await updateDoc(docRef, { ...saveData, updatedAt: serverTimestamp() });
                generatedUrl = `${window.location.origin}/share/${tripId}`;
                alert("수정된 내용이 저장되었습니다!");
            } else {
                saveData.createdAt = serverTimestamp();
                const docRef = await addDoc(collection(db, "trips"), saveData);
                generatedUrl = `${window.location.origin}/share/${docRef.id}`;
            }
            setShareUrl(generatedUrl);
            return generatedUrl;
        } catch (e) {
            console.error("Save Error:", e);
            alert("저장 중 오류가 발생했습니다.");
            return null;
        }
    };

    // --- 🔥 핵심 저장 로직 (신규 가입 1000P + 기록) ---
    const handleSaveAndLogin = async () => {
        setIsSaving(true);
        try {
            let user = auth.currentUser;
            if (!user) {
                const provider = new GoogleAuthProvider();
                const result = await signInWithPopup(auth, provider);
                user = result.user;
            }

            if (user) {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);
                let isNewUser = false;

                // 1. 신규 유저 체크 및 포인트 지급
                if (!userSnap.exists()) {
                    isNewUser = true;
                    await setDoc(userRef, {
                        email: user.email,
                        name: user.displayName,
                        points: 1000,
                        createdAt: serverTimestamp(),
                        quizStats: { date: "", count: 0 }
                    });

                    // 🔥 [기록] 가입 축하금
                    await addDoc(collection(db, "users", user.uid, "point_history"), {
                        desc: "신규 가입 축하금",
                        amount: 1000,
                        createdAt: serverTimestamp()
                    });
                }

                // 2. 내 여행 보관함에 일정 저장
                await addDoc(collection(db, "users", user.uid, "itineraries"), { ...userInfo, ...tripPlan, createdAt: serverTimestamp() });

                alert(isNewUser ? "환영합니다! 가입 축하금 1,000P 지급 완료! 🎁" : "일정이 저장되었습니다!");
                router.push('/mypage');
            }
        } catch (error) {
            console.error("저장 실패:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                alert("로그인이 취소되었습니다.");
            } else {
                alert("저장 중 오류가 발생했습니다.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const formatTripText = (url) => {
        if (!tripPlan) return "";
        let text = `✈️ [My Trip Pro] AI 여행 일정\n\n`;
        text += `📍 제목: ${tripPlan.tripTitle}\n`;
        if (tripPlan.budgetBreakdown?.length > 0) text += `\n💰 예상 견적:\n${tripPlan.budgetBreakdown.join('\n')}\n`;
        if (url) text += `\n🔗 일정 상세 보기: ${url}`;
        return text;
    };
    const handleKakaoConsult = async () => {
        setLoadingAction('kakao');
        const url = await getOrSaveShareUrl();
        if (url) {
            const text = formatTripText(url);
            try { await navigator.clipboard.writeText(text); alert("복사되었습니다! 카톡창에 붙여넣어 주세요."); window.open('http://pf.kakao.com/_xcJhrn/chat', '_blank'); } catch (e) { window.open('http://pf.kakao.com/_xcJhrn/chat', '_blank'); }
        }
        setLoadingAction(null);
    };
    const handleShare = async () => {
        setLoadingAction('share');
        const url = await getOrSaveShareUrl();
        if (url) {
            const text = formatTripText(url);
            if (navigator.share) { try { await navigator.share({ title: tripPlan.tripTitle, text: text, url: url }); } catch (e) { } }
            else { try { await navigator.clipboard.writeText(text); alert("링크 복사 완료!"); } catch (e) { } }
        }
        setLoadingAction(null);
    };
    const handleReset = () => { if (confirm("초기 화면으로 돌아갑니다.")) window.location.reload(); };
    const handleOpenGoogleMaps = (name) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
        window.open(url, '_blank');
    };
    const handleDragStart = () => { isDragging.current = true; document.body.style.cursor = 'row-resize'; };
    useEffect(() => {
        const handleDragMove = (e) => {
            if (!isDragging.current) return;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            let newHeight = (clientY / window.innerHeight) * 100;
            if (newHeight < 10) newHeight = 10; if (newHeight > 85) newHeight = 85;
            setMapHeight(newHeight);
        };
        const handleDragEnd = () => { isDragging.current = false; document.body.style.cursor = 'default'; };
        window.addEventListener('mousemove', handleDragMove); window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('touchmove', handleDragMove); window.addEventListener('touchend', handleDragEnd);
        return () => { window.removeEventListener('mousemove', handleDragMove); window.removeEventListener('mouseup', handleDragEnd); window.removeEventListener('touchmove', handleDragMove); window.removeEventListener('touchend', handleDragEnd); };
    }, []);


    if (!data) return <div className="p-10 text-center text-gray-500">로딩 중...</div>;
    if (error) return <div className="p-5 text-red-500">에러: {error}</div>;
    if (!tripPlan) return null;

    const { tripTitle, itinerary, budgetBreakdown, estimatedCost, recommendedHotels, weather, travelTips } = tripPlan;
    const hotels = recommendedHotels || [];

    return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-start sm:items-center overflow-hidden">
            <div className="w-full max-w-[480px] h-screen sm:h-[95vh] sm:rounded-[30px] bg-gray-50 relative shadow-2xl overflow-hidden flex flex-col border border-gray-200">

                {/* 지도 영역 */}
                <div style={{ height: `${mapHeight}vh` }} className="w-full bg-gray-200 relative shrink-0">
                    <div ref={mapRef} className="w-full h-full" />
                    <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10 flex justify-between items-start">
                        <h1 className="text-lg font-bold text-white drop-shadow-md flex-1">{tripTitle}</h1>
                    </div>
                    {/* 🔥 상단 헤더 버튼: 마이페이지 이동 */}
                    <div className="absolute top-4 right-4 z-50 pointer-events-auto flex gap-2">
                        <button
                            onClick={() => router.push('/mypage')}
                            className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md text-gray-700 hover:bg-white hover:text-indigo-600 transition"
                            title="마이페이지"
                        >
                            <User size={20} />
                        </button>
                    </div>
                </div>

                {/* 하단 리스트 */}
                <div className="flex-1 bg-gray-50 -mt-6 rounded-t-3xl relative z-20 shadow-lg flex flex-col overflow-hidden">
                    {/* 핸들 & 편집 버튼 */}
                    <div onMouseDown={handleDragStart} onTouchStart={handleDragStart} className="w-full flex items-center justify-between px-6 pt-3 pb-2 bg-white rounded-t-3xl border-b border-gray-100 shrink-0 cursor-row-resize hover:bg-gray-50">
                        <div className="w-16"></div>
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                        <div className="flex gap-2">
                            {isEditMode && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAutoFixAll(); }}
                                    disabled={loadingAction === 'autoFix'}
                                    className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-full border bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100 transition shadow-sm"
                                >
                                    {loadingAction === 'autoFix' ? <Loader2 className="animate-spin" size={12} /> : <Wand2 size={12} />}
                                    전체 위치 보정
                                </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setIsEditMode(!isEditMode); }} className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border shadow-sm transition-all ${isEditMode ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                                {isEditMode ? <><Check size={14} /> 완료</> : <><Pencil size={14} /> 편집</>}
                            </button>
                        </div>
                    </div>

                    {/* ✨ 탭 메뉴 */}
                    <div className="flex border-b border-gray-200 bg-white">
                        <button onClick={() => setActiveTab('itinerary')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'itinerary' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><Calendar size={16} /> 상세 일정</button>
                        <button onClick={() => setActiveTab('quiz')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'quiz' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><BrainCircuit size={16} /> 여행지 퀴즈</button>
                    </div>

                    <div ref={scrollContainerRef} className="overflow-y-auto flex-1 px-5 pb-24 bg-white custom-scrollbar scroll-smooth">
                        {activeTab === 'itinerary' ? (
                            <>
                                {/* 💰 예산 */}
                                <div className="mb-6 mt-6">
                                    <h3 className="text-[#FF5A5F] font-bold text-base mb-2 px-1">예산 배분 제안</h3>
                                    <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm space-y-2">
                                        {isEditMode ? (
                                            <div className="space-y-2">
                                                {tripPlan.budgetBreakdown?.map((item, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center">
                                                        <input type="text" value={item} onChange={(e) => handleBudgetChange(idx, e.target.value)} className="flex-1 text-sm p-2 border border-rose-200 rounded-lg outline-none focus:border-[#FF5A5F] bg-rose-50/30" />
                                                        <button onClick={() => handleDeleteBudget(idx)} className="p-2 text-rose-400 hover:text-rose-600 bg-rose-50 rounded-lg"><Trash2 size={14} /></button>
                                                    </div>
                                                ))}
                                                <button onClick={handleAddBudget} className="w-full py-2 text-xs font-bold text-rose-500 border border-dashed border-rose-300 rounded-lg hover:bg-rose-50 flex items-center justify-center gap-1"><Plus size={12} /> 예산 항목 추가</button>
                                            </div>
                                        ) : (
                                            (tripPlan.budgetBreakdown?.length > 0) ? tripPlan.budgetBreakdown.map((item, idx) => (<div key={idx} className="flex items-start gap-2 text-sm"><div className="min-w-[4px] h-[4px] bg-[#FF5A5F] rounded-full mt-2"></div><p className="text-gray-700">{item}</p></div>)) : (<p className="text-gray-700 text-sm">{estimatedCost || "예산 정보 없음"}</p>)
                                        )}
                                    </div>
                                </div>

                                {/* 🏨 숙소 */}
                                {hotels.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2 px-1"><BedDouble size={16} /> 추천 숙소</h3>
                                        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
                                            {hotels.map((hotel, idx) => (
                                                <div key={idx} className="place-card min-w-[220px] bg-white p-3 rounded-xl border border-gray-200 shadow-sm relative"
                                                    data-lat={hotel.coordinates?.lat} data-lng={hotel.coordinates?.lng}
                                                    onClick={() => { googleMapRef.current?.panTo(hotel.coordinates); googleMapRef.current?.setZoom(16); }}>
                                                    <div className="flex items-center gap-2 mb-1"><span className="bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">추천 {idx + 1}</span><h4 className="font-bold text-sm truncate">{hotel.name}</h4></div>
                                                    <p className="text-xs text-[#FF5A5F] font-bold mb-1">{hotel.priceRange}</p><p className="text-[10px] text-gray-500 leading-relaxed bg-gray-50 p-1.5 rounded line-clamp-2">{hotel.description}</p>
                                                    <button className="absolute top-3 right-3 text-gray-400 hover:text-black" onClick={(e) => { e.stopPropagation(); googleMapRef.current?.panTo(hotel.coordinates); googleMapRef.current?.setZoom(16); }}><MapPin size={14} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 🗓️ 일정 */}
                                {itinerary?.map((dayItem, dayIdx) => {
                                    const dayColor = DAY_COLORS[dayIdx % DAY_COLORS.length];
                                    return (
                                        <div key={dayIdx} className="mb-8">
                                            <div className="sticky top-0 bg-white/95 backdrop-blur-sm py-3 z-20 border-b border-gray-50 mb-4 flex items-center gap-2">
                                                <span className="text-xs font-bold text-white px-2 py-1 rounded-md shadow-sm" style={{ backgroundColor: dayColor }}>Day {dayItem.day}</span>
                                                <span className="text-sm text-gray-500 font-medium">{dayItem.date}</span>
                                            </div>

                                            <div className="relative pl-4 ml-3 space-y-6" style={{ borderLeft: `2px solid ${dayColor}30` }}>
                                                {dayItem.places.map((place, placeIdx) => {
                                                    const nextPlace = dayItem.places[placeIdx + 1];
                                                    const distance = (placeIdx < dayItem.places.length - 1) ? calculateDistance(place, nextPlace) : null;

                                                    return (
                                                        <div key={placeIdx} className="relative pl-6">
                                                            <div className="absolute -left-[21px] top-0 w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-md ring-4 ring-white z-10" style={{ backgroundColor: dayColor }}>{placeIdx + 1}</div>

                                                            <div className={`place-card bg-white p-3 rounded-xl border transition ${isEditMode ? 'border-indigo-200 shadow-inner' : 'border-gray-100 hover:border-gray-300 shadow-sm'}`} data-lat={place.coordinates?.lat} data-lng={place.coordinates?.lng}>
                                                                {isEditMode ? (
                                                                    <div className="space-y-2">
                                                                        <div className="flex gap-2">
                                                                            <input type="text" value={place.name} onChange={(e) => handleEditChange(dayIdx, placeIdx, 'name', e.target.value)} className="flex-1 font-bold text-sm p-1 border-b border-indigo-200 outline-none focus:border-indigo-500 bg-transparent" placeholder="장소명" />
                                                                            <button onClick={() => handleUpdateLocation(dayIdx, placeIdx, place.name)} className="p-1.5 rounded bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:text-blue-700 transition" title="위치 찾기"><Search size={14} /></button>
                                                                            <div className="flex gap-1">
                                                                                <button onClick={() => handleMovePlace(dayIdx, placeIdx, -1)} disabled={placeIdx === 0} className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30"><ArrowUp size={12} /></button>
                                                                                <button onClick={() => handleMovePlace(dayIdx, placeIdx, 1)} disabled={placeIdx === dayItem.places.length - 1} className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30"><ArrowDown size={12} /></button>
                                                                            </div>
                                                                        </div>
                                                                        <textarea value={place.description} onChange={(e) => handleEditChange(dayIdx, placeIdx, 'description', e.target.value)} className="w-full text-xs p-1 border border-gray-200 rounded outline-none focus:border-indigo-500 bg-gray-50 h-16 resize-none" placeholder="설명" />
                                                                        <div className="flex justify-end pt-1">
                                                                            <button onClick={() => handleDeletePlace(dayIdx, placeIdx)} className="flex items-center gap-1 text-[10px] text-red-500 font-bold bg-red-50 px-2 py-1 rounded hover:bg-red-100"><Trash2 size={10} /> 삭제</button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div onClick={() => { googleMapRef.current?.panTo(place.coordinates); googleMapRef.current?.setZoom(17); }}>
                                                                        <div className="flex justify-between items-start"><h3 className="text-base font-bold text-gray-900">{place.name}</h3><span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{place.category}</span></div>
                                                                        <p className="text-sm text-gray-600 mt-1">{place.description}</p>
                                                                        <button className="mt-2 flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg transition shadow-sm" style={{ backgroundColor: `${dayColor}15`, color: dayColor }} onClick={(e) => { e.stopPropagation(); handleOpenGoogleMaps(place.name); }}><ExternalLink size={10} /> 길찾기</button>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {distance && (
                                                                <div className="pl-2 py-3 flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                                                                    <div className="w-0.5 h-3 bg-gray-200 rounded-full"></div>
                                                                    <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                                        <Navigation size={10} className="text-blue-400" />
                                                                        직선거리 약 <span className="text-gray-600 font-bold">{distance}km</span> 이동
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {isEditMode && (<div className="pl-6 pt-2"><button onClick={() => handleAddPlace(dayIdx)} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 text-xs font-bold flex items-center justify-center gap-1 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition"><Plus size={14} /> 장소 추가하기</button></div>)}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* ☀️ 날씨 & 💡 꿀팁 */}
                                <div className="mb-6">
                                    {(weather || (travelTips && travelTips.length > 0)) && (
                                        <div className="grid grid-cols-1 gap-3">
                                            {weather && (
                                                <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                                                    <div className="bg-white p-2 rounded-full shadow-sm text-amber-500"><Sun size={20} /></div>
                                                    <div>
                                                        <p className="text-sm font-bold text-blue-900">여행지 날씨</p>
                                                        <p className="text-sm text-blue-700">{weather}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {travelTips?.length > 0 && (
                                                <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                                                    <div className="bg-white p-2 rounded-full shadow-sm text-amber-500 shrink-0"><Lightbulb size={20} /></div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-bold text-amber-900 mb-1">여행 꿀팁</p>
                                                        <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                                                            {travelTips.map((tip, i) => <li key={i}>{tip}</li>)}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 하단 버튼 (기존) */}
                                <div className="pt-2 pb-12" data-html2canvas-ignore="true">
                                    <button onClick={handleReset} className="w-full bg-white border border-gray-300 text-gray-700 py-3.5 rounded-xl font-bold text-base shadow-sm mb-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 active:scale-98 transition"><RotateCcw size={18} /> 조건 변경 / 견적 다시 받기</button>
                                    <button onClick={handleKakaoConsult} disabled={loadingAction !== null} className="w-full bg-[#FAE100] text-[#371D1E] py-3.5 rounded-xl font-bold text-lg shadow-md mb-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-[#FCE620] active:scale-98 transition disabled:opacity-70">
                                        {loadingAction === 'kakao' ? <Loader2 className="animate-spin" /> : <MessageCircle size={20} />}
                                        {loadingAction === 'kakao' ? (isEditMode ? '수정된 일정 저장 중...' : '저장 후 이동 중...') : '카카오톡 상담하기'}
                                    </button>
                                    <div className="flex gap-3">
                                        <button onClick={handleShare} disabled={loadingAction !== null} className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-900 active:scale-98 transition disabled:opacity-70">
                                            {loadingAction === 'share' ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />}
                                            {loadingAction === 'share' ? '생성 중...' : '일정 공유'}
                                        </button>
                                        <button onClick={() => alert("PDF 다운로드 기능 점검 중입니다.")} className="flex-1 bg-white text-gray-700 border border-gray-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 active:scale-98 transition"><Download size={16} /> PDF</button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // --- 탭 2: 여행지 퀴즈 (수정됨: 갱신 버튼 포함) ---
                            <div className="mt-6 mb-24">
                                <div className="bg-indigo-600 text-white p-6 rounded-2xl mb-4 text-center shadow-lg">
                                    <h3 className="text-xl font-bold mb-2">🧠 {userInfo.destination} 여행 능력고사</h3>
                                    <p className="text-indigo-100 text-sm mb-4">
                                        3문제 모두 맞히면 200P 지급! (일 2회 제한)
                                    </p>
                                    <button
                                        onClick={handleRefreshQuiz}
                                        disabled={isQuizLoading}
                                        className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-2 mx-auto transition backdrop-blur-sm"
                                    >
                                        {isQuizLoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                                        다른 문제 풀기
                                    </button>
                                </div>

                                {isQuizLoading ? (
                                    <div className="text-center py-10 text-gray-500">
                                        <Loader2 className="animate-spin mx-auto mb-2 text-indigo-500" size={32} />
                                        <p>새로운 문제를 출제하고 있습니다...</p>
                                    </div>
                                ) : (
                                    <TravelQuiz aiQuizData={currentQuizData || []} />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 🔥 하단 고정 버튼: 일정 저장 & 1000P 받기 (신규 유저 유도용) */}
                {!tripId && ( // 이미 저장된 여행(tripId 존재)이 아닐 때만 노출
                    <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-30">
                        <button
                            onClick={handleSaveAndLogin}
                            disabled={isSaving}
                            className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95 shadow-lg"
                        >
                            {isSaving ? "저장 중..." : (
                                <>
                                    <Save size={20} />
                                    일정 저장 & 1,000P 받기 (신규가입 혜택)
                                </>
                            )}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}