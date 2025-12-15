"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, ChevronLeft, Share2, MapPin, MessageCircle, Mail, Loader2 } from "lucide-react";

export default function AIResult({ data, userInfo, bgImage }) {

    // 메일 전송 중인지 확인하는 상태 (로딩바 표시용)
    const [isSending, setIsSending] = useState(false);

    // ✅ 복사용 텍스트 생성
    const generateClipboardText = () => {
        return `
✈️ [My Trip Pro] AI 맞춤 여행 계획
📍 여행지: ${userInfo?.destination}
📅 일정: ${userInfo?.startDate} ~ ${userInfo?.endDate}
👥 인원: ${userInfo?.people}명
💰 예산: ${userInfo?.budget}만원

${data}`;
    };

    // ✅ [핵심 기능] 버튼 누르면 서버(API)로 전송 요청
    const handleExpertReview = async () => {
        if (!confirm("전문가에게 상세 견적을 요청하시겠습니까?")) return;

        setIsSending(true); // 로딩 시작
        try {
            const response = await fetch("/api/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    destination: userInfo?.destination,
                    period: `${userInfo?.startDate} ~ ${userInfo?.endDate}`,
                    people: userInfo?.people,
                    budget: userInfo?.budget,
                    contact: userInfo?.contact,
                    plan: data,
                }),
            });

            if (response.ok) {
                alert("✅ 견적 요청이 발송되었습니다!\n메일함을 확인해주세요.");
            } else {
                alert("❌ 전송 실패: 잠시 후 다시 시도해주세요.");
            }
        } catch (error) {
            console.error(error);
            alert("서버 오류가 발생했습니다.");
        } finally {
            setIsSending(false); // 로딩 끝
        }
    };

    const handleDownload = () => window.print();

    const handleShare = async () => {
        const shareText = generateClipboardText();
        if (navigator.share) {
            try { await navigator.share({ title: `${userInfo?.destination} 여행 계획`, text: shareText }); } catch (e) { }
        } else {
            try { await navigator.clipboard.writeText(shareText); alert("복사되었습니다!"); } catch (e) { }
        }
    };

    const handleKakaoChat = async () => {
        try { await navigator.clipboard.writeText(generateClipboardText()); alert("내용이 복사되었습니다! 채팅방에 붙여넣어주세요."); } catch (e) { }
        window.open('http://pf.kakao.com/_xcJhrn/chat', '_blank');
    };

    // 이미지 설정 (Unsplash 실제 사진 사용)
    const searchKeyword = userInfo?.destination ? encodeURIComponent(userInfo.destination) : 'luxury travel';
    const headerImageSrc = `https://source.unsplash.com/featured/?${searchKeyword},travel,scenery`;

    return (
        <div className="min-h-screen w-full flex justify-center bg-gray-100 sm:p-8 font-sans relative">
            {bgImage && <img src={bgImage} alt="Background" className="absolute inset-0 w-full h-full object-cover z-0 opacity-50" />}

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[480px] bg-white sm:rounded-[40px] shadow-2xl overflow-hidden relative flex flex-col z-10 h-[95vh]">
                {/* 헤더 영역 */}
                <div className="relative h-72 shrink-0">
                    <img src={headerImageSrc} alt="Destination" className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=800"; }} />
                    <div className="absolute inset-0 bg-linearto-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute top-0 left-0 right-0 p-6 pt-8 flex justify-between text-white z-20">
                        <div onClick={() => window.location.reload()} className="bg-black/20 backdrop-blur-md p-2 rounded-full cursor-pointer"><ChevronLeft className="w-6 h-6" /></div>
                        <div onClick={handleShare} className="bg-black/20 backdrop-blur-md p-2 rounded-full cursor-pointer"><Share2 className="w-5 h-5" /></div>
                    </div>
                    <div className="absolute bottom-6 left-6 right-6 text-white z-20">
                        <span className="bg-[#FF5A5F] px-3 py-1 rounded-full text-xs font-bold shadow-lg mb-2 inline-block">D-Day 맞춤 일정</span>
                        <h1 className="text-3xl font-extrabold shadow-black drop-shadow-md leading-tight">{userInfo?.destination} <span className="font-light text-gray-200">여행</span></h1>
                        <div className="flex items-center gap-2 text-sm text-gray-200 mt-2 font-medium"><MapPin size={14} /> {userInfo?.tourType} · {userInfo?.people}명 · {userInfo?.budget}만원</div>
                    </div>
                </div>

                {/* 본문 영역 */}
                <div className="flex-1 overflow-y-auto bg-white -mt-6 rounded-t-[30px] relative z-10 px-6 pt-8 pb-20">
                    <article className="prose prose-sm prose-slate max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                            h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4 border-b pb-2 border-gray-100" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-[#FF5A5F] mt-8 mb-3 flex items-center gap-2" {...props} />,
                            strong: ({ node, ...props }) => <strong className="text-[#FF5A5F] font-extrabold" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-none space-y-3 my-4 pl-1" {...props} />,
                            li: ({ node, children, ...props }) => (<li className="flex gap-3 text-gray-600 text-[15px] leading-relaxed" {...props}><span className="text-[#FF5A5F] mt-1.5 shrink-0">•</span><span>{children}</span></li>),
                        }}>{data}</ReactMarkdown>
                    </article>

                    {/* ✅ 하단 버튼 영역 */}
                    <div className="mt-10 flex flex-col gap-3">
                        <button onClick={handleKakaoChat} className="w-full bg-[#FAE100] text-[#371D1E] py-4 rounded-xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 hover:bg-[#FCE620]">
                            <MessageCircle size={20} /> 카카오톡 상담하기
                        </button>
                        <div className="flex gap-3">
                            {/* 여기가 핵심입니다. 로딩 중일 때 버튼 비활성화 기능 포함 */}
                            <button
                                onClick={handleExpertReview}
                                disabled={isSending}
                                className="flex-1 bg-gray-800 text-white py-4 rounded-xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors disabled:bg-gray-400"
                            >
                                {isSending ? <Loader2 className="animate-spin" /> : <Mail size={20} />}
                                {isSending ? "전송 중" : "전문가 문의"}
                            </button>
                            <button onClick={handleDownload} className="flex-1 border border-gray-200 text-gray-600 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-gray-50">
                                <Download size={20} /> PDF 저장
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}