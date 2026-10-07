'use client';

import React, { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, MapPin, AlertTriangle, Siren, Volume2, ShieldAlert, Clock } from 'lucide-react';
import Link from 'next/link';
import { db } from '../../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// 보호자용 안심 귀가 화면.
// 새 링크(?u=…&t=…): 로그인 없이 서버 API가 일회용 키를 확인해 15초마다 갱신한다.
// 예전 링크(?userId=…): 로그인한 앱 회원 보호자만 Firestore에서 직접 읽을 수 있다.
const POLL_MS = 15000;

function minutesAgo(iso) {
    if (!iso) return null;
    const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (Number.isNaN(diff)) return null;
    return diff <= 0 ? '방금' : `${diff}분 전`;
}

function GuardianDashboardContent() {
    const searchParams = useSearchParams();
    const staticLat = searchParams.get('lat');
    const staticLng = searchParams.get('lng');
    const staticName = searchParams.get('name') || '여행자';
    const shareUid = searchParams.get('u');
    const shareToken = searchParams.get('t');
    const legacyUserId = searchParams.get('userId');

    const [sessionData, setSessionData] = useState(null);
    // 'loading' | 'live' | 'ended'(보호 종료 또는 만료된 링크) | 'static'(위치만 전달받음) | 'error'
    const [linkState, setLinkState] = useState(shareUid && shareToken ? 'loading' : legacyUserId ? 'loading' : 'static');
    const [userInteracted, setUserInteracted] = useState(false);
    const [isSirenPlaying, setIsSirenPlaying] = useState(false);
    const audioCtxRef = useRef(null);
    const oscillatorRef = useRef(null);
    const gainNodeRef = useRef(null);
    const sirenIntervalRef = useRef(null);

    const toggleSiren = useCallback((forceState) => {
        const targetState = typeof forceState === 'boolean' ? forceState : !isSirenPlaying;

        if (!targetState) {
            if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
            if (oscillatorRef.current) {
                try { oscillatorRef.current.stop(); } catch {}
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
            oscillatorRef.current.type = 'sawtooth';
            oscillatorRef.current.frequency.value = 800;
            oscillatorRef.current.connect(gainNodeRef.current);
            gainNodeRef.current.connect(audioCtxRef.current.destination);
            oscillatorRef.current.start();

            let isHigh = false;
            sirenIntervalRef.current = setInterval(() => {
                if (oscillatorRef.current) {
                    oscillatorRef.current.frequency.setValueAtTime(isHigh ? 800 : 1300, audioCtxRef.current.currentTime);
                }
                isHigh = !isHigh;
            }, 250);
            setIsSirenPlaying(true);
        } catch (err) {
            console.error("보호자 사이렌 작동 실패:", err);
        }
    }, [isSirenPlaying]);

    // 1-a. 새 링크: 일회용 키로 서버에서 주기적으로 가져온다
    useEffect(() => {
        if (!shareUid || !shareToken) return;
        let cancelled = false;

        const load = async () => {
            try {
                const res = await fetch(`/api/safemode/live/?u=${encodeURIComponent(shareUid)}&t=${encodeURIComponent(shareToken)}`, { cache: 'no-store' });
                if (cancelled) return;
                if (res.status === 404) {
                    setSessionData(null);
                    setLinkState('ended');
                    return;
                }
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                setSessionData(await res.json());
                setLinkState('live');
            } catch (err) {
                console.error("보호 세션 조회 실패:", err);
                if (!cancelled) setLinkState((prev) => (prev === 'live' ? 'live' : 'error'));
            }
        };

        load();
        const timer = setInterval(load, POLL_MS);
        const onVisible = () => { if (document.visibilityState === 'visible') load(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [shareUid, shareToken]);

    // 1-b. 예전 링크: 로그인한 회원 보호자만 실시간 구독 가능
    useEffect(() => {
        if (shareToken || !legacyUserId) return;
        const unsubscribe = onSnapshot(doc(db, "safemode_sessions", legacyUserId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setSessionData({ ...data, locationUpdatedAt: data.locationUpdatedAt?.toDate?.().toISOString() || data.updatedAt?.toDate?.().toISOString() || null });
                setLinkState('live');
            } else {
                setSessionData(null);
                setLinkState('ended');
            }
        }, (err) => {
            console.warn("세션 구독 오류:", err?.code || err);
            setLinkState('error');
        });
        return () => unsubscribe();
    }, [shareToken, legacyUserId]);

    // 2. 경보(expired) 상태면 사이렌, 해제되면 끄기
    useEffect(() => {
        let timer;
        if (sessionData && sessionData.status === 'expired') {
            if (userInteracted && !isSirenPlaying) timer = setTimeout(() => toggleSiren(true), 0);
        } else if (isSirenPlaying) {
            timer = setTimeout(() => toggleSiren(false), 0);
        }
        return () => { if (timer) clearTimeout(timer); };
    }, [sessionData, userInteracted, isSirenPlaying, toggleSiren]);

    useEffect(() => () => {
        if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
        if (oscillatorRef.current) { try { oscillatorRef.current.stop(); } catch {} }
        if (audioCtxRef.current) audioCtxRef.current.close();
    }, []);

    const handleEnableAudio = () => {
        setUserInteracted(true);
        if (sessionData && sessionData.status === 'expired') toggleSiren(true);
    };

    const lat = sessionData?.location?.lat ?? staticLat;
    const lng = sessionData?.location?.lng ?? staticLng;
    const name = sessionData?.userName || staticName;
    const isExpired = sessionData?.status === 'expired';
    const isLive = linkState === 'live' && sessionData;
    const hasLocation = lat != null && lng != null && lat !== '' && lng !== '';
    const mapUrl = hasLocation ? `https://www.google.com/maps?q=${lat},${lng}` : null;
    const updatedLabel = isLive ? minutesAgo(sessionData.locationUpdatedAt) : null;

    const statusTitle = isExpired ? '귀가 확인 시간이 지났어요'
        : isLive ? '안심 귀가 중이에요'
            : linkState === 'ended' ? '보호가 끝났어요'
                : linkState === 'loading' ? '확인하는 중…'
                    : '전달받은 위치';
    const statusBody = isExpired ? `${name}님이 약속한 시간 안에 도착을 확인하지 않았어요. 바로 연락해 안전을 확인해 주세요.`
        : isLive ? `${name}님이 안전모드를 켜고 이동 중이에요. 위치는 자동으로 갱신돼요.`
            : linkState === 'ended' ? `${name}님이 안전하게 보호를 마쳤거나, 이 링크가 만료됐어요.`
                : linkState === 'error' ? '지금은 정보를 불러올 수 없어요. 잠시 후 다시 열어 주세요.'
                    : `${name}님이 보낸 위치예요. 실시간으로 갱신되지는 않아요.`;

    return (
        <div className="min-h-dvh bg-tm-ground font-sans text-tm-ink">
            <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 pb-28 pt-6">
                {!userInteracted && (
                    <button
                        onClick={handleEnableAudio}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-tm-line bg-white p-4 text-left"
                    >
                        <span className="flex items-center gap-3">
                            <Volume2 size={20} className="shrink-0 text-tm-navy" />
                            <span className="flex flex-col">
                                <span className="text-[14px] font-bold">경보음 켜기</span>
                                <span className="text-[12px] text-tm-muted">비상 상황이 생기면 이 휴대폰에서 소리로 알려 드려요.</span>
                            </span>
                        </span>
                        <span className="shrink-0 rounded-lg bg-tm-navy px-3 py-1.5 text-[13px] font-bold text-white">켜기</span>
                    </button>
                )}

                <section className={`rounded-[20px] p-6 text-white ${isExpired ? 'bg-tm-sos' : isLive ? 'bg-tm-safe' : 'bg-tm-ink'}`} aria-live="polite">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
                        {isExpired ? <ShieldAlert size={30} /> : <ShieldCheck size={30} />}
                    </div>
                    <h1 className="mb-1.5 text-[22px] font-bold">{statusTitle}</h1>
                    <p className="text-[14px] leading-relaxed text-white/90">{statusBody}</p>
                    {isLive && sessionData.endTime && !isExpired && (
                        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-white/90">
                            <Clock size={15} /> 도착 예정 {new Date(sessionData.endTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}까지
                        </p>
                    )}
                </section>

                <section className="flex flex-col gap-3 rounded-[20px] bg-white p-5">
                    <h2 className="flex items-center gap-2 text-[16px] font-bold">
                        <MapPin size={18} className="text-tm-navy" /> 마지막으로 확인된 위치
                    </h2>
                    {hasLocation ? (
                        <>
                            <div className="aspect-video w-full overflow-hidden rounded-xl bg-tm-sky-tint">
                                <iframe
                                    title="위치 지도"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
                                    allowFullScreen
                                />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-[13px] text-tm-muted">
                                    {isLive ? `실시간 위치${updatedLabel ? ` · ${updatedLabel}` : ''}` : '전달받은 위치(갱신되지 않음)'}
                                </p>
                                <a href={mapUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-xl bg-tm-sky-tint px-3.5 py-2.5 text-[13px] font-bold text-tm-navy">
                                    지도 앱으로 보기
                                </a>
                            </div>
                        </>
                    ) : (
                        <div className="rounded-xl bg-tm-warm-tint p-4 text-[14px] text-tm-warm">
                            아직 위치를 받지 못했어요. 휴대폰 위치 설정이 꺼져 있거나 신호가 약할 수 있어요.
                        </div>
                    )}
                    {isLive && sessionData.locationError && hasLocation && (
                        <p className="flex items-start gap-2 rounded-xl bg-tm-warm-tint p-3 text-[13px] text-tm-warm">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> 최근에는 위치를 받지 못해 위 지도는 마지막으로 확인된 위치예요.
                        </p>
                    )}
                </section>

                <section className={`rounded-[20px] p-5 ${isExpired ? 'bg-[#FDECEA] text-tm-sos' : 'bg-white'}`}>
                    <h3 className="mb-2 flex items-center gap-2 text-[15px] font-bold">
                        <AlertTriangle size={17} /> {isExpired ? '지금 이렇게 해 주세요' : '보호자 안내'}
                    </h3>
                    {isExpired ? (
                        <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed">
                            <li>바로 전화해 현재 위치와 안전을 확인해 주세요.</li>
                            <li>연락이 닿지 않으면 현지 긴급번호에 신고해 주세요. 한국에서는 112, 해외에서는 영사콜센터(+82-2-3210-0404)가 24시간 도와줍니다.</li>
                        </ul>
                    ) : (
                        <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-tm-muted">
                            <li>여행자가 직접 귀가 시간을 정하고 안전모드를 켰어요.</li>
                            <li>시간 안에 도착을 확인하지 않으면 이 화면이 빨간색으로 바뀌고, 경보음을 켜 두셨다면 소리로 알려 드려요.</li>
                            <li>위치가 오래 바뀌지 않거나 연락이 닿지 않으면 먼저 전화해 주세요.</li>
                        </ul>
                    )}
                </section>

                <Link href="/" className="py-2 text-center text-[13px] font-semibold text-tm-muted">Trip Maker 알아보기</Link>
            </div>

            {isExpired && (
                <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2">
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-tm-sos p-4 text-white shadow-2xl">
                        <div className="flex items-center gap-2.5">
                            <Siren size={20} className="shrink-0" />
                            <div>
                                <p className="text-[14px] font-bold">경보가 울리고 있어요</p>
                                <p className="text-[12px] text-white/85">{name}님의 귀가 확인 시간이 지났어요.</p>
                            </div>
                        </div>
                        <button onClick={() => toggleSiren(false)} className="h-11 shrink-0 rounded-xl bg-white/20 px-3.5 text-[13px] font-bold">
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
        <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-tm-ground text-[15px] font-semibold text-tm-muted">불러오는 중…</div>}>
            <GuardianDashboardContent />
        </Suspense>
    );
}
