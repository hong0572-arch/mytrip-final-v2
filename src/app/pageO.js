"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Calendar, Wallet, User, Sparkles, Users, Compass, Heart, Baby, Briefcase } from "lucide-react";
import AIResult from "../components/AIResult";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ko } from 'date-fns/locale';

// 배경 이미지
const backgroundImages = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1498855926480-d98e83099315?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1543107511-b0481b23c445?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop",
];

const tourOptions = [
  { id: '자유여행', label: '자유여행', desc: '내 맘대로 자유롭게' },
  { id: '소그룹', label: '소그룹 투어', desc: '우리끼리 편안하게' },
  { id: '패키지', label: '세미 패키지', desc: '핵심만 쏙쏙' },
];

const companionOptions = [
  { id: '혼자', label: '나홀로', icon: <User size={20} /> },
  { id: '연인', label: '연인', icon: <Heart size={20} /> },
  { id: '친구', label: '친구', icon: <Users size={20} /> },
  { id: '가족', label: '가족', icon: <Baby size={20} /> },
  { id: '비즈니스', label: '출장/워크샵', icon: <Briefcase size={20} /> },
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [bgIndex, setBgIndex] = useState(0);
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

  const [formData, setFormData] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    companion: "연인",
    people: 2,
    budget: 100,
    hotelType: "호텔",
    tourType: "자유여행",
    themes: [],
    contact: "",
    request: "",
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDateChange = (update) => {
    setDateRange(update);
    const [start, end] = update;
    if (start && end) {
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 30) {
        alert("여행 기간은 최대 30일까지만 가능합니다.");
        setDateRange([start, null]);
        return;
      }
      const format = (d) => d.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, startDate: format(start), endDate: format(end) }));
    } else {
      setFormData(prev => ({ ...prev, startDate: start ? start.toISOString().split('T')[0] : "", endDate: "" }));
    }
  };

  const updatePeople = (delta) => {
    setFormData(prev => ({ ...prev, people: Math.max(1, Math.min(20, prev.people + delta)) }));
  };

  const generatePlan = async () => {
    if (!formData.destination) { alert("어디로 떠나시나요? 여행지를 입력해주세요!"); return; }
    if (!formData.startDate || !formData.endDate) { alert("여행 날짜를 달력에서 선택해주세요!"); return; }
    if (!formData.contact || formData.contact.trim().length < 2) { alert("연락처를 입력해주세요."); return; }

    setLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.result) setResult(data.result);
      else alert("일정을 생성하지 못했습니다: " + (data.error || "오류 발생"));
    } catch (error) {
      console.error(error);
      alert("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (result) return <AIResult data={result} userInfo={formData} />;

  return (
    <div className="h-screen w-full flex justify-center items-center bg-gray-900 sm:p-8 font-sans relative overflow-hidden">

      {/* 배경 슬라이드 */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode='wait'>
          <motion.img
            key={bgIndex}
            src={backgroundImages[bgIndex]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] h-full sm:h-[92vh] bg-white/95 backdrop-blur-md sm:rounded-[35px] shadow-2xl overflow-hidden relative flex flex-col z-10"
      >
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-2 shrink-0 flex justify-between items-center bg-white/50 backdrop-blur-sm z-20">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
          <div className="px-3 py-1 bg-rose-50 text-[#FF5A5F] text-xs font-bold rounded-full border border-rose-100">
            AI Travel Planner
          </div>
        </div>

        {/* 스크롤 영역 (하단 패딩을 버튼 높이만큼 줘서 가려지지 않게 함 pb-32) */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-2 pb-36">

          <div className="mb-8 mt-4">
            <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
              나만의 여행,<br />
              <span className="text-[#FF5A5F]">누구와 떠나시나요?</span>
            </h1>
          </div>

          <div className="space-y-7">

            {/* 1. 여행지 & 날짜 */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative z-10">
              <div className="mb-4 border-b border-gray-100 pb-4">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-500 mb-2">
                  <MapPin size={16} className="text-[#FF5A5F]" /> 어디로 가세요?
                </label>
                <input
                  type="text" name="destination"
                  value={formData.destination} onChange={handleInputChange}
                  placeholder="국가 또는 도시 입력"
                  className="w-full text-xl font-bold text-gray-800 placeholder-gray-300 outline-none bg-transparent"
                />
              </div>
              <div className="w-full">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-1">
                  <Calendar size={14} /> 여행 일정
                </label>
                <DatePicker
                  selectsRange={true} startDate={startDate} endDate={endDate} onChange={handleDateChange}
                  minDate={new Date()} locale={ko} dateFormat="yyyy.MM.dd" placeholderText="날짜 선택"
                  className="w-full text-lg font-bold text-gray-800 bg-transparent outline-none cursor-pointer placeholder-gray-300"
                  wrapperClassName="w-full"
                />
              </div>
            </div>

            {/* 2. 누구와 함께 */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-3 px-1">
                <Users size={18} className="text-[#FF5A5F]" /> 동행자
              </label>
              <div className="grid grid-cols-5 gap-2">
                {companionOptions.map((opt) => (
                  <button key={opt.id} onClick={() => setFormData({ ...formData, companion: opt.id })}
                    className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all gap-1 ${formData.companion === opt.id ? 'bg-[#FF5A5F] text-white shadow-md scale-105 font-bold' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                    {opt.icon} <span className="text-[10px]">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 투어 스타일 */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-3 px-1">
                <Compass size={18} className="text-[#FF5A5F]" /> 스타일
              </label>
              <div className="grid grid-cols-3 gap-2">
                {tourOptions.map((option) => (
                  <button key={option.id} onClick={() => setFormData({ ...formData, tourType: option.id })}
                    className={`py-3 px-2 rounded-2xl border transition-all flex flex-col items-center text-center ${formData.tourType === option.id ? 'bg-white border-[#FF5A5F] text-[#FF5A5F] shadow-lg shadow-rose-100 ring-1 ring-[#FF5A5F]' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                    <span className="font-bold text-sm mb-1">{option.label}</span>
                    <span className="text-[10px] opacity-70 break-keep">{option.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. 예산 & 인원 (❗A 문제 해결: z-index 추가 및 CSS 개선) */}
            <div className="bg-gray-50 p-5 rounded-3xl flex gap-6 items-center justify-between border border-gray-100 relative z-0">
              <div className="flex-1 relative">
                <label className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                  <Wallet size={14} /> 1인 예산
                </label>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-xl font-bold text-[#FF5A5F]">{formData.budget}</span>
                  <span className="text-sm font-medium text-gray-500 mb-1">만원</span>
                </div>
                {/* [수정됨] z-index와 cursor-pointer를 확실하게 적용 */}
                <input
                  type="range" name="budget" min="10" max="500" step="10"
                  value={formData.budget} onChange={handleInputChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF5A5F] relative z-20 touch-action-none"
                  style={{ zIndex: 50 }}
                />
              </div>
              <div className="w-1px h-12 bg-gray-200"></div>
              <div className="flex flex-col items-center min-w-[70px]">
                <label className="text-xs font-bold text-gray-500 mb-2">인원</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => updatePeople(-1)} className="w-7 h-7 bg-white rounded-full shadow text-gray-500 font-bold hover:bg-gray-100">-</button>
                  <span className="font-bold text-gray-800">{formData.people}</span>
                  <button onClick={() => updatePeople(1)} className="w-7 h-7 bg-[#FF5A5F] rounded-full shadow text-white font-bold hover:bg-rose-600">+</button>
                </div>
              </div>
            </div>

            {/* 5. 연락처 & 요청사항 */}
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 focus-within:border-[#FF5A5F] transition-colors">
                <label className="text-xs font-bold text-gray-400 mb-1 block">연락처 (필수)</label>
                <input type="text" name="contact" value={formData.contact} onChange={handleInputChange} placeholder="카톡ID / 인스타ID / 이메일" className="w-full text-sm font-medium outline-none text-gray-800" />
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-200 focus-within:border-[#FF5A5F] transition-colors">
                <label className="text-xs font-bold text-gray-400 mb-1 block">추가 요청사항</label>
                <textarea name="request" value={formData.request} onChange={handleInputChange} placeholder="예: 해산물 알러지가 있어요 등" className="w-full text-sm font-medium outline-none text-gray-800 resize-none h-20" />
              </div>
            </div>

          </div>
        </div>

        {/* ❗B 문제 해결: 하단 고정 (Sticky Footer) */}
        {/* 버튼이 컨텐츠 위에 예쁘게 떠 있도록 그라데이션 오버레이 추가 */}
        <div className="absolute bottom-0 left-0 w-full p-6 bg-linear-to-t from-white via-white/95 to-transparent z-30">
          <button
            onClick={generatePlan}
            disabled={loading}
            className="w-full bg-linear-to-r from-[#FF5A5F] to-[#FF3D43] text-white py-4 rounded-2xl font-bold text-xl shadow-xl shadow-rose-200 hover:shadow-rose-400 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            {loading ? <><Sparkles className="animate-spin" size={24} /> 플랜 생성 중...</> : "✨ 무료로 여행 플랜 받기"}
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-2">
            제출 시 개인정보 수집 및 이용에 동의하게 됩니다.
          </p>
        </div>

      </motion.div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; } 
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .react-datepicker { border: none !important; box-shadow: 0 10px 40px rgba(0,0,0,0.1); font-family: sans-serif; border-radius: 16px !important; }
        .react-datepicker__header { bg-white; border-bottom: 1px solid #f0f0f0; border-top-left-radius: 16px !important; border-top-right-radius: 16px !important; background-color: white !important; padding-top: 10px; }
        .react-datepicker__day--selected, .react-datepicker__day--in-range { background-color: #FF5A5F !important; border-radius: 50%; color: white !important; }
        .react-datepicker__day:hover { background-color: #f0f0f0 !important; border-radius: 50%; }
        .react-datepicker__day-name { color: #aaa; font-weight: bold; width: 36px; }
        .react-datepicker__day { width: 36px; line-height: 36px; }
      `}</style>
    </div>
  );
}