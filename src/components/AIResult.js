'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    MessageCircle, Share2, Download, ExternalLink, BedDouble, Loader2,
    Sun, Lightbulb, RotateCcw, Pencil, Check, Trash2, Plus,
    ArrowUp, ArrowDown, MapPin, Search, Wand2, Navigation,
    Calendar, BrainCircuit, Save, User, RefreshCw, ChevronUp, ChevronDown, Home,
    UserPlus, X, MessageSquare, Sparkles, ChevronRight, ChevronLeft, CheckSquare, Square, Send, Wallet,
    ShieldCheck, PhoneCall
} from 'lucide-react';

import { db, auth } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, setDoc, increment, getDoc, getDocs } from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import TravelQuiz from './TravelQuiz';

import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

const getKlookLink = (keyword, destination, language, markerId) => {
    const query = `${keyword} ${destination || ''}`.trim();
    const encodedKeyword = encodeURIComponent(query);
    const isKo = language !== 'en';
    const klookUrl = `https://www.klook.com/${isKo ? 'ko/' : ''}search/?query=${encodedKeyword}`;
    const finalMarker = markerId || '695932';
    return `https://tp.media/r?marker=${finalMarker}&p=4110&u=${encodeURIComponent(klookUrl)}`;
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
    const [isPanelOpen, setIsPanelOpen] = useState(true);

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
    const dialRef = useRef(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const handleSelectPlace = (idx) => {
        setSelectedIndex(idx);
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const items = container.querySelectorAll('.vertical-place-card');
            if (items[idx]) {
                const item = items[idx];
                const scrollTop = item.offsetTop - container.clientHeight / 2 + item.clientHeight / 2;
                container.scrollTo({ top: scrollTop, behavior: 'smooth' });
            }
        }
    };
    const infoWindowRef = useRef(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [infoModalTab, setInfoModalTab] = useState('budget');

    const flatPlaces = React.useMemo(() => {
        if (!tripPlan || !tripPlan.itinerary) return [];
        let list = [];
        tripPlan.itinerary.forEach((dayItem, dIdx) => {
            dayItem.places.forEach((place, pIdx) => {
                list.push({ dayIdx: dIdx, placeIdx: pIdx, day: dayItem.day, place: place, dayColor: DAY_COLORS[dIdx % DAY_COLORS.length] });
            });
        });
        return list;
    }, [tripPlan]);

    useEffect(() => {
        if (!window.google || !googleMapRef.current || flatPlaces.length === 0 || markersRef.current.length === 0) return;
        const currentItem = flatPlaces[selectedIndex];
        if (!currentItem) return;

        const { place } = currentItem;
        const marker = markersRef.current[selectedIndex];

        if (place.coordinates?.lat && place.coordinates?.lng) {
            googleMapRef.current.panTo(place.coordinates);
            if (googleMapRef.current.getZoom() < 15) googleMapRef.current.setZoom(16);
            
            if (!infoWindowRef.current) {
                infoWindowRef.current = new window.google.maps.InfoWindow();
            }
            
            const contentString = `
                <div style="padding: 10px; max-width: 250px; font-family: sans-serif;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                        <h3 style="font-weight: bold; font-size: 15px; margin: 0; color: #111827;">${place.name}</h3>
                        <span style="font-size: 10px; background: #f3f4f6; padding: 2px 6px; border-radius: 12px; color: #6b7280; white-space: nowrap; margin-left: 8px;">${place.category || '기타'}</span>
                    </div>
                    <p style="font-size: 12px; color: #4b5563; margin-top: 6px; margin-bottom: 8px; line-height: 1.4;">${place.description}</p>
                    ${place.budget ? `<div style="font-size: 11px; font-weight: 800; color: #4f46e5; background: #f5f3ff; padding: 6px 10px; border-radius: 8px; margin-bottom: 8px; border: 1px dashed #c7d2fe; display: flex; align-items: center; gap: 4px;">💰 예산: ${place.budget}</div>` : ''}
                    ${place.reason ? `<div style="font-size: 11px; color: #0891b2; background: #ecfeff; padding: 6px 8px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #cffafe;"><strong>🛡️ 안심 포인트!</strong><br />${place.reason}</div>` : ''}
                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&hl=${language}" target="_blank" style="text-decoration: none; font-size: 11px; font-weight: bold; color: #4f46e5; background: #e0e7ff; padding: 6px 10px; border-radius: 6px; flex: 1; text-align: center;">🗺️ 길찾기</a>
                        ${(!place.category?.includes("Restaurant") && !place.category?.includes("Cafe")) ? `<a href="${getKlookLink(place.name, userInfo?.destination || "", language, '695932')}" target="_blank" rel="nofollow noopener noreferrer" style="text-decoration: none; font-size: 11px; font-weight: bold; color: #e11d48; background: #ffe4e6; padding: 6px 10px; border-radius: 6px; flex: 1; text-align: center; display: inline-block;">🎟️ 티켓 예매</a>` : ''}
                    </div>
                </div>
            `;
            infoWindowRef.current.setContent(contentString);
            if (marker) {
                infoWindowRef.current.open(googleMapRef.current, marker);
            }
        }
    }, [selectedIndex, flatPlaces, language]);

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
                        
                        const pinSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                            <svg width="40" height="42" viewBox="0 0 40 42" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 0C11.164 0 4 7.164 4 16c0 10.667 16 24 16 24s16-13.333 16-24c0-8.836-7.164-16-16-16z" fill="${dayColor}" stroke="white" stroke-width="2"/>
                                <circle cx="20" cy="16" r="11" fill="white"/>
                            </svg>
                        `)}`;

                        const marker = new google.maps.Marker({ 
                            position: place.coordinates, 
                            map, 
                            icon: { 
                                url: pinSvg,
                                scaledSize: new google.maps.Size(36, 38),
                                anchor: new google.maps.Point(18, 38),
                                labelOrigin: new google.maps.Point(18, 15)
                            }, 
                            label: { 
                                text: (placeIdx + 1).toString(), 
                                color: dayColor, 
                                fontWeight: "900", 
                                fontSize: "13px" 
                            }, 
                            zIndex: 100 + index,
                            animation: google.maps.Animation.DROP
                        });
                        marker.addListener('click', () => {
                            let fIdx = 0;
                            for (let i = 0; i < index; i++) {
                                fIdx += tripPlan.itinerary[i].places.length;
                            }
                            fIdx += placeIdx;
                            handleSelectPlace(fIdx);
                        });
                        markersRef.current.push(marker);
                    }
                });
                if (path.length > 1) { const line = new google.maps.Polyline({ path, geodesic: true, strokeColor: dayColor, strokeOpacity: 0.8, strokeWeight: 4, map }); polylineRef.current.push(line); }
            });
            tripPlan.recommendedHotels?.forEach((hotel) => {
                if (hotel.coordinates?.lat && hotel.coordinates?.lng) {
                    bounds.extend(hotel.coordinates);
                    
                    const hotelSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                        <svg width="40" height="42" viewBox="0 0 40 42" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 0C11.164 0 4 7.164 4 16c0 10.667 16 24 16 24s16-13.333 16-24c0-8.836-7.164-16-16-16z" fill="#111827" stroke="white" stroke-width="2"/>
                            <circle cx="20" cy="16" r="11" fill="white"/>
                        </svg>
                    `)}`;

                    const marker = new google.maps.Marker({ 
                        position: hotel.coordinates, 
                        map, 
                        icon: { 
                            url: hotelSvg,
                            scaledSize: new google.maps.Size(32, 34),
                            anchor: new google.maps.Point(16, 34),
                            labelOrigin: new google.maps.Point(16, 14)
                        },
                        label: { 
                            text: "H", 
                            color: "#111827", 
                            fontWeight: "900", 
                            fontSize: "12px" 
                        }, 
                        title: hotel.name, 
                        zIndex: 200,
                        animation: google.maps.Animation.DROP
                    });
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
                    const idx = parseInt(entry.target.getAttribute('data-index'));
                    if (!isNaN(idx) && idx !== selectedIndex) {
                        setSelectedIndex(idx);
                    }
                }
            });
        };
        observerRef.current = new IntersectionObserver(callback, { root: scrollContainerRef.current, threshold: 0.6, rootMargin: '-30% 0px -30% 0px' });
        setTimeout(() => { const cards = document.querySelectorAll('.vertical-place-card'); cards.forEach((card) => observerRef.current.observe(card)); }, 500);
        return () => { if (observerRef.current) observerRef.current.disconnect(); };
    }, [tripPlan, activeTab]);

    // IntersectionObserver scroll loop fixed by removing automatic scrollTo useEffect

    // handleDialScroll removed because we use observer callback now

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
    
    // ✨ 기존 저장된 여행 일정 업데이트 로직 추가
    const handleUpdateItinerary = async () => {
        if (!tripId) {
            setIsEditMode(false);
            return;
        }
        
        setLoadingAction('save');
        try {
            const tripRef = doc(db, "trips", tripId);
            // Firebase는 undefined를 허용하지 않으므로 정제
            const sanitizedItinerary = JSON.parse(JSON.stringify(tripPlan.itinerary));
            await updateDoc(tripRef, {
                itinerary: sanitizedItinerary,
                isEdited: true,
                updatedAt: serverTimestamp()
            });
            alert("✅ 일정이 성공적으로 업데이트되었습니다!");
            setIsEditMode(false);
        } catch (err) {
            console.error("Update Error:", err);
            alert("일정 업데이트 중 오류가 발생했습니다.");
        } finally {
            setLoadingAction(null);
        }
    };

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

    const handleKakaoConsult = () => { 
        if (loadingAction) return; 
        setLoadingAction('kakao'); 
        
        // ✨ 즉시 창을 열어 팝업 차단을 방지합니다.
        const chatUrl = 'http://pf.kakao.com/_xcJhrn/chat';
        const win = window.open(chatUrl, '_blank');
        
        // 창이 정상적으로 열리지 않았을 경우 (브라우저 설정 등)
        if (!win || win.closed || typeof win.closed === 'undefined') {
            alert("팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요!");
            setLoadingAction(null);
            return;
        }

        // ✨ 백그라운드에서 공유 링크 생성 및 복사
        getOrSaveShareUrl().then(async (url) => { 
            if (url) { 
                try { 
                    await navigator.clipboard.writeText(formatTripText(url)); 
                } catch (clipErr) {
                    console.warn("Clipboard failed:", clipErr);
                } 
            } 
        }).catch(err => {
            console.error("Kakao consult async error:", err);
        }).finally(() => {
            setLoadingAction(null); 
        });
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
    const safetyAdvice = tripPlan.safetyAdvice || null; // 🛡️ 안전 정보 추가
    const destName = tripPlan.destination?.split('#')[0]?.trim() || "여행지";

    return (
            <div className="fixed inset-0 w-full z-[100] bg-[#030712] flex items-center justify-center font-sans overflow-hidden selection:bg-indigo-500/30">
            <div id={CAPTURE_ID} className="w-full max-w-[480px] h-full sm:h-[92vh] sm:rounded-[48px] bg-black relative shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col border border-white/10 ring-1 ring-white/5">

                {/* Full screen Map */}
                <div className="absolute inset-0 z-0 bg-gray-900 pointer-events-auto">
                    <div ref={mapRef} className="w-full h-full" />
                </div>

                {/* Top Overlay */}
                <div className="absolute top-0 left-0 w-full p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-10 flex flex-col items-start pt-10 sm:pt-6">
                    {theme && (
                        <span className="px-2 py-1 bg-rose-500 text-white text-xs font-black rounded-lg mb-2 shadow-sm">
                            {theme}
                        </span>
                    )}
                    <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg w-full pr-12 leading-tight">{tripPlan.tripTitle}</h1>
                </div>

                {/* Right Top Buttons */}
                <div className="absolute top-8 right-5 z-50 pointer-events-auto flex flex-col gap-3">
                    <button onClick={() => router.push('/mypage')} className="bg-white/20 backdrop-blur-md p-2.5 rounded-full shadow-lg text-white hover:bg-white hover:text-indigo-600 transition border border-white/30" title="마이페이지">
                        <User size={20} />
                    </button>
                    <button onClick={() => setShowInfoModal(true)} className="bg-white/20 backdrop-blur-md p-2.5 rounded-full shadow-lg text-white hover:bg-white hover:text-rose-500 transition animate-pulse border border-rose-400/50" title="여행 정보">
                        <Sparkles size={20} className="text-rose-200" />
                    </button>
                    <button onClick={() => {
                        if (isEditMode && tripId) {
                            handleUpdateItinerary();
                        } else {
                            setIsEditMode(!isEditMode);
                        }
                    }} className={`backdrop-blur-md p-2.5 rounded-full shadow-lg transition border border-white/30 ${isEditMode ? 'bg-indigo-600 text-white' : 'bg-white/20 text-white hover:bg-white hover:text-indigo-600'}`}>
                        {loadingAction === 'save' ? <Loader2 className="animate-spin" size={20} /> : (isEditMode ? <Check size={20} /> : <Pencil size={20} />)}
                    </button>
                </div>
                {/* Right Sliding Panel */}
                {!isEditMode && (
                    <div className={`absolute top-0 right-0 h-full w-[75%] sm:w-[320px] bg-white/95 backdrop-blur-xl shadow-[-10px_0_30px_rgba(0,0,0,0.3)] z-40 transition-transform duration-500 ease-[cubic-bezier(0.3,1,0.3,1)] flex flex-col ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        {/* Toggle Button */}
                        <button 
                            onClick={() => setIsPanelOpen(!isPanelOpen)}
                            className="absolute top-1/2 -left-10 transform -translate-y-1/2 bg-white/95 backdrop-blur-md p-2 rounded-l-2xl shadow-[-5px_0_10px_rgba(0,0,0,0.1)] text-indigo-600 hover:text-indigo-800 transition"
                        >
                            {isPanelOpen ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
                        </button>
                        
                        {/* Panel Header */}
                        <div className="p-5 border-b border-gray-100/50 pt-12 sm:pt-6">
                            <h2 className="text-xl font-black text-gray-800 leading-tight">{tripPlan.tripTitle}</h2>
                            {estimatedCost && <p className="text-sm font-bold text-indigo-600 mt-1">예상 비용: {estimatedCost}</p>}
                        </div>

                        {/* Vertical List */}
                        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 pb-32">
                            {flatPlaces.map((item, i) => {
                                const isSelected = i === selectedIndex;
                                const nextItem = flatPlaces[i + 1];
                                const isSameDay = nextItem && nextItem.dayIdx === item.dayIdx;
                                const showTransit = isSameDay && item.place.transitToNext;

                                return (
                                    <React.Fragment key={i}>
                                        <div 
                                            data-index={i}
                                            onClick={() => handleSelectPlace(i)}
                                            className={`vertical-place-card relative p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-indigo-500 bg-white shadow-md' : 'border-transparent bg-gray-50/80 hover:bg-white hover:border-gray-200'}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`} style={isSelected ? { backgroundColor: item.dayColor } : {}}>
                                                    {item.placeIdx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-black uppercase text-gray-400">Day {item.dayIdx + 1}</span>
                                                        {item.place.budget && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">💰 {item.place.budget}</span>}
                                                    </div>
                                                    <h3 className="text-sm font-bold text-gray-800 truncate mb-1">{item.place.name}</h3>
                                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{item.place.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                        {showTransit && (
                                            <div className="flex flex-col items-center justify-center -my-2 z-10 relative pointer-events-none">
                                                <div className="h-4 border-l-2 border-dashed border-gray-300"></div>
                                                <div className="bg-white text-gray-600 text-[11px] font-bold px-3 py-1 rounded-full border border-gray-200 shadow-sm flex items-center gap-1">
                                                    {item.place.transitToNext}
                                                </div>
                                                <div className="h-4 border-l-2 border-dashed border-gray-300"></div>
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Edit Mode Overlay container */}
                {isEditMode && (
                    <div className="absolute bottom-[100px] left-4 right-4 bg-white/95 backdrop-blur-xl p-4 rounded-[24px] shadow-2xl z-20 max-h-[50vh] overflow-y-auto custom-scrollbar border border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-black text-indigo-600 flex items-center gap-1"><Pencil size={18} /> 일정 편집</h3>
                            <button onClick={(e) => { e.stopPropagation(); handleAutoFixAll(); }} disabled={loadingAction === 'autoFix'} className="bg-violet-100 text-violet-600 py-1 px-3 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-violet-200" title="위치 보정">
                                {loadingAction === 'autoFix' ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />} 전체 경로 재탐색
                            </button>
                        </div>
                        {tripPlan.itinerary?.map((dayItem, dayIdx) => (
                            <div key={dayIdx} className="mb-6">
                                <h4 className="font-bold text-sm bg-gray-100 inline-block px-2 py-1 rounded text-gray-700 mb-2">Day {dayItem.day}</h4>
                                <div className="space-y-3">
                                {dayItem.places.map((place, placeIdx) => (
                                    <div key={placeIdx} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex gap-2 mb-2">
                                            <input type="text" value={place.name} onChange={(e) => handleEditChange(dayIdx, placeIdx, 'name', e.target.value)} className="flex-1 font-bold text-sm p-1.5 border-b border-indigo-200 outline-none bg-indigo-50/50 rounded-t" placeholder="장소명" />
                                            <button onClick={() => handleUpdateLocation(dayIdx, placeIdx, place.name)} className="p-1.5 rounded bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"><Search size={14} /></button>
                                        </div>
                                        <textarea value={place.description} onChange={(e) => handleEditChange(dayIdx, placeIdx, 'description', e.target.value)} className="w-full text-xs p-1.5 border border-gray-200 rounded bg-gray-50 h-12 resize-none mb-2" placeholder="설명을 입력해주세요" />
                                        
                                        {/* ✨ 일정별 예산/지출 입력 필드 고도화 (MyPage와 동기화) */}
                                        <div className="space-y-2 mb-3">
                                            <div className="flex items-center gap-2 bg-indigo-50/30 p-2 rounded-lg border border-indigo-100/50">
                                                <Wallet size={12} className="text-indigo-500 shrink-0" />
                                                <span className="text-[9px] font-black text-indigo-400 uppercase shrink-0 w-8">Exp</span>
                                                <input 
                                                    type="number" 
                                                    value={place.expectedBudget || ""} 
                                                    onChange={(e) => handleEditChange(dayIdx, placeIdx, 'expectedBudget', parseInt(e.target.value) || 0)} 
                                                    placeholder="예상 경비 (원)" 
                                                    className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold text-gray-700 placeholder:text-gray-300"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 bg-rose-50/30 p-2 rounded-lg border border-rose-100/50">
                                                <Receipt size={12} className="text-rose-500 shrink-0" />
                                                <span className="text-[9px] font-black text-rose-400 uppercase shrink-0 w-8">Act</span>
                                                <input 
                                                    type="number" 
                                                    value={place.actualExpense || ""} 
                                                    onChange={(e) => handleEditChange(dayIdx, placeIdx, 'actualExpense', parseInt(e.target.value) || 0)} 
                                                    placeholder="실제 지출 (원)" 
                                                    className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold text-rose-700 placeholder:text-rose-300"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button onClick={() => handleMovePlace(dayIdx, placeIdx, -1)} disabled={placeIdx === 0} className="flex-1 py-1 rounded bg-gray-50 flex justify-center disabled:opacity-30"><ArrowUp size={14} /></button>
                                            <button onClick={() => handleMovePlace(dayIdx, placeIdx, 1)} disabled={placeIdx === dayItem.places.length - 1} className="flex-1 py-1 rounded bg-gray-50 flex justify-center disabled:opacity-30"><ArrowDown size={14} /></button>
                                            <button onClick={() => handleDeletePlace(dayIdx, placeIdx)} className="flex-1 py-1 bg-red-50 text-red-500 rounded flex justify-center items-center"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                                </div>
                                <button onClick={() => handleAddPlace(dayIdx)} className="w-full mt-3 py-2 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-500 text-xs font-bold flex items-center justify-center gap-1 hover:bg-indigo-50"><Plus size={14} /> 장소 추가</button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Bottom Center Gradient for fade effect */}
                <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none z-10"></div>


                {/* 노란색 버튼을 저장 버튼으로 활용 (브랜드 컬러 대비) */}
                {!tripId && (
                    <div className="absolute bottom-[240px] right-6 z-40 flex flex-col items-end gap-2 pointer-events-none">
                        <div className="bg-yellow-400 text-black text-[11px] font-bold px-3 py-1.5 rounded-l-xl rounded-t-xl shadow-lg pointer-events-auto relative">저장하기<div className="absolute -bottom-1 right-1 w-3 h-3 bg-yellow-400 transform rotate-45"></div></div>
                        <button onClick={handleSaveClick} disabled={isSaving} className="w-14 h-14 bg-yellow-400 rounded-full shadow-2xl flex items-center justify-center text-[#3c1e1e] pointer-events-auto hover:bg-yellow-300 transition-transform active:scale-95 border-2 border-white">
                            {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} strokeWidth={2.5} />}
                        </button>
                    </div>
                )}

                {/* Floating Bottom Navigation */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] sm:w-[85%] z-50 pointer-events-auto">
                    <nav className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[32px] py-2 px-2 flex justify-around items-center">
                        <button onClick={handleReset} className="flex flex-col items-center gap-1 p-2 w-[65px] text-white hover:text-rose-400 transition active:scale-95">
                            <Home size={22} /><span className="text-[10px] font-bold">홈으로</span>
                        </button>
                        <button onClick={handleKakaoConsult} className="flex flex-col items-center gap-1 p-2 w-[65px] text-yellow-400 hover:text-yellow-300 transition active:scale-95 text-center">
                            <MessageCircle size={22} /><span className="text-[10px] font-bold">카톡상담</span>
                        </button>
                        <button onClick={handleShare} className="flex flex-col items-center gap-1 p-2 w-[65px] text-white hover:text-indigo-400 transition active:scale-95">
                            <Share2 size={22} /><span className="text-[10px] font-bold">공유하기</span>
                        </button>
                        <button onClick={handleDownloadPDF} className="flex flex-col items-center gap-1 p-2 w-[65px] text-white hover:text-blue-400 transition active:scale-95 relative">
                            {loadingAction === 'pdf' ? <Loader2 className="animate-spin text-white mb-1" size={20} /> : <Download size={22} />}
                            <span className="text-[10px] font-bold">PDF저장</span>
                        </button>
                    </nav>
                </div>

                {/* Info Modal (Budget, Hotels, Tips) */}
                {showInfoModal && (
                    <div className="absolute inset-0 z-[60] flex items-end sm:items-center justify-center">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInfoModal(false)}></div>
                        <div className="bg-white w-full sm:w-[90%] h-[75vh] sm:h-[80vh] rounded-t-[32px] sm:rounded-[32px] relative z-20 shadow-2xl flex flex-col p-5 animate-in slide-in-from-bottom-full sm:zoom-in-95">
                            <button onClick={() => setShowInfoModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">
                                <X size={18} />
                            </button>
                            <h2 className="text-xl font-black mb-4 pr-10 text-gray-800 flex items-center gap-2"><Sparkles className="text-rose-500" size={20}/> 여정 꿀팁 박스</h2>
                            
                            <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                                <button onClick={() => setInfoModalTab('budget')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${infoModalTab === 'budget' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>예산</button>
                                <button onClick={() => setInfoModalTab('hotels')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${infoModalTab === 'hotels' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>추천 숙소</button>
                                <button onClick={() => setInfoModalTab('tips')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${infoModalTab === 'tips' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>팁 & 날씨</button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
                                {infoModalTab === 'budget' && (
                                    <div className="space-y-3">
                                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center mb-4">
                                            <span className="font-bold text-indigo-800">총 예상 비용</span>
                                            <span className="font-black text-indigo-600 text-lg">{estimatedCost || "예산 정보 없음"}</span>
                                        </div>
                                        {tripPlan.budgetBreakdown?.map((item, idx) => (
                                            <div key={idx} className="flex gap-2 items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                                <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center font-bold text-xs shrink-0">{idx+1}</div>
                                                <p className="flex-1 text-sm font-medium text-gray-700">{item}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {infoModalTab === 'hotels' && (
                                    <div className="space-y-4">
                                        {hotels.length > 0 ? hotels.map((hotel, idx) => (
                                            <div key={idx} className="place-card bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative group cursor-pointer hover:border-indigo-500 transition-all" onClick={() => { const link = getKlookLink(hotel.name, userInfo?.destination || "", language, '695932'); window.open(link, '_blank'); }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-md">추천 {idx + 1}</span>
                                                    <h4 className="font-bold text-base">{hotel.name}</h4>
                                                </div>
                                                <p className="text-xs text-indigo-500 font-bold mb-2 bg-indigo-50 inline-block px-2 py-1 rounded-lg">{hotel.priceRange}</p>
                                                <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 p-2 rounded-lg">{hotel.description}</p>
                                                <div className="mt-3 flex justify-end">
                                                    <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">Klook 예약 <ExternalLink size={12}/></span>
                                                </div>
                                            </div>
                                        )) : <div className="text-center text-gray-400 p-10 text-sm font-medium">추천 숙소 정보가 없습니다.</div>}
                                    </div>
                                )}
                                {infoModalTab === 'tips' && (
                                    <div className="space-y-4">
                                        {safetyAdvice && (
                                            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-4 rounded-2xl border border-cyan-100 flex items-start gap-4 mb-4">
                                                <div className="bg-white p-3 rounded-full text-cyan-500 shadow-sm shrink-0"><ShieldCheck size={24} /></div>
                                                <div>
                                                    <p className="font-black text-cyan-900 mb-1">안심 & 안전 가이드</p>
                                                    <p className="text-sm text-cyan-800 leading-relaxed font-medium whitespace-pre-wrap">{safetyAdvice}</p>
                                                </div>
                                            </div>
                                        )}
                                        {weather && (
                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-4 mb-4">
                                                <div className="bg-white p-3 rounded-full text-amber-500 shadow-sm shrink-0"><Sun size={24} /></div>
                                                <div>
                                                    <p className="font-black text-blue-900 mb-1">날씨 정보</p>
                                                    <p className="text-sm text-blue-800 leading-relaxed">{weather}</p>
                                                </div>
                                            </div>
                                        )}
                                        {travelTips && travelTips.length > 0 && (
                                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-4">
                                                <div className="bg-white p-3 rounded-full text-amber-500 shadow-sm shrink-0"><Lightbulb size={24} /></div>
                                                <div>
                                                    <p className="font-black text-amber-900 mb-2">여행 꿀팁</p>
                                                    <ul className="text-sm text-amber-800 space-y-2 list-disc list-inside">
                                                        {travelTips.map((tip, i) => <li key={i}>{tip}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 매칭 모달 (원본 유지) */}
                {showMatchModal && (
                    <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMatchModal(false)}></div>
                        <div className="bg-white/90 backdrop-blur-2xl w-full max-w-sm rounded-[32px] p-6 relative z-10 shadow-2xl animate-in zoom-in-95">
                            <button onClick={() => setShowMatchModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><X size={18} /></button>
                            <div className="text-center mb-6 mt-2">
                                <div className="w-16 h-16 bg-linear-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30 animate-bounce"><Sparkles size={32} className="text-white" /></div>
                                <h3 className="text-xl font-black text-gray-900 mb-1">여행 메이트 추천</h3>
                                <p className="text-sm text-gray-500 font-bold">비슷한 성향의 여행자를 찾았어요!</p>
                            </div>
                            <div className="space-y-3 mb-6">
                                {realMates.length === 0 ? (
                                    <p className="text-center text-sm text-gray-400 font-bold py-4">아직 추천할 만한 유저가 없습니다.</p>
                                ) : (
                                    realMates.map(mate => (
                                        <div key={mate.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <img src={mate.profileImgBase64 || "https://i.pravatar.cc/150?u=" + mate.id} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-50" />
                                                <div><p className="font-bold text-gray-900">{mate.name}</p><p className="text-[10px] text-gray-400 font-bold truncate max-w-[120px]">{mate.bio || "반가워요!"}</p></div>
                                            </div>
                                            <button onClick={() => handleRequestRealMate(mate)} className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center hover:bg-indigo-600 hover:text-white transition"><Send size={16} /></button>
                                        </div>
                                    ))
                                )}
                            </div>
                            <button onClick={() => setShowMatchModal(false)} className="w-full bg-gray-100 text-gray-600 font-bold py-3.5 rounded-2xl">나중에 할게요</button>
                        </div>
                    </div>
                )}

                {/* 저장 모달 (원본 유지) */}
                {showSaveModal && (
                    <div className="absolute inset-0 z-70 flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSaveModal(false)}></div>
                        <div className="bg-white w-full max-w-sm rounded-[32px] p-6 relative z-10 shadow-2xl flex flex-col items-center animate-in zoom-in-95">
                            <button onClick={() => setShowSaveModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><X size={18} /></button>
                            <div className="w-16 h-16 bg-linear-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg"><Save size={32} /></div>
                            <h3 className="text-xl font-black text-gray-900 mb-1">일정을 저장할까요?</h3>
                            <p className="text-sm text-gray-500 mb-6 text-center">저장된 일정은 마이페이지에서<br />수정할 수 있어요.</p>
                            <div onClick={() => setShareToFeed(!shareToFeed)} className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all mb-6 ${shareToFeed ? 'border-rose-500 bg-rose-50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${shareToFeed ? 'bg-rose-500 text-white' : 'bg-gray-300'}`}><Check size={16} strokeWidth={3} /></div>
                                <div className="text-left flex-1"><p className={`text-sm font-bold ${shareToFeed ? 'text-rose-600' : 'text-gray-600'}`}>여행자 피드 공유 (100P 적립)</p><p className="text-[10px] text-gray-400">다른 여행자들에게 영감을 주세요!</p></div>
                            </div>
                            <button onClick={executeSave} disabled={isSaving} className="w-full bg-gray-900 text-white font-bold text-lg py-4 rounded-2xl shadow-xl hover:bg-black transition">{isSaving ? <Loader2 className="animate-spin" size={20} /> : "저장 완료"}</button>
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
                                                        {place.budget && (
                                                            <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: '#4f46e5' }}>
                                                                💰 예산: {place.budget}
                                                            </div>
                                                        )}
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
