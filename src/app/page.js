"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Calendar, Wallet, Home as HomeIcon, Heart, User, Sparkles, Users, BedDouble, Compass, Phone, MessageSquare } from "lucide-react";
import AIResult from "../components/AIResult";

// 📸 배경 이미지 URL
const backgroundImages = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1498855926480-d98e83099315?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1543107511-b0481b23c445?q=80&w=2070&auto=format&fit=crop",
];

const tourOptions = [
  { id: '자유여행', label: '자유여행', desc: '대중교통, 맛집 웨이팅, 자유 시간 위주' },
  { id: '소그룹 단독여행', label: '소그룹 단독여행', desc: '전용 차량, 프라이빗 가이드 위주' },
  { id: '패키지여행', label: '패키지여행', desc: '효율적인 동선, 핵심 명소, 가이드 설명' },
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [bgImage, setBgImage] = useState("");

  // ✅ 연락처(contact), 요청사항(requests) 추가
  const [formData, setFormData] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    people: 2,
    budget: 50,
    hotelType: "호텔",
    tourType: "자유여행",
    themes: [],
    contact: "",
    requests: "",
  });

  useEffect(() => {
    const randomImage = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
    setBgImage(randomImage);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const updatePeople = (delta) => {
    setFormData(prev => ({
      ...prev,
      people: Math.max(1, Math.min(6, prev.people + delta))
    }));
  };

  const generatePlan = async () => {
    // 필수값 체크 (연락처도 필수로 받을지 선택 가능, 여기선 필수로 둠)
    if (!formData.destination || !formData.startDate || !formData.endDate || !formData.contact) {
      alert("여행지, 날짜, 연락처를 모두 입력해주세요!");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.result) setResult(data.result);
      else alert("오류: " + (data.error || "알 수 없는 오류"));
    } catch (error) {
      console.error(error);
      alert("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 결과 화면으로 데이터 전송
  if (result) return <AIResult data={result} userInfo={formData} bgImage={bgImage} />;

  return (
    <div className="h-screen w-full flex justify-center items-center bg-gray-100 sm:p-8 font-sans relative overflow-hidden">

      {bgImage && (
        <img src={bgImage} alt="Travel Background" className="absolute inset-0 w-full h-full object-cover z-0" />
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[420px] max-h-[90vh] bg-white/95 backdrop-blur-sm sm:rounded-[40px] sm:shadow-[0_20px_40px_rgba(0,0,0,0.3)] sm:border-8 sm:border-white/50 overflow-hidden relative flex flex-col z-10"
      >
        <div className="bg-transparent px-6 pt-8 pb-2 flex justify-between items-center sticky top-0 z-10 shrink-0"></div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-2 pb-32">

          <div className="mb-6 flex justify-start">
            <img src="/logo.png" alt="My Trip Pro" className="h-10 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
              나만의 여행,<br />
              <span className="text-[#FF5A5F]">어떻게 준비할까요?</span>
            </h1>
          </div>

          <div className="space-y-6">

            {/* 1. 여행지 */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 focus-within:ring-2 focus-within:ring-[#FF5A5F]">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                <MapPin size={18} className="text-[#FF5A5F]" /> 여행지
              </label>
              <input type="text" name="destination" value={formData.destination} onChange={handleInputChange} placeholder="예: 파리, 제주도" className="w-full bg-transparent outline-none text-lg font-bold text-gray-800" />
            </div>

            {/* 2. 날짜 */}
            <div className="flex gap-3">
              <div className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-500 mb-1">가는 날</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="w-full bg-transparent outline-none font-bold text-gray-800 text-sm" />
              </div>
              <div className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-500 mb-1">오는 날</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} className="w-full bg-transparent outline-none font-bold text-gray-800 text-sm" />
              </div>
            </div>

            {/* 3. 투어 형태 */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-3">
                <Compass size={18} className="text-[#FF5A5F]" /> 투어 형태
              </label>
              <div className="flex flex-col gap-3">
                {tourOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setFormData({ ...formData, tourType: option.id })}
                    className={`py-4 px-5 rounded-2xl text-left transition-all border ${formData.tourType === option.id
                      ? 'bg-[#FF5A5F] border-[#FF5A5F] text-white shadow-lg shadow-rose-200 scale-[1.02]'
                      : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50 hover:border-gray-200'
                      }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-bold text-base ${formData.tourType === option.id ? 'text-white' : 'text-gray-800'}`}>
                        {option.label}
                      </span>
                      {formData.tourType === option.id && <Sparkles size={18} className="text-yellow-300" />}
                    </div>
                    <p className={`text-xs ${formData.tourType === option.id ? 'text-white/90' : 'text-gray-400'}`}>
                      {option.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. 인원 */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                <Users size={18} className="text-[#FF5A5F]" /> 인원
              </label>
              <div className="flex items-center gap-4 bg-white px-2 py-1 rounded-xl border border-gray-200 shadow-sm">
                <button onClick={() => updatePeople(-1)} className="w-8 h-8 flex items-center justify-center text-gray-500 font-bold hover:bg-gray-100 rounded-lg">-</button>
                <span className="text-lg font-bold w-4 text-center">{formData.people}</span>
                <button onClick={() => updatePeople(1)} className="w-8 h-8 flex items-center justify-center text-[#FF5A5F] font-bold hover:bg-red-50 rounded-lg">+</button>
              </div>
            </div>

            {/* 5. 예산 */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <label className="flex justify-between text-sm font-bold text-gray-600 mb-4">
                <div className="flex items-center gap-2"><Wallet size={18} className="text-[#FF5A5F]" /> 인당 예산</div>
                <span className="text-[#FF5A5F] text-lg">{formData.budget}만원</span>
              </label>
              <input type="range" name="budget" min="10" max="500" step="10" value={formData.budget} onChange={handleInputChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF5A5F]" />
            </div>

            {/* 6. 숙소 취향 */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-3">
                <BedDouble size={18} className="text-[#FF5A5F]" /> 선호 숙소
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['호텔', '감성숙소', '리조트', '게스트하우스'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormData({ ...formData, hotelType: type })}
                    className={`py-3 rounded-xl text-sm font-bold transition-all ${formData.hotelType === type ? 'bg-[#FF5A5F] text-white shadow-md ring-2 ring-[#FF5A5F] ring-offset-1' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* ✅ 7. 고객 정보 & 요청사항 (신규) */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 focus-within:ring-2 focus-within:ring-[#FF5A5F]">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                  <Phone size={18} className="text-[#FF5A5F]" /> 연락처 (필수)
                </label>
                <input type="text" name="contact" value={formData.contact} onChange={handleInputChange} placeholder="010-1234-5678, 이메일 또는 카톡/인스타ID" className="w-full bg-transparent outline-none text-base font-medium text-gray-800 placeholder-gray-400" />
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 focus-within:ring-2 focus-within:ring-[#FF5A5F]">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                  <MessageSquare size={18} className="text-[#FF5A5F]" /> 추가 요청사항
                </label>
                <textarea
                  name="requests"
                  value={formData.requests}
                  onChange={handleInputChange}
                  placeholder="예: 부모님과 함께 가요, 휠체어 대여 필요해요, 해산물은 못 먹어요."
                  className="w-full bg-transparent outline-none text-base font-medium text-gray-800 placeholder-gray-400 min-h-[80px] resize-none"
                />
              </div>
            </div>

          </div>

          <div className="mt-10">
            <button onClick={generatePlan} disabled={loading} className="w-full bg-[#FF5A5F] text-white py-4 rounded-2xl font-bold text-xl shadow-xl shadow-rose-200 hover:bg-[#FF4046] active:scale-95 transition-all flex items-center justify-center gap-2">
              {loading ? <><Sparkles className="animate-spin" /> 맞춤 견적 짜는 중...</> : "나만의 맞춤 플랜 확인하기"}
            </button>
          </div>
        </div>

        <div className="bg-white border-t border-gray-100 px-8 py-4 flex justify-between items-center sticky bottom-0 z-20 shrink-0 pb-8">
          <HomeIcon size={26} className="text-[#FF5A5F]" />
          <Search size={26} className="text-gray-300" />
          <Heart size={26} className="text-gray-300" />
          <User size={26} className="text-gray-300" />
        </div>
      </motion.div>
      <style jsx global>{` .scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; } `}</style>
    </div>
  );
}