"use client";

import { useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { motion } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, ChevronLeft, Share2, MapPin, MessageCircle, Mail, Loader2, Map as MapIcon, Image as ImageIcon } from "lucide-react";

// RouteMap dynamic import (SSR Disabled)
const RouteMap = dynamic(() => import("./RouteMap"), { ssr: false });

export default function AIResult({ data, userInfo, bgImage }) {
    const contentRef = useRef(null);

    // 메일 전송 상태 (로딩바)
    const [isSending, setIsSending] = useState(false);

    // ✅ 지도 보기 토글 상태 (기본값: 사진 모드)
    const [showMap, setShowMap] = useState(false);

    // ✅ 데이터 파싱 (Markdown vs JSON Map Data 분리)
    const { cleanMarkdown, mapData } = useMemo(() => {
        if (!data) return { cleanMarkdown: "", mapData: null };

        const splitMarker = "---MAP_DATA_START---";
        const endMarker = "---MAP_DATA_END---";

        if (data.includes(splitMarker)) {
            const [markdown, jsonPart] = data.split(splitMarker);
            try {
                // jsonPart에서 endMarker 제거
                let cleanJson = jsonPart.replace(endMarker, "").trim();

                // 혹시 모를 Markdown 코드 블럭 제거 (```json, ```)
                cleanJson = cleanJson.replace(/```json/g, "").replace(/```/g, "").trim();

                const parsedMap = JSON.parse(cleanJson);
                return { cleanMarkdown: markdown.trim(), mapData: parsedMap };
            } catch (e) {
                console.error("Map Data Parse Error:", e);
                return { cleanMarkdown: markdown.trim(), mapData: null };
            }
        }
        return { cleanMarkdown: data, mapData: null };
    }, [data]);


    // ✅ 복사용 텍스트 생성
    const generateClipboardText = () => {
        return `
✈️ [My Trip Pro] AI 맞춤 여행 계획
📍 여행지: ${userInfo?.destination}
📅 일정: ${userInfo?.startDate} ~ ${userInfo?.endDate}
👥 인원: ${userInfo?.people}명
💰 예산: ${userInfo?.budget}만원

${cleanMarkdown}`;
    };

    // ✅ [통합 1] 서버 API로 이메일 전송 (Nodemailer 연동)
    const handleExpertReview = async () => {
        if (!confirm("전문가에게 상세 견적을 요청하시겠습니까?")) return;

        setIsSending(true);
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
                    plan: cleanMarkdown,
                }),
            });

            if (response.ok) {
                alert(`✅ 견적 요청이 발송되었습니다!\n전문가 검토 후 최종본을 전달드리겠습니다.`);
            } else {
                alert("❌ 전송 실패: 잠시 후 다시 시도해주세요.");
            }
        } catch (error) {
            console.error(error);
            alert("서버 오류가 발생했습니다.");
        } finally {
            setIsSending(false);
        }
    };

    const handleDownload = async () => {
        if (!contentRef.current) return;

        try {
            // 1. 현재 컴포넌트를 복제 (화면에는 영향 없음)
            const element = contentRef.current;
            const clone = element.cloneNode(true);

            // 2. 복제본을 화면 밖으로 배치하고 스타일 강제 조정 (전체 높이 펼치기)
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '0';
            // 모바일 뷰 너비 유지 (중요)
            container.style.width = `${element.offsetWidth}px`;
            container.appendChild(clone);
            document.body.appendChild(container);

            // 복제본의 스크롤 제거 및 높이 자동 확장
            clone.style.height = 'auto';
            clone.style.overflow = 'visible';
            clone.style.maxHeight = 'none';

            // 내부 스크롤 영역도 찾아서 확장 (AIResult 구조에 맞게)
            const scrollableDiv = clone.querySelector('.overflow-y-auto');
            if (scrollableDiv) {
                scrollableDiv.style.height = 'auto';
                scrollableDiv.style.overflow = 'visible';
                scrollableDiv.style.maxHeight = 'none';
            }

            // Map 컨테이너가 있다면 강제로 렌더링 확보 (Leaflet 렌더링 대기)
            // html-to-image는 DOM 스냅샷이므로 Canvas 기반인 Leaflet을 찍으려면 
            // clone 노드가 DOM에 붙은 상태여야 함. (이미 붙였음)
            // 약간의 딜레이가 필요할 수도 있음 (타일 로딩 등).
            await new Promise(resolve => setTimeout(resolve, 800)); // 시간을 조금 더 넉넉하게

            // 3. 이미지 생성 (전체 높이)
            const dataUrl = await toPng(clone, { cacheBust: true, pixelRatio: 2 });

            // 4. 복제본 제거
            document.body.removeChild(container);

            // 5. PDF 생성 (내용 길이에 맞춰 페이지 크기 자동 조절)
            // A4 너비(210mm) 기준 높이 비율 계산
            const pdf = new jsPDF('p', 'mm', 'a4'); // 초기화용
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfWidth = 210; // A4 width
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // 긴 내용에 맞춰 PDF 페이지 크기를 동적으로 생성
            const longPdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: [pdfWidth, pdfHeight]
            });

            longPdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
            longPdf.save(`${userInfo?.destination || 'trip'}_full_plan.pdf`);
        } catch (error) {
            console.error('PDF Generate Failed:', error);
            alert(`PDF 생성 중 오류가 발생했습니다: ${error.message}`);
        }
    };

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

    // ✅ [통합 2] 이미지 소스 (Unsplash Source 복구)
    // 고객 요청: Unsplash에서 여행지에 맞는 이미지 가져오기
    // AI가 제안한 영문 키워드를 사용하여 정확도 향상
    const searchKeyword = mapData?.image_keyword
        ? encodeURIComponent(mapData.image_keyword)
        : (userInfo?.destination ? encodeURIComponent(userInfo.destination) : 'luxury travel');

    const headerImageSrc = `https://source.unsplash.com/featured/?${searchKeyword},travel,scenery`;

    return (
        <div className="min-h-screen w-full flex justify-center bg-gray-100 sm:p-8 font-sans relative">
            {bgImage && <img src={bgImage} alt="Background" className="absolute inset-0 w-full h-full object-cover z-0 opacity-50" />}

            <motion.div ref={contentRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[480px] bg-white sm:rounded-[40px] shadow-2xl overflow-hidden relative flex flex-col z-10 h-[95vh]">
                {/* 헤더 영역 (이미지 <-> 지도 토글) */}
                <div className="relative h-72 shrink-0 bg-gray-100">
                    {showMap && mapData ? (
                        <div className="w-full h-full">
                            <RouteMap data={mapData} className="w-full h-full rounded-none m-0" />
                        </div>
                    ) : (
                        <>
                            <img src={headerImageSrc} alt="Destination" className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=800"; }} />
                            <div className="absolute inset-0 bg-linearto-t from-black/80 via-transparent to-transparent" />
                        </>
                    )}

                    {/* 상단 버튼 (뒤로가기, 지도토글, 공유) */}
                    {/* pointer-events-none을 주어 지도 조작 방해 안하도록 하되, 버튼만 auto로 설정 */}
                    <div className="absolute top-0 left-0 right-0 p-6 pt-8 flex justify-between text-white z-20 pointer-events-none">
                        <div onClick={() => window.location.reload()} className="bg-black/20 backdrop-blur-md p-2 rounded-full cursor-pointer pointer-events-auto hover:bg-black/30 transition-all"><ChevronLeft className="w-6 h-6" /></div>

                        <div className="flex gap-2 pointer-events-auto">
                            {/* 🗺️ 지도 토글 버튼 (데이터 있을 때만 표시) */}
                            {mapData && (
                                <div onClick={() => setShowMap(!showMap)} className="bg-black/20 backdrop-blur-md p-2 rounded-full cursor-pointer hover:bg-black/30 transition-all">
                                    {showMap ? <ImageIcon className="w-5 h-5" /> : <MapIcon className="w-5 h-5" />}
                                </div>
                            )}
                            <div onClick={handleShare} className="bg-black/20 backdrop-blur-md p-2 rounded-full cursor-pointer hover:bg-black/30 transition-all"><Share2 className="w-5 h-5" /></div>
                        </div>
                    </div>

                    {/* 여행지 정보 (지도 모드일 때도 표시할지? -> 디자인 유지를 위해 표시하되 가독성 확보) */}
                    <div className={`absolute bottom-6 left-6 right-6 z-20 pointer-events-none transition-opacity duration-300 ${showMap ? 'opacity-0' : 'opacity-100'}`}>
                        <span className="bg-[#FF5A5F] px-3 py-1 rounded-full text-xs font-bold shadow-lg mb-2 inline-block text-white">D-Day 맞춤 일정</span>
                        <h1 className="text-3xl font-extrabold shadow-black drop-shadow-md leading-tight text-white">{userInfo?.destination} <span className="font-light text-gray-200">여행</span></h1>
                        <div className="flex items-center gap-2 text-sm text-gray-200 mt-2 font-medium"><MapPin size={14} /> {userInfo?.tourType} · {userInfo?.people}명 · {userInfo?.budget}만원</div>
                    </div>
                    {/* 지도 모드일 때는 하단에 살짝 그라데이션 주어서 둥근 모서리 느낌 살리기 */}
                    {showMap && <div className="absolute bottom-0 left-0 right-0 h-10 bg-linear-to-t from-black/10 to-transparent pointer-events-none"></div>}
                </div>

                {/* ✅ [통합 3] 본문 디자인 (마크다운 적용) */}
                <div className="flex-1 overflow-y-auto bg-white -mt-6 rounded-t-[30px] relative z-10 px-6 pt-8 pb-20">

                    {/* 본문에는 더이상 큰 지도를 표시하지 않음 (헤더로 이동했으므로) */}

                    <article className="prose prose-sm prose-slate max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                            h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4 border-b pb-2 border-gray-100" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-[#FF5A5F] mt-8 mb-3 flex items-center gap-2" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-gray-800 mt-6 mb-2 bg-gray-50 p-3 rounded-xl border-l-4 border-[#FF5A5F]" {...props} />,
                            strong: ({ node, ...props }) => <strong className="text-[#FF5A5F] font-extrabold" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-none space-y-3 my-4 pl-1" {...props} />,
                            li: ({ node, children, ...props }) => (<li className="flex gap-3 text-gray-600 text-[15px] leading-relaxed" {...props}><span className="text-[#FF5A5F] mt-1.5 shrink-0">•</span><span>{children}</span></li>),
                            hr: ({ node, ...props }) => <hr className="my-8 border-gray-200" {...props} />,
                            // 📍 빨간 핀 아이콘 추가 및 링크 스타일링
                            a: ({ node, ...props }) => (
                                <a className="text-blue-500 underline font-semibold hover:text-blue-700 inline-flex items-center gap-0.5" target="_blank" rel="noopener noreferrer" {...props}>
                                    <MapPin size={12} className="text-red-500 fill-red-500" />
                                    {props.children}
                                </a>
                            )
                        }}>{cleanMarkdown}</ReactMarkdown>
                    </article>

                    {/* 하단 버튼 영역 */}
                    <div className="mt-10 flex flex-col gap-3">
                        <button onClick={handleKakaoChat} className="w-full bg-[#FAE100] text-[#371D1E] py-4 rounded-xl font-bold text-lg shadow-sm flex items-center justify-center gap-2 hover:bg-[#FCE620]">
                            <MessageCircle size={20} /> 카카오톡 상담하기
                        </button>
                        <div className="flex gap-3">
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