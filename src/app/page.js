'use client';

import { useState, useEffect, useRef } from 'react';

// --- [설정] 사장님 이메일 ---
const ADMIN_EMAIL = "ceo@mytrip.pro";

// --- [상수 데이터] ---
const TRAVEL_TYPES = [
  { label: '자유 여행', emoji: '🗽', desc: '내 맘대로 자유롭게' },
  { label: '가이드 패키지', emoji: '🚩', desc: '편안한 전용 차량' },
  { label: '세미 패키지', emoji: '⚖️', desc: '자유 + 투어 반반' }
];

const THEMES = [
  { label: '쇼핑', emoji: '🛍️' }, { label: '미식', emoji: '🍽️' },
  { label: '힐링', emoji: '🧘' }, { label: '관광', emoji: '🏰' },
  { label: '인생샷', emoji: '📸' }, { label: '휴양', emoji: '🏊‍♀️' },
  { label: '액티비티', emoji: '🏄' }, { label: '잘 모름', emoji: '❓' }
];

const HOTELS = ['5성급 럭셔리', '4성급 부티크', '리조트/풀빌라', '가성비 시티호텔', '현지 감성 숙소', '상관없음'];

const LOADING_MESSAGES = [
  "✈️ 최적의 항공권 스케줄 조회 중...",
  "🏨 예산에 맞는 숙소 가격비교 중...",
  "🍽️ 현지인만 아는 찐맛집(2곳씩) 찾는 중...",
  "🗺️ 최적의 이동 동선 계산 중...",
  "✨ 전문가의 노하우를 담는 중..."
];

