"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from 'react-markdown'; // ✅ 마크다운 번역기
import remarkGfm from 'remark-gfm'; // ✅ 표, 리스트 지원
import { Download, ChevronLeft, Share2, Heart, MapPin, Mail, MessageCircle, CheckCircle, Loader2, Copy } from "lucide-react";

export default function AIResult({ data, userInfo, bgImage }) {

    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);

    // ✅ 복사용 텍스트 생성 (마크다운 기호 제거하고 순수 텍스트만 추출)
    const generateClipboardText = () => {
        return `
✈️ [My Trip Pro] AI 맞춤 여행 계획

📍 여행지: ${userInfo?.destination}
📅 일정: ${userInfo?.startDate} ~ ${userInfo?.endDate}
👥 인원: ${userInfo?.people}명
💰 예산: ${userInfo?.budget}만원

${data} 
(상세 내용은 링크를 확인하세요!)
`;
    };

    const handleDownload = () => {
        window.print();
    };

    const handleShare = async () => {
        const shareText = generateClipboardText();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${userInfo?.destination} 여행 계획`,
                    text: shareText,
                });
            } catch (error) { console.log('공유 실패:', error); }
        } else {
            try {
                await navigator.clipboard.writeText(shareText);
                alert("여행 계획이 복사되었습니다!");
            } catch (err) { alert("복사 실패"); }
        }
    };

    const handleKakaoChat = async () => {
        const text = generateClipboardText();
        try {
            await navigator.clipboard.writeText(text);
            alert("📋 여행 계획이 복사되었습니다!\n상담 채팅방에 '붙여넣기' 해주세요.");
        } catch (err) { console.error(err); }
        window.open('http://pf.kakao.com/_xcJhrn/chat', '_blank');
    };

    // 이메일 전송 함수 (기존 로직 유지)
    const handleExpertReview = async () => {
        // ... (기존과 동일하므로 생략, 필요시 이전 코드 그대로 사용)
        alert("기능 준비 중입니다!");
    };

    const destinationKeyword = userInfo?.destination ? encodeURIComponent(userInfo.destination) : "travel";
    const headerImageSrc = `https://loremflickr.com/800/600/${destinationKeyword},landscape/all`;

    return (
        <div className="min-h-screen w-full flex justify-center bg-gray-100 sm:p-8 font-sans relative">

            {bgImage && (
                <img src={bgImage} alt="Travel Background" className="absolute inset-0 w-full h-full object-cover z-0 opacity-50" />
            )}

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[480px] bg-white sm:rounded-[40px] shadow-2xl overflow-hidden relative flex flex-col z-10 h-[95vh]"
            >
                {/* 헤더 영역 */}
                <div className="relative h-64 shrink-0">
                    <img src={headerImageSrc} alt="Destination" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-linearto-t from-black/80 via-transparent to-transparent" />

                    <div className="absolute top-0 left-0 right-0 p-6 pt-8 flex justify-between text-white z-20">
                        <div className="bg-white/20 backdrop-blur-md p-2 rounded-full cursor-pointer hover:bg-white/30" onClick={() => window.location.reload()}>
                            <ChevronLeft className="w-6 h-6" />
                        </div>
                        <div className="flex gap-3">
                            <div className="bg-white/20 backdrop-blur-md p-2 rounded-full cursor-pointer hover:bg-white/30" onClick={handleShare}>
                                <Share2 className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-6 left-6 text-white z-20">
                        <span className="bg-[#FF5A5F] px-3 py-1 rounded-full text-xs font-bold mb-2 inline-block">D-Day</span>
                        <h1 className="text-3xl font-extrabold shadow-black drop-shadow-lg">
                            {userInfo?.destination} <span className="font-light text-gray-200">여행</span>
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-gray-200 mt-1">
                            <MapPin size={14} /> {userInfo?.tourType} · {userInfo?.people}명
                        </div>
                    </div>
                </div>

                {/* ✅ 여기가 핵심! 디자인이 적용되는 본문 영역 */}
                <div className="flex-1 overflow-y-auto bg-white -mt-6 rounded-t-[30px] relative z-10 px-6 pt-8 pb-20">

                    {/* 마크다운 렌더링 컴포넌트 */}
                    <article className="prose prose-sm prose-slate max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                // 1. 제목 스타일링 (###)
                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4 border-b pb-2 border-gray-100" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-[#FF5A5F] mt-8 mb-3 flex items-center gap-2" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-gray-800 mt-6 mb-2 bg-gray-50 p-2 rounded-lg border-l-4 border-[#FF5A5F]" {...props} />,

                                // 2. 강조 스타일링 (**)
                                strong: ({ node, ...props }) => <strong className="text-[#FF5A5F] font-extrabold" {...props} />,

                                // 3. 리스트 스타일링 (*)
                                ul: ({ node, ...props }) => <ul className="list-none space-y-2 my-4 pl-1" {...props} />,
                                li: ({ node, children, ...props }) => (
                                    <li className="flex gap-2 text-gray-600 text-[15px] leading-relaxed" {...props}>
                                        <span className="text-[#FF5A5F] mt-1.5">•</span>
                                        <span>{children}</span>
                                    </li>
                                ),
                                // 4. 줄바꿈 처리
                                p: ({ node, ...props }) => <p className="mb-4 text-gray-600 leading-relaxed" {...props} />,
                            }}
                        >
                            {data}
                        </ReactMarkdown>
                    </article>

                    {/* 하단 액션 버튼들 */}
                    <div className="mt-10 flex flex-col gap-3">
                        <button onClick={handleKakaoChat} className="w-full bg-[#FAE100] text-[#371D1E] py-4 rounded-xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 hover:bg-[#FCE620]">
                            <MessageCircle size={20} /> 카카오톡 상담하기
                        </button>
                        <button onClick={handleDownload} className="w-full border border-gray-200 text-gray-600 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-gray-50">
                            <Download size={20} /> PDF 저장
                        </button>
                    </div>
                </div>

            </motion.div>
        </div>
    );
}