'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Calendar, CheckCircle2, Droplet, Flame, ShieldAlert,
  Plus, RefreshCw, AlertTriangle, Compass, Check, BookOpen, Clock,
  Smartphone, BellRing, Settings2, HelpCircle, ChevronRight, X, Footprints
} from 'lucide-react';
import { sendScheduledNotification, requestNotificationPermission } from '../lib/notificationHelper';

// 공통 국가별 콘센트/어댑터 정보
const DESTINATION_INFO = {
  일본: { adapter: 'Type A (110V, 11자형)', currency: 'JPY (엔화)', tip: '동전 사용이 많으므로 동전 지갑이 유용해요.' },
  도쿄: { adapter: 'Type A (110V, 11자형)', currency: 'JPY (엔화)', tip: '동전 사용이 많으므로 동전 지갑이 유용해요.' },
  오사카: { adapter: 'Type A (110V, 11자형)', currency: 'JPY (엔화)', tip: '교통 패스가 발달해 있어 미리 주오패스나 이코카를 구매하면 편해요.' },
  베트남: { adapter: 'Type A / C / G (220V, 멀티콘센트 호환)', currency: 'VND (동)', tip: '그랩(Grab) 앱을 미리 깔고 카드를 연동해두면 이동이 매우 편리해요.' },
  다낭: { adapter: 'Type A / C / G (220V)', currency: 'VND (동)', tip: '현지 환전소나 금은방에서 원화나 달러를 동으로 환전하는 것이 유리해요.' },
  태국: { adapter: 'Type A / B / C (220V)', currency: 'THB (바트)', tip: 'GLN 모바일 QR 결제(토스/하나 등)가 매우 널리 쓰여 현금 비중을 낮출 수 있어요.' },
  방콕: { adapter: 'Type A / B / C (220V)', currency: 'THB (바트)', tip: 'GLN 모바일 결제가 잘 되어 있어요. 트래픽이 심하니 지상철(BTS) 이용을 권장해요.' },
  유럽: { adapter: 'Type C / F (230V, 한국형 콘센트 호환)', currency: 'EUR (유로)', tip: '소매치기가 매우 많으니 가방 스프링 자물쇠와 스마트폰 스트랩이 필수입니다.' },
  파리: { adapter: 'Type E (230V)', currency: 'EUR (유로)', tip: '대중교통 이용 시 나비고(Navigo) 카드를 스마트폰 앱으로 충전해 사용하면 편해요.' },
  로마: { adapter: 'Type L (230V)', currency: 'EUR (유로)', tip: '길바닥이 돌바닥으로 되어 있으니 튼튼하고 편안한 운동화 착용이 필수입니다.' },
  미국: { adapter: 'Type A / B (120V)', currency: 'USD (달러)', tip: '식당 및 우버 등 서비스 이용 시 15~20% 팁 문화가 있으니 예산 수립 시 참고하세요.' },
  하와이: { adapter: 'Type A / B (120V)', currency: 'USD (달러)', tip: '렌트카 이용이 거의 필수적이며, 렌트카 내부에 귀중품을 절대 보관하지 마세요.' },
  기본: { adapter: '멀티 어댑터 지참 권장', currency: '현지 통화', tip: '여권 유효기간은 출국일 기준 최소 6개월 이상 남아있어야 안심할 수 있어요.' }
};