export default function Home() {
  const [messages, setMessages] = useState([
    { role: 'ai', content: '안녕하세요! 여행 플래너 My Trip .Pro입니다. 😊\n\n가장 먼저, **어느 도시나 지역**으로 떠나고 싶으신가요?' }
  ]);

  // 단계: 0:여행지 -> 1:출발지 -> 2:날짜 -> 3:인원 -> 4:타입 -> 5:테마 -> 6:예산/숙소 -> 7:연락처 -> 8:로딩 -> 9:완료
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    destination: '', departure: '', startDate: '', endDate: '', people: '',
    travelType: '', themes: [], budget: 200, hotelType: '5성급 럭셔리', contact: ''
  });

  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const [loadingText, setLoadingText] = useState("AI가 여행을 설계 중입니다...");
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // [NEW] 결과 화면에서 입력할 추가 요청사항 상태
  const [userRequest, setUserRequest] = useState('');

  const messagesEndRef = useRef(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages, isTyping]);

  // 로딩 롤링
  useEffect(() => {
    let interval;
    if (isTyping && currentStep === 8) {
      let idx = 0;
      interval = setInterval(() => {
        setLoadingText(LOADING_MESSAGES[idx % LOADING_MESSAGES.length]);
        idx++;
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isTyping, currentStep]);

  // 뒤로 가기
  const handlePrevStep = () => {
    if (currentStep <= 0) return;
    setMessages(prev => [...prev, { role: 'system', content: '↩️ 이전 단계로 돌아가서 다시 입력합니다.' }]);
    setCurrentStep(prev => prev - 1);
    setInputVal('');
  };

  // 응답 처리
  const handleUserResponse = (text, displayVal = null) => {
    const userMessage = displayVal || text;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    const nextData = { ...formData };

    if (currentStep === 0) nextData.destination = text;
    if (currentStep === 1) nextData.departure = text;
    if (currentStep === 3) nextData.people = text;
    if (currentStep === 4) nextData.travelType = text;
    // Step 5, 6은 UI에서 직접 처리
    if (currentStep === 7) nextData.contact = text;

    setFormData(nextData);
    setInputVal('');
    setIsTyping(true);

    setTimeout(() => {
      let nextAiMsg = '';
      let nextStep = currentStep + 1;

      if (currentStep === 0) nextAiMsg = `${text}... 정말 멋진 선택이에요! ✨\n그럼 **어디서 출발**하시나요? (예: 인천공항, 서울역)`;
      else if (currentStep === 1) nextAiMsg = `${text} 출발이군요! 🛫\n여행 일정은 **언제부터 언제까지**인가요?`;
      else if (currentStep === 2) nextAiMsg = `확인했습니다. 🗓️\n여행 인원은 **총 몇 명**인가요?`;
      else if (currentStep === 3) nextAiMsg = `${text}명이시군요. 👨‍👩‍👧‍👦\n이번 여행의 **스타일**을 골라주세요.`;
      else if (currentStep === 4) nextAiMsg = `좋습니다. 이번 여행에서 **가장 중요하게 생각하는 테마**는 무엇인가요? (여러 개 선택 가능)`;
      else if (currentStep === 5) nextAiMsg = `취향을 파악했어요! 🧐\n선호하는 **숙소 등급**과 **1인당 예산**을 알려주세요.`;
      else if (currentStep === 6) nextAiMsg = `마지막입니다! 💖\n견적서를 받아보실 **연락처(카톡/이메일)**를 남겨주세요.`;
      else if (currentStep === 7) {
        callRealAI(nextData);
        return;
      }

      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'ai', content: nextAiMsg }]);
      setCurrentStep(nextStep);
    }, 700);
  };

  // API 호출
  const callRealAI = async (finalData) => {
    try {
      const dateRange = `${finalData.startDate} ~ ${finalData.endDate}`;
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...finalData,
          days: dateRange,
          // prompt_suffix는 삭제했습니다 (이제 결과 본 후 입력하므로)
        }),
      });

      const data = await res.json();
      setIsTyping(false);
      if (data.error) throw new Error(data.error);

      setAiResult(data.result);
      setMessages(prev => [...prev, { role: 'ai', content: `🎉 **${finalData.destination}** 맞춤 여행 플랜이 완성되었습니다!\n아래 내용을 검토하시고, 하단에 추가 요청사항을 적어주세요.` }]);
      setCurrentStep(9);

    } catch (error) {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'ai', content: '죄송해요. 잠시 시스템이 혼잡합니다. 잠시 후 다시 시도해 주세요. 😥' }]);
    }
  };

  // 전문가 의뢰 (이메일 전송)
  const sendEmail = async () => {
    if (!confirm('작성하신 추가 요청사항과 함께 전문가에게 의뢰하시겠습니까?')) return;
    try {
      // [수정] 사용자가 결과창에서 입력한 추가 요청사항을 포함
      const contentWithRequest = `
          <h2>📞 고객 연락처 & 추가 요청</h2>
          <p><strong>연락처:</strong> ${formData.contact}</p>
          <div style="background:#fff9db; padding:15px; margin:20px 0; border:1px solid #ffd43b; border-radius:8px;">
            <strong>📝 고객 추가 요청사항:</strong><br>
            ${userRequest || "(없음)"}
          </div>
          <hr>
          ${aiResult}
        `;

      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: ADMIN_EMAIL, destination: formData.destination, planData: contentWithRequest }),
      });

      if (res.ok) alert(`✅ 접수되었습니다! 남겨주신 연락처(${formData.contact})로 48시간 내에 전문가가 연락드립니다.`);
      else alert('전송 실패. 잠시 후 다시 시도해주세요.');
    } catch (e) { alert('오류 발생'); }
  };

  const openKakaoChat = () => window.open('http://pf.kakao.com/_xcJhrn/chat', '_blank');
  const openFlightSearch = () => window.open(`https://search.naver.com/search.naver?query=${encodeURIComponent(formData.departure + '에서 ' + formData.destination + ' 항공권')}`, '_blank');

  return (
    <>
      <style jsx global>{`
        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
        body { font-family: "Pretendard", sans-serif; }
        .prose table { width: 100% !important; border-collapse: collapse !important; margin-top: 15px !important; margin-bottom: 15px !important; border: 1px solid #e5e7eb !important; }
        .prose th { background-color: #f9fafb !important; padding: 12px !important; border: 1px solid #e5e7eb !important; text-align: left !important; font-weight: 700 !important; color: #111827 !important; }
        .prose td { padding: 12px !important; border: 1px solid #e5e7eb !important; color: #374151 !important; }
        .prose strong { color: #ea580c; font-weight: 700; }
      `}</style>

      <div className="relative min-h-screen flex items-center justify-center font-sans bg-gray-900 text-gray-800">

        <video autoPlay loop muted playsInline className="absolute w-full h-full object-cover z-0" poster="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop">
          <source src="/bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10"></div>

        <div className="relative z-20 w-full max-w-md h-[85vh] sm:h-[700px] sm:rounded-[40px] bg-white/10 border border-white/20 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-500">

          {/* 헤더 */}
          <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-black/20">
            <div>
              <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-amber-100 tracking-tight">My Trip .Pro</h1>
              <p className="text-[10px] text-white/70 font-medium tracking-wider uppercase mt-1">Premium AI Concierge</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-[10px] text-white font-bold">GPT-4o</span>
            </div>
          </div>

          {/* 채팅 영역 */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                {msg.role === 'ai' ? (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm shadow-lg mr-3 flex-shrink-0 border border-white/20">🤖</div>
                ) : (
                  msg.role === 'system' && <div className="w-full text-center text-xs text-white/50 my-2">-- {msg.content} --</div>
                )}
                {msg.role !== 'system' && (
                  <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-tr-none font-medium' : 'bg-white/80 text-gray-800 border border-white/40 rounded-tl-none backdrop-blur-sm'}`}>
                    {msg.content}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-pulse ml-12 mb-4">
                <div className="bg-black/40 px-4 py-3 rounded-2xl border border-white/10 text-white text-xs flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div><span>{currentStep === 8 ? loadingText : "입력 확인 중..."}</span>
                </div>
              </div>
            )}

            {aiResult && (
              <div className="bg-white rounded-[24px] overflow-hidden shadow-2xl mt-4 animate-scale-in pb-6">
                <div className="bg-slate-900 p-6 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-900 to-blue-900 opacity-50"></div>
                  <h3 className="relative z-10 text-xl font-bold text-white mb-1">✨ {formData.destination} 프리미엄 플랜</h3>
                  <p className="relative z-10 text-xs text-blue-200">AI Analysis Complete</p>
                </div>

                {/* 지도 */}
                <div className={`w-full bg-gray-100 relative transition-all duration-300 ${isMapExpanded ? 'h-96' : 'h-48'}`}>
                  <iframe
                    width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(formData.destination)}&t=m&z=14&output=embed&iwloc=near`}
                    allowFullScreen
                  ></iframe>
                  <button onClick={() => setIsMapExpanded(!isMapExpanded)} className="absolute bottom-2 right-2 bg-white text-gray-700 text-xs px-3 py-1.5 rounded-full shadow-md font-bold hover:bg-gray-50 flex items-center gap-1">{isMapExpanded ? '🔽 축소' : '🔼 지도 크게 보기'}</button>
                </div>

                {/* 본문 */}
                <div className="px-6 py-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                  <div className="text-sm leading-relaxed text-gray-700 prose" dangerouslySetInnerHTML={{ __html: aiResult }} />
                </div>

                {/* [NEW] 추가 요청사항 입력란 */}
                <div className="px-6 pb-2">
                  <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">📝 전문가에게 전할 추가 요청사항</label>
                  <textarea
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none resize-none"
                    rows="3"
                    placeholder="예: 2일차 저녁은 한식으로 변경하고 싶어요. 부모님 모시고 가는데 걷는 일정 줄여주세요."
                    value={userRequest}
                    onChange={(e) => setUserRequest(e.target.value)}
                  ></textarea>
                </div>

                <div className="px-6 mt-2 space-y-2 mb-4">
                  <button onClick={openFlightSearch} className="w-full py-3.5 bg-sky-600 text-white font-bold rounded-xl shadow-lg hover:bg-sky-500 transition text-sm flex items-center justify-center gap-2"><span>✈️ 실시간 항공권 최저가 확인</span></button>
                  <button onClick={sendEmail} className="w-full py-3.5 bg-black text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 transition text-sm flex items-center justify-center gap-2"><span>👨‍💼 전문가 검토 의뢰 (전송)</span></button>
                  <button onClick={openKakaoChat} className="w-full py-3.5 bg-[#FEE500] text-[#3c1e1e] font-bold rounded-xl shadow-lg hover:bg-[#fdd835] transition text-sm flex items-center justify-center gap-2"><span>💬 카카오톡으로 전문 상담하기</span></button>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 입력 컨트롤 영역 */}
          <div className="p-4 bg-white/10 border-t border-white/10 backdrop-blur-md flex-shrink-0">
            {/* Step 1: 출발지 */}
            {currentStep === 1 && !isTyping && (<div className="flex gap-2 animate-slide-up"><button onClick={handlePrevStep} className="px-4 py-3 bg-white/20 text-white font-bold rounded-2xl hover:bg-white/30">⬅</button><input type="text" value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && inputVal && handleUserResponse(inputVal)} placeholder="출발지(예: 인천공항)를 입력하세요" className="flex-1 p-4 rounded-2xl bg-white/90 text-gray-800 placeholder:text-gray-400 outline-none shadow-lg focus:ring-2 focus:ring-orange-400 transition" /><button onClick={() => inputVal && handleUserResponse(inputVal)} className="bg-gradient-to-r from-orange-500 to-pink-600 text-white px-5 rounded-2xl hover:opacity-90 transition shadow-lg flex items-center justify-center"><span className="text-xl">➤</span></button></div>)}
            {/* Step 2: 날짜 */}
            {currentStep === 2 && !isTyping && (<div className="space-y-3 bg-white/90 p-4 rounded-2xl shadow-lg animate-slide-up"><div className="flex gap-3"><div className="flex-1"><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">출발</label><input type="date" onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400" /></div><div className="flex-1"><label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">도착</label><input type="date" onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400" /></div></div><div className="flex gap-2"><button onClick={handlePrevStep} className="px-4 py-3 bg-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-300">⬅</button><button onClick={() => { if (!formData.startDate || !formData.endDate) return alert("날짜를 선택해주세요"); handleUserResponse(`${formData.startDate} ~ ${formData.endDate}`); }} className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition">선택 완료</button></div></div>)}
            {/* Step 3: 인원 */}
            {currentStep === 3 && !isTyping && (<div className="flex gap-2 animate-slide-up"><button onClick={handlePrevStep} className="px-4 py-3 bg-white/90 text-gray-600 font-bold rounded-2xl hover:bg-white">⬅</button><input type="number" placeholder="2" onChange={(e) => setInputVal(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && inputVal && handleUserResponse(inputVal)} className="w-24 p-4 rounded-2xl bg-white/90 text-center text-xl font-bold outline-none shadow-lg focus:ring-2 focus:ring-orange-400" /><button onClick={() => inputVal && handleUserResponse(inputVal)} className="flex-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-2xl font-bold shadow-lg text-lg">명 입력 ↵</button></div>)}
            {/* Step 4: 여행 타입 */}
            {currentStep === 4 && !isTyping && (<div className="space-y-2 animate-slide-up"><div className="flex justify-start"><button onClick={handlePrevStep} className="mb-2 px-3 py-1 bg-white/20 text-white text-xs rounded-full hover:bg-white/30">⬅ 이전 단계</button></div>{TRAVEL_TYPES.map((type, i) => (<button key={i} onClick={() => handleUserResponse(type.label)} className="w-full p-4 bg-white/90 rounded-xl hover:bg-white shadow-md transition flex items-center gap-4 text-left group border border-transparent hover:border-orange-300"><span className="text-2xl group-hover:scale-110 transition">{type.emoji}</span><div><div className="font-bold text-gray-800">{type.label}</div><div className="text-xs text-gray-500">{type.desc}</div></div></button>))}</div>)}
            {/* Step 5: 테마 */}
            {currentStep === 5 && !isTyping && (<div className="space-y-3 animate-slide-up bg-white/10 p-2 rounded-2xl"><div className="grid grid-cols-4 gap-2">{THEMES.map((t, i) => (<button key={i} onClick={() => { const newThemes = formData.themes.includes(t.label) ? formData.themes.filter(x => x !== t.label) : [...formData.themes, t.label]; setFormData({ ...formData, themes: newThemes }); }} className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${formData.themes.includes(t.label) ? 'bg-orange-500 text-white shadow-lg scale-105' : 'bg-white/80 text-gray-600 hover:bg-white'}`}><span className="text-xl mb-1">{t.emoji}</span><span className="text-[10px] font-bold">{t.label}</span></button>))}</div><div className="flex gap-2"><button onClick={handlePrevStep} className="px-4 py-3 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30">⬅</button><button onClick={() => handleUserResponse(formData.themes.length > 0 ? formData.themes.join(', ') : '추천 테마')} className="flex-1 py-3 bg-black text-white font-bold rounded-xl shadow-lg">선택 완료 ({formData.themes.length})</button></div></div>)}
            {/* Step 6: 예산/숙소 */}
            {currentStep === 6 && !isTyping && (<div className="space-y-4 bg-white/90 p-5 rounded-2xl shadow-lg animate-slide-up"><div><div className="flex justify-between mb-2"><span className="text-xs font-bold text-gray-500">1인 예산</span><span className="text-lg font-bold text-orange-600">{formData.budget}만원</span></div><input type="range" min="50" max="1000" step="10" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500" /></div><div><label className="text-xs font-bold text-gray-500 mb-1.5 block">숙소 취향</label><div className="grid grid-cols-2 gap-2">{HOTELS.map((h, i) => (<button key={i} onClick={() => setFormData({ ...formData, hotelType: h })} className={`p-2 text-xs rounded-lg border ${formData.hotelType === h ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-600'}`}>{h}</button>))}</div></div><div className="flex gap-2"><button onClick={handlePrevStep} className="px-4 py-3 bg-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-300">⬅</button><button onClick={() => handleUserResponse(`${formData.budget}만원, ${formData.hotelType} 선호`)} className="flex-1 py-3 bg-black text-white font-bold rounded-xl">다음 단계</button></div></div>)}
            {/* 텍스트 입력 (Step 0, 7) */}
            {(currentStep === 0 || currentStep === 7) && !aiResult && !isTyping && (<div className="flex gap-2 animate-slide-up">{currentStep > 0 && (<button onClick={handlePrevStep} className="px-4 bg-white/20 text-white rounded-2xl hover:bg-white/30 text-xl font-bold">⬅</button>)}<input type="text" value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && inputVal && handleUserResponse(inputVal)} placeholder={currentStep === 7 ? "연락처를 입력해주세요" : currentStep === 1 ? "출발지(예: 인천공항)를 입력하세요" : "메시지를 입력하세요..."} className="flex-1 p-4 rounded-2xl bg-white/90 text-gray-800 placeholder:text-gray-400 outline-none shadow-lg focus:ring-2 focus:ring-orange-400 transition" /><button onClick={() => inputVal && handleUserResponse(inputVal)} className="bg-gradient-to-r from-orange-500 to-pink-600 text-white px-5 rounded-2xl hover:opacity-90 transition shadow-lg flex items-center justify-center"><span className="text-xl">➤</span></button></div>)}
            {/* 리셋 */}
            {aiResult && (<button onClick={() => window.location.reload()} className="w-full py-3 text-white/70 text-xs hover:text-white transition underline">처음부터 다시하기</button>)}
          </div>
        </div>
      </div>
    </>
  );
}