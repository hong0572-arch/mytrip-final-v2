'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, TrendingDown, TrendingUp, Plane, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

// 💰 가격 포맷 함수
const formatPrice = (price) => {
    if (!price) return '---';
    return `₩${price.toLocaleString('ko-KR')}`;
};

// 📊 변동률 계산 함수
const calcPercent = (current, initial) => {
    if (!initial || !current) return 0;
    return ((current - initial) / initial * 100).toFixed(1);
};

// 📈 미니 가격 차트 컴포넌트 (SVG 기반)
function MiniPriceChart({ priceHistory = [] }) {
    if (!priceHistory || priceHistory.length < 2) {
        return (
            <div className="w-full h-16 flex items-center justify-center text-[10px] text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                데이터 수집 중... (최소 2일)
            </div>
        );
    }

    const prices = priceHistory.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || 1;
    const width = 280;
    const height = 60;
    const padding = 8;

    const points = prices.map((price, i) => {
        const x = padding + (i / (prices.length - 1)) * (width - padding * 2);
        const y = height - padding - ((price - minPrice) / range) * (height - padding * 2);
        return `${x},${y}`;
    }).join(' ');

    const lastPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];
    const isDown = lastPrice <= prevPrice;

    return (
        <div className="w-full relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" preserveAspectRatio="none">
                {/* 그라데이션 배경 */}
                <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isDown ? '#10b981' : '#ef4444'} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={isDown ? '#10b981' : '#ef4444'} stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* 영역 채우기 */}
                <polygon
                    points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
                    fill="url(#chartGrad)"
                />
                {/* 라인 */}
                <polyline
                    points={points}
                    fill="none"
                    stroke={isDown ? '#10b981' : '#ef4444'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* 마지막 포인트 */}
                {(() => {
                    const lastX = padding + ((prices.length - 1) / (prices.length - 1)) * (width - padding * 2);
                    const lastY = height - padding - ((lastPrice - minPrice) / range) * (height - padding * 2);
                    return (
                        <circle cx={lastX} cy={lastY} r="3.5" fill={isDown ? '#10b981' : '#ef4444'} stroke="white" strokeWidth="1.5" />
                    );
                })()}
            </svg>
            {/* 최저/최고 라벨 */}
            <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 px-1">
                <span>{formatPrice(minPrice)}</span>
                <span>{formatPrice(maxPrice)}</span>
            </div>
        </div>
    );
}

