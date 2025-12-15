"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, ChevronLeft, Share2, MapPin, MessageCircle, Mail, Copy } from "lucide-react";

export default function AIResult({ data, userInfo, bgImage }) {

    // ✅ 복사용 텍스트 생성
    const generateClipboardText = () => {
        return `
✈️ [My Trip Pro] AI 맞춤 여행 계획

📍 여행지: ${userInfo?.destination}
📅 일정: ${userInfo?.startDate} ~ ${userInfo?.endDate}
👥 인원: ${userInfo?.people}명
💰 예산: ${userInfo?.budget}만원

${data} 
`;
    };

    const handleDownload = () => {
        window.print();
    };

    const handleShare = async () => {
        // ... (공유 기능 기존 동일)
        const shareText = generateClipboardText();
        if (navigator.share) {
            try { await navigator.share({ title: `${userInfo?.destination} 여행 계획`, text: shareText }); }
            catch (error) { console.log('공유 실패:', error); }
        } else {
            try { await navigator.clipboard.writeText(shareText); alert("여행 계획이 복사되었습니다!"); }
            catch (err) { alert("복사 실패"); }
        }
    };

    const handleKakaoChat = async () => {
        // ... (카톡 기능 기존 동일)
        const text = generateClipboardText();
        try { await navigator.clipboard.writeText(text); alert("📋 여행 계획이 복사되었습니다!\n카카오톡 채팅방에 '붙여넣기' 해주세요."); }
        catch (err) { console.error(err); }
        window.open('http://pf.kakao.com/_xcJhrn/chat', '_blank');
    };

    // ✅ [수정 1] 이미지 소스 변경 (AI 생성 -> Unsplash 실제 사진 검색)
    // destination이 있으면 그것으로, 없으면 'luxury travel'로 검색
    const searchKeyword = userInfo?.destination ? encodeURIComponent(userInfo.destination) : 'luxury travel';
    // source.unsplash.com은 키워드에 맞는 실제 고퀄리티 사진을 제공합니다.
    const headerImageSrc = `https://source.unsplash.com/featured/?${searchKeyword},travel,scenery`;


    // ✅ [수정 2] 이메일 링크 미리 생성 (버튼 클릭 이벤트 대신 a 태그 사용)
    const mailSubject = encodeURIComponent(`[여행문의] ${userInfo?.destination} 여행 견적 요청`);
    const mailBody = encodeURIComponent(generateClipboardText());
    const mailtoLink = `mailto:support@mytrip.pro?subject=${mailSubject}&body=${mailBody}`;


    return (
        <div className="min-h-screen w-full flex justify-center bg-gray-100 sm:p-8 font-sans relative">
            {/* 배경 이미지는 유지 */}
            {bgImage && (
                <img src={bgImage} alt="Travel Background" className="absolute inset-0 w-full h-full object-cover z-0 opacity-50" />
            )}

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[480px] bg-white sm:rounded-[40px] shadow-2xl overflow-hidden relative flex flex-col z-10 h-[95vh]"
            >
                {/* 🏞️ 헤더 영역 */}
                <div className="relative h-72 shrink-0">
                    <img
                        src={headerImageSrc}
                        alt="Destination"
                        className="w-full h-full object-cover"
                        // 로딩 실패시 기본 이미지
                        onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=800"; }}
                    />
                    <div className="absolute inset-0 bg-linearto-t from-black/80 via-transparent to-transparent" />

                    {/* 상단 네비게이션 (기존 동일) */}
                    <div className="absolute top-0 left-0 right-0 p-6 pt-8 flex justify-between text-white z-20">
                        <div className="bg-black/20 backdrop-blur-md p-2 rounded-full cursor-pointer hover:bg-black/30 transition" onClick={() => window.location.reload()}>
                            <ChevronLeft className="w-6 h-6" />
                        </div>
                        <div className="bg-black/20 backdrop-blur-md p-2 rounded-full cursor-pointer hover:bg-black/30 transition" onClick={handleShare}>
                            <Share2 className="w-5 h-5" />
                        </div>
                    </div>

                    {/* 타이틀 텍스트 (기존 동일) */}
                    <div className="absolute bottom-6 left-6 right-6 text-white z-20">
                        <span className="bg-[#FF5A5F] px-3 py-1 rounded-full text-xs font-bold shadow-lg mb-2 inline-block">D-Day 맞춤 일정</span>
                        <h1 className="text-3xl font-extrabold shadow-black drop-shadow-md leading-tight">
                            {userInfo?.destination} <span className="font-light text-gray-200">여행</span>
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-gray-200 mt-2 font-medium">
                            <MapPin size={14} /> {userInfo?.tourType} · {userInfo?.people}명 · {userInfo?.budget}만원
                        </div>
                    </div>
                </div>

                {/* 📝 본문 영역 */}
                <div className="flex-1 overflow-y-auto bg-white -mt-6 rounded-t-[30px] relative z-10 px-6 pt-8 pb-20">
                    <article className="prose prose-sm prose-slate max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4 border-b pb-2 border-gray-100" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-[#FF5A5F] mt-8 mb-3 flex items-center gap-2" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-gray-800 mt-6 mb-2 bg-gray-50 p-3 rounded-xl border-l-4 border-[#FF5A5F]" {...props} />,
                                strong: ({ node, ...props }) => <strong className="text-[#FF5A5F] font-extrabold" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-none space-y-3 my-4 pl-1" {...props} />,
                                li: ({ node, children, ...props }) => (
                                    <li className="flex gap-3 text-gray-600 text-[15px] leading-relaxed" {...props}>
                                        <span className="text-[#FF5A5F] mt-1.5 shrink-0">•</span>
                                        <span>{children}</span>
                                    </li>
                                ),
                                p: ({ node, ...props }) => <p className="mb-4 text-gray-600 leading-relaxed" {...props} />,
                                hr: ({ node, ...props }) => <hr className="my-8 border-gray-200" {...props} />
                            }}
                        >
                            {data}
                        </ReactMarkdown>
                    </article>

                    {/* ✅ 하단 액션 버튼 (수정됨) */}
                    <div className="mt-10 flex flex-col gap-3">
                        <button onClick={handleKakaoChat} className="w-full bg-[#FAE100] text-[#371D1E] py-4 rounded-xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 hover:bg-[#FCE620] transition-colors">
                            <MessageCircle size={20} /> 카카오톡 상담하기
                        </button>

                        <div className="flex gap-3">
                            {/* ✅ [수정 2 적용] button 태그를 a 태그로 변경하여 mailto 연결 */}
                            <a href={mailtoLink} className="flex-1 bg-gray-800 text-white py-4 rounded-xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors cursor-pointer">
                                <Mail size={20} /> 전문가 문의
                            </a>
                            <button onClick={handleDownload} className="flex-1 border border-gray-200 text-gray-600 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                                <Download size={20} /> PDF 저장
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}