'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Share2, Download, ExternalLink, BedDouble, Save, Link as LinkIcon, Check } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { db } from '../lib/firebase'; // 1단계에서 만든 파일 불러오기
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// ⚠️ 구글 맵 API 키
const GOOGLE_MAPS_API_KEY = 'AIzaSyDcAUKNWbwORzW7sT-9hcRs6GSrUS_TKAU';
const DAY_COLORS = ['#FF4B4B', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

export default function AIResult({ data }) {
    const [parsedData, setParsedData] = useState(null);
    const [error, setError] = useState(null);

    // 저장 관련 상태
    const [isSaving, setIsSaving] = useState(false);
    const [shareUrl, setShareUrl] = useState(null); // 저장된 공유 링크

    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const observerRef = useRef(null);
    const pdfExportRef = useRef(null);

    // 1. 데이터 파싱
    useEffect(() => {
        if (!data) return;
        try {
            let cleanData = data;
            if (typeof data === 'object') {
                setParsedData(data);
                return;
            }
            if (typeof data === 'string') {
                cleanData = data.replace(/```json/g, '').replace(/```/g, '').trim();
                const result = JSON.parse(cleanData);
                setParsedData(result);
            }
        } catch (e) {
            console.error("JSON Error:", e);
            setError(e.message);
        }
    }, [data]);

    const { tripTitle, itinerary, budgetBreakdown, estimatedCost, recommendedHotels } = parsedData || {};
    const allPlacesWithDay = itinerary?.flatMap((day, dayIndex) => day.places.map(place => ({ ...place, dayIndex }))) || [];
    const hotels = recommendedHotels || [];

    // 2. 구글 맵 초기화
    useEffect(() => {
        if (!parsedData || !itinerary) return;
        if (!window.google) {
            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
            script.async = true;
            script.defer = true;
            script.onload = initMap;
            document.head.appendChild(script);
        } else {
            initMap();
        }

        function initMap() {
            if (!mapRef.current) return;
            const startLocation = allPlacesWithDay[0]?.coordinates || { lat: 35.6895, lng: 139.6917 };
            const map = new google.maps.Map(mapRef.current, {
                center: startLocation, zoom: 13, disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy',
                styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
            });
            googleMapRef.current = map;
            const bounds = new google.maps.LatLngBounds();

            itinerary.forEach((dayItem, index) => {
                const dayColor = DAY_COLORS[index % DAY_COLORS.length];
                const path = [];
                dayItem.places.forEach((place) => {
                    if (place.coordinates) {
                        path.push(place.coordinates);
                        bounds.extend(place.coordinates);
                        new google.maps.Marker({
                            position: place.coordinates, map,
                            icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: dayColor, fillOpacity: 1, strokeColor: "white", strokeWeight: 2, scale: 12 },
                            label: { text: place.order.toString(), color: "white", fontWeight: "bold", fontSize: "12px" },
                            zIndex: 100 + index
                        });
                    }
                });
                if (path.length > 1) {
                    new google.maps.Polyline({ path, geodesic: true, strokeColor: dayColor, strokeOpacity: 0.8, strokeWeight: 4, map });
                }
            });

            hotels.forEach((hotel) => {
                if (hotel.coordinates) {
                    bounds.extend(hotel.coordinates);
                    new google.maps.Marker({
                        position: hotel.coordinates, map,
                        label: { text: "H", color: "white", fontWeight: "bold", fontSize: "10px" },
                        icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: "#111827", fillOpacity: 1, strokeColor: "white", strokeWeight: 2, scale: 10 },
                        title: hotel.name, zIndex: 200
                    });
                }
            });
            if (!bounds.isEmpty()) map.fitBounds(bounds);
        }
    }, [parsedData]);

    // 3. 스크롤 감지
    useEffect(() => {
        if (!parsedData || !scrollContainerRef.current) return;
        if (observerRef.current) observerRef.current.disconnect();
        const callback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const lat = parseFloat(entry.target.getAttribute('data-lat'));
                    const lng = parseFloat(entry.target.getAttribute('data-lng'));
                    if (googleMapRef.current && !isNaN(lat) && !isNaN(lng)) {
                        googleMapRef.current.panTo({ lat, lng });
                        if (googleMapRef.current.getZoom() < 15) googleMapRef.current.setZoom(16);
                    }
                }
            });
        };
        observerRef.current = new IntersectionObserver(callback, { root: scrollContainerRef.current, threshold: 0, rootMargin: '-45% 0px -45% 0px' });
        document.querySelectorAll('.place-card').forEach((card) => observerRef.current.observe(card));
        return () => { if (observerRef.current) observerRef.current.disconnect(); };
    }, [parsedData]);

    // 4. [NEW] Firebase 저장 핸들러
    const handleSaveTrip = async () => {
        if (shareUrl) {
            // 이미 저장된 경우 링크 복사
            try {
                await navigator.clipboard.writeText(shareUrl);
                alert("공유 링크가 복사되었습니다!");
            } catch (e) { alert("복사 실패"); }
            return;
        }

        setIsSaving(true);
        try {
            // DB의 'trips' 컬렉션에 데이터 저장
            const docRef = await addDoc(collection(db, "trips"), {
                ...parsedData,
                createdAt: serverTimestamp(), // 저장 시간 기록
            });

            // 공유 링크 생성 (현재 도메인 + /share/ + 문서ID)
            const generatedUrl = `${window.location.origin}/share/${docRef.id}`;
            setShareUrl(generatedUrl);

            alert("여행이 저장되었습니다! 🔗 공유 링크가 생성되었습니다.");
        } catch (e) {
            console.error("Firebase Error:", e);
            alert("저장 중 오류가 발생했습니다: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const formatTripText = () => {
        if (!parsedData) return "";
        let text = `✈️ [My Trip Pro] AI 여행 일정\n\n`;
        text += `📍 제목: ${tripTitle}\n`;
        if (budgetBreakdown && budgetBreakdown.length > 0) text += `\n💰 예상 견적:\n${budgetBreakdown.join('\n')}\n`;
        else if (estimatedCost) text += `\n💰 예상 견적: ${estimatedCost}\n`;

        // 중요: 저장된 링크가 있으면 그걸 우선 사용
        const linkToShare = shareUrl || window.location.href;
        text += `\n🔗 일정 상세 보기: ${linkToShare}`;
        return text;
    };

    const handleOpenGoogleMaps = (name, lat, lng) => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${lat},${lng}`, '_blank');

    const handleKakaoConsult = async () => {
        const text = formatTripText();
        try { await navigator.clipboard.writeText(text); alert("일정이 복사되었습니다! 상담창에 붙여넣기 해주세요."); }
        catch (e) { }
        window.open('http://pf.kakao.com/_xcJhrn/chat', '_blank');
    };

    const handleShare = async () => {
        const text = formatTripText();
        const linkToShare = shareUrl || window.location.href;

        // 저장되지 않았으면 저장하라고 유도할 수도 있지만, 우선 현재 상태 공유
        if (navigator.share) {
            try { await navigator.share({ title: tripTitle, text: text, url: linkToShare }); } catch (e) { }
        } else {
            try { await navigator.clipboard.writeText(text); alert("여행 내용이 복사되었습니다!"); } catch (e) { }
        }
    };

    const handleDownloadPDF = async () => {
        const element = pdfExportRef.current;
        if (!element) return;
        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgHeight = (canvas.height * 210) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;
            pdf.addImage(imgData, 'PNG', 0, position, 210, imgHeight);
            heightLeft -= 297;
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, 210, imgHeight);
                heightLeft -= 297;
            }
            pdf.save(`${tripTitle}_상세.pdf`);
        } catch (e) { alert("PDF 저장 오류"); }
    };

    if (!data) return <div className="p-10 text-center text-gray-500">로딩 중...</div>;
    if (error) return <div className="p-5 text-red-500">에러: {error}</div>;
    if (!parsedData) return null;

    return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-start sm:items-center">
            <div className="w-full max-w-[480px] h-screen sm:h-[95vh] sm:rounded-[30px] bg-gray-50 relative shadow-2xl overflow-hidden flex flex-col border border-gray-200">

                {/* 지도 */}
                <div className="h-[40vh] w-full bg-gray-200 relative z-0 shrink-0 group">
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                    <div className="absolute top-0 left-0 w-full p-5 bg-linear-to-b from-black/60 to-transparent pointer-events-none z-10">
                        <h1 className="text-xl font-bold text-white drop-shadow-md">{tripTitle}</h1>
                    </div>
                </div>

                {/* 리스트 */}
                <div className="flex-1 bg-gray-50 -mt-6 rounded-t-3xl relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">
                    <div className="w-full flex justify-center pt-3 pb-2 bg-white rounded-t-3xl border-b border-gray-100 shrink-0"><div className="w-12 h-1.5 bg-gray-300 rounded-full"></div></div>

                    <div ref={scrollContainerRef} className="overflow-y-auto flex-1 px-5 pb-10 bg-white custom-scrollbar scroll-smooth">

                        {/* 💰 예산 */}
                        {((budgetBreakdown && budgetBreakdown.length > 0) || estimatedCost) && (
                            <div className="mb-8 mt-4">
                                <h3 className="text-[#FF5A5F] font-bold text-lg mb-3 px-1">총 예산 배분 제안:</h3>
                                <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm space-y-3">
                                    {budgetBreakdown && budgetBreakdown.length > 0 ? (
                                        budgetBreakdown.map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-2">
                                                <div className="min-w-[4px] h-[4px] bg-[#FF5A5F] rounded-full mt-2.5"></div>
                                                <p className="text-gray-700 font-medium">{item}</p>
                                            </div>
                                        ))
                                    ) : (<p className="text-gray-700 font-medium">{estimatedCost}</p>)}
                                </div>
                            </div>
                        )}

                        {/* 🏨 숙소 */}
                        {hotels.length > 0 && (
                            <div className="mb-6">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-3 px-1"><BedDouble size={16} /> 추천 숙소</h3>
                                <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
                                    {hotels.map((hotel, idx) => (
                                        <div key={idx} className="place-card min-w-[240px] bg-white p-4 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-black transition"
                                            data-lat={hotel.coordinates?.lat} data-lng={hotel.coordinates?.lng}
                                            onClick={() => { googleMapRef.current?.panTo(hotel.coordinates); googleMapRef.current?.setZoom(16); }}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">추천 {idx + 1}</span>
                                                <h4 className="font-bold text-sm truncate">{hotel.name}</h4>
                                            </div>
                                            <p className="text-xs text-[#FF5A5F] font-bold mb-2">{hotel.priceRange}</p>
                                            <p className="text-[11px] text-gray-500 leading-relaxed bg-gray-50 p-2 rounded">{hotel.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 일정 */}
                        {itinerary?.map((dayItem, index) => {
                            const dayColor = DAY_COLORS[index % DAY_COLORS.length];
                            return (
                                <div key={index} className="mb-10">
                                    <div className="sticky top-0 bg-white/95 backdrop-blur-sm py-4 z-20 border-b border-gray-50 mb-6 flex items-center gap-2">
                                        <span className="text-xs font-bold text-white px-2.5 py-1 rounded-md shadow-sm" style={{ backgroundColor: dayColor }}>Day {dayItem.day}</span>
                                        <span className="text-sm text-gray-500 font-medium">{dayItem.date}</span>
                                    </div>
                                    <div className="relative pl-4 ml-3 space-y-8" style={{ borderLeft: `2px solid ${dayColor}30` }}>
                                        {dayItem.places.map((place, placeIndex) => (
                                            <div key={placeIndex} className="relative pl-8">
                                                <div className="absolute -left-[23px] top-0 w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-md ring-4 ring-white z-10" style={{ backgroundColor: dayColor }}>{place.order}</div>
                                                <div className="place-card group cursor-pointer" data-lat={place.coordinates?.lat} data-lng={place.coordinates?.lng} onClick={() => { googleMapRef.current?.panTo(place.coordinates); googleMapRef.current?.setZoom(17); }}>
                                                    <h3 className="text-lg font-bold text-gray-900">{place.name}</h3>
                                                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">{place.category}</span>
                                                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-xl border border-gray-100">{place.description}</p>
                                                    <button className="mt-3 flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg transition shadow-sm" style={{ backgroundColor: `${dayColor}15`, color: dayColor }} onClick={(e) => { e.stopPropagation(); handleOpenGoogleMaps(place.name, place.coordinates?.lat, place.coordinates?.lng); }}>
                                                        <ExternalLink size={12} /> 길찾기
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {/* 🚀 4. 하단 버튼 (저장 버튼 추가됨) */}
                        <div className="pt-8 pb-12 px-2" data-html2canvas-ignore="true">
                            {/* 저장 버튼: 아직 저장 안했으면 '저장하기', 했으면 '링크복사' */}
                            <button
                                onClick={handleSaveTrip}
                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-md mb-3 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98 ${shareUrl ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-[#FF5A5F] text-white hover:bg-rose-600'}`}
                            >
                                {isSaving ? "저장 중..." : shareUrl ? <><Check size={20} /> 저장완료! 링크 복사하기</> : <><Save size={20} /> 이 여행 저장하기</>}
                            </button>

                            <button onClick={handleKakaoConsult} className="w-full bg-[#FAE100] text-[#371D1E] py-4 rounded-xl font-bold text-lg shadow-md mb-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-[#FCE620] active:scale-98 transition">
                                <MessageCircle size={20} /> 카카오톡 상담하기
                            </button>
                            <div className="flex gap-3">
                                <button onClick={handleShare} className="flex-1 bg-gray-800 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-900 active:scale-98 transition"><Share2 size={18} /> {shareUrl ? '링크공유' : '텍스트공유'}</button>
                                <button onClick={handleDownloadPDF} className="flex-1 bg-white text-gray-700 border border-gray-200 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 active:scale-98 transition"><Download size={18} /> PDF</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PDF용 히든 뷰 (동일 유지) */}
            <div id="pdf-content" ref={pdfExportRef} style={{ position: 'absolute', top: '-10000px', width: '210mm', minHeight: '297mm', backgroundColor: 'white', padding: '20mm', color: 'black', fontFamily: 'sans-serif' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', borderBottom: '2px solid black', paddingBottom: '10px' }}>{tripTitle}</h1>
                <div style={{ margin: '20px 0', padding: '20px', backgroundColor: '#fff5f5', borderRadius: '10px', border: '1px solid #ffecec' }}>
                    <h3 style={{ color: '#FF5A5F', fontWeight: 'bold', marginBottom: '10px' }}>💰 총 예산 배분 제안</h3>
                    {budgetBreakdown && budgetBreakdown.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {budgetBreakdown.map((item, i) => <li key={i} style={{ marginBottom: '8px', fontSize: '14px' }}>• {item}</li>)}
                        </ul>
                    ) : (<p>{estimatedCost}</p>)}
                </div>
                {hotels.length > 0 && (
                    <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '16px' }}>🏨 추천 숙소</h3>
                        {hotels.map((hotel, idx) => (
                            <div key={idx} style={{ marginBottom: '12px', paddingLeft: '10px', borderLeft: '3px solid #ddd' }}>
                                <strong style={{ fontSize: '14px' }}>{hotel.name}</strong> <span style={{ fontSize: '13px', color: '#FF5A5F' }}>{hotel.priceRange}</span>
                                <br /><span style={{ fontSize: '12px', color: '#666' }}>{hotel.description}</span>
                            </div>
                        ))}
                    </div>
                )}
                {itinerary?.map((dayItem, index) => (
                    <div key={index} style={{ marginBottom: '30px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginTop: '20px' }}>
                            Day {dayItem.day} <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#666' }}>({dayItem.date})</span>
                        </h3>
                        {dayItem.places.map((place, placeIndex) => (
                            <div key={placeIndex} style={{ margin: '15px 0 15px 10px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
                                    <span style={{ display: 'inline-block', width: '20px', height: '20px', background: '#333', color: 'white', textAlign: 'center', borderRadius: '50%', fontSize: '12px', marginRight: '8px', lineHeight: '20px' }}>{place.order}</span>
                                    {place.name} <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>({place.category})</span>
                                </div>
                                <p style={{ fontSize: '13px', color: '#444', marginTop: '4px', lineHeight: '1.4' }}>{place.description}</p>
                            </div>
                        ))}
                    </div>
                ))}
                <div style={{ marginTop: '50px', textAlign: 'center', fontSize: '12px', color: '#999', borderTop: '1px solid #eee', paddingTop: '10px' }}>AI Travel Planner - My Trip Pro</div>
            </div>
        </div>
    );
}