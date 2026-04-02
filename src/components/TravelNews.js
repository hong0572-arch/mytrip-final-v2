'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MapPin, Calendar, RefreshCw, ExternalLink } from 'lucide-react';

// 날짜 포맷 헬퍼
const formatDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return '';
    return `${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
};

export default function TravelNews({ language = 'ko' }) {
    const [newsItems, setNewsItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);
    const scrollRef = useRef(null);

    // 데이터 가져오기
    const fetchNews = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch('/api/tourism?type=festival&numOfRows=10');
            
            if (!res.ok) {
                throw new Error(`API Error: ${res.status}`);
            }
            
            const data = await res.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            // 이미지 있는 것만 필터
            const items = (data.items || [])
                .filter(item => item.image)
                .slice(0, 10)
                .map(item => ({ ...item, tag: '🎉 축제/행사' }));

            setNewsItems(items);
        } catch (err) {
            console.error('Travel news fetch error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 초기 로드 + 30분마다 자동 갱신
    useEffect(() => {
        fetchNews();
        const refreshInterval = setInterval(fetchNews, 30 * 60 * 1000);
        return () => clearInterval(refreshInterval);
    }, [fetchNews]);

    // 자동 슬라이드 (4초 간격)
    useEffect(() => {
        if (newsItems.length <= 1) return;
        intervalRef.current = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % newsItems.length);
        }, 4000);
        return () => clearInterval(intervalRef.current);
    }, [newsItems]);

    // 슬라이드 변경 시 스크롤
    useEffect(() => {
        if (scrollRef.current && newsItems.length > 0) {
            const cardWidth = 240;
            scrollRef.current.scrollTo({
                left: currentSlide * cardWidth,
                behavior: 'smooth'
            });
        }
    }, [currentSlide, newsItems]);

    const handleCardClick = (item) => {
        const url = item.detailUrl || `https://search.naver.com/search.naver?query=${encodeURIComponent(item.title)}+축제`;
        window.open(url, '_blank');
    };

    // 로딩 상태
    if (isLoading) {
        return (
            <div className="w-full">
                <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-6 h-6 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="flex gap-3 overflow-hidden">
                    {[1, 2].map(i => (
                        <div key={i} className="min-w-[240px] h-[140px] rounded-2xl bg-gray-100 animate-pulse shrink-0" />
                    ))}
                </div>
            </div>
        );
    }

    // 에러 또는 데이터 없으면 안내 표시
    if (error || newsItems.length === 0) {
        return (
            <div className="w-full text-center py-4">
                <p className="text-sm text-gray-400 font-medium">
                    {error ? '소식을 불러오지 못했어요 😿' : '새로운 소식이 없어요'}
                </p>
                <button onClick={fetchNews} className="mt-2 text-xs text-rose-500 font-bold flex items-center gap-1 mx-auto">
                    <RefreshCw size={12} /> 다시 시도
                </button>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-rose-500 to-amber-500 rounded-lg flex items-center justify-center">
                        <Sparkles size={13} className="text-white" />
                    </div>
                    <span className="text-sm font-black text-gray-800">
                        {language === 'en' ? 'Travel News' : '여행 새소식'}
                    </span>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsLoading(true); fetchNews(); }}
                    className="p-1.5 rounded-full hover:bg-gray-100 transition text-gray-400"
                >
                    <RefreshCw size={14} />
                </button>
            </div>

            {/* 카드 캐러셀 */}
            <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2 -mx-1 px-1"
                onTouchStart={() => clearInterval(intervalRef.current)}
                onTouchEnd={() => {
                    if (newsItems.length > 1) {
                        intervalRef.current = setInterval(() => {
                            setCurrentSlide(prev => (prev + 1) % newsItems.length);
                        }, 4000);
                    }
                }}
            >
                {newsItems.map((item, idx) => (
                    <motion.div
                        key={item.id || idx}
                        onClick={() => handleCardClick(item)}
                        className="min-w-[230px] h-[140px] rounded-2xl relative overflow-hidden shadow-md cursor-pointer group shrink-0 snap-start"
                        whileTap={{ scale: 0.97 }}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        {/* 배경 이미지 */}
                        <img
                            src={item.image}
                            alt={item.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&auto=format'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                        {/* 태그 */}
                        <div className="absolute top-2.5 left-2.5">
                            <span className="text-[10px] font-bold text-white bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/20">
                                {item.tag}
                            </span>
                        </div>

                        {/* 콘텐츠 */}
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                            <h4 className="text-white font-bold text-[13px] leading-tight mb-1 line-clamp-2 drop-shadow-sm">
                                {item.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-white/70">
                                {item.addr && (
                                    <span className="flex items-center gap-0.5 truncate max-w-[100px]">
                                        <MapPin size={9} />
                                        {item.addr.split(' ').slice(0, 2).join(' ')}
                                    </span>
                                )}
                                {item.eventStartDate && (
                                    <span className="flex items-center gap-0.5">
                                        <Calendar size={9} />
                                        {formatDate(item.eventStartDate)}~{formatDate(item.eventEndDate)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 외부 링크 아이콘 */}
                        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-5 h-5 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                                <ExternalLink size={10} className="text-white" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* 슬라이드 인디케이터 */}
            {newsItems.length > 1 && (
                <div className="flex justify-center gap-1 mt-2">
                    {newsItems.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentSlide(idx)}
                            className={`h-1 rounded-full transition-all duration-300 ${
                                idx === currentSlide 
                                    ? 'w-4 bg-rose-500' 
                                    : 'w-1.5 bg-gray-200'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
