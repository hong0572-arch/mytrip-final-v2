'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, PhoneCall, Timer, X, Send, User, ChevronUp, AlertTriangle, Siren, Shield, Heart, Sparkles, Search, Loader2 } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';

export default function GlobalSafeMode() {
    const [user, setUser] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    
    // 안전 모드 핵심 상태
    const [isActive, setIsActive] = useState(false);
    const [duration, setDuration] = useState(30); // 분 단위
    const [timeLeft, setTimeLeft] = useState(0); // 초 단위
    const [guardianUserId, setGuardianUserId] = useState('');
    const [guardianName, setGuardianName] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');
    const [isRegistered, setIsRegistered] = useState(false);
    const [showTimerAlert, setShowTimerAlert] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // 보호자 검색 및 등록 관련 상태
    const [registerTab, setRegisterTab] = useState('search'); // 'search' or 'manual'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchStatus, setSearchStatus] = useState('idle'); // 'idle', 'searching', 'result', 'no-result'

    // 글로벌 타 가입자 보호 경보 상태
    const [otherExpiredSession, setOtherExpiredSession] = useState(null);
    const [isGuardianSirenPlaying, setIsGuardianSirenPlaying] = useState(false);
    
    const timerRef = useRef(null);
    const pulseRef = useRef(null);
    
    // 오디오 사이렌 관련 상태 및 참조
    const [isSirenPlaying, setIsSirenPlaying] = useState(false);
    const audioCtxRef = useRef(null);
    const oscillatorRef = useRef(null);
    const gainNodeRef = useRef(null);
    const sirenIntervalRef = useRef(null);

    // 보호자 기기용 사이렌 참조
    const guardianAudioCtxRef = useRef(null);
    const guardianOscillatorRef = useRef(null);
    const guardianGainNodeRef = useRef(null);
    const guardianSirenIntervalRef = useRef(null);

    // 1. 유저 인증 상태 연동 및 초기 로컬스토리지 복구
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currUser) => {
            setUser(currUser);
        });

        // 로컬스토리지로부터 값 읽어오기
        const savedActive = localStorage.getItem('safeMode_active') === 'true';
        const savedEndTime = localStorage.getItem('safeMode_endTime');
        const savedGUserId = localStorage.getItem('safeMode_gUserId') || '';
        const savedGName = localStorage.getItem('safeMode_gName') || '';
        const savedGPhone = localStorage.getItem('safeMode_gPhone') || '';
        
        setGuardianUserId(savedGUserId);
        setGuardianName(savedGName);
        setGuardianPhone(savedGPhone);
        if (savedGName) setIsRegistered(true);

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

    // 2. [보호자용] 실시간 타 가입자 비상 모니터링 리스너
    useEffect(() => {
        if (!user) {
            setOtherExpiredSession(null);
            toggleGuardianSiren(false);
            return;
        }

        // 자신이 보호자로 지정되어 있고, 상태가 'expired'인 세션을 실시간 감시
        const q = query(
            collection(db, "safemode_sessions"), 
            where("guardianUserId", "==", user.uid),
            where("status", "==", "expired")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                // 경보 중인 세션이 하나 이상 존재하면 첫 번째 세션을 등록하고 사이렌을 가동
                const activeAlertDoc = snapshot.docs[0].data();
                setOtherExpiredSession({
                    id: snapshot.docs[0].id,
                    ...activeAlertDoc
                });
                // 보호자가 사이렌이 재생 중이지 않다면 자동 재생 시도
                toggleGuardianSiren(true);
            } else {
                setOtherExpiredSession(null);
                toggleGuardianSiren(false);
            }
        });

        return () => {
            unsubscribe();
            toggleGuardianSiren(false);
        };
    }, [user]);

    // 3. 타이머 틱 작동
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

    // 4. 타이머 만료 처리
    const handleTimerExpire = async () => {
        setIsActive(false);
        localStorage.removeItem('safeMode_active');
        localStorage.removeItem('safeMode_endTime');
        
        setShowTimerAlert(true);
        triggerVibration(3);

        // 🚨 타이머 만료 시 즉시 사이렌 자동 가동
        if (!isSirenPlaying) {
            toggleSiren(true);
        }

        // Firestore 세션 상태 업데이트 (expired)
        try {
            if (user) {
                const sessionRef = doc(db, "safemode_sessions", user.uid);
                await setDoc(sessionRef, {
                    status: 'expired',
                    updatedAt: serverTimestamp()
                }, { merge: true });
            }
        } catch (err) {
            console.error("세션 상태 만료 업데이트 실패:", err);
        }

        // 보호자에게 실시간 만료 경보 알림 전송 (앱 가입 보호자용)
        if (guardianUserId) {
            try {
                await addDoc(collection(db, "match_requests"), {
                    type: "safemode_expired",
                    senderId: user.uid,
                    senderName: user.displayName || '여행자',
                    targetMateId: guardianUserId,
                    targetMateName: guardianName,
                    status: "pending",
                    message: `🚨 [안심 귀가 경보] ${user.displayName || '여행자'}님의 안전 타이머가 완료되었습니다. 안전을 즉시 확인하세요!`,
                    createdAt: serverTimestamp()
                });
            } catch (err) {
                console.error("보호자 비상 알림 발송 실패:", err);
            }
        }
        
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

    // 5. GPS 실시간 위치 추적 인터벌
    useEffect(() => {
        if (!isActive || !user) return;

        const updateLocation = async () => {
            if (typeof window !== 'undefined' && navigator.geolocation) {
                // PC 브라우저나 건물 안 테스트를 위해 일반 정확도(enableHighAccuracy: false)로 획득을 시도합니다.
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        try {
                            const sessionRef = doc(db, "safemode_sessions", user.uid);
                            await setDoc(sessionRef, {
                                location: { lat: latitude, lng: longitude },
                                updatedAt: serverTimestamp()
                            }, { merge: true });
                            console.log("GPS Location updated:", latitude, longitude);
                        } catch (err) {
                            console.error("GPS Firestore 업데이트 실패:", err);
                        }
                    },
                    async (error) => {
                        console.warn(`GPS 위치 획득 실패 (코드: ${error.code}): ${error.message}`);
                        
                        // [테스트 폴백] 위치 권한이 없거나 획득 실패한 경우에도 로컬 테스트 차질 및 크래시를 방지하기 위해 가상 좌표를 기록합니다.
                        try {
                            const sessionRef = doc(db, "safemode_sessions", user.uid);
                            await setDoc(sessionRef, {
                                location: { lat: 37.5665, lng: 126.9780 }, // 서울 중심 좌표 폴백
                                updatedAt: serverTimestamp(),
                                isMockLocation: true
                            }, { merge: true });
                            console.log("💡 GPS 위치 획득 실패로 인해 테스트용 폴백 좌표(서울)가 세션에 기록되었습니다.");
                        } catch (err) {
                            console.error("폴백 위치 Firestore 업데이트 실패:", err);
                        }
                    },
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
                );
            }
        };

        updateLocation(); // 최초 1회 즉시 실행
        const locationInterval = setInterval(updateLocation, 15000); // 15초 주기

        return () => clearInterval(locationInterval);
    }, [isActive, user]);

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

    // 웹 오디오 API를 이용한 강력한 사이렌 생성기 (피호출자 기기용)
    const toggleSiren = (forceState) => {
        const targetState = typeof forceState === 'boolean' ? forceState : !isSirenPlaying;

        if (!targetState) {
            // 사이렌 끄기
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
            triggerToast('🚨 사이렌이 중지되었습니다.');
            return;
        }

        if (isSirenPlaying) return; // 이미 실행 중이면 중복 실행 방지

        // 사이렌 켜기
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new AudioContext();
            oscillatorRef.current = audioCtxRef.current.createOscillator();
            gainNodeRef.current = audioCtxRef.current.createGain();

            // 소리 크기 설정
            gainNodeRef.current.gain.value = 1.0; 
            
            // 오실레이터 설정 (Square 파형)
            oscillatorRef.current.type = 'square';
            oscillatorRef.current.frequency.value = 750; // 기본 주파수
            
            oscillatorRef.current.connect(gainNodeRef.current);
            gainNodeRef.current.connect(audioCtxRef.current.destination);
            
            oscillatorRef.current.start();
            
            // 사이렌 삐용삐용 효과 (주파수 교차)
            let isHigh = false;
            sirenIntervalRef.current = setInterval(() => {
                if (oscillatorRef.current) {
                    oscillatorRef.current.frequency.setValueAtTime(
                        isHigh ? 750 : 1200, 
                        audioCtxRef.current.currentTime
                    );
                }
                isHigh = !isHigh;
                triggerVibration(1); // 소리와 함께 진동
            }, 300);

            setIsSirenPlaying(true);
            triggerToast('🚨 긴급 사이렌이 작동 중입니다!');
            
            // 자동으로 보호자에게 위치 전송
            handleSendLocationMessage();
        } catch (err) {
            console.error("오디오 재생 실패:", err);
            triggerToast('⚠️ 현재 기기 환경에서 사이렌 오디오를 재생할 수 없습니다.');
        }
    };

    // 보호자 기기용 날카로운 톱니파 비상 경보 사이렌 생성기
    const toggleGuardianSiren = (forceState) => {
        const targetState = typeof forceState === 'boolean' ? forceState : !isGuardianSirenPlaying;

        if (!targetState) {
            if (guardianSirenIntervalRef.current) clearInterval(guardianSirenIntervalRef.current);
            if (guardianOscillatorRef.current) {
                try { guardianOscillatorRef.current.stop(); } catch (e) {}
                guardianOscillatorRef.current.disconnect();
            }
            if (guardianGainNodeRef.current) guardianGainNodeRef.current.disconnect();
            if (guardianAudioCtxRef.current) guardianAudioCtxRef.current.close();

            guardianAudioCtxRef.current = null;
            guardianOscillatorRef.current = null;
            guardianGainNodeRef.current = null;
            setIsGuardianSirenPlaying(false);
            return;
        }

        if (isGuardianSirenPlaying) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            guardianAudioCtxRef.current = new AudioContext();
            guardianOscillatorRef.current = guardianAudioCtxRef.current.createOscillator();
            guardianGainNodeRef.current = guardianAudioCtxRef.current.createGain();

            guardianGainNodeRef.current.gain.value = 0.8;
            guardianOscillatorRef.current.type = 'sawtooth'; // 톱니파
            guardianOscillatorRef.current.frequency.value = 850;

            guardianOscillatorRef.current.connect(guardianGainNodeRef.current);
            guardianGainNodeRef.current.connect(guardianAudioCtxRef.current.destination);
            
            guardianOscillatorRef.current.start();

            let isHigh = false;
            guardianSirenIntervalRef.current = setInterval(() => {
                if (guardianOscillatorRef.current) {
                    guardianOscillatorRef.current.frequency.setValueAtTime(
                        isHigh ? 850 : 1350,
                        guardianAudioCtxRef.current.currentTime
                    );
                }
                isHigh = !isHigh;
                triggerVibration(2);
            }, 250);

            setIsGuardianSirenPlaying(true);
        } catch (err) {
            console.error("보호자 사이렌 재생 실패:", err);
        }
    };

    // 컴포넌트 언마운트 시 오디오 정리
    useEffect(() => {
        return () => {
            if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
            if (oscillatorRef.current) {
                try { oscillatorRef.current.stop(); } catch(e){}
            }
            if (audioCtxRef.current) audioCtxRef.current.close();

            if (guardianSirenIntervalRef.current) clearInterval(guardianSirenIntervalRef.current);
            if (guardianOscillatorRef.current) {
                try { guardianOscillatorRef.current.stop(); } catch(e){}
            }
            if (guardianAudioCtxRef.current) guardianAudioCtxRef.current.close();
        };
    }, []);

    // 6. Safe Mode 켜기
    const handleToggleOn = async () => {
        if (!guardianName.trim()) {
            return triggerToast('먼저 비상 보호자 정보를 등록해 주세요! 🛡️');
        }
        
        const parsedDuration = Number(duration);
        if (!parsedDuration || parsedDuration <= 0) {
            return triggerToast('올바른 귀가 시간을 설정해 주세요! ⏱️');
        }
        
        const seconds = parsedDuration * 60;
        const endTime = Date.now() + seconds * 1000;
        
        localStorage.setItem('safeMode_active', 'true');
        localStorage.setItem('safeMode_endTime', endTime.toString());
        
        setIsActive(true);
        setTimeLeft(seconds);
        triggerToast('🟢 Safe Mode가 가동되었습니다. 보호 상태가 활성화됩니다!');
        triggerVibration(1);

        // Firestore 실시간 보호 세션 시작
        try {
            const sessionRef = doc(db, "safemode_sessions", user.uid);
            await setDoc(sessionRef, {
                userId: user.uid,
                userName: user.displayName || '여행자',
                guardianUserId: guardianUserId || '',
                guardianName: guardianName,
                guardianPhone: guardianPhone || '',
                status: 'active',
                duration: parsedDuration,
                endTime: endTime,
                location: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            console.error("보호 세션 문서 생성 실패:", err);
        }

        // 가입된 보호자에게 보호 시작 실시간 알림 발송
        if (guardianUserId) {
            try {
                await addDoc(collection(db, "match_requests"), {
                    type: "safemode_started",
                    senderId: user.uid,
                    senderName: user.displayName || '여행자',
                    targetMateId: guardianUserId,
                    targetMateName: guardianName,
                    status: "pending",
                    message: `🛡️ [Safe Mode] ${user.displayName || '여행자'}님이 안심 귀가 이동을 시작했습니다. 실시간 대시보드에서 지켜봐주세요!`,
                    sessionUrl: `/share/live_safemode?userId=${user.uid}`,
                    createdAt: serverTimestamp()
                });
            } catch (err) {
                console.error("보호 시작 알림 발송 실패:", err);
            }
        }

        // 커스텀 이벤트 전송
        window.dispatchEvent(new CustomEvent('safeModeChanged', { detail: { active: true, duration: seconds } }));
    };

    // 7. Safe Mode 끄기 (안전 확인 완료)
    const handleToggleOff = async () => {
        localStorage.removeItem('safeMode_active');
        localStorage.removeItem('safeMode_endTime');
        
        setIsActive(false);
        setTimeLeft(0);
        setShowTimerAlert(false);
        triggerToast('🛡️ 귀가 약속이 해제되었습니다. 안전한 복귀를 축하합니다!');

        // 사이렌이 켜져 있었다면 중지
        if (isSirenPlaying) {
            toggleSiren(false);
        }

        // Firestore 실시간 보호 세션 종료 및 알림 발송
        try {
            if (user) {
                const sessionRef = doc(db, "safemode_sessions", user.uid);
                await deleteDoc(sessionRef);
            }
        } catch (err) {
            console.error("보호 세션 삭제 실패:", err);
        }

        if (guardianUserId) {
            try {
                await addDoc(collection(db, "match_requests"), {
                    type: "safemode_safe",
                    senderId: user.uid,
                    senderName: user.displayName || '여행자',
                    targetMateId: guardianUserId,
                    targetMateName: guardianName,
                    status: "pending",
                    message: `🛡️ [Safe Mode 완료] ${user.displayName || '여행자'}님이 안전하게 무사 귀가했습니다.`,
                    createdAt: serverTimestamp()
                });
            } catch (err) {
                console.error("보호 완료 알림 발송 실패:", err);
            }
        }
        
        window.dispatchEvent(new CustomEvent('safeModeChanged', { detail: { active: false } }));
    };

    // 8. 보호자 연락처 수동 등록
    const handleRegisterGuardian = (e) => {
        e.preventDefault();
        if (!guardianName.trim() || !guardianPhone.trim()) return;

        localStorage.setItem('safeMode_gName', guardianName);
        localStorage.setItem('safeMode_gPhone', guardianPhone);
        setIsRegistered(true);
        triggerToast('✅ 보호자 정보가 등록되었습니다.');
    };

    // 앱 사용자 검색 함수
    const handleSearchUser = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearchStatus('searching');
        try {
            const usersRef = collection(db, "users");
            const qEmail = query(usersRef, where("email", "==", searchQuery.trim()));
            const qName = query(usersRef, where("name", "==", searchQuery.trim()));
            const [emailSnap, nameSnap] = await Promise.all([getDocs(qEmail), getDocs(qName)]);
            
            const resultsMap = new Map();
            emailSnap.forEach(doc => {
                if (doc.id !== user.uid) resultsMap.set(doc.id, { id: doc.id, ...doc.data() });
            });
            nameSnap.forEach(doc => {
                if (doc.id !== user.uid) resultsMap.set(doc.id, { id: doc.id, ...doc.data() });
            });
            
            const results = Array.from(resultsMap.values());
            setSearchResults(results);
            setSearchStatus(results.length > 0 ? 'result' : 'no-result');
        } catch (error) {
            console.error("보호자 검색 실패:", error);
            setSearchStatus('idle');
        }
    };

    // 검색된 사용자 보호자로 선택
    const handleSelectUserGuardian = async (targetUser) => {
        const name = targetUser.name || targetUser.displayName || '보호자';
        const phone = targetUser.phoneNumber || '';
        
        setGuardianUserId(targetUser.id);
        setGuardianName(name);
        setGuardianPhone(phone);
        setIsRegistered(true);

        localStorage.setItem('safeMode_gUserId', targetUser.id);
        localStorage.setItem('safeMode_gName', name);
        localStorage.setItem('safeMode_gPhone', phone);

        // 보호자 등록 자동 알림 발송
        try {
            await addDoc(collection(db, "match_requests"), {
                type: "safemode_guardian_registered",
                senderId: user.uid,
                senderName: user.displayName || '여행자',
                targetMateId: targetUser.id,
                targetMateName: name,
                status: "pending",
                message: `🛡️ [Safe Mode] ${user.displayName || '여행자'}님이 당신을 비상 보호자로 등록했습니다.`,
                createdAt: serverTimestamp()
            });
            triggerToast(`✅ ${name}님을 비상 보호자로 등록하고 알림을 보냈습니다.`);
        } catch (error) {
            console.error("보호자 등록 알림 실패:", error);
            triggerToast(`✅ 보호자 정보가 저장되었습니다.`);
        }

        // 검색 상태 리셋
        setSearchQuery('');
        setSearchResults([]);
        setSearchStatus('idle');
    };

    const handleResetGuardian = () => {
        setIsRegistered(false);
        setGuardianUserId('');
        setGuardianName('');
        setGuardianPhone('');
        localStorage.removeItem('safeMode_gUserId');
        localStorage.removeItem('safeMode_gName');
        localStorage.removeItem('safeMode_gPhone');
    };

    // 9. 실시간 위치 문자 링크 공유 전송
    const handleSendLocationMessage = async () => {
        if (typeof window === 'undefined') return;

        triggerToast('📍 현재 위치 정보를 가져오는 중입니다...');

        const getPosition = () => {
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation not supported'));
                } else {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 0
                    });
                }
            });
        };

        let textMessage = '';
        const baseUrl = `https://mytrip2.pro/share/live_safemode`;
        const encodedName = encodeURIComponent(user?.displayName || '여행자');

        try {
            const position = await getPosition();
            const { latitude, longitude } = position.coords;
            const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
            const mapUrl = `${baseUrl}?lat=${latitude}&lng=${longitude}&name=${encodedName}&userId=${user?.uid || ''}`;
            
            textMessage = `🚨 [TripMaker 안심 알림]\n저 지금 Safe Mode 상태로 이동 중입니다!\n\n📍 나의 정확한 현재 위치 (구글 지도):\n${googleMapsUrl}\n\n🛡️ 전용 안심 대시보드로 보기:\n${mapUrl}`;
        } catch (error) {
            console.error("위치 정보 획득 실패:", error);
            const mapUrl = `${baseUrl}?name=${encodedName}&userId=${user?.uid || ''}`;
            textMessage = `🚨 [TripMaker 안심 알림]\n저 지금 Safe Mode 상태로 이동 중입니다!\n\n(위치 접근이 제한되어 기본 링크만 전송합니다)\n🛡️ 전용 안심 대시보드로 보기:\n${mapUrl}`;
        }

        // 가입된 보호자에게 실시간 위치 공유 인앱 알림 추가 발송
        if (guardianUserId) {
            try {
                await addDoc(collection(db, "match_requests"), {
                    type: "safemode_location_share",
                    senderId: user.uid,
                    senderName: user.displayName || '여행자',
                    targetMateId: guardianUserId,
                    targetMateName: guardianName,
                    status: "pending",
                    message: `📍 [Safe Mode 위치 전송] ${user.displayName || '여행자'}님이 실시간 위치 정보를 전송했습니다.`,
                    sessionUrl: `/share/live_safemode?userId=${user.uid}`,
                    createdAt: serverTimestamp()
                });
            } catch (err) {
                console.error("보호자 위치 전송 알림 실패:", err);
            }
        }

        try {
            await navigator.clipboard.writeText(textMessage);
            triggerToast('📋 실제 위치가 포함된 공유 텍스트가 복사되었습니다!');
            
            // 즉시 카카오톡이나 SMS 전송 창 연동
            const encodedMsg = encodeURIComponent(textMessage);
            const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
            
            if (isMobile && guardianPhone) {
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
                <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex justify-center px-4 pt-3 animate-in slide-in-from-top-full duration-500">
                    <motion.div 
                        drag
                        dragMomentum={false}
                        dragElastic={0.1}
                        dragConstraints={{ left: -200, right: 200, top: 0, bottom: 650 }}
                        className="w-full max-w-[480px] pointer-events-auto"
                    >
                        <div className="w-full bg-brand-success/90 backdrop-blur-md border border-brand-success/30 text-white rounded-2xl py-3 px-4 shadow-[0_8px_32px_rgba(76,201,240,0.3)] flex items-center justify-between ring-2 ring-brand-success/50 cursor-grab active:cursor-grabbing">
                            <div className="flex items-center gap-2.5">
                                <span className="relative flex h-3.5 w-3.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"></span>
                                </span>
                                <span className="text-xs font-black tracking-wide uppercase text-brand-accent">🛡️ Safe Mode 실시간 보호 중</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="bg-black/30 font-black px-2.5 py-1 rounded-lg text-sm tabular-nums tracking-wider border border-white/10 text-white">
                                    {formatTime(timeLeft)}
                                </span>
                                <button 
                                    onClick={() => setIsOpen(true)}
                                    className="bg-white text-brand-accent text-[10px] font-black px-3 py-1 rounded-lg hover:bg-brand-success/20 transition active:scale-95 shadow-sm"
                                >
                                    관리
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* 2. 하단 중앙 플로팅 안심 가드 버튼 (시그니처 디자인: 가디언 하트 오브) */}
            <div 
                id="safe-mode-float"
                className="fixed bottom-[105px] left-1/2 -translate-x-1/2 z-[998] pointer-events-auto flex flex-col items-center gap-2.5 transition-transform duration-500 ease-[cubic-bezier(0.3,1,0.3,1)]"
            >
                {isActive && (
                    <div className="bg-brand-success text-brand-accent text-[9px] font-black px-2.5 py-1 rounded-lg shadow-[0_0_15px_rgba(76,201,240,0.5)] animate-pulse border border-brand-success tracking-wide">
                        🛡️ 안심 귀가 보호 중
                    </div>
                )}
                <button
                    onClick={() => setIsOpen(true)}
                    className="relative group flex items-center justify-center transition-transform duration-300 hover:scale-105 active:scale-95 outline-none"
                    style={{ width: '60px', height: '60px' }}
                    title="Safe Mode 설정"
                >
                    {isActive ? (
                        <>
                            {/* [ACTIVE] 강력한 스카이 사이언 세이프티 존 */}
                            <span className="absolute inset-0 rounded-full bg-brand-success opacity-50 animate-ping" style={{ animationDuration: '2s' }}></span>
                            <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-brand-success via-brand-primary to-brand-secondary blur-md opacity-80 animate-pulse"></span>
                            
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-success/10 to-white border-2 border-brand-success shadow-[0_0_25px_rgba(76,201,240,0.5)] z-10 flex items-center justify-center overflow-hidden">
                                <div className="relative flex items-center justify-center">
                                    <Shield size={34} className="text-brand-success/25" fill="currentColor" />
                                    <Heart size={16} className="text-brand-secondary absolute animate-pulse" fill="currentColor" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* [INACTIVE] 시그니처 다크 오로라 글래스 오브 */}
                            <span className="absolute -inset-2 rounded-full bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent blur-lg opacity-40 group-hover:opacity-75 transition-opacity duration-500 animate-pulse"></span>
                            
                            {/* 메인 비비드 글래스 바디 */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-primary via-brand-secondary to-brand-accent border border-white/30 shadow-[0_8px_32px_rgba(255,107,53,0.4)] z-10 flex items-center justify-center overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[45%] bg-gradient-to-b from-white/40 to-transparent rounded-t-full"></div>
                                
                                <div className="relative flex items-center justify-center">
                                    <Shield size={32} className="text-white/90" strokeWidth={1.5} />
                                    <Heart size={14} className="text-white absolute animate-pulse" fill="currentColor" />
                                    <Sparkles size={12} className="text-yellow-300 absolute -top-1.5 -right-2 opacity-90" />
                                </div>
                            </div>
                        </>
                    )}
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
                                    <ShieldCheck className={isActive ? 'text-brand-success' : 'text-brand-primary'} size={26} />
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
                                <div className="bg-gradient-to-br from-brand-success/10 to-brand-success/20 p-6 rounded-[28px] border border-brand-success/30 text-center relative overflow-hidden shadow-inner">
                                    <span className="text-[10px] font-black uppercase text-brand-accent tracking-widest block mb-2">실시간 안심 보호 진행 중</span>
                                    <div className="text-4xl sm:text-5xl font-black text-brand-accent tracking-wider tabular-nums font-mono">
                                        {formatTime(timeLeft)}
                                    </div>
                                    
                                    <div className="flex justify-center items-center gap-1.5 mt-3 text-xs font-bold text-brand-accent bg-white/60 inline-flex px-3 py-1 rounded-full border border-brand-accent/20">
                                        <User size={12} /> 보호자: {guardianName} {guardianPhone && `(${guardianPhone})`}
                                    </div>
                                </div>

                                {/* 안심 가드 액션 버튼들 */}
                                <div className="space-y-3">
                                    <button
                                        onClick={() => toggleSiren()}
                                        className={`w-full py-4.5 rounded-2xl font-black text-base shadow-lg flex items-center justify-center gap-2 transition active:scale-95 border-b-4 ${
                                            isSirenPlaying 
                                                ? 'bg-brand-danger text-white shadow-brand-danger/40 hover:bg-brand-danger/90 border-brand-danger/80 animate-pulse' 
                                                : 'bg-brand-danger/90 text-white shadow-brand-danger/30 hover:bg-brand-danger border-brand-danger/80'
                                        }`}
                                    >
                                        <Siren size={20} className={isSirenPlaying ? "animate-spin" : ""} />
                                        {isSirenPlaying ? '🚨 사이렌 중지' : '🚨 위급 상황 사이렌 울리기'}
                                    </button>

                                    <button
                                        onClick={handleSendLocationMessage}
                                        className="w-full py-4.5 bg-brand-primary text-white rounded-2xl font-black text-base shadow-lg shadow-brand-primary/30 flex items-center justify-center gap-2 hover:bg-brand-primary/95 transition active:scale-95 border-b-4 border-brand-primary/80"
                                    >
                                        <Send size={18} /> 보호자에게 실시간 위치 전송
                                    </button>
                                    
                                    <button
                                        onClick={handleToggleOff}
                                        className="w-full py-4 bg-brand-success text-brand-accent rounded-2xl font-black text-base shadow-lg shadow-brand-success/20 flex items-center justify-center gap-2 hover:bg-brand-success/95 transition active:scale-95 border-b-4 border-brand-success/80"
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
                                        <PhoneCall size={16} className="text-brand-primary" />
                                        1단계. 비상 안심 연락망 등록
                                    </h4>

                                    {isRegistered ? (
                                        <div className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
                                            <div>
                                                <p className="text-sm font-black text-gray-800">{guardianName}</p>
                                                {guardianPhone && <p className="text-xs font-bold text-gray-400 mt-0.5">{guardianPhone}</p>}
                                                {guardianUserId && <span className="inline-block mt-1.5 text-[9px] font-black bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded">서비스 연동 회원</span>}
                                            </div>
                                            <button 
                                                onClick={handleResetGuardian}
                                                className="text-xs font-bold text-brand-danger bg-brand-danger/10 hover:bg-brand-danger/20 px-3 py-2 rounded-lg transition"
                                            >
                                                수정
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* 탭 헤더 */}
                                            <div className="flex border-b border-gray-200 pb-1">
                                                <button 
                                                    type="button" 
                                                    onClick={() => setRegisterTab('search')} 
                                                    className={`flex-1 pb-2 text-xs font-black text-center transition-all ${registerTab === 'search' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    서비스 사용자 검색
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setRegisterTab('manual')} 
                                                    className={`flex-1 pb-2 text-xs font-black text-center transition-all ${registerTab === 'manual' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                                >
                                                    직접 연락처 입력
                                                </button>
                                            </div>

                                            {registerTab === 'search' ? (
                                                <div className="space-y-3">
                                                    <form onSubmit={handleSearchUser} className="flex gap-2">
                                                        <div className="relative flex-1">
                                                            <input
                                                                type="text"
                                                                placeholder="가입자 이름 또는 이메일 검색"
                                                                value={searchQuery}
                                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                                required
                                                                className="w-full bg-white border border-gray-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 rounded-xl pl-9 pr-4 py-3 text-xs font-bold outline-none transition"
                                                            />
                                                            <Search size={14} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                        </div>
                                                        <button
                                                            type="submit"
                                                            className="bg-brand-primary hover:bg-brand-primary/90 text-white px-4 py-3 rounded-xl text-xs font-black transition active:scale-95 shadow-sm"
                                                        >
                                                            검색
                                                        </button>
                                                    </form>

                                                    {searchStatus === 'searching' && (
                                                        <div className="flex justify-center py-4">
                                                             <Loader2 className="animate-spin text-brand-primary" size={20} />
                                                        </div>
                                                    )}

                                                    {searchStatus === 'result' && (
                                                        <div className="max-h-40 overflow-y-auto space-y-2 bg-white border border-gray-100 p-2 rounded-xl custom-scrollbar shadow-inner">
                                                            {searchResults.map((targetUser) => (
                                                                <div 
                                                                    key={targetUser.id} 
                                                                    onClick={() => handleSelectUserGuardian(targetUser)}
                                                                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-brand-primary/10 cursor-pointer transition border border-transparent hover:border-brand-primary/20"
                                                                >
                                                                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary font-black text-xs flex items-center justify-center uppercase shrink-0">
                                                                        {(targetUser.name || targetUser.displayName || 'U').substring(0, 2)}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-black text-gray-800 truncate">{targetUser.name || targetUser.displayName}</p>
                                                                        <p className="text-[10px] font-bold text-gray-400 truncate">{targetUser.email}</p>
                                                                    </div>
                                                                    <span className="text-[9px] font-black bg-brand-primary/10 text-brand-primary px-2 py-1 rounded">선택</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {searchStatus === 'no-result' && (
                                                        <p className="text-center text-[11px] text-gray-400 font-bold py-4">일치하는 사용자를 찾지 못했습니다.</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <form onSubmit={handleRegisterGuardian} className="space-y-3">
                                                    <div className="flex flex-col gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="보호자 성함 (예: 엄마)"
                                                            value={guardianName}
                                                            onChange={(e) => setGuardianName(e.target.value)}
                                                            required
                                                            className="w-full bg-white border border-gray-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 rounded-xl px-4 py-3.5 text-xs font-bold outline-none transition"
                                                        />
                                                        <input
                                                            type="tel"
                                                            placeholder="휴대폰 번호 (-없이 입력)"
                                                            value={guardianPhone}
                                                            onChange={(e) => setGuardianPhone(e.target.value)}
                                                            required
                                                            className="w-full bg-white border border-gray-200 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 rounded-xl px-4 py-3.5 text-xs font-bold outline-none transition"
                                                        />
                                                    </div>
                                                    <button
                                                        type="submit"
                                                        className="w-full py-3.5 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl text-xs font-black shadow-md transition active:scale-95"
                                                    >
                                                        비상 연락망 저장
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 타이머 설정 */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-black text-gray-800 flex items-center gap-1.5 px-1">
                                        <Timer size={16} className="text-brand-primary" />
                                        2단계. 안심 약속 귀가 시간 설정
                                    </h4>
                                    
                                    <div className="flex flex-col gap-2.5">
                                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3.5 focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary/20 transition shadow-sm">
                                            <input 
                                                type="number"
                                                min="1"
                                                value={duration}
                                                onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : '')}
                                                className="flex-1 bg-transparent text-sm font-black text-gray-900 outline-none w-full"
                                                placeholder="직접 시간 입력 (예: 120)"
                                            />
                                            <span className="text-xs font-bold text-gray-500 shrink-0">분 뒤 알림</span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[10, 30, 60, 120].map((mins) => (
                                                <button
                                                    key={mins}
                                                    onClick={() => setDuration(mins)}
                                                    className={`py-2 rounded-lg text-[11px] font-black border transition active:scale-95 ${
                                                        duration === mins
                                                            ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                                                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {mins}분
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold px-1 leading-relaxed">
                                        💡 밤 10시 이후 이동할 때, 설정한 시간 내에 무사 귀가를 인증하지 않으면 보호자 알림 및 동행 단톡방에 경보 시스템 메시지가 자동으로 올라갑니다.
                                    </p>
                                </div>

                                {/* 활성화 버튼 */}
                                <button
                                    onClick={handleToggleOn}
                                    className="w-full py-4.5 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent text-white rounded-2xl font-black text-base shadow-xl hover:opacity-90 transition flex items-center justify-center gap-2 border-b-4 border-brand-accent active:scale-95"
                                >
                                    <ShieldCheck size={20} className="text-white animate-pulse" />
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
                    <div className="absolute inset-0 bg-brand-danger/85 backdrop-blur-md animate-in fade-in duration-300"></div>
                    <div className="bg-white w-full max-w-sm rounded-[36px] p-6 relative z-10 shadow-2xl flex flex-col items-center animate-in zoom-in-95 border-2 border-brand-danger">
                        <div className="w-16 h-16 bg-brand-danger/10 rounded-2xl flex items-center justify-center text-brand-danger mb-4 animate-bounce shadow-md">
                            <AlertTriangle size={36} />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-1 text-center">🚨 귀가 안심 타이머 만료!</h3>
                        <p className="text-xs text-brand-danger font-black mb-3">Emergency Alert Triggered</p>
                        <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed font-semibold">
                            지정한 귀가 예정 약속 시간이 끝났습니다.<br />
                            무사히 도착하셨다면 꼭 해제 버튼을 눌러주세요.<br />
                            <span className="text-brand-danger font-bold block mt-2">(현재 비상 경보가 채팅방에 올라갔습니다)</span>
                        </p>
                        <button 
                            onClick={handleToggleOff} 
                            className="w-full py-4.5 rounded-2xl font-black text-white bg-brand-danger hover:bg-brand-danger/90 transition-colors shadow-lg active:scale-95 text-base border-b-4 border-brand-danger/80"
                        >
                            🛡️ 무사 도착 해제 (경보 끄기)
                        </button>
                    </div>
                </div>
            )}

            {/* 5. [글로벌] 피보호자 비상 만료 알림 카드 (보호자 시점) */}
            {otherExpiredSession && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-6 pointer-events-auto">
                    <div className="absolute inset-0 bg-brand-danger/90 backdrop-blur-lg animate-in fade-in duration-300"></div>
                    <div className="bg-white w-full max-w-sm rounded-[36px] p-6 relative z-10 shadow-2xl flex flex-col items-center animate-in zoom-in-95 border-2 border-brand-danger ring-4 ring-brand-danger/20">
                        <div className="w-16 h-16 bg-brand-danger/10 text-brand-danger rounded-2xl flex items-center justify-center mb-4 animate-pulse shadow-md">
                            <ShieldAlert size={36} />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-1 text-center">🚨 보호 대상 위험 경보!</h3>
                        <p className="text-xs text-brand-danger font-black mb-3">Guardian Emergency Warning</p>
                        <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed font-semibold">
                            보호 대상자인 <span className="text-brand-danger font-black">{otherExpiredSession.userName}</span>님의<br />
                            안심 귀가 예정 시간이 만료되었습니다!<br />
                            신속히 연락을 시도하고 안전을 확인하세요.
                        </p>
                        <div className="w-full space-y-2">
                            {otherExpiredSession.guardianPhone && (
                                <a 
                                    href={`tel:${otherExpiredSession.guardianPhone}`}
                                    className="w-full py-4 rounded-2xl font-black text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 transition-colors flex items-center justify-center gap-2 active:scale-95 text-sm"
                                >
                                    <PhoneCall size={16} /> 대상자에게 전화하기
                                </a>
                            )}
                            <a 
                                href={`/share/live_safemode?userId=${otherExpiredSession.userId}`}
                                className="w-full py-4 rounded-2xl font-black text-white bg-brand-danger hover:bg-brand-danger/90 transition-colors flex items-center justify-center gap-2 active:scale-95 text-sm shadow-md"
                            >
                                <Shield size={16} /> 실시간 안심 지도 보기
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. 자체 프리미엄 토스트 피드백 */}
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
