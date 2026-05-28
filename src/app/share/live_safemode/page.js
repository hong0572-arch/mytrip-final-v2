'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, MapPin, AlertTriangle, Phone, Siren, Volume2, Shield, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { db } from '../../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

function GuardianDashboardContent() {
    const searchParams = useSearchParams();
    const staticLat = searchParams.get('lat');
    const staticLng = searchParams.get('lng');
    const staticName = searchParams.get('name') || '여행자';
    const userId = searchParams.get('userId');

    // 실시간 세션 데이터
    const [sessionData, setSessionData] = useState(null);
    const [userInteracted, setUserInteracted] = useState(false); // 브라우저 자동재생 제한 해제 상태

    // 사이렌 상태 및 참조
    const [isSirenPlaying, setIsSirenPlaying] = useState(false);
    const audioCtxRef = useRef(null);
    const oscillatorRef = useRef(null);
    const gainNodeRef = useRef(null);
    const sirenIntervalRef = useRef(null);

    // 1. Firestore 실시간 세션 구독
    useEffect(() => {
        if (!userId) return;

        const sessionRef = doc(db, "safemode_sessions", userId);
        const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setSessionData(data);
                console.log("실시간 보호 세션 갱신:", data);
            } else {
                setSessionData(null);
                console.log("실시간 보호 세션 해제(안전 귀가 완료)");
            }
        }, (err) => {
            console.error("세션 구독 오류:", err);
        });

        return () => unsubscribe();
    }, [userId]);

    // 2. 실시간 세션의 만료(status === 'expired') 감지 및 사이렌 자동 재생 제어
    useEffect(() => {
        if (sessionData && sessionData.status === 'expired') {
            if (userInteracted && !isSirenPlaying) {
                // 사용자가 상호작용했고, 아직 사이렌이 울리지 않는 경우 자동 시작
                toggleSiren(true);
            }
        } else {
            // 안전해졌거나 세션이 만료 해제(삭제)되었을 경우 사이렌 강제 끄기
            if (isSirenPlaying) {
                toggleSiren(false);
            }
        }
    }, [sessionData, userInteracted, isSirenPlaying]);

    // 컴포넌트 언마운트 시 오디오 해제
    useEffect(() => {
        return () => {
            if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
            if (oscillatorRef.current) {
                try { oscillatorRef.current.stop(); } catch(e){}
            }
            if (audioCtxRef.current) audioCtxRef.current.close();
        };
    }, []);

    // 보호자 사이렌 오디오 재생 제어 함수
    const toggleSiren = (forceState) => {
        const targetState = typeof forceState === 'boolean' ? forceState : !isSirenPlaying;

        if (!targetState) {
            if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
            if (oscillatorRef.current) {
                try { oscillatorRef.current.stop(); } catch (e) {}
                oscillatorRef.current.disconnect();
            }
            if (gainNodeRef.current) gainNodeRef.current.disconnect();
            if (audioCtxRef.current) audioCtxRef.current.close();

            audioCtxRef.current = null;
            oscillatorRef.current = null;
            gainNodeRef.current = null;
            setIsSirenPlaying(false);
            return;
        }

        if (isSirenPlaying) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new AudioContext();
            oscillatorRef.current = audioCtxRef.current.createOscillator();
            gainNodeRef.current = audioCtxRef.current.createGain();

            gainNodeRef.current.gain.value = 0.9;
            oscillatorRef.current.type = 'sawtooth'; // 보호자는 날카로운 톱니파
            oscillatorRef.current.frequency.value = 800;

            oscillatorRef.current.connect(gainNodeRef.current);
            gainNodeRef.current.connect(audioCtxRef.current.destination);
            
            oscillatorRef.current.start();

            let isHigh = false;
            sirenIntervalRef.current = setInterval(() => {
                if (oscillatorRef.current) {
                    oscillatorRef.current.frequency.setValueAtTime(
                        isHigh ? 800 : 1300,
                        audioCtxRef.current.currentTime
                    );
                }
                isHigh = !isHigh;
            }, 250);

            setIsSirenPlaying(true);
        } catch (err) {
            console.error("보호자 사이렌 작동 실패:", err);
        }
    };

    // 브라우저 Autoplay 보안 제약 해제를 위한 클릭 상호작용
    const handleEnableAudio = () => {
        setUserInteracted(true);
        // 혹시 이미 만료 상태인 세션이 진입 시에 켜져 있었다면 바로 울림 시작
        if (sessionData && sessionData.status === 'expired') {
            toggleSiren(true);
        }
    };

    // 실시간 좌표 vs 정적 좌표 결정
    const lat = sessionData?.location?.lat || staticLat;
    const lng = sessionData?.location?.lng || staticLng;
    const name = sessionData?.userName || staticName;
    const isExpired = sessionData?.status === 'expired';

    const hasLocation = lat && lng;
    const mapUrl = hasLocation ? `https://www.google.com/maps?q=${lat},${lng}` : null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pt-12 pb-20 font-sans">
            {/* 오디오 상호작용 유도 배너 */}
            {!userInteracted && (
                <div className="w-full max-w-md mb-4 animate-in fade-in duration-300">
                    <button 
                        onClick={handleEnableAudio}
                        className="w-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary py-3.5 px-4 rounded-2xl flex items-center justify-between text-xs font-black shadow-sm active:scale-98 transition"
                    >
                        <div className="flex items-center gap-2 text-left">
                            <Volume2 size={18} className="animate-bounce shrink-0" />
                            <div>
                                <p>음성 안내 경보 및 사이렌 활성화</p>
                                <p className="text-[10px] text-brand-primary/80 mt-0.5 font-bold">비상 상황 시 즉각적인 경보음을 듣기 위해 클릭해 주세요.</p>
                            </div>
                        </div>
                        <span className="bg-brand-primary text-white px-2.5 py-1 rounded-lg text-[10px]">켬</span>
                    </button>
                </div>
            )}

            <div className={`w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden transition-all duration-500 border-2 ${isExpired ? 'border-brand-danger shadow-brand-danger/20 ring-4 ring-brand-danger/10' : 'border-transparent'}`}>
                {/* 헤더 구역 */}
                <div className={`p-8 text-center relative overflow-hidden transition-colors duration-500 ${isExpired ? 'bg-gradient-to-br from-brand-danger to-brand-danger/80' : 'bg-gradient-to-br from-brand-primary via-brand-secondary to-brand-accent'}`}>
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-lg animate-pulse bg-white/20 text-white`}>
                            {isExpired ? <ShieldAlert size={48} /> : <ShieldCheck size={48} />}
                        </div>
                        <h1 className="text-2xl font-black text-white mb-2 tracking-tight">
                            {isExpired ? '🚨 비상 안심 경보!' : '안심 귀가 모니터링'}
                        </h1>
                        <p className="text-white/90 text-sm font-bold leading-relaxed">
                            {isExpired ? (
                                <span>{name}님의 안심 귀가 타이머가 초과되었습니다!<br/>안전을 신속하게 확인해주세요.</span>
                            ) : (
                                <span>현재 {name}님이 Safe Mode로 안전하게 이동 중입니다.</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* 컨텐츠 구역 */}
                <div className="p-8 space-y-8">
                    {/* 실시간 위치 */}
                    <div>
                        <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                            <MapPin className="text-brand-primary" /> 마지막 확인된 위치
                        </h2>
                        
                        {hasLocation ? (
                            <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                <div className="aspect-video w-full bg-gray-200 relative flex items-center justify-center">
                                    <iframe 
                                        width="100%" 
                                        height="100%" 
                                        frameBorder="0" 
                                        style={{ border: 0 }}
                                        src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`} 
                                        allowFullScreen
                                    ></iframe>
                                </div>
                                <div className="p-4 bg-white flex justify-between items-center">
                                    <p className="text-xs font-bold text-gray-500">
                                        {sessionData ? '📡 실시간 GPS 트래킹 중' : '📍 전달받은 정적 GPS 위치'}
                                    </p>
                                    <a 
                                        href={mapUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-xs font-black text-brand-primary bg-brand-primary/10 px-4 py-2 rounded-xl hover:bg-brand-primary/20 transition"
                                    >
                                        구글 지도로 크게 보기
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-brand-danger/10 p-6 rounded-2xl border border-brand-danger/20 text-center">
                                <AlertTriangle size={32} className="text-brand-danger/60 mx-auto mb-3 animate-pulse" />
                                <p className="text-sm font-black text-brand-danger mb-1">위치 정보를 불러올 수 없습니다</p>
                                <p className="text-xs text-brand-danger/80 font-bold">기기의 위치 설정이 꺼져있거나, 통신 상태가 불안정할 수 있습니다.</p>
                            </div>
                        )}
                    </div>

                    {/* 보호자 행동 지침 */}
                    <div className={`rounded-2xl p-6 border transition-colors duration-500 ${isExpired ? 'bg-brand-danger/10 border-brand-danger/20 text-brand-danger' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>
                        <h3 className="font-black mb-2 flex items-center gap-2 text-sm">
                            <AlertTriangle size={16} /> 
                            {isExpired ? '⚠️ [긴급 지침] 즉시 조치를 권장합니다' : '보호자 행동 지침'}
                        </h3>
                        {isExpired ? (
                            <ul className="text-xs font-bold text-brand-danger/80 space-y-2 leading-relaxed">
                                <li>• 여행자님이 직접 설정한 귀가 약속 시간이 만료되었습니다.</li>
                                <li>• 신속하게 전화를 걸어 여행자의 현재 위치와 안전을 확인해 주세요.</li>
                                <li>• 통화가 불가능하거나 현장 확인이 곤란한 경우, 즉시 경찰(112) 또는 주변 구조대에 신고해 주세요.</li>
                            </ul>
                        ) : (
                            <ul className="text-xs font-bold text-amber-800/80 space-y-2 leading-relaxed">
                                <li>• 여행자님이 귀가 시간을 설정하고 스스로 안전 모드를 켰습니다.</li>
                                <li>• 설정된 시간이 지나도 안전을 확인하지 않으면 긴급 사이렌이 울리고 문자가 다시 전송됩니다.</li>
                                <li>• 장시간 위치 변화가 없거나 연락이 닿지 않을 경우, 즉시 전화를 걸어 안전을 확인해 주세요.</li>
                            </ul>
                        )}
                    </div>
                </div>

                {/* 하단 푸터 */}
                <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
                    <Link href="/" className="text-xs font-bold text-gray-400 hover:text-brand-primary transition">
                        TripMaker 서비스 메인으로 가기
                    </Link>
                </div>
            </div>

            {/* 보호자 기기 비상 사이렌 소리 알림 팝업 오버레이 */}
            {isExpired && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] w-[90%] max-w-[360px] animate-in slide-in-from-bottom duration-300">
                    <div className="bg-brand-danger text-white p-4.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border border-brand-danger/80">
                        <div className="flex items-center gap-2.5">
                            <Siren size={20} className="animate-spin text-white" />
                            <div className="text-left">
                                <p className="text-xs font-black">🚨 긴급 비상 경고 사이렌 작동 중!</p>
                                <p className="text-[10px] text-white/80 font-bold mt-0.5">{name}님의 보호 시간이 만료되었습니다.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => toggleSiren(false)}
                            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-[10px] font-black shrink-0 transition active:scale-95"
                        >
                            소리 끄기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function GuardianDashboard() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-brand-primary font-black">Loading Dashboard...</div>}>
            <GuardianDashboardContent />
        </Suspense>
    );
}
