'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Share2, Download, ExternalLink, BedDouble, Loader2, Sun, Lightbulb, RotateCcw, Pencil, Check, Trash2, Plus, ArrowUp, ArrowDown, MapPin, Search, Wand2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDcAUKNWbwORzW7sT-9hcRs6GSrUS_TKAU';
const DAY_COLORS = ['#FF4B4B', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

export default function AIResult({ data, userInfo, tripId }) {
    // 🏗️ State 관리
    const [tripPlan, setTripPlan] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [error, setError] = useState(null);
    const [loadingAction, setLoadingAction] = useState(null);
    const [shareUrl, setShareUrl] = useState(null);

    // 📏 지도 높이 조절
    const [mapHeight, setMapHeight] = useState(40);
    const isDragging = useRef(false);

    // 자동 보정 중복 방지용 Ref
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
        } catch (e) {
            console.error("JSON Error:", e);
            setError(e.message);
        }
    }, [data]);

    // 2. 구글 맵 렌더링 & 🚀 자동 위치 보정 실행
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

            // 기존 마커 제거
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

            // 🚀 [핵심] 신규 생성이면(tripId 없음) 자동으로 위치 보정 실행
            if (!tripId && !hasAutoFixed.current) {
                console.log("새 일정이므로 위치 자동 보정을 시작합니다...");
                hasAutoFixed.current = true; // 중복 실행 방지
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
    }, [tripPlan]); // tripId는 제외 (tripPlan이 초기화될 때만 실행)


    // ✨ [신규] 조용히 실행되는 자동 보정 함수 (알림창 없음)
    const performSilentAutoFix = async (mapInstance) => {
        if (!mapInstance || !tripPlan) return;

        const service = new google.maps.places.PlacesService(mapInstance);
        const newPlan = { ...tripPlan };
        const region = tripPlan.destination || ""; // 여행지 이름 (예: 다낭)
        let isUpdated = false;

        const updates = [];

        newPlan.itinerary.forEach((dayItem, dayIdx) => {
            dayItem.places.forEach((place, placeIdx) => {
                // 이미 좌표가 정확할 수도 있으니, 딜레이를 주며 검색
                const promise = new Promise((resolve) => {
                    setTimeout(() => {
                        // 🔥 검색어 조합: "다낭" + "용다리"
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
                                // 기존 좌표와 다를 때만 업데이트
                                const oldLat = newPlan.itinerary[dayIdx].places[placeIdx].coordinates.lat;
                                const newLat = location.lat();

                                // 아주 미세한 차이는 무시 (불필요한 리렌더링 방지)
                                if (Math.abs(oldLat - newLat) > 0.0001) {
                                    newPlan.itinerary[dayIdx].places[placeIdx].coordinates = {
                                        lat: location.lat(),
                                        lng: location.lng()
                                    };
                                    isUpdated = true;
                                }
                            }
                            resolve();
                        });
                    }, dayIdx * 200 + placeIdx * 200); // API 과부하 방지용 딜레이
                });
                updates.push(promise);
            });
        });

        await Promise.all(updates);

        if (isUpdated) {
            console.log("위치 자동 보정 완료!");
            setTripPlan({ ...newPlan }); // 상태 업데이트 -> 지도 자동 갱신됨
            if (!tripId) setShareUrl(null);
        }
    };


    // 🔄 스크롤 시 지도 자동 이동
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
            root: scrollContainerRef.current,
            threshold: 0.6,
            rootMargin: '-20% 0px -20% 0px'
        });

        setTimeout(() => {
            const cards = document.querySelectorAll('.place-card');
            cards.forEach((card) => observerRef.current.observe(card));
        }, 500);

        return () => { if (observerRef.current) observerRef.current.disconnect(); };
    }, [tripPlan]);


    // 📍 [수동] 개별 위치 보정
    const handleUpdateLocation = (dayIndex, placeIndex, queryName) => {
        if (!window.google || !googleMapRef.current) return;
        if (!queryName) return;

        // 🔥 수동 보정 때도 지역명 자동 포함
        const region = tripPlan.destination || "";
        let finalQuery = queryName;
        if (region && !queryName.includes(region)) {
            finalQuery = `${region} ${queryName}`;
        }

        const service = new google.maps.places.PlacesService(googleMapRef.current);
        service.findPlaceFromQuery({
            query: finalQuery,
            fields: ['name', 'geometry']
        }, (results, status) => {
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

    // ✨ [수동] 전체 위치 보정 버튼 (강제 실행용)
    const handleAutoFixAll = async () => {
        if (!window.google || !googleMapRef.current) {
            alert("지도가 로딩되지 않았습니다.");
            return;
        }
        if (!confirm("모든 장소의 위치를 여행지 기준으로 재설정하시겠습니까?")) return;

        setLoadingAction('autoFix');
        // 강제로 실행하므로 기존 로직 재사용
        hasAutoFixed.current = false;
        await performSilentAutoFix(googleMapRef.current);
        setLoadingAction(null);
        alert("전체 위치 보정이 완료되었습니다.");
    };


    // 💰 예산 수정 핸들러
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

    // 장소 수정 핸들러
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

    // 💾 저장 로직
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

                {/* 🗺️ 지도 */}
                <div style={{ height: `${mapHeight}vh`, transition: isDragging.current ? 'none' : 'height 0.3s ease' }} className="w-full bg-gray-200 relative z-0 shrink-0 group">
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                    <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10 flex justify-between items-start">
                        <h1 className="text-lg font-bold text-white drop-shadow-md flex-1">{tripTitle}</h1>
                    </div>
                </div>

                {/* 📜 리스트 */}
                <div className="flex-1 bg-gray-50 -mt-6 rounded-t-3xl relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">

                    {/* 핸들 & 편집 버튼 */}
                    <div onMouseDown={handleDragStart} onTouchStart={handleDragStart} className="w-full flex items-center justify-between px-6 pt-3 pb-2 bg-white rounded-t-3xl border-b border-gray-100 shrink-0 cursor-row-resize hover:bg-gray-50">
                        <div className="w-16"></div>
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                        <div className="flex gap-2">
                            {/* ✨ 전체 위치 보정 버튼 (편집 모드일 때만) */}
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

                    <div ref={scrollContainerRef} className="overflow-y-auto flex-1 px-5 pb-10 bg-white custom-scrollbar scroll-smooth">

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
                                    (budgetBreakdown?.length > 0) ? budgetBreakdown.map((item, idx) => (<div key={idx} className="flex items-start gap-2 text-sm"><div className="min-w-[4px] h-[4px] bg-[#FF5A5F] rounded-full mt-2"></div><p className="text-gray-700">{item}</p></div>)) : (<p className="text-gray-700 text-sm">{estimatedCost || "예산 정보 없음"}</p>)
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
                                        {dayItem.places.map((place, placeIdx) => (
                                            <div key={placeIdx} className="relative pl-6">
                                                <div className="absolute -left-[21px] top-0 w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-md ring-4 ring-white z-10" style={{ backgroundColor: dayColor }}>{placeIdx + 1}</div>

                                                <div className={`place-card bg-white p-3 rounded-xl border transition ${isEditMode ? 'border-indigo-200 shadow-inner' : 'border-gray-100 hover:border-gray-300 shadow-sm'}`} data-lat={place.coordinates?.lat} data-lng={place.coordinates?.lng}>

                                                    {isEditMode ? (
                                                        <div className="space-y-2">
                                                            <div className="flex gap-2">
                                                                <input type="text" value={place.name} onChange={(e) => handleEditChange(dayIdx, placeIdx, 'name', e.target.value)} className="flex-1 font-bold text-sm p-1 border-b border-indigo-200 outline-none focus:border-indigo-500 bg-transparent" placeholder="장소명" />
                                                                {/* 📍 개별 보정 버튼 */}
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
                                            </div>
                                        ))}

                                        {isEditMode && (<div className="pl-6 pt-2"><button onClick={() => handleAddPlace(dayIdx)} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 text-xs font-bold flex items-center justify-center gap-1 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition"><Plus size={14} /> 장소 추가하기</button></div>)}
                                    </div>
                                </div>
                            );
                        })}

                        {/* 하단 버튼 */}
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
                    </div>
                </div>
            </div>
        </div>
    );
}