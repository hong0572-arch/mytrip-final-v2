"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapPin, RefreshCw, Utensils, ShoppingBag, Calendar, Hotel, Loader2 } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function AroundMeMap({ language = 'ko' }) {
    const mapRef = useRef(null);
    const [position, setPosition] = useState(null); // { lat, lng }
    const [loading, setLoading] = useState(true);
    const [googleReady, setGoogleReady] = useState(false);
    const [category, setCategory] = useState("restaurants"); // restaurants, lodging, shopping, events
    const [loadingPlaces, setLoadingPlaces] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Google Maps Script 로드 (중복 로드 차단 적용)
    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
        
        if (typeof window !== "undefined") {
            if (window.google) {
                setGoogleReady(true);
                return;
            }

            // 이미 DOM상에 구글 지도 스크립트가 추가되고 있는 중인지 검사
            const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
            if (existingScript) {
                const handleLoad = () => setGoogleReady(true);
                existingScript.addEventListener("load", handleLoad);
                
                // 만약 스크립트가 이미 로드 완료되었으나 window.google 검사가 미처 안 끝난 경우를 대비한 주기적 체크 (Fallback)
                const checkInterval = setInterval(() => {
                    if (window.google) {
                        setGoogleReady(true);
                        clearInterval(checkInterval);
                    }
                }, 100);

                return () => {
                    existingScript.removeEventListener("load", handleLoad);
                    clearInterval(checkInterval);
                };
            } else {
                // DOM에 구글 지도 스크립트가 없다면 새로 생성하여 로드
                const script = document.createElement("script");
                script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    setGoogleReady(true);
                };
                script.onerror = () => {
                    setErrorMsg(language === 'en' ? "Failed to load Google Maps SDK." : "구글 지도 SDK 로드에 실패했습니다.");
                };
                document.head.appendChild(script);
            }
        }
    }, [language]);

    // 브라우저 Geolocation으로 현재 위치 탐색
    const detectLocation = () => {
        setLoading(true);
        setErrorMsg("");
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    setPosition({ lat, lng });
                    setLoading(false);
                },
                (err) => {
                    console.warn("위치 서비스 오류, 기본값(서울 시청) 사용:", err);
                    // 서울 시청 좌표
                    const defaultLoc = { lat: 37.5665, lng: 126.9780 };
                    setPosition(defaultLoc);
                    setErrorMsg(language === 'en' ? "Using default location (Seoul)" : "위치 권한을 얻지 못해 서울 시청 기준으로 로드합니다.");
                    setLoading(false);
                },
                { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
            );
        } else {
            const defaultLoc = { lat: 37.5665, lng: 126.9780 };
            setPosition(defaultLoc);
            setErrorMsg(language === 'en' ? "Location not supported. Using Seoul." : "브라우저가 위치 정보를 지원하지 않아 서울 기준으로 로드합니다.");
            setLoading(false);
        }
    };

    useEffect(() => {
        detectLocation();
    }, [language]);

    // 지도 렌더링 및 Google Places Service 연동
    useEffect(() => {
        if (!googleReady || !position || !mapRef.current || !window.google) return;

        // 1. Google Map 객체 생성
        const map = new google.maps.Map(mapRef.current, {
            center: position,
            zoom: 15,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            scaleControl: true,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: false
        });

        // 2. 내 현재 위치 커스텀 SVG 마커 추가
        new google.maps.Marker({
            position: position,
            map: map,
            title: language === 'en' ? "My Location" : "내 현재 위치",
            icon: {
                url: '/current-location-marker.svg',
                scaledSize: new google.maps.Size(38, 45), // 마커 가로세로 크기 지정 (38px * 45px)
                anchor: new google.maps.Point(19, 45)     // 마커의 하단 끝 중앙이 실제 좌표 위치에 오도록 보정
            }
        });

        // 3. Google Places Service 생성
        const service = new google.maps.places.PlacesService(map);
        
        // 카테고리별 매핑 구글 타입들
        const typeMap = {
            restaurants: ['restaurant', 'cafe', 'bakery', 'bar'],
            lodging: ['lodging'],
            shopping: ['shopping_mall', 'store', 'clothing_store', 'department_store'],
            events: ['tourist_attraction', 'museum', 'amusement_park', 'park']
        };

        const request = {
            location: position,
            radius: 2000, // 2km 반경 탐색
            types: typeMap[category] || ['restaurant']
        };

        setLoadingPlaces(true);
        service.nearbySearch(request, (results, status) => {
            setLoadingPlaces(false);
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                // 각 카테고리별 커스텀 SVG 마커 이미지 경로 설정
                const markerIconUrl = category === 'restaurants' ? '/restaurant-marker.svg' :
                                      category === 'lodging' ? '/lodging-marker.svg' :
                                      category === 'shopping' ? '/shopping-marker.svg' :
                                      category === 'events' ? '/event-marker.svg' : '/restaurant-marker.svg';

                results.forEach((place) => {
                    if (!place.geometry || !place.geometry.location) return;

                    const marker = new google.maps.Marker({
                        position: place.geometry.location,
                        map: map,
                        title: place.name,
                        icon: {
                            url: markerIconUrl,
                            scaledSize: new google.maps.Size(38, 45), // 마커 가로세로 크기 지정 (38px * 45px)
                            anchor: new google.maps.Point(19, 45)     // 마커의 하단 끝 중앙(19, 45)이 실제 위도/경도 좌표에 오도록 보정
                        }
                    });

                    // 마커 클릭 시 정보 윈도우 생성
                    const infoWindow = new google.maps.InfoWindow({
                        content: `
                            <div style="color: #1e293b; font-family: Pretendard, sans-serif; text-align: left; padding: 4px; max-width: 200px;">
                                <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 2px;">
                                    ${place.name}
                                </div>
                                <div style="font-size: 11px; color: #eab308; font-weight: 700; margin-bottom: 4px;">
                                    별점 ⭐${place.rating || '평점 없음'}
                                </div>
                                <div style="font-size: 11px; color: #64748b; line-height: 1.4; margin-bottom: 6px;">
                                    ${place.vicinity || ''}
                                </div>
                                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}" 
                                   target="_blank" 
                                   style="color: #2AC1DB; font-size: 11px; font-weight: 800; text-decoration: underline; display: block;">
                                    Google Maps에서 열기 ↗
                                </a>
                            </div>
                        `
                    });

                    marker.addListener("click", () => {
                        infoWindow.open({
                            anchor: marker,
                            map,
                            shouldFocus: false,
                        });
                    });
                });
            } else {
                console.warn("Places search completed with status:", status);
            }

            // Fetch Partner Products from Firestore
            const fetchProducts = async () => {
                try {
                    const snap = await getDocs(collection(db, "products"));
                    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    
                    products.forEach(product => {
                        if (!product.coordinates || !product.coordinates.lat) return;
                        
                        // Roughly 5km filter
                        const dLat = Math.abs(product.coordinates.lat - position.lat);
                        const dLng = Math.abs(product.coordinates.lng - position.lng);
                        if (dLat > 0.05 || dLng > 0.05) return; 
                        
                        // Filter by category roughly
                        if (category === "lodging" && product.type !== "hotel") return;
                        if (category === "events" && product.type !== "ticket" && product.type !== "tour") return;
                        if (category === "restaurants" && product.type !== "restaurant" && product.type !== "food") return;
                        if (category === "shopping" && product.type !== "shopping") return;

                        const getCategoryEmoji = (type) => {
                            switch (type) {
                                case 'hotel': case 'lodging': return '🏨';
                                case 'restaurant': case 'food': return '🍽️';
                                case 'shopping': return '🛍️';
                                case 'ticket': case 'tour': case 'event': return '🎫';
                                default: return '✨';
                            }
                        };
                        const emoji = getCategoryEmoji(product.type || product.category);

                        const marker = new google.maps.Marker({
                            position: product.coordinates,
                            map: map,
                            title: product.title,
                            icon: {
                                url: '/timmy.png',
                                scaledSize: new google.maps.Size(64, 64),
                                anchor: new google.maps.Point(32, 64),
                                labelOrigin: new google.maps.Point(32, -10)
                            },
                            label: {
                                text: emoji,
                                fontSize: "24px"
                            },
                            animation: google.maps.Animation.DROP,
                            zIndex: 9999 
                        });

                        const infoWindow = new google.maps.InfoWindow({
                            content: `
                                <div style="color: #1e293b; font-family: Pretendard, sans-serif; text-align: left; padding: 4px; max-width: 200px;">
                                    <div style="font-size: 10px; font-weight: 800; color: #4f46e5; margin-bottom: 2px;">🏆 파트너 추천 상품</div>
                                    <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 2px;">
                                        ${product.title}
                                    </div>
                                    <div style="font-size: 12px; color: #eab308; font-weight: 700; margin-bottom: 4px;">
                                        ₩${Number(product.price).toLocaleString()}
                                    </div>
                                    <div style="font-size: 11px; color: #64748b; line-height: 1.4; margin-bottom: 6px;">
                                        ${product.description.substring(0, 50)}...
                                    </div>
                                    <a href="/product/${product.id}" 
                                       target="_blank" 
                                       style="display: inline-block; padding: 6px 12px; background: #4f46e5; color: white; font-size: 11px; font-weight: 800; border-radius: 6px; text-decoration: none;">
                                        상품 상세보기 ↗
                                    </a>
                                </div>
                            `
                        });

                        marker.addListener("click", () => {
                            infoWindow.open({ anchor: marker, map, shouldFocus: false });
                        });
                    });
                } catch (e) {
                    console.error("Error fetching products", e);
                }
            };
            fetchProducts();

        });

    }, [googleReady, position, category, language]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-80 bg-slate-50 rounded-3xl border border-slate-200 text-slate-500">
                <RefreshCw className="animate-spin text-spotify-green mb-3" size={32} />
                <p className="text-sm font-bold">{language === 'en' ? "Detecting current location..." : "현재 내 위치를 확인하고 있습니다..."}</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            {/* 카테고리 필터 헤더 (가독성 높은 라이트 모드 알약 스타일) */}
            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200 relative">
                <div className="flex gap-1.5 flex-1 overflow-x-auto scrollbar-hide mr-2">
                    <button
                        type="button"
                        onClick={() => setCategory("restaurants")}
                        className={`py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 ${category === "restaurants" ? 'bg-spotify-green text-black shadow-sm font-extrabold scale-[1.02]' : 'text-slate-600 hover:bg-slate-200/50'}`}
                    >
                        <Utensils size={14} />
                        {language === 'en' ? 'Food' : '맛집'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setCategory("lodging")}
                        className={`py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 ${category === "lodging" ? 'bg-spotify-green text-black shadow-sm font-extrabold scale-[1.02]' : 'text-slate-600 hover:bg-slate-200/50'}`}
                    >
                        <Hotel size={14} />
                        {language === 'en' ? 'Lodging' : '숙소'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setCategory("shopping")}
                        className={`py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 ${category === "shopping" ? 'bg-spotify-green text-black shadow-sm font-extrabold scale-[1.02]' : 'text-slate-600 hover:bg-slate-200/50'}`}
                    >
                        <ShoppingBag size={14} />
                        {language === 'en' ? 'Shopping' : '쇼핑'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setCategory("events")}
                        className={`py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 ${category === "events" ? 'bg-spotify-green text-black shadow-sm font-extrabold scale-[1.02]' : 'text-slate-600 hover:bg-slate-200/50'}`}
                    >
                        <Calendar size={14} />
                        {language === 'en' ? 'Events' : '축제/행사'}
                    </button>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                    {loadingPlaces && (
                        <Loader2 className="animate-spin text-spotify-green shrink-0" size={16} />
                    )}
                    <button
                        type="button"
                        onClick={detectLocation}
                        className="p-2 text-slate-600 hover:bg-slate-200 rounded-xl transition-all shrink-0 active:scale-95"
                        title={language === 'en' ? "Refresh Location" : "위치 재탐색"}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 text-left font-bold">
                    ⚠️ {errorMsg}
                </div>
            )}

            {/* 구글 지도 본체 (높이를 384px -> 500px로 증가) */}
            <div className="w-full h-[500px] rounded-3xl overflow-hidden border border-slate-200 relative z-0 shadow-lg" ref={mapRef} style={{ minHeight: "500px" }} />
        </div>
    );
}