// 🔔 가격 추적 시작 모달
function TrackingModal({ isOpen, onClose, onSubmit, destination, destinationName, departureDate, returnDate, currentPrice, isLoading }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-white w-full sm:w-[420px] rounded-t-3xl sm:rounded-3xl p-6 pb-8 space-y-5 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center">
                        <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                            <Bell className="text-blue-500" size={18} />
                            가격 변동 알림 설정
                        </h3>
                        <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 transition">
                            <X size={18} className="text-slate-400" />
                        </button>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100/50 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Plane className="text-blue-600" size={18} />
                            </div>
                            <div>
                                <p className="font-extrabold text-slate-800 text-sm">서울(ICN) → {destinationName || destination}</p>
                                <p className="text-[11px] text-slate-500">
                                    {departureDate}{returnDate ? ` ~ ${returnDate}` : ''}
                                </p>
                            </div>
                        </div>
                        {currentPrice > 0 && (
                            <div className="bg-white/80 rounded-xl p-3 text-center">
                                <p className="text-[10px] text-slate-500 mb-0.5">현재 참고 가격</p>
                                <p className="font-black text-lg text-slate-800">{formatPrice(currentPrice)}</p>
                                <p className="text-[9px] text-slate-400 mt-0.5">* Travelpayouts 캐시 데이터 기준</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1.5">
                        <p className="text-[11px] font-bold text-amber-700">📌 알림 안내</p>
                        <ul className="text-[10px] text-amber-600 space-y-0.5 pl-3 list-disc">
                            <li>매일 오전 9시에 가격을 체크합니다</li>
                            <li>가격이 <strong>5% 이상</strong> 변동되면 알림을 보내드려요</li>
                            <li>푸시 알림 + 이메일로 알려드립니다</li>
                            <li>노선 추적은 <strong>1개</strong>만 가능합니다</li>
                        </ul>
                    </div>

                    <button
                        type="button"
                        onClick={() => onSubmit()}
                        disabled={isLoading}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl active:scale-95 transition-all text-sm shadow-lg shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                설정 중...
                            </>
                        ) : (
                            <>
                                <Bell size={16} />
                                가격 변동 알림 시작하기
                            </>
                        )}
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// 🎯 메인 컴포넌트: 가격 추적 카드 (MyPage용)
export function FlightPriceTrackerCard({ tracker, onDelete, isDeleting }) {
    const [showHistory, setShowHistory] = useState(false);

    if (!tracker) return null;

    const priceDiff = tracker.lastKnownPrice - tracker.initialPrice;
    const percentChange = calcPercent(tracker.lastKnownPrice, tracker.initialPrice);
    const isDown = priceDiff <= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden"
        >
            {/* 헤더 */}
            <div className={`px-5 py-4 ${isDown ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-red-500 to-orange-500'} text-white`}>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                            <Plane size={18} />
                        </div>
                        <div>
                            <p className="font-extrabold text-sm">서울 → {tracker.destinationName || tracker.destination}</p>
                            <p className="text-white/80 text-[11px]">
                                {tracker.departureDate}{tracker.returnDate ? ` ~ ${tracker.returnDate}` : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {isDown ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                        <span className="font-black text-sm">{percentChange > 0 ? '+' : ''}{percentChange}%</span>
                    </div>
                </div>
            </div>

            {/* 가격 정보 */}
            <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-50 rounded-xl p-2.5">
                        <p className="text-[9px] text-slate-500 font-bold mb-0.5">등록 시 가격</p>
                        <p className="font-black text-xs text-slate-700">{formatPrice(tracker.initialPrice)}</p>
                    </div>
                    <div className={`rounded-xl p-2.5 ${isDown ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <p className="text-[9px] text-slate-500 font-bold mb-0.5">현재 가격</p>
                        <p className={`font-black text-xs ${isDown ? 'text-emerald-700' : 'text-red-700'}`}>
                            {formatPrice(tracker.lastKnownPrice)}
                        </p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-2.5">
                        <p className="text-[9px] text-slate-500 font-bold mb-0.5">추적 최저가</p>
                        <p className="font-black text-xs text-blue-700">{formatPrice(tracker.lowestPrice)}</p>
                    </div>
                </div>

                {/* 가격 변동 요약 */}
                <div className={`flex items-center justify-center gap-2 py-2 rounded-xl ${isDown ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                    {isDown ? <TrendingDown className="text-emerald-600" size={14} /> : <TrendingUp className="text-red-600" size={14} />}
                    <span className={`font-extrabold text-xs ${isDown ? 'text-emerald-700' : 'text-red-700'}`}>
                        등록 대비 {Math.abs(priceDiff).toLocaleString('ko-KR')}원 {isDown ? '하락' : '상승'}
                    </span>
                </div>

                {/* 미니 차트 */}
                <MiniPriceChart priceHistory={tracker.priceHistory} />

                {/* 가격 이력 토글 */}
                <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-bold hover:text-slate-700 transition py-1"
                >
                    {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    가격 이력 {showHistory ? '접기' : '보기'} ({tracker.priceHistory?.length || 0}건)
                </button>

                <AnimatePresence>
                    {showHistory && tracker.priceHistory && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {[...tracker.priceHistory].reverse().map((entry, idx) => {
                                    const prevEntry = tracker.priceHistory[tracker.priceHistory.length - 2 - idx];
                                    const diff = prevEntry ? entry.price - prevEntry.price : 0;
                                    return (
                                        <div key={idx} className="flex justify-between items-center px-3 py-1.5 bg-slate-50 rounded-lg text-[10px]">
                                            <span className="text-slate-500">
                                                {new Date(entry.checkedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-700">{formatPrice(entry.price)}</span>
                                                {diff !== 0 && (
                                                    <span className={`font-bold ${diff < 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {diff > 0 ? '+' : ''}{diff.toLocaleString('ko-KR')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 알림 해제 버튼 */}
                <button
                    type="button"
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                    {isDeleting ? (
                        <Loader2 className="animate-spin" size={14} />
                    ) : (
                        <BellOff size={14} />
                    )}
                    {isDeleting ? '해제 중...' : '가격 알림 해제'}
                </button>
            </div>
        </motion.div>
    );
}

// 🔔 가격 추적 버튼 (항공편 검색 결과에 삽입용)
export function TrackPriceButton({ 
    userId, 
    userEmail, 
    destination, 
    destinationName, 
    departureDate, 
    returnDate, 
    currentPrice, 
    fcmToken, 
    existingTracker, 
    onTrackerChange,
    compact = false 
}) {
    const [showModal, setShowModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (replace = false) => {
        const isReplace = replace === true; // Event 객체가 넘어오는 경우 방지

        if (!userId) {
            alert('로그인이 필요한 기능입니다.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/flights/tracker', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    userEmail,
                    destination,
                    destinationName,
                    departureDate,
                    returnDate,
                    currentPrice,
                    fcmToken: fcmToken || window._fcmToken || '',
                    replace: isReplace
                })
            });

            const data = await res.json();
            
            // 🚨 기존 알림이 있는 경우 교체 여부 묻기
            if (res.status === 409 && data.code === 'ALREADY_EXISTS') {
                setIsLoading(false);
                if (confirm('이미 기존 노선의 가격을 추적 중입니다.\n기존 알림을 해제하고 현재 노선으로 변경하시겠습니까?')) {
                    await handleSubmit(true); // 재귀 호출 완료 대기
                }
                return;
            }

            if (!res.ok) {
                alert(data.error || '추적 등록에 실패했습니다.');
                return;
            }

            setShowModal(false);
            if (onTrackerChange) onTrackerChange(data);
            alert('✅ 가격 변동 알림이 설정되었습니다!\n매일 오전 9시에 가격을 체크합니다.');
        } catch (err) {
            console.error('Tracker creation error:', err);
            alert('네트워크 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // 이미 추적 중인 경우
    if (existingTracker && existingTracker.destination === destination) {
        return (
            <div className={`flex items-center gap-1.5 ${compact ? 'text-[10px]' : 'text-xs'} text-blue-600 font-bold`}>
                <Bell size={compact ? 12 : 14} className="animate-pulse" />
                <span>알림 추적 중</span>
            </div>
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setShowModal(true);
                }}
                className={`flex items-center gap-1.5 font-bold transition-all active:scale-95 ${
                    compact
                        ? 'text-[10px] text-blue-600 hover:text-blue-700 px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100'
                        : 'text-xs text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl shadow-md shadow-blue-600/20'
                }`}
            >
                <Bell size={compact ? 11 : 14} />
                <span>{compact ? '알림' : '가격 변동 알림'}</span>
            </button>

            <TrackingModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={handleSubmit}
                destination={destination}
                destinationName={destinationName}
                departureDate={departureDate}
                returnDate={returnDate}
                currentPrice={currentPrice}
                isLoading={isLoading}
            />
        </>
    );
}

// 📋 MyPage용 가격 추적 관리 섹션
export default function FlightPriceTracker({ userId, userEmail }) {
    const [tracker, setTracker] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchTracker = useCallback(async () => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        try {
            const res = await fetch(`/api/flights/tracker?userId=${userId}`);
            const data = await res.json();
            setTracker(data.tracker || null);
        } catch (err) {
            console.error('Failed to fetch tracker:', err);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchTracker();
    }, [fetchTracker]);

    const handleDelete = async () => {
        if (!tracker) return;
        if (!confirm('가격 변동 알림을 해제하시겠습니까?')) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/flights/tracker?userId=${userId}&trackerId=${tracker.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setTracker(null);
            }
        } catch (err) {
            console.error('Failed to delete tracker:', err);
            alert('해제에 실패했습니다.');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
        );
    }

    if (!tracker) {
        return (
            <div className="text-center py-12 px-6 space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <BellOff className="text-blue-400" size={28} />
                </div>
                <p className="font-bold text-slate-600 text-sm">활성화된 가격 알림이 없습니다</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                    항공권 탭에서 검색 후<br />
                    <span className="font-bold text-blue-500">🔔 가격 변동 알림</span> 버튼을 눌러보세요!
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <FlightPriceTrackerCard
                tracker={tracker}
                onDelete={handleDelete}
                isDeleting={isDeleting}
            />
        </div>
    );
}