export default function TripCoach({ itineraries = [], userData = {}, onShowToast, language = 'ko', onTabChange }) {
  const [selectedTrip, setSelectedTrip] = useState(null);
  
  // 1. 자가기록 및 코칭 측정값들
  const [waterIntake, setWaterIntake] = useState(500); // ml (기본 500)
  const [stepCount, setStepCount] = useState(6240); // 걸음 수 (기본 6240)
  const [fatigueLevel, setFatigueLevel] = useState('relaxed'); // relaxed, active, tired, exhausted
  const [checklist, setChecklist] = useState({
    passport: true,
    visa: false,
    insurance: false,
    exchange: false,
    adapter: false,
    hotelCheckin: false
  });
  
  // 2. 알림 설정 옵션
  const [notificationConfig, setNotificationConfig] = useState({
    logistics: true,
    weather: true,
    health: true,
    safety: true
  });
  const [testNotificationTime, setTestNotificationTime] = useState(3); // 3초 뒤 테스트
  const [isScheduling, setIsScheduling] = useState(false);

  // itineraries 변경 시 디폴트 선택
  useEffect(() => {
    if (itineraries.length > 0 && !selectedTrip) {
      setSelectedTrip(itineraries[0]);
    }
  }, [itineraries, selectedTrip]);

  // 선택한 여행지의 국가 정보 파싱
  const getDestinationMeta = (destName = '') => {
    if (!destName) return DESTINATION_INFO.기본;
    const cleanName = destName.split(',')[0].trim();
    for (const key of Object.keys(DESTINATION_INFO)) {
      if (cleanName.includes(key) || key.includes(cleanName)) {
        return DESTINATION_INFO[key];
      }
    }
    return DESTINATION_INFO.기본;
  };

  // 여행 단계 계산
  const getTripPhase = (trip) => {
    if (!trip || !trip.startDate) return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(trip.startDate);
    start.setHours(0, 0, 0, 0);
    const end = trip.endDate ? new Date(trip.endDate) : start;
    end.setHours(0, 0, 0, 0);

    if (today < start) return 'prep'; // 출발 전
    if (today >= start && today <= end) return 'during'; // 여행 중
    return 'post'; // 여행 완료
  };

  const currentPhase = getTripPhase(selectedTrip);
  const meta = getDestinationMeta(selectedTrip?.destination);

  // 3. Apple Health 스타일 링 계산 파트
  // 준비도 점수 (체크리스트 개수 비율)
  const totalChecklistCount = Object.keys(checklist).length;
  const completedChecklistCount = Object.values(checklist).filter(Boolean).length;
  const prepScore = Math.round((completedChecklistCount / totalChecklistCount) * 100);

  // 수분 목표 달성률 (목표 2000ml)
  const hydrationScore = Math.min(Math.round((waterIntake / 2000) * 100), 100);

  // 걸음 목표 달성률 (목표 10000보)
  const activityScore = Math.min(Math.round((stepCount / 10000) * 100), 100);

  // 안심 지수 (피로도와 안전모드 복합)
  const getSafetyScore = () => {
    let score = 95;
    if (fatigueLevel === 'tired') score -= 15;
    if (fatigueLevel === 'exhausted') score -= 30;
    if (!checklist.insurance) score -= 10;
    return Math.max(score, 20);
  };
  const safetyScore = getSafetyScore();

  // 자가 기록 핸들러
  const handleAddWater = (amount) => {
    setWaterIntake(prev => prev + amount);
    if (onShowToast) onShowToast(`💧 물 ${amount}ml 기록되었습니다!`, 'success');
  };

  const handleAddSteps = (amount) => {
    setStepCount(prev => prev + amount);
    if (onShowToast) onShowToast(`🏃 ${amount.toLocaleString()}걸음이 더해졌습니다!`, 'success');
  };

  const handleToggleChecklist = (key) => {
    setChecklist(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 푸시 알림 권한 획득 및 시뮬레이션 테스트 실행
  const triggerNotificationTest = async () => {
    setIsScheduling(true);
    const granted = await requestNotificationPermission();
    
    if (!granted) {
      if (onShowToast) onShowToast('⚠️ 알림 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해 주세요.', 'error');
      setIsScheduling(false);
      return;
    }

    const title = language === 'en' ? 'Timmy Travel Coach 🐾' : '티미의 실시간 여행 코치 🐾';
    const body = currentPhase === 'prep'
      ? `${selectedTrip?.destination || '여행지'} 출발까지 얼마 남지 않았어요! 어댑터(${meta.adapter})와 여권 준비율(${prepScore}%)을 최종 확인해보세요.`
      : `비가 내리기 시작해요! ☔ 현 위치에 급격한 기상 변화가 예상되니 우산을 준비하시고 실내 명소로 일정을 우회해보세요.`;

    if (onShowToast) {
      onShowToast(`🔔 ${testNotificationTime}초 후 여행 코칭 알림이 울립니다. 앱을 끄거나 백그라운드로 이동해 테스트해보세요!`, 'info');
    }

    await sendScheduledNotification(title, body, testNotificationTime);
    
    setTimeout(() => {
      setIsScheduling(false);
    }, testNotificationTime * 1000 + 500);
  };

  // 원형 진행 바 SVG 렌더링 헬퍼
  const ProgressRing = ({ percentage, colorClass, size = 68, strokeWidth = 7 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-slate-200 fill-none"
            strokeWidth={strokeWidth}
          />
          {/* Animated Foreground circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={`fill-none ${colorClass}`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-[10px] font-black text-slate-800">{percentage}%</span>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-500 pb-16">
      {/* 헤더 */}
      <header className="flex justify-between items-center px-4 pt-12 pb-4 sticky top-0 z-40 bg-gradient-to-b from-[#F3E5D0]/95 to-transparent backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-[14px] flex items-center justify-center text-white shadow-lg shrink-0">
            <Sparkles size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Trip Coach</h1>
        </div>
        <div className="bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200 flex items-center gap-1.5 shadow-sm text-xs font-bold text-slate-600">
          <Clock size={13} className="text-brand-secondary" />
          {currentPhase === 'prep' ? '준비 코칭 진행 중' : currentPhase === 'during' ? '실시간 코칭 진행 중' : '여행 코칭 종료'}
        </div>
      </header>

      <div className="px-4 pt-4 space-y-6">
        {/* 여행지 선택 필터 */}
        {itineraries.length === 0 ? (
          <div className="bg-white/40 border border-dashed border-slate-300 rounded-[24px] p-8 text-center backdrop-blur-xl">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
              <Compass size={28} />
            </div>
            <h3 className="font-black text-slate-800 text-base mb-1">활성화된 여행 일정이 없습니다</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">코칭을 시작하려면 일정을 새로 만들어보세요.</p>
            <button
              onClick={() => window.location.href = '/?mode=new'}
              className="bg-brand-primary hover:bg-brand-primary/95 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md transition active:scale-95"
            >
              새 일정 생성하기 ✈️
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target Itinerary</span>
              <span className="text-xs font-bold text-brand-primary flex items-center gap-1">
                <Calendar size={13} /> {selectedTrip?.startDate || '날짜 미정'}
              </span>
            </div>
            
            {/* 여행 일정 셀렉터 */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {itineraries.map((trip) => {
                const isActive = selectedTrip?.id === trip.id;
                return (
                  <button
                    key={trip.id}
                    onClick={() => {
                      setSelectedTrip(trip);
                      // 초기 체크리스트 상태 재배치
                      setChecklist({
                        passport: true,
                        visa: trip.destination?.includes('베트남') || trip.destination?.includes('유럽') ? false : true,
                        insurance: false,
                        exchange: false,
                        adapter: false,
                        hotelCheckin: false
                      });
                    }}
                    className={`px-5 py-3.5 rounded-[20px] font-bold text-xs whitespace-nowrap transition-all border shadow-sm flex items-center gap-2 ${
                      isActive
                        ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white border-brand-primary scale-105 shadow-brand-primary/20'
                        : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <span>{trip.icon || '✈️'}</span>
                    <span>{trip.destination || trip.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedTrip && (
          <>
            {/* 1. Apple Health 스타일 대시보드 링 카드 */}
            <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-slate-800 font-black text-lg flex items-center gap-2">
                    {selectedTrip?.destination} 코칭 지표
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                    아이폰 건강 앱과 연동되어 안전하고 건강한 라이프를 코칭합니다.
                  </p>
                </div>
              </div>

              {/* 2x2 그리드형 원형 차트 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 준비도 링 */}
                <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between gap-2 border border-slate-200/60">
                  <div className="overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-500 block mb-0.5">준비도</span>
                    <span className="text-sm font-black text-slate-800 tracking-tight">{prepScore}% 완료</span>
                    <span className="text-[9px] text-slate-400 block mt-1">체크리스트 달성율</span>
                  </div>
                  <ProgressRing percentage={prepScore} colorClass="stroke-cyan-400" />
                </div>

                {/* 활동량 링 */}
                <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between gap-2 border border-slate-200/60">
                  <div className="overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-500 block mb-0.5">활동 지수</span>
                    <span className="text-sm font-black text-slate-800 tracking-tight">{stepCount.toLocaleString()}보</span>
                    <span className="text-[9px] text-slate-400 block mt-1">목표: 1만보 ({activityScore}%)</span>
                  </div>
                  <ProgressRing percentage={activityScore} colorClass="stroke-rose-500" />
                </div>

                {/* 수분량 링 */}
                <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between gap-2 border border-slate-200/60">
                  <div className="overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-500 block mb-0.5">수분 섭취</span>
                    <span className="text-sm font-black text-slate-800 tracking-tight">{waterIntake} / 2,000</span>
                    <span className="text-[9px] text-slate-400 block mt-1">ml 단위 ({hydrationScore}%)</span>
                  </div>
                  <ProgressRing percentage={hydrationScore} colorClass="stroke-indigo-400" />
                </div>

                {/* 안전도 링 */}
                <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between gap-2 border border-slate-200/60">
                  <div className="overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-500 block mb-0.5">컨디션 & 안전</span>
                    <span className="text-sm font-black text-slate-800 tracking-tight">{safetyScore}점</span>
                    <span className="text-[9px] text-slate-400 block mt-1">
                      {safetyScore >= 80 ? '안전·우수 🟢' : safetyScore >= 60 ? '휴식 필요 🟡' : '위험 🔴'}
                    </span>
                  </div>
                  <ProgressRing percentage={safetyScore} colorClass="stroke-emerald-400" />
                </div>
              </div>
            </div>

            {/* 2. 자가 건강 및 컨디션 기록하기 */}
            <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 shadow-md">
              <h3 className="text-slate-800 font-black text-base mb-4 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-brand-secondary" /> 자가 건강 및 활동 기록
              </h3>
              
              <div className="space-y-4">
                {/* 수분 섭취 퀵로그 */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Droplet size={16} className="text-indigo-600" /> 수분 섭취량 기록
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">현재 누적: {waterIntake}ml / 하루 권장량 2.0L</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleAddWater(250)}
                      className="flex-1 sm:flex-initial bg-indigo-600/10 text-indigo-600 hover:bg-indigo-600/20 font-bold text-xs px-3 py-2 rounded-xl transition"
                    >
                      + 250ml 💧
                    </button>
                    <button
                      onClick={() => handleAddWater(500)}
                      className="flex-1 sm:flex-initial bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs px-3 py-2 rounded-xl transition shadow-md shadow-indigo-600/10"
                    >
                      + 500ml 🌊
                    </button>
                  </div>
                </div>

                {/* 뚜벅이 걸음 수 기록 */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Footprints size={16} className="text-rose-500" /> 걸음 수 증가 기록 (만보기 시뮬레이션)
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">현재 걸음수: {stepCount.toLocaleString()}보</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleAddSteps(1000)}
                      className="flex-1 sm:flex-initial bg-rose-600/10 text-rose-500 hover:bg-rose-600/20 font-bold text-xs px-3 py-2 rounded-xl transition"
                    >
                      + 1,000보 🏃
                    </button>
                    <button
                      onClick={() => handleAddSteps(5000)}
                      className="flex-1 sm:flex-initial bg-rose-600 text-white hover:bg-rose-700 font-bold text-xs px-3 py-2 rounded-xl transition shadow-md shadow-rose-600/10"
                    >
                      + 5,000보 🔥
                    </button>
                  </div>
                </div>

                {/* 피로 상태 설정 */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                    <Flame size={16} className="text-amber-500" /> 신체 피로 수준 체크
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'relaxed', label: '상쾌함 🌱', color: 'border-emerald-500 text-emerald-600 bg-emerald-500/10' },
                      { id: 'active', label: '움직임 활발 🏃', color: 'border-cyan-500 text-cyan-600 bg-cyan-500/10' },
                      { id: 'tired', label: '피곤함 🥱', color: 'border-amber-500 text-amber-600 bg-amber-500/10' },
                      { id: 'exhausted', label: '방전상태 🚨', color: 'border-rose-500 text-rose-600 bg-rose-500/10' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setFatigueLevel(opt.id);
                          if (onShowToast) onShowToast(`피로도가 '${opt.label.split(' ')[0]}' 상태로 기록되었습니다.`, 'info');
                        }}
                        className={`py-3 rounded-xl border text-[11px] font-black text-center transition-all ${
                          fatigueLevel === opt.id
                            ? `${opt.color} scale-[1.03] ring-1 ring-slate-200`
                            : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50 shadow-sm'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. 코칭 인사이트 카드 (상태기반 조언 제공) */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Today's Coaching Highlights</span>
              
              {/* 상황에 맞는 카드 렌더링 */}
              {/* [출발 전 - 준비 단계 코칭 카드] */}
              {currentPhase === 'prep' && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/80 rounded-[28px] p-5 shadow-md relative overflow-hidden text-slate-800">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-200">
                      <BookOpen size={22} />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-slate-800 font-black text-base flex items-center gap-1.5">
                        돼지코 및 환전 가이드 🔌
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
                        목적지 <strong>{selectedTrip?.destination}</strong>은/는 <strong>{meta.adapter}</strong> 어댑터를 사용합니다.
                        한국과 전압 규격이 다르므로 멀티어댑터 소지가 필수적입니다.
                      </p>
                      <p className="text-xs text-brand-primary font-bold mt-2 flex items-center gap-1">
                        💡 환율 정보: {meta.currency} 기준 최신 우대 환전율 팁을 확인하고 모바일 지갑을 채우세요.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* [수분 부족 코칭 카드] */}
              {hydrationScore < 60 && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200/80 rounded-[28px] p-5 shadow-md relative overflow-hidden text-slate-800">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0 border border-blue-200 animate-pulse">
                      <Droplet size={22} />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-slate-800 font-black text-base">물 섭취 필요 알림! 💧</h4>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
                        활동량에 비해 오늘의 물 섭취량이 부족합니다. 탈수를 예방하고 컨디션을 좋게 유지하기 위해 최소 1L의 물을 더 드시길 권장합니다.
                      </p>
                      <button
                        onClick={() => handleAddWater(500)}
                        className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/10"
                      >
                        지금 물 500ml 원샷 🥤
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* [피로 상태 경고 카드] */}
              {(fatigueLevel === 'tired' || fatigueLevel === 'exhausted') && (
                <div className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200/80 rounded-[28px] p-5 shadow-md relative overflow-hidden text-slate-800">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shrink-0 border border-rose-200">
                      <AlertTriangle size={22} />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-slate-800 font-black text-base flex items-center gap-1.5">
                        과도한 걷기 & 피로 충전 경고 ⚠️
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
                        현재 피로도가 <strong>{fatigueLevel === 'exhausted' ? '방전상태' : '피곤함'}</strong>입니다. 
                        무릎과 척추 보호를 위해 장시간 무리한 걷기를 잠시 멈추시고 근처 카페에서 30분 이상 휴식을 취해보세요.
                      </p>
                      <button
                        onClick={() => {
                          setFatigueLevel('relaxed');
                          if (onShowToast) onShowToast('30분간의 달콤한 휴식으로 컨디션이 회복되었습니다! 🌱', 'success');
                        }}
                        className="mt-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-rose-600/10"
                      >
                        30분 휴식 완료 기록 ☕
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* [치안 및 안전 주의 카드] */}
              {currentPhase === 'during' && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-[28px] p-5 shadow-md relative overflow-hidden text-slate-800">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-200">
                      <ShieldAlert size={22} />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-slate-800 font-black text-base">안심 가이드 및 꿀팁 🛡️</h4>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
                        {meta.tip}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">안전지침</span>
                        <span className="text-[10px] text-slate-500">항상 에코백과 바지 주머니 관리를 철저히!</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. 여행 준비 체크리스트 */}
            <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 shadow-md text-slate-800">
              <h3 className="text-slate-800 font-black text-base mb-4 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-cyan-500" /> 필수 여행 준비 체크리스트
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: 'passport', label: '🛂 여권 유효기간 확인 (6개월 이상)' },
                  { key: 'visa', label: '✈️ 무비자 확인 혹은 비자 신청' },
                  { key: 'insurance', label: '🛡️ 여행자 안심 보험 가입 완료', action: { label: '간편가입 🔗', type: 'link', url: 'https://m.tokiomarine.co.kr' } },
                  { key: 'exchange', label: '💵 현지 외화 환전 및 카드 준비', action: { label: '환전하기 👛', type: 'tab', target: 'wallet' } },
                  { key: 'adapter', label: '🔌 국가별 돼지코 플러그 챙기기' },
                  { key: 'hotelCheckin', label: '🏨 호텔 체크인 정보 및 위치 캡처', action: { label: '보관함 🎟️', type: 'tab', target: 'vault' } }
                ].map(item => (
                  <div key={item.key} className="relative flex items-center w-full">
                    <button
                      onClick={() => handleToggleChecklist(item.key)}
                      className={`flex-1 p-3.5 pr-20 rounded-xl border flex items-center gap-2.5 transition text-left text-xs font-bold ${
                        checklist[item.key]
                          ? 'border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border ${
                        checklist[item.key] ? 'bg-cyan-500 border-cyan-500 text-white' : 'border-slate-300 text-transparent'
                      }`}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span className="truncate pr-2">{item.label}</span>
                    </button>
                    
                    {item.action && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.action.type === 'tab' && onTabChange) {
                            onTabChange(item.action.target);
                          } else if (item.action.type === 'link') {
                            window.open(item.action.url, '_blank');
                          }
                        }}
                        className="absolute right-3 py-1.5 px-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[10px] font-black text-cyan-600 border border-cyan-500/20 active:scale-95 transition-all cursor-pointer z-10"
                      >
                        {item.action.label}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 5. 알림 세팅 & 알림 테스트 해보기 */}
            <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 shadow-md text-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 size={18} className="text-purple-500" />
                <h3 className="text-slate-800 font-black text-base">알림 유형 설정 & 실시간 테스트</h3>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { key: 'logistics', label: '여권/서류 등 출국 준비 알림', desc: '출발 전 서류 미비 방지' },
                  { key: 'weather', label: '실시간 날씨 이상 경고 알림', desc: '강수, 강풍, 폭설 등 우산 챙기기 권유' },
                  { key: 'health', label: '여행 중 수분 부족 및 휴식 권장 알림', desc: '수분 충전 타이밍 알림' },
                  { key: 'safety', label: '위험 지역 및 소매치기 위험 감지 알림', desc: '안전 보강 알림' }
                ].map(opt => (
                  <div key={opt.key} className="flex justify-between items-center py-2 border-b border-slate-200/60">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{opt.label}</span>
                      <span className="text-[10px] text-slate-500 font-bold block">{opt.desc}</span>
                    </div>
                    <button
                      onClick={() => setNotificationConfig(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                      className={`w-11 h-6 rounded-full transition-all relative ${
                        notificationConfig[opt.key] ? 'bg-brand-primary' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                        notificationConfig[opt.key] ? 'right-0.5' : 'left-0.5'
                      }`}></div>
                    </button>
                  </div>
                ))}
              </div>

              {/* 실 스마트폰 알림 발생기 */}
              <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-2xl p-4">
                <h4 className="text-xs font-black text-brand-primary flex items-center gap-1 mb-1.5">
                  <BellRing size={14} /> 실시간 코칭 푸시 알림 시뮬레이터
                </h4>
                <p className="text-[10px] text-slate-500 leading-normal mb-3.5">
                  아래 버튼을 클릭한 뒤 홈 화면으로 나가면, {testNotificationTime}초 후 티미가 직접 설정한 유형의 알림을 기기로 전송합니다. PWA 및 네이티브 모듈 상태를 즉시 테스트해볼 수 있습니다.
                </p>
                <div className="flex gap-2">
                  <select
                     value={testNotificationTime}
                     onChange={(e) => setTestNotificationTime(parseInt(e.target.value))}
                     className="bg-slate-100 text-slate-800 text-xs font-bold px-3 rounded-xl border border-slate-200 outline-none"
                  >
                    <option value={3}>3초 후</option>
                    <option value={5}>5초 후</option>
                    <option value={10}>10초 후</option>
                  </select>
                  <button
                    onClick={triggerNotificationTest}
                    disabled={isScheduling}
                    className="flex-1 bg-brand-primary hover:bg-brand-primary/95 text-white font-black text-xs py-3 rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isScheduling ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> 알림 전송 예약 중...
                      </>
                    ) : (
                      <>
                        <Smartphone size={14} /> 알림 즉시 테스트하기 📱
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
