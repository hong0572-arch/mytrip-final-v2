'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    MessageCircle, Share2, Download, ExternalLink, BedDouble, Loader2,
    Sun, Lightbulb, RotateCcw, Pencil, Check, Trash2, Plus,
    ArrowUp, ArrowDown, MapPin, Search, Wand2, Navigation,
    Calendar, BrainCircuit, Save, User, RefreshCw, ChevronUp, ChevronDown, Home,
    UserPlus, X, MessageSquare, Sparkles, ChevronRight, CheckSquare, Square, Send
} from 'lucide-react';

import { db, auth } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, setDoc, increment, getDoc, getDocs } from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import TravelQuiz from './TravelQuiz';

import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

const getKlookLink = (keyword, markerId, language) => {
    const encodedKeyword = encodeURIComponent(keyword);
    const isKo = language !== 'en';
    const baseUrl = isKo ? "https://www.klook.com/ko/search" : "https://www.klook.com/search";
    const langParam = isKo ? "ko_KR" : "en_US";
    const currParam = isKo ? "KRW" : "USD";
    const klookUrl = `${baseUrl}?query=${encodedKeyword}&lang=${langParam}&currency=${currParam}`;
    return `https://tp.media/r?marker=${markerId}&trs=488085&p=4110&u=${encodeURIComponent(klookUrl)}&campaign_id=137`;
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const DAY_COLORS = ['#FF4B4B', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

export default function AIResult({ data, userInfo, tripId, onReset, language = 'ko' }) {
    const router = useRouter();

    const [tripPlan, setTripPlan] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [error, setError] = useState(null);
    const [loadingAction, setLoadingAction] = useState(null);
    const [shareUrl, setShareUrl] = useState(null);
    const [activeTab, setActiveTab] = useState('itinerary');
    const [isSaving, setIsSaving] = useState(false);
    const [mapHeight, setMapHeight] = useState(40);

    const [currentQuizData, setCurrentQuizData] = useState(null);
    const [isQuizLoading, setIsQuizLoading] = useState(false);
    // showActions 상태는 더 이상 필요 없으므로 제거해도 되지만, 하위 호환을 위해 둡니다.

    const [realMates, setRealMates] = useState([]);
    const [showMatchModal, setShowMatchModal] = useState(false);

    const [showSaveModal, setShowSaveModal] = useState(false);
    const [shareToFeed, setShareToFeed] = useState(true);

    const isSavingRef = useRef(false);
    const isDragging = useRef(false);
    const hasAutoFixed = useRef(false);
    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    const markersRef = useRef([]);
    const polylineRef = useRef([]);
    const scrollContainerRef = useRef(null);
    const observerRef = useRef(null);

    // ✨ 1. DB에서 진짜 유저 불러오기
    useEffect(() => {
        if (tripId) return;

        const fetchRealUsers = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "users"));
                const users = [];
                querySnapshot.forEach((docSnap) => {
                    if (auth.currentUser && docSnap.id !== auth.currentUser.uid) {
                        users.push({ id: docSnap.id, ...docSnap.data() });
                    }
                });
                const shuffled = users.sort(() => 0.5 - Math.random());
                setRealMates(shuffled.slice(0, 2));
            } catch (error) {
                console.error("유저 목록 불러오기 실패:", error);
            }
        };

        fetchRealUsers();

        const timer = setTimeout(() => setShowMatchModal(true), 3000);
        return () => clearTimeout(timer);
    }, [tripId]);

    const handleRequestRealMate = async (targetUser) => {
        if (!auth.currentUser) return alert("로그인이 필요합니다. 먼저 일정을 저장해주세요!");
        try {
            await addDoc(collection(db, "match_requests"), {
                type: "workspace_invite",
                senderId: auth.currentUser.uid,
                senderName: auth.currentUser.displayName || "여행자",
                targetMateId: targetUser.id,
                targetMateName: targetUser.name,
                destination: data?.destination || "여행",
                status: "pending",
                message: "방금 만든 따끈따끈한 AI 여행 일정에 동행을 제안합니다! 👋",
                createdAt: serverTimestamp()
            });
            alert(`${targetUser.name}님에게 동행 요청을 보냈습니다! (상대방의 우편함으로 도착합니다) 💌`);
            setShowMatchModal(false);
        } catch (error) {
            alert("요청 발송 실패");
        }
    };

    useEffect(() => {
        const checkRedirectResult = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result && result.user) {
                    const pendingData = sessionStorage.getItem('pendingTripSave');
                    if (pendingData) {
                        if (isSavingRef.current) return;
                        isSavingRef.current = true;
                        setIsSaving(true);

                        const { savedUserInfo, savedTripPlan, shouldShareToFeed } = JSON.parse(pendingData);
                        const user = result.user;
                        const userRef = doc(db, "users", user.uid);
                        const userSnap = await getDoc(userRef);

                        let isNewUser = false;
                        if (!userSnap.exists()) {
                            isNewUser = true;
                            await setDoc(userRef, { email: user.email, name: user.displayName, points: 1000, createdAt: serverTimestamp(), quizStats: { date: "", count: 0 } });
                            await addDoc(collection(db, "users", user.uid, "point_history"), { desc: "신규 가입 축하금", amount: 1000, createdAt: serverTimestamp() });
                        }

                        const newTripRef = await addDoc(collection(db, "trips"), {
                            ...savedUserInfo,
                            ...savedTripPlan,
                            memberIds: [user.uid],
                            membersInfo: [{ uid: user.uid, name: user.displayName || "여행자", avatar: user.photoURL || "https://i.pravatar.cc/150?u=me" }],
                            hostId: user.uid,
                            createdAt: serverTimestamp()
                        });

                        if (shouldShareToFeed) {
                            const finalDest = savedTripPlan.destination || savedUserInfo?.destination || savedTripPlan.tripTitle?.split(' ')[0] || "Seoul";
                            const mapImg = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(finalDest)}&zoom=12&size=600x600&maptype=roadmap&markers=color:red%7C${encodeURIComponent(finalDest)}&key=${GOOGLE_MAPS_API_KEY}`;

                            await addDoc(collection(db, "feeds"), {
                                author: user.displayName, avatar: user.photoURL, authorUid: user.uid,
                                type: 'map', title: savedTripPlan.tripTitle, image: mapImg,
                                tags: [`#${savedTripPlan.destination}`, "#AI여행", "#TripMaker"],
                                likes: 0, comments: 0, forks: 0, mockTripData: { ...savedTripPlan }, createdAt: serverTimestamp()
                            });

                            // ✨ 하루 한 번만 피드 보상 지급
                            const data = userSnap.exists() ? userSnap.data() : null;
                            const today = new Date().toISOString().split('T')[0];

                            if (data && data.lastFeedRewardDate === today) {
                                console.log("이미 오늘 피드 보상을 받았습니다.");
                            } else {
                                await updateDoc(userRef, {
                                    points: increment(100),
                                    lastFeedRewardDate: today
                                });
                                await addDoc(collection(db, "users", user.uid, "point_history"), {
                                    reason: "여행 일정 피드 공유 (일일 보상)",
                                    amount: 100,
                                    createdAt: serverTimestamp()
                                });
                            }
                        }

                        const msg = isNewUser ? "가입 축하금 1,000P" : "저장 완료!";
                        const today = new Date().toISOString().split('T')[0];
                        const userDataForMsg = userSnap.exists() ? userSnap.data() : null;
                        const hasTodayReward = userDataForMsg && userDataForMsg.lastFeedRewardDate === today;
                        const feedMsg = (shouldShareToFeed && !hasTodayReward) ? " + 피드 공유 100P 적립! 💰" : (shouldShareToFeed ? " + 피드 공유 완료!" : "");
                        alert(`${msg}${feedMsg}`);

                        sessionStorage.removeItem('pendingTripSave');
                        setIsSaving(false);
                        isSavingRef.current = false;
                        router.push('/mypage');
                    }
                }
            } catch (error) {
                console.error("Redirect Auth Error:", error);
                setIsSaving(false);
                isSavingRef.current = false;
            }
        };
        checkRedirectResult();
    }, [router]);

    const PDF_TEMPLATE_ID = "pdf-document-template";
    const CAPTURE_ID = "trip-result-container";

    useEffect(() => {
        if (!data) return;
        try {
            let initialData = data;
            if (typeof data === 'string') {
                const cleanData = data.replace(/```json/gi, '').replace(/```/g, '').trim();
                initialData = JSON.parse(cleanData);
            }
            if (!initialData.budgetBreakdown) initialData.budgetBreakdown = [];
            if (initialData.itinerary) {
                initialData.itinerary.forEach(day => {
                    day.places.forEach(place => {
                        if (place.lat && place.lng && !isNaN(parseFloat(place.lat))) {
                            place.coordinates = { lat: parseFloat(place.lat), lng: parseFloat(place.lng) };
                        }
                    });
                });
            }
            setTripPlan(initialData);
            if (initialData.quiz) setCurrentQuizData(initialData.quiz);
        } catch (e) { console.error("JSON Error:", e); setError(e.message); }
    }, [data]);

    const handleRefreshQuiz = async () => {
        const destination = tripPlan?.tripTitle?.split(' ')[0] || userInfo?.destination;
        if (!destination) return;
        setIsQuizLoading(true);
        try {
            const response = await fetch('/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destination }) });
            const newData = await response.json();
            if (newData.result) setCurrentQuizData(newData.result);
        } catch (error) { console.error(error); } finally { setIsQuizLoading(false); }
    };

    const calculateDistance = (place1, place2) => {
        if (!place1?.coordinates || !place2?.coordinates) return null;
        const R = 6371; const dLat = (place2.coordinates.lat - place1.coordinates.lat) * (Math.PI / 180); const dLon = (place2.coordinates.lng - place1.coordinates.lng) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(place1.coordinates.lat * (Math.PI / 180)) * Math.cos(place2.coordinates.lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1);
    };

    useEffect(() => {
        if (!tripPlan || !tripPlan.itinerary) return;
        const loadMap = () => {
            if (!window.google || !mapRef.current) return;
            if (!googleMapRef.current) {
                const startLocation = tripPlan.itinerary[0]?.places[0]?.coordinates || { lat: 35.6895, lng: 139.6917 };
                googleMapRef.current = new google.maps.Map(mapRef.current, { center: startLocation, zoom: 13, disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }] });
            }
            const map = googleMapRef.current;
            markersRef.current.forEach(m => m.setMap(null)); polylineRef.current.forEach(p => p.setMap(null));
            markersRef.current = []; polylineRef.current = [];
            const bounds = new google.maps.LatLngBounds();
            tripPlan.itinerary.forEach((dayItem, index) => {
                const dayColor = DAY_COLORS[index % DAY_COLORS.length];
                const path = [];
                dayItem.places.forEach((place, placeIdx) => {
                    if (place.coordinates?.lat && place.coordinates?.lng) {
                        path.push(place.coordinates); bounds.extend(place.coordinates);
                        const marker = new google.maps.Marker({ position: place.coordinates, map, icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: dayColor, fillOpacity: 1, strokeColor: "white", strokeWeight: 2, scale: 12 }, label: { text: (placeIdx + 1).toString(), color: "white", fontWeight: "bold", fontSize: "12px" }, zIndex: 100 + index });
                        markersRef.current.push(marker);
                    }
                });
                if (path.length > 1) { const line = new google.maps.Polyline({ path, geodesic: true, strokeColor: dayColor, strokeOpacity: 0.8, strokeWeight: 4, map }); polylineRef.current.push(line); }
            });
            tripPlan.recommendedHotels?.forEach((hotel) => {
                if (hotel.coordinates?.lat && hotel.coordinates?.lng) {
                    bounds.extend(hotel.coordinates);
                    const marker = new google.maps.Marker({ position: hotel.coordinates, map, label: { text: "H", color: "white", fontWeight: "bold", fontSize: "10px" }, icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: "#111827", fillOpacity: 1, strokeColor: "white", strokeWeight: 2, scale: 10 }, title: hotel.name, zIndex: 200 });
                    markersRef.current.push(marker);
                }
            });
            if (!bounds.isEmpty()) map.fitBounds(bounds);
            if (!tripId && !hasAutoFixed.current) { hasAutoFixed.current = true; performSilentAutoFix(map); }
        };
        if (!window.google) { const script = document.createElement("script"); script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`; script.async = true; script.defer = true; script.onload = loadMap; document.head.appendChild(script); } else { loadMap(); }
    }, [tripPlan]);

    const performSilentAutoFix = async (mapInstance) => {
        if (!mapInstance || !tripPlan) return;
        const service = new google.maps.places.PlacesService(mapInstance);
        const newPlan = { ...tripPlan }; const region = tripPlan.destination || ""; let isUpdated = false; const updates = [];
        newPlan.itinerary.forEach((dayItem, dayIdx) => {
            dayItem.places.forEach((place, placeIdx) => {
                const promise = new Promise((resolve) => {
                    if (place.coordinates && place.coordinates.lat && place.coordinates.lng) { resolve(); return; }
                    setTimeout(() => {
                        let searchQuery = place.name; if (region && !searchQuery.includes(region)) { searchQuery = `${region} ${searchQuery}`; }
                        service.findPlaceFromQuery({ query: searchQuery, fields: ['geometry'] }, (results, status) => {
                            if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
                                const location = results[0].geometry.location; const currentPlace = newPlan.itinerary[dayIdx].places[placeIdx]; const oldLat = currentPlace.coordinates ? currentPlace.coordinates.lat : null; const newLat = location.lat();
                                if (oldLat === null || Math.abs(oldLat - newLat) > 0.0001) { currentPlace.coordinates = { lat: location.lat(), lng: location.lng() }; isUpdated = true; }
                            } resolve();
                        });
                    }, dayIdx * 200 + placeIdx * 200);
                }); updates.push(promise);
            });
        });
        await Promise.all(updates); if (isUpdated) { setTripPlan({ ...newPlan }); if (!tripId) setShareUrl(null); }
    };

    useEffect(() => {
        if (!tripPlan || !scrollContainerRef.current) return;
        if (observerRef.current) observerRef.current.disconnect();
        const callback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const lat = parseFloat(entry.target.getAttribute('data-lat')); const lng = parseFloat(entry.target.getAttribute('data-lng'));
                    if (googleMapRef.current && !isNaN(lat) && !isNaN(lng)) { googleMapRef.current.panTo({ lat, lng }); if (googleMapRef.current.getZoom() < 14) googleMapRef.current.setZoom(15); }
                }
            });
        };
        observerRef.current = new IntersectionObserver(callback, { root: scrollContainerRef.current, threshold: 0.6, rootMargin: '-20% 0px -20% 0px' });
        setTimeout(() => { const cards = document.querySelectorAll('.place-card'); cards.forEach((card) => observerRef.current.observe(card)); }, 500);
        return () => { if (observerRef.current) observerRef.current.disconnect(); };
    }, [tripPlan, activeTab]);

    const handleUpdateLocation = (dayIndex, placeIndex, queryName) => {
        if (!window.google || !googleMapRef.current || !queryName) return;
        const region = tripPlan.destination || ""; let finalQuery = queryName; if (region && !queryName.includes(region)) finalQuery = `${region} ${queryName}`;
        const service = new google.maps.places.PlacesService(googleMapRef.current);
        service.findPlaceFromQuery({ query: finalQuery, fields: ['name', 'geometry'] }, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
                const location = results[0].geometry.location; const newCoords = { lat: location.lat(), lng: location.lng() }; const newPlan = { ...tripPlan };
                newPlan.itinerary[dayIndex].places[placeIndex].coordinates = newCoords; setTripPlan(newPlan); if (!tripId) setShareUrl(null);
                googleMapRef.current.panTo(newCoords); googleMapRef.current.setZoom(16); alert(`✅ '${results[0].name}' 위치로 보정했습니다!`);
            } else { alert(`❌ '${finalQuery}'를 찾을 수 없습니다.`); }
        });
    };

    const handleAutoFixAll = async () => { if (!window.google || !googleMapRef.current) { alert("지도가 로딩되지 않았습니다."); return; } if (!confirm("모든 장소의 위치를 여행지 기준으로 재설정하시겠습니까?")) return; setLoadingAction('autoFix'); hasAutoFixed.current = false; await performSilentAutoFix(googleMapRef.current); setLoadingAction(null); alert("전체 위치 보정이 완료되었습니다."); };
    const handleBudgetChange = (index, value) => { const newPlan = { ...tripPlan }; newPlan.budgetBreakdown[index] = value; setTripPlan(newPlan); if (!tripId) setShareUrl(null); };
    const handleAddBudget = () => { const newPlan = { ...tripPlan }; if (!newPlan.budgetBreakdown) newPlan.budgetBreakdown = []; newPlan.budgetBreakdown.push("새 항목: 0원"); setTripPlan(newPlan); if (!tripId) setShareUrl(null); };
    const handleDeleteBudget = (index) => { const newPlan = { ...tripPlan }; newPlan.budgetBreakdown.splice(index, 1); setTripPlan(newPlan); if (!tripId) setShareUrl(null); };
    const handleEditChange = (dayIndex, placeIndex, field, value) => { const newPlan = { ...tripPlan }; newPlan.itinerary[dayIndex].places[placeIndex][field] = value; setTripPlan(newPlan); if (!tripId) setShareUrl(null); };
    const handleDeletePlace = (dayIndex, placeIndex) => { if (!confirm("이 장소를 삭제하시겠습니까?")) return; const newPlan = { ...tripPlan }; newPlan.itinerary[dayIndex].places.splice(placeIndex, 1); newPlan.itinerary[dayIndex].places.forEach((p, i) => p.order = i + 1); setTripPlan(newPlan); if (!tripId) setShareUrl(null); };
    const handleAddPlace = (dayIndex) => { const newPlan = { ...tripPlan }; const newOrder = newPlan.itinerary[dayIndex].places.length + 1; newPlan.itinerary[dayIndex].places.push({ order: newOrder, name: "새로운 장소", category: "기타", description: "설명을 입력해주세요.", coordinates: { lat: 35.6895, lng: 139.6917 } }); setTripPlan(newPlan); if (!tripId) setShareUrl(null); };
    const handleMovePlace = (dayIndex, placeIndex, direction) => { const newPlan = { ...tripPlan }; const places = newPlan.itinerary[dayIndex].places; const targetIndex = placeIndex + direction; if (targetIndex < 0 || targetIndex >= places.length) return;[places[placeIndex], places[targetIndex]] = [places[targetIndex], places[placeIndex]]; places.forEach((p, i) => p.order = i + 1); setTripPlan(newPlan); if (!tripId) setShareUrl(null); };

    const getOrSaveShareUrl = async () => {
        if (shareUrl && !isEditMode) return shareUrl;
        try {
            // ✨ Firebase는 undefined 값을 허용하지 않으므로 정제 작업 필요
            const sanitizedTripPlan = JSON.parse(JSON.stringify(tripPlan));
            const saveData = { 
                ...sanitizedTripPlan, 
                contactInfo: userInfo?.contact || "정보 없음", 
                isEdited: Boolean(isEditMode || tripPlan.isEdited), 
                createdAt: serverTimestamp() 
            };
            
            const docRef = await addDoc(collection(db, "shared_links"), saveData);
            const generatedUrl = `${window.location.origin}/share/${docRef.id}`;
            setShareUrl(generatedUrl);
            return generatedUrl;
        } catch (e) { 
            console.error("Save Error Details:", e); 
            // 구체적인 에러 메시지를 포함하여 사용자에게 안내 (디버깅 지원)
            alert(`공유 링크 생성 중 오류가 발생했습니다:\n${e.code || e.message || '알 수 없는 오류'}`); 
            return null; 
        }
    };

    const handleDownloadPDF = async () => {
        const source = document.getElementById(PDF_TEMPLATE_ID);
        if (!source) return;
        setLoadingAction('pdf');
        try {
            const printContainerId = 'pdf-print-container';
            let printContainer = document.getElementById(printContainerId);
            if (printContainer) printContainer.remove();
            printContainer = document.createElement('div');
            printContainer.id = printContainerId; printContainer.style.position = 'fixed'; printContainer.style.top = '0'; printContainer.style.left = '0'; printContainer.style.zIndex = '-9999'; printContainer.style.backgroundColor = '#f0f0f0';
            document.body.appendChild(printContainer);
            const A4_WIDTH_MM = 210; const A4_HEIGHT_MM = 297; const PAGE_WIDTH_PX = 794; const PAGE_HEIGHT_PX = 1123; const PADDING_PX = 56;
            const createPage = () => {
                const page = document.createElement('div'); page.className = 'pdf-page bg-white shadow-lg'; page.style.width = `${PAGE_WIDTH_PX}px`; page.style.height = `${PAGE_HEIGHT_PX}px`; page.style.padding = `${PADDING_PX}px`; page.style.boxSizing = 'border-box'; page.style.marginBottom = '20px'; page.style.overflow = 'hidden'; page.style.position = 'relative'; page.style.fontFamily = 'sans-serif';
                const contentArea = document.createElement('div'); contentArea.style.width = '100%'; contentArea.style.height = '100%'; contentArea.className = 'flex flex-col'; page.appendChild(contentArea); printContainer.appendChild(page);
                return { page, content: contentArea };
            };
            const items = Array.from(source.querySelectorAll('.pdf-item')); const pages = []; let currentPage = createPage(); pages.push(currentPage);
            for (const item of items) {
                const clone = item.cloneNode(true); clone.style.marginTop = '0'; clone.style.marginBottom = '20px'; currentPage.content.appendChild(clone);
                if (currentPage.content.scrollHeight > currentPage.content.clientHeight) { currentPage.content.removeChild(clone); currentPage = createPage(); pages.push(currentPage); currentPage.content.appendChild(clone); }
            }
            await new Promise(resolve => setTimeout(resolve, 800)); const pdf = new jsPDF('p', 'mm', 'a4');
            for (let i = 0; i < pages.length; i++) {
                const imgData = await toPng(pages[i].page, { quality: 1.0, pixelRatio: 2, cacheBust: true, backgroundColor: 'white', fontEmbedCSS: '' });
                if (i > 0) pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
            }
            pdf.save(`${tripPlan.tripTitle || 'trip_plan'}.pdf`); document.body.removeChild(printContainer);
        } catch (error) { alert("PDF 생성 중 오류가 발생했습니다."); } finally { setLoadingAction(null); }
    };

    const formatTripText = (url) => {
        if (!tripPlan) return ""; let text = `✈️ [Trip Maker] AI가 만든 여행 일정\n\n📍 제목: ${tripPlan.tripTitle}\n`;
        if (tripPlan.budgetBreakdown?.length > 0) text += `\n💰 예상 견적:\n${tripPlan.budgetBreakdown.join('\n')}\n`;
        if (url) text += `\n🔗 일정 상세 보기: ${url}`; return text;
    };

    const handleKakaoConsult = async () => { 
        setLoadingAction('kakao'); 
        const url = await getOrSaveShareUrl(); 
        if (url) { 
            try { 
                await navigator.clipboard.writeText(formatTripText(url)); 
                alert("일정 내용이 복사되었습니다!\n상담 채팅방에 '붙여넣기' 해주세요."); 
                window.open('http://pf.kakao.com/_xcJhrn/chat', '_blank'); 
            } catch (e) { 
                window.open('http://pf.kakao.com/_xcJhrn/chat', '_blank'); 
            } 
        } 
        setLoadingAction(null); 
    };
    const handleShare = async () => { setLoadingAction('share'); const url = await getOrSaveShareUrl(); if (url) { const text = formatTripText(url); if (navigator.share) { try { await navigator.share({ title: tripPlan.tripTitle, text: text }); } catch (e) { } } else { try { await navigator.clipboard.writeText(text); alert("링크가 복사되었습니다!"); } catch (e) { } } } setLoadingAction(null); };

    const executeSave = async () => {
        if (isSavingRef.current) return;
        isSavingRef.current = true;
        setIsSaving(true);

        try {
            let user = auth.currentUser;
            if (!user) {
                const provider = new GoogleAuthProvider();
                const isMobileApp = window.matchMedia('(display-mode: standalone)').matches || window.innerWidth <= 768;
                if (isMobileApp) {
                    sessionStorage.setItem('pendingTripSave', JSON.stringify({ savedUserInfo: userInfo, savedTripPlan: tripPlan, shouldShareToFeed: shareToFeed }));
                    await signInWithRedirect(auth, provider);
                    return;
                } else {
                    const result = await signInWithPopup(auth, provider);
                    user = result.user;
                }
            }

            if (user) {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);
                let isNewUser = false;
                if (!userSnap.exists()) {
                    isNewUser = true;
                    await setDoc(userRef, { email: user.email, name: user.displayName, points: 1000, createdAt: serverTimestamp(), quizStats: { date: "", count: 0 } });
                    await addDoc(collection(db, "users", user.uid, "point_history"), { desc: "신규 가입 축하금", amount: 1000, createdAt: serverTimestamp() });
                }

                const newTripRef = await addDoc(collection(db, "trips"), {
                    ...userInfo,
                    ...tripPlan,
                    memberIds: [user.uid],
                    membersInfo: [{
                        uid: user.uid,
                        name: user.displayName || "여행자",
                        avatar: user.photoURL || "https://i.pravatar.cc/150?u=me"
                    }],
                    hostId: user.uid,
                    createdAt: serverTimestamp()
                });

                if (shareToFeed) {
                    const finalDestination = tripPlan.destination || userInfo?.destination || tripPlan.tripTitle?.split(' ')[0] || "Seoul";
                    const mapImageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(finalDestination)}&zoom=12&size=600x600&maptype=roadmap&markers=color:red%7C${encodeURIComponent(finalDestination)}&key=${GOOGLE_MAPS_API_KEY}`;

                    await addDoc(collection(db, "feeds"), {
                        author: user.displayName, authorUid: user.uid, avatar: user.photoURL,
                        type: 'map', title: tripPlan.tripTitle, image: mapImageUrl,
                        tags: [`#${tripPlan.destination}`, "#여행동선", "#TripMaker"],
                        likes: 0, likedBy: [], comments: 0, forks: 0,
                        mockTripData: { ...tripPlan }, createdAt: serverTimestamp()
                    });

                    // ✨ 하루 한 번만 피드 보상 지급
                    const userData = userSnap.exists() ? userSnap.data() : null;
                    const today = new Date().toISOString().split('T')[0];

                    if (userData && userData.lastFeedRewardDate === today) {
                        console.log("이미 오늘 피드 보상을 받았습니다.");
                    } else {
                        await updateDoc(userRef, {
                            points: increment(100),
                            lastFeedRewardDate: today
                        });
                        await addDoc(collection(db, "users", user.uid, "point_history"), {
                            reason: "여행 일정 피드 공유 (일일 보상)",
                            amount: 100,
                            createdAt: serverTimestamp()
                        });
                        console.log("피드 공유 보상 100P 지급 완료");
                    }
                }

                alert(isNewUser ? "가입 축하금 1,000P + 일정 저장 완료!" : "✨ 여행 워크스페이스가 생성되었습니다!");
                router.push('/mypage');
            }
        } catch (error) {
            console.error("저장 실패:", error);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
            isSavingRef.current = false;
        }
    };

    const handleSaveClick = () => {
        if (tripId) { alert("이미 저장된 일정입니다."); return; }
        setShowSaveModal(true);
    };

    const handleReset = () => { if (window.confirm("초기 화면으로 돌아가서 새로운 여행을 계획하시겠습니까?")) { window.location.href = '/'; } };
    const handleOpenGoogleMaps = (place) => {
        const { name } = place;
        const destContext = tripPlan?.destination || userInfo?.destination || "";
        // 명확함을 위해 이름 + 여행지(도시)를 조합하여 검색
        const query = `${name} ${destContext}`.trim();
        
        // hl 파라미터를 추가하여 현재 앱 언어(ko/en)에 맞는 지도가 뜨게 함
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&hl=${language}`, '_blank');
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

    const { tripTitle, itinerary, budgetBreakdown, estimatedCost, recommendedHotels, weather, travelTips, theme } = tripPlan;
    const hotels = recommendedHotels || [];
    const destName = tripPlan.destination?.split('#')[0]?.trim() || "여행지";

    return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-start sm:items-center overflow-hidden relative font-sans">
            <div id={CAPTURE_ID} className="w-full max-w-[480px] h-screen sm:h-[95vh] sm:rounded-[30px] bg-gray-50 relative shadow-2xl overflow-hidden flex flex-col border border-gray-200">

                {/* 지도 영역 */}
                <div style={{ height: `${mapHeight}vh` }} className="w-full bg-gray-200 relative shrink-0">
                    <div ref={mapRef} className="w-full h-full" />

                    <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10 flex flex-col items-start">
                        {theme && (
                            <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-md mb-1 shadow-sm">
                                {theme}
                            </span>
                        )}
                        <h1 className="text-lg font-bold text-white drop-shadow-md w-full pr-10 leading-snug">{tripTitle}</h1>
                    </div>

                    <div className="absolute top-4 right-4 z-50 pointer-events-auto flex gap-2">
                        <button onClick={() => router.push('/mypage')} className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md text-gray-700 hover:bg-white hover:text-indigo-600 transition" title="마이페이지"><User size={20} /></button>
                    </div>
                </div>

                {/* 하단 리스트 영역 */}
                <div className="flex-1 bg-gray-50 -mt-6 rounded-t-3xl relative z-20 shadow-lg flex flex-col overflow-hidden">
                    <div onMouseDown={handleDragStart} onTouchStart={handleDragStart} className="w-full flex items-center justify-between px-6 pt-3 pb-2 bg-white rounded-t-3xl border-b border-gray-100 shrink-0 cursor-row-resize hover:bg-gray-50">
                        <div className="w-16"></div>
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                        <div className="flex items-center gap-2 relative">
                            {isEditMode && (
                                <button onClick={(e) => { e.stopPropagation(); handleAutoFixAll(); }} disabled={loadingAction === 'autoFix'} className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-full border bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100 transition shadow-sm">
                                    {loadingAction === 'autoFix' ? <Loader2 className="animate-spin" size={12} /> : <Wand2 size={12} />} 전체 위치 보정
                                </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setIsEditMode(!isEditMode); }} className={`relative flex items-center gap-1 text-sm font-bold px-4 py-1.5 rounded-full border shadow-md transition-all z-40 ${isEditMode ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200' : 'bg-white text-rose-500 border-rose-200 hover:bg-rose-50 ring-1 ring-rose-100'}`}>
                                {isEditMode ? <><Check size={15} /> 완료</> : <><Pencil size={20} /> 편집</>}
                            </button>
                        </div>
                    </div>

                    <div className="flex border-b border-gray-200 bg-white">
                        <button onClick={() => setActiveTab('itinerary')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'itinerary' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><Calendar size={16} /> 상세 일정</button>
                    </div>

                    <div ref={scrollContainerRef} className="overflow-y-auto flex-1 px-5 pb-32 bg-white custom-scrollbar scroll-smooth">
                        {theme && !isEditMode && (
                                    <div className="mb-6 mt-6 bg-rose-50 rounded-[20px] p-5 border border-rose-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute -top-4 -right-4 text-6xl opacity-10">✨</div>
                                        <div className="flex items-center gap-2 mb-3 relative z-10">
                                            <Sparkles size={18} className="text-rose-500" />
                                            <h3 className="font-bold text-gray-800 text-sm">AI 트래블 테라피스트의 코멘트</h3>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed relative z-10">
                                            "{userInfo?.destination || '이런 여행'}"을(를) 원하시는 당신을 위해,
                                            <span className="font-bold text-rose-500"> {destName}</span>(으)로 떠나는
                                            <span className="font-bold"> {theme}</span> 여행을 특별히 준비해 보았어요.
                                        </p>
                                    </div>
                                )}

                                <div className={`mb-6 ${theme && !isEditMode ? 'mt-2' : 'mt-6'}`}>
                                    <h3 className="text-[#FF5A5F] font-bold text-base mb-2 px-1">예산 배분 제안</h3>
                                    <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm space-y-2">
                                        {isEditMode ? (
                                            <div className="space-y-2">
                                                {tripPlan.budgetBreakdown?.map((item, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center"><input type="text" value={item} onChange={(e) => handleBudgetChange(idx, e.target.value)} className="flex-1 text-sm p-2 border border-rose-200 rounded-lg outline-none focus:border-[#FF5A5F] bg-rose-50/30" /><button onClick={() => handleDeleteBudget(idx)} className="p-2 text-rose-400 hover:text-rose-600 bg-rose-50 rounded-lg"><Trash2 size={14} /></button></div>
                                                ))}
                                                <button onClick={handleAddBudget} className="w-full py-2 text-xs font-bold text-rose-500 border border-dashed border-rose-300 rounded-lg hover:bg-rose-50 flex items-center justify-center gap-1"><Plus size={12} /> 예산 항목 추가</button>
                                            </div>
                                        ) : ((tripPlan.budgetBreakdown?.length > 0) ? tripPlan.budgetBreakdown.map((item, idx) => (<div key={idx} className="flex items-start gap-2 text-sm"><div className="min-w-[4px] h-[4px] bg-[#FF5A5F] rounded-full mt-2"></div><p className="text-gray-700">{item}</p></div>)) : (<p className="text-gray-700 text-sm">{estimatedCost || "예산 정보 없음"}</p>))}
                                    </div>
                                </div>

                                {hotels.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2 px-1"><BedDouble size={16} /> 추천 숙소</h3>
                                        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
                                            {hotels.map((hotel, idx) => (
                                                <div key={idx} className="place-card min-w-[220px] bg-white p-3 rounded-xl border border-gray-200 shadow-sm relative cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all group" data-lat={hotel.coordinates?.lat} data-lng={hotel.coordinates?.lng} onClick={() => { const link = getKlookLink(`${hotel.name} ${userInfo?.destination || ""}`, '695932'); window.open(link, '_blank'); }}>
                                                    <div className="flex items-center gap-2 mb-1"><span className="bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">추천 {idx + 1}</span><h4 className="font-bold text-sm truncate group-hover:text-indigo-600 transition-colors">{hotel.name}</h4></div>
                                                    <p className="text-xs text-[#FF5A5F] font-bold mb-1">{hotel.priceRange}</p>
                                                    <p className="text-[10px] text-gray-500 leading-relaxed bg-gray-50 p-1.5 rounded line-clamp-2">{hotel.description}</p>
                                                    <div className="mt-2 pt-2 border-t border-gray-50 text-center"><span className="text-[10px] font-bold text-indigo-500 flex items-center justify-center gap-1">Klook 최저가 보기 <ExternalLink size={10} /></span></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {itinerary?.map((dayItem, dayIdx) => {
                                    const dayColor = DAY_COLORS[dayIdx % DAY_COLORS.length];
                                    return (
                                        <div key={dayIdx} className="mb-8">
                                            <div className="sticky top-0 bg-white/95 backdrop-blur-sm py-3 z-20 border-b border-gray-50 mb-4 flex items-center gap-2"><span className="text-xs font-bold text-white px-2 py-1 rounded-md shadow-sm" style={{ backgroundColor: dayColor }}>Day {dayItem.day}</span><span className="text-sm text-gray-500 font-medium">{dayItem.date}</span></div>
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
                                                                        <div className="flex gap-2"><input type="text" value={place.name} onChange={(e) => handleEditChange(dayIdx, placeIdx, 'name', e.target.value)} className="flex-1 font-bold text-sm p-1 border-b border-indigo-200 outline-none focus:border-indigo-500 bg-transparent" placeholder="장소명" /><button onClick={() => handleUpdateLocation(dayIdx, placeIdx, place.name)} className="p-1.5 rounded bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:text-blue-700 transition" title="위치 찾기"><Search size={14} /></button><div className="flex gap-1"><button onClick={() => handleMovePlace(dayIdx, placeIdx, -1)} disabled={placeIdx === 0} className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30"><ArrowUp size={12} /></button><button onClick={() => handleMovePlace(dayIdx, placeIdx, 1)} disabled={placeIdx === dayItem.places.length - 1} className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30"><ArrowDown size={12} /></button></div></div>
                                                                        <textarea value={place.description} onChange={(e) => handleEditChange(dayIdx, placeIdx, 'description', e.target.value)} className="w-full text-xs p-1 border border-gray-200 rounded outline-none focus:border-indigo-500 bg-gray-50 h-16 resize-none" placeholder="설명" />
                                                                        <div className="flex justify-end pt-1"><button onClick={() => handleDeletePlace(dayIdx, placeIdx)} className="flex items-center gap-1 text-[10px] text-red-500 font-bold bg-red-50 px-2 py-1 rounded hover:bg-red-100"><Trash2 size={10} /> 삭제</button></div>
                                                                    </div>
                                                                ) : (
                                                                    <div onClick={() => { googleMapRef.current?.panTo(place.coordinates); googleMapRef.current?.setZoom(17); }}>
                                                                        <div className="flex justify-between items-start"><h3 className="text-base font-bold text-gray-900">{place.name}</h3><span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{place.category}</span></div>
                                                                        <p className="text-sm text-gray-600 mt-1">{place.description}</p>
                                                                        {place.reason && (
                                                                            <div className="relative mt-3">
                                                                                <div className="absolute -top-1.5 left-4 w-3 h-3 bg-rose-50 rotate-45 border-l border-t border-rose-100"></div>
                                                                                <div className="relative bg-rose-50 p-3 rounded-xl border border-rose-100 shadow-sm flex gap-2 items-start">
                                                                                    <div className="text-rose-400 mt-0.5 text-sm">🐾</div>
                                                                                    <div>
                                                                                        <p className="text-[10px] font-black text-rose-400 mb-0.5 uppercase">냥프로의 픽!</p>
                                                                                        <p className="text-xs font-bold text-gray-800 leading-snug">"{place.reason}"</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex gap-2 mt-2">
                                                                            <button className="flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg transition shadow-sm" style={{ backgroundColor: `${dayColor}15`, color: dayColor }} onClick={(e) => { e.stopPropagation(); handleOpenGoogleMaps(place); }}><ExternalLink size={10} /> 길찾기</button>
                                                                            {!place.category?.includes("Restaurant") && !place.category?.includes("Cafe") && (
                                                                                <button onClick={(e) => { e.stopPropagation(); const link = getKlookLink(`${place.name} ${userInfo?.destination || ""}`, '695932'); window.open(link, '_blank'); }} className="flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 transition shadow-sm">🎟️ 티켓/투어 예매</button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {distance && (<div className="pl-2 py-3 flex items-center gap-2 text-[10px] text-gray-400 font-medium"><div className="w-0.5 h-3 bg-gray-200 rounded-full"></div><span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100"><Navigation size={10} className="text-blue-400" />직선거리 약 <span className="text-gray-600 font-bold">{distance}km</span> 이동</span></div>)}
                                                        </div>
                                                    );
                                                })}
                                                {isEditMode && (<div className="pl-6 pt-2"><button onClick={() => handleAddPlace(dayIdx)} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 text-xs font-bold flex items-center justify-center gap-1 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition"><Plus size={14} /> 장소 추가하기</button></div>)}
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="mb-6">
                                    {(weather || (travelTips && travelTips.length > 0)) && (
                                        <div className="grid grid-cols-1 gap-3">
                                            {weather && (<div className="bg-blue-50/80 p-4 rounded-xl border border-blue-100 flex items-center gap-3"><div className="bg-white p-2 rounded-full shadow-sm text-amber-500"><Sun size={20} /></div><div><p className="text-sm font-bold text-blue-900">여행지 날씨</p><p className="text-sm text-blue-700">{weather}</p></div></div>)}
                                            {travelTips?.length > 0 && (<div className="bg-amber-50/80 p-4 rounded-xl border border-amber-100 flex items-start gap-3"><div className="bg-white p-2 rounded-full shadow-sm text-amber-500 shrink-0"><Lightbulb size={20} /></div><div className="overflow-hidden"><p className="text-sm font-bold text-amber-900 mb-1">여행 꿀팁</p><ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">{travelTips.map((tip, i) => <li key={i}>{tip}</li>)}</ul></div></div>)}
                                        </div>
                                    )}
                                </div>
                    </div>
                </div>

                {/* 우측 하단 플로팅 저장 버튼 (기존 유지) */}
                {!tripId && (
                    <div className="absolute bottom-28 right-5 z-40 flex flex-col items-end gap-2 pointer-events-none">
                        <div className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-l-xl rounded-t-xl shadow-lg animate-bounce pointer-events-auto relative">내 여행 저장<div className="absolute -bottom-1 right-0 w-3 h-3 bg-indigo-600 transform rotate-45"></div></div>
                        <button onClick={handleSaveClick} disabled={isSaving} className="w-14 h-14 bg-indigo-600 rounded-full shadow-[0_4px_15px_rgba(79,70,229,0.4)] flex items-center justify-center text-white hover:bg-indigo-700 active:scale-90 transition-all pointer-events-auto border-2 border-white">{isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} strokeWidth={2.5} />}</button>
                    </div>
                )}

                {/* ✨ [핵심 수정] 마이페이지 스타일의 새로운 하단 메뉴바 */}
                <div className="absolute bottom-6 left-0 w-full px-6 z-50 pointer-events-none">
                    <nav className="bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-[32px] px-2 py-2 flex justify-around items-center pointer-events-auto">
                        {/* 홈으로 버튼 */}
                        <button onClick={handleReset} className="flex flex-col items-center gap-1 p-2 w-[75px] text-gray-500 hover:text-rose-500 transition active:scale-95">
                            <Home size={22} strokeWidth={2} />
                            <span className="text-[10px] font-black break-keep whitespace-nowrap">홈으로</span>
                        </button>

                        {/* 카톡상담 버튼 */}
                        <button onClick={handleKakaoConsult} disabled={loadingAction !== null} className="flex flex-col items-center gap-1 p-2 w-[75px] text-gray-500 hover:text-yellow-600 transition active:scale-95 disabled:opacity-50">
                            {loadingAction === 'kakao' ? <Loader2 className="animate-spin" size={22} /> : <MessageCircle size={22} strokeWidth={2} />}
                            <span className="text-[10px] font-black break-keep whitespace-nowrap">카톡상담</span>
                        </button>

                        {/* 공유하기 버튼 */}
                        <button onClick={handleShare} disabled={loadingAction !== null} className="flex flex-col items-center gap-1 p-2 w-[75px] text-gray-500 hover:text-indigo-600 transition active:scale-95 disabled:opacity-50">
                            {loadingAction === 'share' ? <Loader2 className="animate-spin" size={22} /> : <Share2 size={22} strokeWidth={2} />}
                            <span className="text-[10px] font-black break-keep whitespace-nowrap">공유하기</span>
                        </button>

                        {/* PDF저장 버튼 */}
                        <button onClick={handleDownloadPDF} disabled={loadingAction !== null} className="flex flex-col items-center gap-1 p-2 w-[75px] text-gray-500 hover:text-blue-600 transition active:scale-95 disabled:opacity-50">
                            {loadingAction === 'pdf' ? <Loader2 className="animate-spin" size={22} /> : <Download size={22} strokeWidth={2} />}
                            <span className="text-[10px] font-black break-keep whitespace-nowrap">PDF저장</span>
                        </button>
                    </nav>
                </div>

                {/* ✨ 진짜 유저 매칭 팝업 (중앙 정렬) */}
                {showMatchModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowMatchModal(false)}></div>
                        <div className="bg-white/90 backdrop-blur-2xl border border-white/50 w-full max-w-sm rounded-[32px] p-6 relative z-10 animate-in zoom-in-95 duration-300 shadow-2xl">
                            <button onClick={() => setShowMatchModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"><X size={18} strokeWidth={2.5} /></button>

                            <div className="text-center mb-6 mt-2">
                                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30 animate-bounce">
                                    <Sparkles size={32} className="text-white" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-1">여행 메이트 추천</h3>
                                <p className="text-sm text-gray-500 font-bold">비슷한 성향의 여행자를 찾았어요!</p>
                            </div>

                            <div className="space-y-3 mb-6">
                                {realMates.length === 0 ? (
                                    <p className="text-center text-sm text-gray-400 font-bold py-4">아직 추천할 만한 유저가 없습니다.</p>
                                ) : (
                                    realMates.map(mate => (
                                        <div key={mate.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition">
                                            <div className="flex items-center gap-3">
                                                <img src={mate.profileImgBase64 || "https://i.pravatar.cc/150?u=" + mate.id} alt="profile" className="w-12 h-12 rounded-full object-cover border-2 border-indigo-50" />
                                                <div>
                                                    <p className="font-bold text-gray-900 flex items-center gap-1">{mate.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold truncate max-w-[120px]">{mate.bio || "자기소개가 없습니다."}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleRequestRealMate(mate)} className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center hover:bg-indigo-600 hover:text-white transition active:scale-95" title="동행 요청하기">
                                                <Send size={16} className="ml-0.5" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                            <button onClick={() => setShowMatchModal(false)} className="w-full bg-gray-100 text-gray-600 font-bold py-3.5 rounded-2xl active:scale-95 transition hover:bg-gray-200">나중에 할게요</button>
                        </div>
                    </div>
                )}

                {/* 저장 옵션 모달 */}
                {showSaveModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowSaveModal(false)}></div>
                        <div className="bg-white w-full max-w-sm rounded-[32px] p-6 relative z-10 animate-in zoom-in-95 duration-300 shadow-2xl flex flex-col items-center">
                            <button onClick={() => setShowSaveModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"><X size={18} strokeWidth={2.5} /></button>
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-500/30">
                                <Save size={32} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-1">일정을 저장할까요?</h3>
                            <p className="text-sm text-gray-500 mb-6 text-center">저장된 일정은 마이페이지에서<br />언제든 확인하고 수정할 수 있어요.</p>

                            <div
                                onClick={() => setShareToFeed(!shareToFeed)}
                                className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all mb-6 ${shareToFeed ? 'border-rose-500 bg-rose-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                            >
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${shareToFeed ? 'bg-rose-500 text-white' : 'bg-gray-300 text-white'}`}>
                                    <Check size={16} strokeWidth={3} />
                                </div>
                                <div className="text-left flex-1">
                                    <p className={`text-sm font-bold ${shareToFeed ? 'text-rose-600' : 'text-gray-600'}`}>여행자 피드에 공유하고 100P 받기 ✨</p>
                                    <p className="text-[10px] text-gray-400">다른 여행자들에게 영감을 주세요!</p>
                                </div>
                            </div>

                            <button
                                onClick={executeSave}
                                disabled={isSaving}
                                className="w-full bg-gray-900 text-white font-bold text-lg py-4 rounded-2xl shadow-xl hover:bg-black active:scale-[0.98] transition flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={20} /> : "저장 완료"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* PDF 변환용 숨겨진 A4 서식 유지 */}
            <div id={PDF_TEMPLATE_ID} style={{ position: 'fixed', top: 0, left: 0, zIndex: -9999, width: '210mm', minHeight: '297mm', padding: '15mm', backgroundColor: 'white', color: 'black', fontFamily: 'sans-serif' }}>
                {tripPlan && (
                    <>
                        <div className="pdf-item text-center border-b-2 border-black pb-5 mb-8">
                            {theme && <span style={{ display: 'inline-block', backgroundColor: '#f43f5e', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>{theme}</span>}
                            <h1 className="text-3xl font-bold mb-2">{tripPlan.tripTitle}</h1>
                            <p className="text-gray-500"> 여행 계획서 by Trip Maker</p>
                        </div>
                        <div className="pdf-item mb-8">
                            <h2 className="text-xl font-bold border-l-4 border-indigo-600 pl-3 mb-4">1. 여행 개요 및 예산</h2>
                            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                                <ul className="space-y-2">
                                    <li className="flex"><span className="font-bold w-24">총 예상 비용:</span> {estimatedCost}</li>
                                    <li>
                                        <span className="font-bold block mb-1">예산 상세:</span>
                                        <ul className="list-disc list-inside pl-2 text-sm text-gray-700">
                                            {tripPlan.budgetBreakdown?.map((b, i) => <li key={i}>{b}</li>)}
                                        </ul>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="mb-8">
                            <h2 className="pdf-item text-xl font-bold border-l-4 border-indigo-600 pl-3 mb-4">2. 상세 일정</h2>
                            {tripPlan.itinerary?.map((day, idx) => (
                                <div key={idx} className="mb-6">
                                    <div className="pdf-item mb-3">
                                        <h3 className="font-bold text-lg bg-indigo-50 px-3 py-1 rounded inline-block text-indigo-800">
                                            Day {day.day} <span className="text-sm font-normal text-gray-500 ml-2">{day.date}</span>
                                        </h3>
                                    </div>
                                    <div className="space-y-3 pl-2 border-l-2 border-gray-200 ml-2">
                                        {day.places.map((place, pIndex) => (
                                            <div key={pIndex} className="pdf-item bg-gray-50 p-4 rounded-xl mb-3 border border-gray-100 relative">
                                                <div className="flex justify-between items-start">
                                                    <div style={{ width: '100%' }}>
                                                        <h4 className="font-bold text-gray-800 text-base">
                                                            <span className="text-rose-500 mr-2">{place.order}.</span>
                                                            {place.name}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 mt-1">{place.description}</p>
                                                        {place.reason && (
                                                            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fff1f2', borderRadius: '8px', fontSize: '11px', color: '#881337', border: '1px solid #ffe4e6' }}>
                                                                <strong>💡 AI 추천 이유:</strong> {place.reason}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="pdf-item">
                            <h2 className="text-xl font-bold border-l-4 border-indigo-600 pl-3 mb-4">3. 여행 정보</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="border p-4 rounded-lg">
                                    <h4 className="font-bold mb-2">☀️ 날씨 정보</h4>
                                    <p className="text-sm text-gray-700">{weather || "정보 없음"}</p>
                                </div>
                                <div className="border p-4 rounded-lg">
                                    <h4 className="font-bold mb-2">💡 여행 꿀팁</h4>
                                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                        {travelTips?.map((t, i) => <li key={i}>{t}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div >
    );
}
