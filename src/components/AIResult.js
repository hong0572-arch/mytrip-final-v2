"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, ChevronLeft, Share2, Heart, MapPin, Mail, MessageCircle, CheckCircle, Loader2, Copy } from "lucide-react";

export default function AIResult({ data, userInfo, bgImage }) {

    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);

    // ✅ 1. 복사용 텍스트 생성 함수 (HTML -> 보기 좋은 텍스트로 변환)
    const generateClipboardText = () => {
        // HTML 태그 제거 및 줄바꿈 처리
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = data.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n");
        const cleanBody = tempDiv.innerText;

        return `
✈️ [My Trip Pro] AI 맞춤 여행 계획

📍 여행지: ${userInfo?.destination}
📅 일정: ${userInfo?.startDate} ~ ${userInfo?.endDate}
👥 인원: ${userInfo?.people}명
💰 예산: ${userInfo?.budget}만원
🏨 숙소: ${userInfo?.hotelType}
✨ 테마: ${userInfo?.themes?.join(", ")}

📞 연락처: ${userInfo?.contact || "미입력"}
📝 요청사항: ${userInfo?.request || "없음"}

--------------------------------
[상세 일정]
${cleanBody}
--------------------------------
AI가 설계한 여행 계획입니다.
전문가님, 이대로 견적 및 예약 가능할까요?
`;
    };

    const handleDownload = () => {
        window.print();
    };

    // ✅ 2. 공유하기 버튼 (친구에게 텍스트 보내기)
    const handleShare = async () => {
        const shareText = generateClipboardText();

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${userInfo?.destination} 여행 계획`,
                    text: shareText,
                });
            } catch (error) {
                console.log('공유 실패:', error);
            }
        } else {
            // PC 등 공유하기 기능 없으면 클립보드 복사
            try {
                await navigator.clipboard.writeText(shareText);
                alert("여행 계획이 복사되었습니다! 원하시는 곳에 붙여넣기(Ctrl+V) 하세요.");
            } catch (err) {
                alert("복사에 실패했습니다.");
            }
        }
    };

    // 이메일 자동 발송 함수
    const handleExpertReview = async () => {
        if (isSent) return;
        if (!confirm("전문가에게 여행 계획 점검을 요청하시겠습니까?\n(입력하신 연락처로 연락드립니다.)")) return;

        setIsSending(true);

        try {
            const response = await fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...userInfo,
                    aiResult: data
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setIsSent(true);
                alert("✅ 접수 완료! 담당자가 확인 후 곧 연락드리겠습니다.");
            } else {
                throw new Error(result.error || "전송 실패");
            }
        } catch (error) {
            console.error("이메일 전송 에러:", error);
            alert(`❌ 전송 실패: ${error.message}\n잠시 후 다시 시도해 주세요.`);
        } finally {
            setIsSending(false);
        }
    };

    // ✅ 3. 카카오톡 상담 버튼 (복사 후 채팅방 열기)
    const handleKakaoChat = async () => {
        const text = generateClipboardText();
        try {
            await navigator.clipboard.writeText(text);
            alert("📋 여행 계획이 복사되었습니다!\n\n상담 채팅방이 열리면 입력창에\n'붙여넣기'를 해주세요.");
        } catch (err) {
            console.error("복사 실패", err);
            alert("자동 복사에 실패했습니다. 채팅방에서 상담해주세요.");
        }
        // 사장님 카톡 링크
        window.open('http://pf.kakao.com/_xcJhrn/chat', '_blank');
    };

    const destinationKeyword = userInfo?.destination ? encodeURIComponent(userInfo.destination) : "travel";
    const headerImageSrc = `https://loremflickr.com/800/600/${destinationKeyword},landscape/all`;

    return (
        <div className="h-screen w-full flex justify-center items-center bg-gray-100 sm:p-8 font-sans relative overflow-hidden">

            {bgImage && (
                <img src={bgImage} alt="Travel Background" className="absolute inset-0 w-full h-full object-cover z-0" />
            )}

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[420px] max-h-[90vh] bg-white/95 backdrop-blur-sm sm:rounded-[40px] sm:shadow-[0_20px_40px_rgba(255,90,95,0.15)] sm:border-8 sm:border-white/50 overflow-hidden relative flex flex-col z-10"
            >

                {/* 헤더 영역 */}
                <div className="relative h-64 w-full shrink-0">
                    <img
                        src={headerImageSrc}
                        alt="Destination"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070"; }}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

                    {/* 상단 네비게이션 */}
                    <div className="absolute top-0 left-0 right-0 p-6 pt-8 flex justify-between items-center text-white z-10">
                        <ChevronLeft className="w-8 h-8 cursor-pointer drop-shadow-md hover:scale-110 transition-transform" onClick={() => window.location.reload()} />
                        <div className="flex gap-4">
                            {/* 공유 버튼 클릭 시 텍스트 공유 실행 */}
                            <Share2 className="w-6 h-6 cursor-pointer drop-shadow-md hover:scale-110 transition-transform" onClick={handleShare} />
                            <Heart className="w-6 h-6 cursor-pointer drop-shadow-md hover:scale-110 transition-transform" />
                        </div>
                    </div>

                    {/* 왼쪽 하단: 날짜 태그 및 제목 */}
                    <div className="absolute bottom-0 left-0 p-6 text-white z-10">
                        <div className="flex gap-2 mb-2">
                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/30">
                                {userInfo?.startDate || "여행일"} 출발
                            </span>
                            <span className="bg-[#FF5A5F] px-3 py-1 rounded-full text-xs font-bold">
                                D-Day
                            </span>
                        </div>
                        <h1 className="text-3xl font-extrabold leading-tight mb-1 shadow-black/50 drop-shadow-lg">
                            {userInfo?.destination || "여행지"}<br />
                            <span className="text-rose-200">여행 가이드</span>
                        </h1>
                    </div>

                    <div className="absolute bottom-0 right-0 p-6 text-white z-10 text-right">
                        <div className="flex items-center justify-end gap-1 text-sm text-gray-100 opacity-90 drop-shadow-md font-medium bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-[2px]">
                            <MapPin size={14} /> {userInfo?.tourType || "자유여행"} · {userInfo?.people || 2}명
                        </div>
                    </div>
                </div>

                {/* 본문 영역 */}
                <div className="flex-1 overflow-y-auto scrollbar-hide bg-[#FAFAFA] -mt-10 rounded-t-[30px] relative z-0 shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
                    <div className="p-6 pt-10 pb-10">
                        <div
                            className="prose prose-sm max-w-none prose-headings:font-bold prose-a:text-[#FF5A5F]"
                            style={{ fontFamily: "'Pretendard', sans-serif" }}
                            dangerouslySetInnerHTML={{ __html: data }}
                        />

                        {/* 버튼 그룹 */}
                        <div className="mt-12 mb-4 flex flex-col gap-3 print:hidden">

                            {/* 1. 이메일 자동 발송 버튼 */}
                            <button
                                onClick={handleExpertReview}
                                disabled={isSending || isSent}
                                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 transition-all 
                   ${isSent
                                        ? "bg-green-50 text-green-600 border border-green-200"
                                        : "bg-white text-[#FF5A5F] border border-[#FF5A5F] hover:bg-rose-50 active:scale-95"}`}
                            >
                                {isSending ? (
                                    <><Loader2 className="animate-spin" size={20} /> 전송 중...</>
                                ) : isSent ? (
                                    <><CheckCircle size={20} /> 점검 요청 완료!</>
                                ) : (
                                    <><Mail size={20} /> 전문가에게 점검 받기 (이메일)</>
                                )}
                            </button>

                            {/* 2. 카카오톡 상담 (복사 기능 추가됨) */}
                            <button
                                onClick={handleKakaoChat}
                                className="w-full bg-[#FAE100] text-[#371D1E] py-4 rounded-2xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-[#FCE620]"
                            >
                                <MessageCircle size={20} />
                                카카오톡으로 상담하기
                            </button>
                            <p className="text-xs text-center text-gray-400 -mt-1 pb-2">
                                * 클릭 시 여행 계획이 자동으로 복사됩니다.
                            </p>

                            {/* 3. PDF 저장 */}
                            <button
                                onClick={handleDownload}
                                className="w-full bg-[#FF5A5F] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-rose-200 flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-[#FF4046]"
                            >
                                <Download size={20} />
                                계획 저장하기 (PDF)
                            </button>

                        </div>

                    </div>
                </div>

            </motion.div>

            <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        details summary::-webkit-details-marker { display: none; }
        details summary { list-style: none; }
        details[open] summary { margin-bottom: 10px; }
        
        @media print {
          body { background: white; }
          .max-w-\[420px\] { max-width: 100% !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; min-height: auto !important; }
          .print\\:hidden { display: none !important; }
          .sticky { position: static !important; }
          .overflow-y-auto { overflow: visible !important; }
          .bg-black\/20 { background-color: transparent !important; color: black !important; }
        }
      `}</style>
        </div>
    );
}