'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    MessageCircle, Share2, Download, ExternalLink, BedDouble, Loader2,
    Sun, Lightbulb, RotateCcw, Pencil, Check, Trash2, Plus,
    ArrowUp, ArrowDown, MapPin, Search, Wand2, Navigation,
    Calendar, BrainCircuit, Save, User, RefreshCw, ChevronUp, ChevronDown, Home
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, setDoc, increment, getDoc } from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import TravelQuiz from './TravelQuiz';

// ✨ PDF 및 이미지 변환 라이브러리
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

// 🔗 통합 검색 딥링크 생성기 (Klook - 대표님 맞춤 설정)
// 언어(language) 인자를 추가로 받아서 동적으로 처리
const getKlookLink = (keyword, markerId, language) => {
    const encodedKeyword = encodeURIComponent(keyword);
    const isKo = language !== 'en';

    // 한국어면 /ko/ 경로 + KRW, 영어면 기본 경로 + USD
    const baseUrl = isKo ? "https://www.klook.com/ko/search" : "https://www.klook.com/search";
    const langParam = isKo ? "ko_KR" : "en_US";
    const currParam = isKo ? "KRW" : "USD";

    const klookUrl = `${baseUrl}?query=${encodedKeyword}&lang=${langParam}&currency=${currParam}`;
    return `https://tp.media/r?marker=${markerId}&trs=488085&p=4110&u=${encodeURIComponent(klookUrl)}&campaign_id=137`;
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const DAY_COLORS = ['#FF4B4B', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

export default function AIResult({ data, userInfo, tripId, onReset }) {
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

    // 🧠 퀴즈 관련 State
    const [currentQuizData, setCurrentQuizData] = useState(null);
    const [isQuizLoading, setIsQuizLoading] = useState(false);
    const [showActions, setShowActions] = useState(false); // ✨ 하단 액션 버튼 토글 상태

    const isDragging = useRef(false);
    const hasAutoFixed = useRef(false);
    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    const markersRef = useRef([]);
    const polylineRef = useRef([]);
    const scrollContainerRef = useRef(null);
    const observerRef = useRef(null);

    // 🚀 모바일 리다이렉트 로그인 후 데이터 복구 로직
    useEffect(() => {
        const checkRedirectResult = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result && result.user) {
                    const pendingData = sessionStorage.getItem('pendingTripSave');
                    if (pendingData) {
                        setIsSaving(true);
                        const { savedUserInfo, savedTripPlan } = JSON.parse(pendingData);
                        const user = result.user;
                        const userRef = doc(db, "users", user.uid);
                        const userSnap = await getDoc(userRef);

                        let isNewUser = false;
                        if (!userSnap.exists()) {
                            isNewUser = true;
                            await setDoc(userRef, { email: user.email, name: user.displayName, points: 1000, createdAt: serverTimestamp(), quizStats: { date: "", count: 0 } });
                            await addDoc(collection(db, "users", user.uid, "point_history"), { desc: "신규 가입 축하금", amount: 1000, createdAt: serverTimestamp() });
                        }
                        await addDoc(collection(db, "users", user.uid, "itineraries"), { ...savedUserInfo, ...savedTripPlan, createdAt: serverTimestamp() });

                        sessionStorage.removeItem('pendingTripSave');
                        setIsSaving(false);
                        alert(isNewUser ? "환영합니다! 가입 축하금 1,000P 지급 완료! 🎁" : "일정이 성공적으로 저장되었습니다!");
                        router.push('/mypage');
                    }
                }
            } catch (error) {
                console.error("Redirect Auth Error:", error);
                setIsSaving(false);
            }
        };
        checkRedirectResult();
    }, [router]);


    // ✨ [수정됨] ID 변수 선언 추가 (에러 해결!)
    const PDF_TEMPLATE_ID = "pdf-document-template";
    const CAPTURE_ID = "trip-result-container";

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

            // ✨ [추가됨] AI가 준 lat, lng를 구글 지도가 읽을 수 있는 coordinates 구조로 변환!
            if (initialData.itinerary) {
                initialData.itinerary.forEach(day => {
                    day.places.forEach(place => {
                        // TourAPI에서 가져온 정확한 좌표가 있다면 적용
                        if (place.lat && place.lng && !isNaN(parseFloat(place.lat))) {
                            place.coordinates = {
                                lat: parseFloat(place.lat),
                                lng: parseFloat(place.lng)
                            };
                        }
                    });
                });
            }

            setTripPlan(initialData);
            if (initialData.quiz) {
                setCurrentQuizData(initialData.quiz);
            }
        } catch (e) {
            console.error("JSON Error:", e);
            setError(e.message);
        }
    }, [data]);

    // 🔄 퀴즈 갱신 함수
    const handleRefreshQuiz = async () => {
        const destination = tripPlan?.tripTitle?.split(' ')[0] || userInfo?.destination;
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
                setCurrentQuizData(newData.result);
            }
        } catch (error) {
            console.error("Quiz Refresh Error:", error);
        } finally {
            setIsQuizLoading(false);
        }
    };

    // 📏 거리 계산
    const calculateDistance = (place1, place2) => {
        if (!place1?.coordinates || !place2?.coordinates) return null;
        const R = 6371;
        const dLat = (place2.coordinates.lat - place1.coordinates.lat) * (Math.PI / 180);
        const dLon = (place2.coordinates.lng - place1.coordinates.lng) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(place1.coordinates.lat * (Math.PI / 180)) * Math.cos(place2.coordinates.lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (R * c).toFixed(1);
    };

    // 2. 구글 맵 로직
    useEffect(() => {
        if (!tripPlan || !tripPlan.itinerary) return;

        const loadMap = () => {
            if (!window.google || !mapRef.current) return;

            if (!googleMapRef.current) {
                const startLocation = tripPlan.itinerary[0]?.places[0]?.coordinates || { lat: 35.6895, lng: 139.6917 };
                googleMapRef.current = new google.maps.Map(mapRef.current, {
                    center: startLocation,
                    zoom: 13,
                    disableDefaultUI: true,
                    zoomControl: true,
                    gestureHandling: 'greedy',
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
                            position: place.coordinates,
                            map,
                            icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: dayColor, fillOpacity: 1, strokeColor: "white", strokeWeight: 2, scale: 12 },
                            label: { text: (placeIdx + 1).toString(), color: "white", fontWeight: "bold", fontSize: "12px" },
                            zIndex: 100 + index
                        });
                        markersRef.current.push(marker);
                    }
                });

                if (path.length > 1) {
                    const line = new google.maps.Polyline({
                        path,
                        geodesic: true,
                        strokeColor: dayColor,
                        strokeOpacity: 0.8,
                        strokeWeight: 4,
                        map
                    });
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
                    // ✨ [핵심 방어막] 이미 공공데이터(TourAPI)에서 가져온 완벽한 좌표가 있으면 구글 검색을 돌리지 않고 패스!
                    if (place.coordinates && place.coordinates.lat && place.coordinates.lng) {
                        resolve();
                        return;
                    }

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

    // 스크롤 시 지도 이동
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

    // --- 편집 관련 핸들러들 ---
    const handleUpdateLocation = (dayIndex, placeIndex, queryName) => {
        if (!window.google || !googleMapRef.current) return;
        if (!queryName) return;
        const region = tripPlan.destination || "";
        let finalQuery = queryName;
        if (region && !queryName.includes(region)) finalQuery = `${region} ${queryName}`;
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

    // --- 공유 URL 생성 ---
    const getOrSaveShareUrl = async () => {
        if (shareUrl && !isEditMode) return shareUrl;
        try {
            const saveData = {
                ...tripPlan,
                contactInfo: userInfo?.contact || "정보 없음",
                isEdited: Boolean(isEditMode || tripPlan.isEdited),
                createdAt: serverTimestamp()
            };
            const docRef = await addDoc(collection(db, "trips"), saveData);
            const generatedUrl = `${window.location.origin}/share/${docRef.id}`;
            setShareUrl(generatedUrl);
            return generatedUrl;
        } catch (e) {
            console.error("Save Error:", e);
            alert("공유 링크 생성 중 오류가 발생했습니다.");
            return null;
        }
    };

    // --- 🔥 PDF 다운로드 (완벽한 A4 분할 출력) ---
    const handleDownloadPDF = async () => {
        const source = document.getElementById(PDF_TEMPLATE_ID);
        if (!source) return;

        setLoadingAction('pdf');
        try {
            // 1. 임시 출력 컨테이너 생성 (화면 밖에 배치)
            const printContainerId = 'pdf-print-container';
            let printContainer = document.getElementById(printContainerId);
            if (printContainer) printContainer.remove();

            printContainer = document.createElement('div');
            printContainer.id = printContainerId;
            printContainer.style.position = 'fixed';
            printContainer.style.top = '0';
            printContainer.style.left = '0';
            printContainer.style.zIndex = '-9999';
            // 배경을 투명하게 두면 캡처 시 문제가 생길 수 있으므로 흰색 배경 지정
            printContainer.style.backgroundColor = '#f0f0f0';
            document.body.appendChild(printContainer);

            // 2. A4 규격 설정 (mm 단위)
            const A4_WIDTH_MM = 210;
            const A4_HEIGHT_MM = 297;
            const MARGIN_MM = 15;
            const CONTENT_WIDTH_MM = A4_WIDTH_MM - (MARGIN_MM * 2);
            const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - (MARGIN_MM * 2);

            // 픽셀 단위 변환 (96DPI 기준 대략적 계산, 실제로는 toPng가 배율 조정함)
            // 화면상에서 A4 비율을 유지하며 렌더링하기 위해 width를 고정
            const PAGE_WIDTH_PX = 794; // A4 width at 96 DPI
            const PAGE_HEIGHT_PX = 1123; // A4 height at 96 DPI
            const PADDING_PX = 56; // approx 15mm

            const createPage = () => {
                const page = document.createElement('div');
                page.className = 'pdf-page bg-white shadow-lg';
                page.style.width = `${PAGE_WIDTH_PX}px`;
                page.style.height = `${PAGE_HEIGHT_PX}px`;
                page.style.padding = `${PADDING_PX}px`;
                page.style.boxSizing = 'border-box';
                page.style.marginBottom = '20px'; // 시각적 분리 (캡처엔 영향 없음)
                page.style.overflow = 'hidden'; // 넘치는 내용 숨김 (안전장치)
                page.style.position = 'relative';

                // 폰트 상속 등을 위해 클래스 복사 (필요하면)
                page.style.fontFamily = 'sans-serif';

                // 내용물이 담길 내부 컨테이너
                const contentArea = document.createElement('div');
                contentArea.style.width = '100%';
                contentArea.style.height = '100%';
                contentArea.className = 'flex flex-col';
                page.appendChild(contentArea);

                printContainer.appendChild(page);
                return { page, content: contentArea };
            };

            // 3. 페이지네이션 로직
            const items = Array.from(source.querySelectorAll('.pdf-item'));
            const pages = [];

            let currentPage = createPage();
            pages.push(currentPage);

            for (const item of items) {
                const clone = item.cloneNode(true);
                clone.style.marginTop = '0'; // 기존 마진 제거
                clone.style.marginBottom = '20px'; // 아이템 간 간격

                // 일단 현재 페이지에 붙여봄
                currentPage.content.appendChild(clone);

                // 높이 초과 확인
                // scrollHeight가 clientHeight보다 크면 넘친 것
                const contentHeight = currentPage.content.scrollHeight;
                const maxHeight = currentPage.content.clientHeight;

                if (contentHeight > maxHeight) {
                    // 넘쳤으므로 제거하고 새 페이지에 추가
                    currentPage.content.removeChild(clone);

                    currentPage = createPage();
                    pages.push(currentPage);
                    currentPage.content.appendChild(clone);
                }
            }

            // 렌더링 안정화 대기
            await new Promise(resolve => setTimeout(resolve, 800));

            // 4. 각 페이지를 이미지로 변환하여 PDF 병합
            const pdf = new jsPDF('p', 'mm', 'a4');

            for (let i = 0; i < pages.length; i++) {
                const pageElement = pages[i].page;

                const imgData = await toPng(pageElement, {
                    quality: 1.0,
                    pixelRatio: 2, // 고화질
                    cacheBust: true,
                    backgroundColor: 'white',
                    fontEmbedCSS: '', // CORS 방지
                });

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
            }

            pdf.save(`${tripPlan.tripTitle || 'trip_plan'}.pdf`);

            // 5. 청소
            document.body.removeChild(printContainer);

        } catch (error) {
            console.error("PDF Pagination Error:", error);
            alert("PDF 생성 중 오류가 발생했습니다.");
        } finally {
            setLoadingAction(null);
        }
    };

    const formatTripText = (url) => {
        if (!tripPlan) return "";
        let text = `✈️ [Trip Maker] AI가 만든 여행 일정\n\n`;
        text += `📍 제목: ${tripPlan.tripTitle}\n`;
        if (tripPlan.budgetBreakdown?.length > 0) text += `\n💰 예상 견적:\n${tripPlan.budgetBreakdown.join('\n')}\n`;

        // ✅ 실제 생성된 공유 링크(url 변수)가 출력되도록 수정했습니다.
        if (url) text += `\n🔗 일정 상세 보기: ${url}`;
        return text;
    };

    // 하단 버튼 핸들러
    const handleKakaoConsult = async () => {
        setLoadingAction('kakao');
        const url = await getOrSaveShareUrl();
        if (url) {
            const text = formatTripText(url);
            try {
                await navigator.clipboard.writeText(text);
                alert("일정 내용이 복사되었습니다!\n상담 채팅방에 '붙여넣기' 해주세요.");
                window.open('http://pf.kakao.com/_xcJhrn/chat', '_blank');
            } catch (e) {
                window.open('http://pf.kakao.com/_xcJhrn/chat', '_blank');
            }
        }
        setLoadingAction(null);
    };

    const handleShare = async () => {
        setLoadingAction('share');
        const url = await getOrSaveShareUrl();
        if (url) {
            const text = formatTripText(url);
            if (navigator.share) {
                try {
                    // 💡 url 파라미터를 제거하여 중복을 방지합니다.
                    await navigator.share({ title: tripPlan.tripTitle, text: text });
                } catch (e) { }
            }
            else {
                try { await navigator.clipboard.writeText(text); alert("링크가 복사되었습니다!"); } catch (e) { }
            }
        }
        setLoadingAction(null);
    };

    const handleSaveAndLogin = async () => {
        setIsSaving(true);
        try {
            let user = auth.currentUser;

            if (!user) {
                const provider = new GoogleAuthProvider();
                // ✅ 현재 접속한 환경이 모바일 앱인지 확인
                const isMobileApp = window.matchMedia('(display-mode: standalone)').matches || window.innerWidth <= 768;

                if (isMobileApp) {
                    // 모바일 환경: 리다이렉트 전 임시 저장고에 일정 보관
                    sessionStorage.setItem('pendingTripSave', JSON.stringify({ savedUserInfo: userInfo, savedTripPlan: tripPlan }));
                    await signInWithRedirect(auth, provider);
                    return; // 함수 종료 (화면이 구글 로그인으로 넘어감)
                } else {
                    // PC 웹 환경: 기존 팝업창 유지
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
                await addDoc(collection(db, "users", user.uid, "itineraries"), { ...userInfo, ...tripPlan, createdAt: serverTimestamp() });
                alert(isNewUser ? "환영합니다! 가입 축하금 1,000P 지급 완료! 🎁" : "일정이 저장되었습니다!");
                router.push('/mypage');
            }
        } catch (error) {
            console.error("저장 실패:", error);
            alert("저장 중 오류가 발생했습니다.");
            setIsSaving(false);
        }
    };


    const handleReset = () => {
        if (window.confirm("초기 화면으로 돌아가서 새로운 여행을 계획하시겠습니까?")) {
            // 모든 찌꺼기 데이터를 날리고 앱을 처음 상태로 완벽하게 새로고침합니다.
            window.location.href = '/';
            // 만약 위 코드로 안 된다면 window.location.reload(); 로 바꿔서 써보세요!
        }
    };


    const handleOpenGoogleMaps = (name) => { window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`, '_blank'); };

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
            <div id={CAPTURE_ID} className="w-full max-w-[480px] h-screen sm:h-[95vh] sm:rounded-[30px] bg-gray-50 relative shadow-2xl overflow-hidden flex flex-col border border-gray-200">

                {/* 지도 영역 */}
                <div style={{ height: `${mapHeight}vh` }} className="w-full bg-gray-200 relative shrink-0">
                    <div ref={mapRef} className="w-full h-full" />
                    <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10 flex justify-between items-start">
                        <h1 className="text-lg font-bold text-white drop-shadow-md flex-1">{tripTitle}</h1>
                    </div>
                    <div className="absolute top-4 right-4 z-50 pointer-events-auto flex gap-2">
                        <button onClick={() => router.push('/mypage')} className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md text-gray-700 hover:bg-white hover:text-indigo-600 transition" title="마이페이지"><User size={20} /></button>
                    </div>
                </div>

                {/* 하단 리스트 */}
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

                            {/* ✨ 말풍선 위치 수정: 위쪽이 아니라 버튼 '왼쪽'으로 옮겨서 잘림 방지! */}
                            {!isEditMode && (
                                <div className="absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 bg-rose-500 text-white text-[12px] font-bold px-3 py-1.5 rounded-xl shadow-md animate-bounce whitespace-nowrap z-50">
                                    일정 편집할까요?
                                    {/* 뾰족한 꼬리가 오른쪽(버튼 쪽)을 향하도록 수정 */}
                                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2.5 h-2.5 bg-rose-500 transform rotate-45"></div>
                                </div>
                            )}

                            <button
                                onClick={(e) => { e.stopPropagation(); setIsEditMode(!isEditMode); }}
                                className={`relative flex items-center gap-1 text-sm font-bold px-4 py-1.5 rounded-full border shadow-md transition-all z-40 ${isEditMode
                                    ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200'
                                    : 'bg-white text-rose-500 border-rose-200 hover:bg-rose-50 ring-1 ring-rose-100'
                                    }`}
                            >
                                {isEditMode ? <><Check size={15} /> 완료</> : <><Pencil size={20} /> 편집</>}
                            </button>
                        </div>
                    </div>

                    {/* 탭 메뉴 */}
                    <div className="flex border-b border-gray-200 bg-white">
                        <button onClick={() => setActiveTab('itinerary')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'itinerary' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><Calendar size={16} /> 상세 일정</button>
                        <button onClick={() => setActiveTab('quiz')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'quiz' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><BrainCircuit size={16} /> 여행지 퀴즈</button>
                    </div>

                    <div ref={scrollContainerRef} className="overflow-y-auto flex-1 px-5 pb-32 bg-white custom-scrollbar scroll-smooth">
                        {activeTab === 'itinerary' ? (
                            <>
                                {/* 예산 */}
                                <div className="mb-6 mt-6">
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

                                {/* 숙소 */}
                                {/* AIResult.js의 추천 숙소 리스트 부분 */}
                                {hotels.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2 px-1">
                                            <BedDouble size={16} /> 추천 숙소
                                        </h3>
                                        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
                                            {hotels.map((hotel, idx) => (
                                                <div
                                                    key={idx}
                                                    className="place-card min-w-[220px] bg-white p-3 rounded-xl border border-gray-200 shadow-sm relative cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all group"
                                                    data-lat={hotel.coordinates?.lat}
                                                    data-lng={hotel.coordinates?.lng}
                                                    // ✨ 클릭 시 Klook 검색으로 이동
                                                    onClick={() => {
                                                        const link = getKlookLink(
                                                            `${hotel.name} ${userInfo?.destination || ""}`, // 호텔명 + 도시명 조합
                                                            '695932' // 🚨 [필수] 대표님의 마커 ID (숫자)로 꼭 바꾸세요!
                                                        );
                                                        window.open(link, '_blank');
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">추천 {idx + 1}</span>
                                                        <h4 className="font-bold text-sm truncate group-hover:text-indigo-600 transition-colors">{hotel.name}</h4>
                                                    </div>
                                                    <p className="text-xs text-[#FF5A5F] font-bold mb-1">{hotel.priceRange}</p>
                                                    <p className="text-[10px] text-gray-500 leading-relaxed bg-gray-50 p-1.5 rounded line-clamp-2">{hotel.description}</p>

                                                    {/* 하단 버튼 텍스트 추가 */}
                                                    <div className="mt-2 pt-2 border-t border-gray-50 text-center">
                                                        <span className="text-[10px] font-bold text-indigo-500 flex items-center justify-center gap-1">
                                                            Klook 최저가 보기 <ExternalLink size={10} />
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* 일정 루프 */}
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
                                                                    // ✨ 634번째 줄 근처: 여기서부터 덮어씌우세요 (띄어쓰기 수정됨)
                                                                    <div onClick={() => { googleMapRef.current?.panTo(place.coordinates); googleMapRef.current?.setZoom(17); }}>
                                                                        <div className="flex justify-between items-start">
                                                                            <h3 className="text-base font-bold text-gray-900">{place.name}</h3>
                                                                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{place.category}</span>
                                                                        </div>
                                                                        <p className="text-sm text-gray-600 mt-1">{place.description}</p>

                                                                        <div className="flex gap-2 mt-2">
                                                                            {/* 기존 길찾기 버튼 */}
                                                                            <button
                                                                                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg transition shadow-sm"
                                                                                style={{ backgroundColor: `${dayColor}15`, color: dayColor }}
                                                                                onClick={(e) => { e.stopPropagation(); handleOpenGoogleMaps(place.name); }}
                                                                            >
                                                                                <ExternalLink size={10} /> 길찾기
                                                                            </button>

                                                                            {/* ✨ [추가됨] Klook 티켓/투어 버튼 (식당/카페 제외) */}
                                                                            {!place.category?.includes("Restaurant") && !place.category?.includes("Cafe") && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        const link = getKlookLink(
                                                                                            `${place.name} ${userInfo?.destination || ""}`, // 장소명 + 도시명
                                                                                            '695932' // 🚨 [필수] 마커 ID 확인!
                                                                                        );
                                                                                        window.open(link, '_blank');
                                                                                    }}
                                                                                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 transition shadow-sm"
                                                                                >
                                                                                    🎟️ 티켓/투어 예매
                                                                                </button>
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

                                {/* 날씨, 꿀팁 */}
                                <div className="mb-6">
                                    {(weather || (travelTips && travelTips.length > 0)) && (
                                        <div className="grid grid-cols-1 gap-3">
                                            {weather && (<div className="bg-blue-50/80 p-4 rounded-xl border border-blue-100 flex items-center gap-3"><div className="bg-white p-2 rounded-full shadow-sm text-amber-500"><Sun size={20} /></div><div><p className="text-sm font-bold text-blue-900">여행지 날씨</p><p className="text-sm text-blue-700">{weather}</p></div></div>)}
                                            {travelTips?.length > 0 && (<div className="bg-amber-50/80 p-4 rounded-xl border border-amber-100 flex items-start gap-3"><div className="bg-white p-2 rounded-full shadow-sm text-amber-500 shrink-0"><Lightbulb size={20} /></div><div className="overflow-hidden"><p className="text-sm font-bold text-amber-900 mb-1">여행 꿀팁</p><ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">{travelTips.map((tip, i) => <li key={i}>{tip}</li>)}</ul></div></div>)}
                                        </div>
                                    )}
                                </div>

                                {/* 🔥 [추가된 하단 버튼 3종] */}
                                {/* 🔥 [버튼 이동됨] 하단 고정 영역으로 이동 */}
                            </>
                        ) : (
                            <div className="mt-6 mb-24">
                                <div className="bg-indigo-600 text-white p-6 rounded-2xl mb-4 text-center shadow-lg">
                                    <h3 className="text-xl font-bold mb-2">🧠 {userInfo.destination} 여행 능력고사</h3>
                                    <p className="text-indigo-100 text-sm mb-4">3문제 모두 맞히면 200P 지급! (일 2회 제한)</p>
                                    <button onClick={handleRefreshQuiz} disabled={isQuizLoading} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center justify-center gap-2 mx-auto transition backdrop-blur-sm">{isQuizLoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />} 다른 문제 풀기</button>
                                </div>
                                {isQuizLoading ? (<div className="text-center py-10 text-gray-500"><Loader2 className="animate-spin mx-auto mb-2 text-indigo-500" size={32} /><p>새로운 문제를 출제하고 있습니다...</p></div>) : (<TravelQuiz aiQuizData={currentQuizData || []} />)}
                            </div>
                        )}
                    </div>
                </div>

                {/* 🔥 [신규] 저장 FAB (원형 + 버튼) */}
                {!tripId && (
                    <div className="absolute bottom-20 right-5 z-50 flex flex-col items-end gap-2 pointer-events-none">
                        {/* 말풍선 */}
                        <div className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-l-xl rounded-t-xl shadow-lg animate-bounce pointer-events-auto relative">
                            내 여행 저장
                            <div className="absolute -bottom-1 right-0 w-3 h-3 bg-indigo-600 transform rotate-45"></div>
                        </div>
                        {/* FAB 버튼 */}
                        <button
                            onClick={handleSaveAndLogin}
                            disabled={isSaving}
                            className="w-14 h-14 bg-indigo-600 rounded-full shadow-[0_4px_15px_rgba(79,70,229,0.4)] flex items-center justify-center text-white hover:bg-indigo-700 active:scale-90 transition-all pointer-events-auto border-2 border-white"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Plus size={28} strokeWidth={2.5} />}
                        </button>
                    </div>
                )}

                {/* 하단 고정 버튼 바 (토글형 & 컴팩트 디자인) */}
                <div className={`absolute bottom-0 left-0 w-full transition-transform duration-300 z-40 ${showActions ? 'translate-y-0' : 'translate-y-[calc(100%-40px)]'}`}>
                    {/* 핸들바 (항상 보임) */}
                    <div
                        onClick={() => setShowActions(!showActions)}
                        className="bg-white border-t border-gray-200 flex items-center justify-center py-2 cursor-pointer shadow-[0_-4px_10px_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors"
                    >
                        {showActions ? (
                            <div className="flex items-center gap-1 text-xs text-gray-400 font-bold"><ChevronDown size={14} /> 접기</div>
                        ) : (
                            <div className="flex items-center gap-1 text-xs text-indigo-500 font-bold animate-pulse"><ChevronUp size={14} /> 메뉴 열기 (저장/공유/PDF)</div>
                        )}
                    </div>

                    {/* 버튼 영역 (토글됨) */}
                    <div className="bg-white px-4 pb-4 pt-1 grid grid-cols-4 gap-2">
                        <button onClick={handleReset} className="bg-rose-50 text-rose-600 py-2 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 hover:bg-rose-100 active:scale-95 transition">
                            <Home size={16} />
                            <span>홈으로</span>
                        </button>
                        <button onClick={handleKakaoConsult} disabled={loadingAction !== null} className="bg-[#FAE100] text-[#371D1E] py-2 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 hover:bg-[#FCE620] active:scale-95 transition disabled:opacity-70">
                            {loadingAction === 'kakao' ? <Loader2 className="animate-spin" size={16} /> : <MessageCircle size={16} />}
                            <span>카톡상담</span>
                        </button>
                        <button onClick={handleShare} disabled={loadingAction !== null} className="bg-gray-800 text-white py-2 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 hover:bg-gray-900 active:scale-95 transition disabled:opacity-70">
                            {loadingAction === 'share' ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />}
                            <span>공유하기</span>
                        </button>
                        <button onClick={handleDownloadPDF} disabled={loadingAction !== null} className="bg-blue-50 text-blue-600 py-2 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 hover:bg-blue-100 active:scale-95 transition">
                            {loadingAction === 'pdf' ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                            <span>PDF저장</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 🔥 [핵심] PDF 변환용 숨겨진 A4 서식 (Smart Pagination 적용) */}
            <div id={PDF_TEMPLATE_ID} style={{ position: 'fixed', top: 0, left: 0, zIndex: -9999, width: '210mm', minHeight: '297mm', padding: '15mm', backgroundColor: 'white', color: 'black', fontFamily: 'sans-serif' }}>
                {tripPlan && (
                    <>
                        <div className="pdf-item text-center border-b-2 border-black pb-5 mb-8">
                            <h1 className="text-3xl font-bold mb-2">{tripPlan.tripTitle}</h1>
                            <p className="text-gray-500"> 여행 계획서 by Trip Maker</p>
                        </div>

                        {/* 1. 여행 개요 */}
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

                        {/* 2. 상세 일정 (장소별로 분할) */}
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
                                        {/* 각 장소 하나하나를 독립된 블록(pdf-item)으로 만들어 페이지 넘김 처리 */}
                                        {/* 일정표 상세 (Places) 매핑 부분 */}
                                        {day.places.map((place, pIndex) => (
                                            <div key={pIndex} className="pdf-item bg-gray-50 p-4 rounded-xl mb-3 border border-gray-100 relative">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 text-base">
                                                            <span className="text-rose-500 mr-2">{place.order}.</span>
                                                            {place.name}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 mt-1">{place.description}</p>
                                                    </div>
                                                </div>

                                                {/* 🎢 Klook 버튼 제거됨 (PDF용) */}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 3. 꿀팁 & 날씨 */}
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