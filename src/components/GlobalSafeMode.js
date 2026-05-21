'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ShieldAlert, PhoneCall, Timer, X, Send, User, ChevronUp, AlertTriangle } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function GlobalSafeMode() {
    const [user, setUser] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    
    // 안전 모드 핵심 상태
    const [isActive, setIsActive] = useState(false);
    const [duration, setDuration] = useState(30); // 분 단위
    const [timeLeft, setTimeLeft] = useState(0); // 초 단위
    const [guardianName, setGuardianName] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');
    const [isRegistered, setIsRegistered] = useState(false);
    const [showTimerAlert, setShowTimerAlert] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    
    const timerRef = useRef(null);
    const pulseRef = useRef(null);

    // 1. 유저 인증 상태 연동 및 초기 로컬스토리지 복구
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currUser) => {
            setUser(currUser);
        });

        // 로컬스토리지로부터 값 읽어오기
        const savedActive = localStorage.getItem('safeMode_active') === 'true';
        const savedEndTime = localStorage.getItem('safeMode_endTime');
        const savedGName = localStorage.getItem('safeMode_gName') || '';
        const savedGPhone = localStorage.getItem('safeMode_gPhone') || '';
        
        setGuardianName(savedGName);
        setGuardianPhone(savedGPhone);
        if (savedGName && savedGPhone) setIsRegistered(true);

        if (savedActive && savedEndTime) {
            const end = parseInt(savedEndTime);
            const now = Date.now();
            if (end > now) {
                setIsActive(true);
                setTimeLeft(Math.floor((end - now) / 1000));
            } else {
                localStorage.removeItem('safeMode_active');
                localStorage.removeItem('safeMode_endTime');
            }
        }

        return () => unsubscribe();
    }, []);

    // 2. 타이머 틱 작동
    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        handleTimerExpire();
                        return 0;
                    }
                    // 로컬스토리지 마이너 동기화
                    const savedEndTime = localStorage.getItem('safeMode_endTime');
                    if (savedEndTime) {
                        const remaining = Math.max(0, Math.floor((parseInt(savedEndTime) - Date.now()) / 1000));
                        return remaining;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (!isActive) {
            clearInterval(timerRef.current);
        }

        return () => clearInterval(timerRef.current);
    }, [isActive, timeLeft]);

    // 3. 타이머 만료 처리
    const handleTimerExpire = async () => {
        setIsActive(false);
        localStorage.removeItem('safeMode_active');
        localStorage.removeItem('safeMode_endTime');
        
        setShowTimerAlert(true);
        triggerVibration(3);
        
        // Firebase 동행인 채팅방으로 비상 메시지 전송 시도
        try {
            const activeTripId = localStorage.getItem('activeTripId');
            if (activeTripId && user) {
                await addDoc(collection(db, "trips", activeTripId, "messages"), {
                    text: `🚨 [안심 귀가 알림] ${user.displayName || '여행자'}님의 Safe Mode 안심 귀가 약속 타이머가 만료되었습니다! 안전을 확인해 주세요. 🚨`,
                    senderId: 'system_safemode',
                    senderName: '🛡️ Safe Mode 시스템',
                    senderAvatar: '/logo.png',
                    createdAt: serverTimestamp()
                });
            }
        } catch (err) {
            console.error("비상 메시지 자동 송출 실패:", err);
        }
    };

    // 진동 효과 (모바일 웹 지원)
    const triggerVibration = (count = 1) => {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            const pattern = Array(count).fill([200, 100]).flat();
            window.navigator.vibrate(pattern);
        }
    };

    // 토스트 알림 표시
    const triggerToast = (msg) => {
        setToastMessage(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    // 4. Safe Mode 켜기
    const handleToggleOn = () => {
        if (!guardianName.trim() || !guardianPhone.trim()) {
            return triggerToast('먼저 비상 보호자 정보를 등록해 주세요! 🛡️');
        }
        
        const seconds = duration * 60;
        const endTime = Date.now() + seconds * 1000;
        
        localStorage.setItem('safeMode_active', 'true');
        localStorage.setItem('safeMode_endTime', endTime.toString());
        
        setIsActive(true);
        setTimeLeft(seconds);
        triggerToast('🟢 Safe Mode가 가동되었습니다. 보호 상태가 활성화됩니다!');
        triggerVibration(1);

        // 커스텀 이벤트 전송 (AIResult 등에서 감지용)
        window.dispatchEvent(new CustomEvent('safeModeChanged', { detail: { active: true, duration: seconds } }));
    };

    // 5. Safe Mode 끄기 (안전 확인 완료)
    const handleToggleOff = () => {
        localStorage.removeItem('safeMode_active');
        localStorage.removeItem('safeMode_endTime');
        
        setIsActive(false);
        setTimeLeft(0);
        setShowTimerAlert(false);
        triggerToast('🛡️ 귀가 약속이 해제되었습니다. 안전한 복귀를 축하합니다!');
        
        window.dispatchEvent(new CustomEvent('safeModeChanged', { detail: { active: false } }));
    };

    // 6. 보호자 연락처 등록
    const handleRegisterGuardian = (e) => {
        e.preventDefault();
        if (!guardianName.trim() || !guardianPhone.trim()) return;

        localStorage.setItem('safeMode_gName', guardianName);
        localStorage.setItem('safeMode_gPhone', guardianPhone);
        setIsRegistered(true);
        triggerToast('✅ 보호자 정보가 등록되었습니다.');
    };

    const handleResetGuardian = () => {
        setIsRegistered(false);
        setGuardianName('');
        setGuardianPhone('');
        localStorage.removeItem('safeMode_gName');
        localStorage.removeItem('safeMode_gPhone');
    };

    // 7. 실시간 위치 문자 링크 공유 전송
    const handleSendLocationMessage = async () => {
        if (typeof window === 'undefined') return;

        // 가상 혹은 실제 위치 링크 생성
        const mapUrl = `https://mytrip2.pro/share/live_safemode`;
        const textMessage = `🚨 [TripMaker 안심 알림]\n저 지금 Safe Mode 상태로 이동 중입니다!\n실시간 안심 위치 보기:\n${mapUrl}`;

        try {
            await navigator.clipboard.writeText(textMessage);
            triggerToast('📋 안심 공유 텍스트가 클립보드에 복사되었습니다! 보호자에게 카톡/문자로 붙여넣어 주세요.');
            
            // 즉시 카카오톡이나 SMS 전송 창 연동
            const encodedMsg = encodeURIComponent(textMessage);
            const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
            
            if (isMobile) {
                window.location.href = `sms:${guardianPhone}?body=${encodedMsg}`;
            } else {
                window.open(`https://share.kakao.com/talk/friends/picker/link`, '_blank');
            }
        } catch (err) {
            triggerToast('공유 텍스트 생성 실패');
        }
    };

    // 포맷 도우미
    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // 로그인된 회원에게만 전역 제공
    if (!user) return null;

    return (
        <>
            {/* 1. 상단 다이내믹 세이프티 아일랜드 (배너) */}
            {isActive && (
                <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-[480px] px-4 pt-3 pointer-events-none animate-in slide-in-from-top-full duration-500">
                    <div className="w-full bg-emerald-500/90 backdrop-blur-md border border-emerald-400/30 text-white rounded-2xl py-3 px-4 shadow-[0_8px_32px_rgba(16,185,129,0.3)] flex items-center justify-between pointer-events-auto ring-2 ring-emerald-400/50">
                        <div className="flex items-center gap-2.5">
                            <span className="relative flex h-3.5 w-3.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"></span>
                            </span>
                            <span className="text-xs font-black tracking-wide uppercase">🛡️ Safe Mode 실시간 보호 중</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="bg-black/30 font-black px-2.5 py-1 rounded-lg text-sm tabular-nums tracking-wider border border-white/10">
                                {formatTime(timeLeft)}
                            </span>
                            <button 
                                onClick={() => setIsOpen(true)}
                                className="bg-white text-emerald-700 text-[10px] font-black px-3 py-1 rounded-lg hover:bg-emerald-50 transition active:scale-95 shadow-sm"
                            >
                                관리
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. 우측 하단 플로팅 안심 가드 버튼 */}
            <div className="fixed bottom-24 right-5 z-[998] pointer-events-auto flex flex-col items-end gap-2.5">
                {isActive && (
                    <div className="bg-emerald-500 text-white text-[9px] font-black px-2.5 py-1 rounded-lg shadow-md animate-pulse border border-emerald-400">
                        보호 중
                    </div>
                )}
                <button
                    onClick={() => setIsOpen(true)}
                    className={`w-14 h-14 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex items-center justify-center border-2 border-white transition-all duration-300 hover:scale-105 active:scale-95 ${
                        isActive 
                            ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 animate-pulse text-white shadow-[0_0_20px_rgba(16,185,129,0.6)]' 
                            : 'bg-gradient-to-br from-gray-700 to-gray-900 text-amber-400 hover:from-gray-800 hover:to-black'
                    }`}
                    title="Safe Mode 설정"
                >
                    <ShieldCheck size={28} className={isActive ? 'animate-spin-slow' : ''} />
                </button>
            </div>

            {/* 3. Safe Mode 하단 컨트롤 패널 모달 */}
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-end justify-center pointer-events-auto">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsOpen(false)}></div>
                    <div className="bg-white w-full max-w-[480px] rounded-t-[40px] relative z-10 shadow-2xl flex flex-col p-6 animate-in slide-in-from-bottom duration-300 border-t border-gray-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        
                        {/* 헤더 */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                                    <ShieldCheck className={isActive ? 'text-emerald-500' : 'text-indigo-600'} size={26} />
                                    Safe Mode
                                </h3>
                                <p className="text-xs text-gray-500 font-bold mt-1">1인 & 여성 안심 귀가 스마트 타이머</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* 메인 상태 화면 */}
                        {isActive ? (
                            <div className="space-y-5">
                                {/* 카운트다운 써클 카드 */}
                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 rounded-[28px] border border-emerald-100 text-center relative overflow-hidden shadow-inner">
                                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest block mb-2">실시간 안심 보호 진행 중</span>
                                    <div className="text-4xl sm:text-5xl font-black text-emerald-800 tracking-wider tabular-nums font-mono">
                                        {formatTime(timeLeft)}
                                    </div>
                                    
                                    <div className="flex justify-center items-center gap-1.5 mt-3 text-xs font-bold text-emerald-700 bg-white/60 inline-flex px-3 py-1 rounded-full border border-emerald-200/50">
                                        <User size={12} /> 보호자: {guardianName} ({guardianPhone})
                                    </div>
                                </div>

                                {/* 안심 가드 액션 버튼들 */}
                                <div className="space-y-3">
                                    <button
                                        onClick={handleSendLocationMessage}
                                        className="w-full py-4.5 bg-indigo-600 text-white rounded-2xl font-black text-base shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 hover:bg-indigo-700 transition active:scale-95"
                                    >
                                        <Send size={18} /> 보호자에게 실시간 위치 전송
                                    </button>
                                    
                                    <button
                                        onClick={handleToggleOff}
                                        className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:bg-emerald-600 transition active:scale-95 border-b-4 border-emerald-700"
                                    >
                                        🛡️ 귀가 완료 (타이머 끄기)
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* 보호자 등록 구역 */}
                                <div className="bg-gray-50 p-5 rounded-[28px] border border-gray-200/60">
                                    <h4 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-1.5">
                                        <PhoneCall size={16} className="text-indigo-500" />
                                        1단계. 비상 안심 연락망 등록
                                    </h4>

                                    {isRegistered ? (
                                        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
                                            <div>
                                                <p className="text-sm font-black text-gray-800">{guardianName}</p>
                                                <p className="text-xs font-bold text-gray-400 mt-0.5">{guardianPhone}</p>
                                            </div>
                                            <button 
                                                onClick={handleResetGuardian}
                                                className="text-xs font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-lg transition"
                                            >
                                                수정
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleRegisterGuardian} className="space-y-3">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="보호자 성함 (예: 엄마)"
                                                    value={guardianName}
                                                    onChange={(e) => setGuardianName(e.target.value)}
                                                    required
                                                    className="flex-1 bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-xl px-4 py-3.5 text-xs font-bold outline-none transition"
                                                />
                                                <input
                                                    type="tel"
                                                    placeholder="휴대폰 번호 (-없이 입력)"
                                                    value={guardianPhone}
                                                    onChange={(e) => setGuardianPhone(e.target.value)}
                                                    required
                                                    className="flex-1 bg-white border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-xl px-4 py-3.5 text-xs font-bold outline-none transition"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-black shadow-md hover:bg-black transition"
                                            >
                                                비상 연락망 저장
                                            </button>
                                        </form>
                                    )}
                                </div>

                                {/* 타이머 설정 */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-black text-gray-800 flex items-center gap-1.5 px-1">
                                        <Timer size={16} className="text-indigo-500" />
                                        2단계. 안심 약속 귀가 시간 설정
                                    </h4>
                                    
                                    <div className="grid grid-cols-4 gap-2">
                                        {[10, 20, 30, 60].map((mins) => (
                                            <button
                                                key={mins}
                                                onClick={() => setDuration(mins)}
                                                className={`py-3.5 rounded-xl text-xs font-black border transition active:scale-95 ${
                                                    duration === mins
                                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                                }`}
                                            >
                                                {mins}분
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold px-1 leading-relaxed">
                                        💡 밤 10시 이후 이동할 때, 설정한 시간 내에 무사 귀가를 인증하지 않으면 보호자 알림 및 동행 단톡방에 경보 시스템 메시지가 자동으로 올라갑니다.
                                    </p>
                                </div>

                                {/* 활성화 버튼 */}
                                <button
                                    onClick={handleToggleOn}
                                    className="w-full py-4.5 bg-gradient-to-r from-gray-900 to-indigo-950 text-white rounded-2xl font-black text-base shadow-xl hover:from-black hover:to-indigo-900 transition flex items-center justify-center gap-2 border-b-4 border-indigo-900 active:scale-95"
                                >
                                    <ShieldCheck size={20} className="text-amber-400 animate-pulse" />
                                    Safe Mode 실시간 보호 시작
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 4. 타이머 강제 만료 비상 알림 카드 */}
            {showTimerAlert && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 pointer-events-auto">
                    <div className="absolute inset-0 bg-red-950/80 backdrop-blur-md animate-in fade-in duration-300"></div>
                    <div className="bg-white w-full max-w-sm rounded-[36px] p-6 relative z-10 shadow-2xl flex flex-col items-center animate-in zoom-in-95 border-2 border-red-500">
                        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-500 mb-4 animate-bounce shadow-md">
                            <AlertTriangle size={36} />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-1 text-center">🚨 귀가 안심 타이머 만료!</h3>
                        <p className="text-xs text-red-500 font-black mb-3">Emergency Alert Triggered</p>
                        <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed font-semibold">
                            지정한 귀가 예정 약속 시간이 끝났습니다.<br />
                            무사히 도착하셨다면 꼭 해제 버튼을 눌러주세요.<br />
                            <span className="text-red-600 font-bold block mt-2">(현재 비상 경보가 채팅방에 올라갔습니다)</span>
                        </p>
                        <button 
                            onClick={handleToggleOff} 
                            className="w-full py-4.5 rounded-2xl font-black text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg active:scale-95 text-base border-b-4 border-red-700"
                        >
                            🛡️ 무사 도착 해제 (경보 끄기)
                        </button>
                    </div>
                </div>
            )}

            {/* 5. 자체 프리미엄 토스트 피드백 */}
            {showToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] w-[90%] max-w-[360px] animate-in slide-in-from-bottom duration-300">
                    <div className="bg-gray-900/95 backdrop-blur-md text-white px-4 py-3.5 rounded-2xl shadow-2xl border border-white/10 text-xs font-black text-center leading-relaxed">
                        {toastMessage}
                    </div>
                </div>
            )}
        </>
    );
}
