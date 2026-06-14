"use client";

import { useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import { ChevronLeft, Sparkles, Coins, Download, Users, Zap, CheckCircle, MapPin, BrainCircuit } from "lucide-react";
import SunSceneBackground from '../../components/SunSceneBackground';

export default function GuidePage() {
    const router = useRouter();

    // 애니메이션 설정
    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    const container = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#121212] text-white font-sans relative overflow-hidden flex justify-center">
            {/* 메인 모바일형 래퍼 컨테이너 (My Page 등과 동일한 너비로 설정하여 일관성 유지) */}
            <div className="w-full max-w-[560px] min-h-screen relative border-x border-white/10 shadow-2xl flex flex-col bg-[#121212] overflow-y-auto pb-36">
                
                {/* 태양 및 산 그라데이션 배경 */}
                <SunSceneBackground scene="mountain" />

                {/* 상단 네비게이션 */}
                <div className="px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-[#121212]/60 backdrop-blur-md border-b border-white/10 shrink-0">
                    <button 
                        onClick={() => router.back()} 
                        className="text-slate-300 hover:text-white transition p-2 bg-white/5 rounded-full shadow-sm border border-white/10 active:scale-95 cursor-pointer"
                    >
                        <ChevronLeft size={20} strokeWidth={2.5} />
                    </button>
                    <span className="font-bold text-white text-base">사용 가이드</span>
                    <div className="w-9"></div>
                </div>

                <div className="px-6 pt-8 relative z-10 flex-1">

                    {/* 헤더 영역 */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10 text-center"
                    >
                        <span className="inline-flex items-center gap-1.5 py-1 px-3.5 rounded-full bg-brand-primary/20 text-brand-primary text-xs font-black mb-4 animate-pulse border border-brand-primary/30">
                            <Zap size={12} fill="currentColor" /> My Trip Pro 100% 활용법
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">
                            검색 없이 3초 완성!<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">AI 여행 플래너</span> 사용법
                        </h1>
                        <p className="text-slate-400 text-xs sm:text-sm font-medium">
                            복잡한 계획은 AI에게 맡기고,<br />설레는 마음만 챙겨서 떠나세요.
                        </p>
                    </motion.div>

                    {/* 단계별 가이드 리스트 */}
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="visible"
                        className="space-y-8"
                    >
                        {/* Step 1 */}
                        <motion.div variants={fadeInUp} className="relative">
                            <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-white/10"></div>
                            <div className="relative bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 ml-4 shadow-xl">
                                <div className="absolute -left-[27px] top-6 w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-xs shadow-md z-10 border border-white/20">1</div>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-brand-primary/20 text-brand-primary rounded-2xl border border-brand-primary/10">
                                        <Sparkles size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">3초 만에 일정 생성하기</h3>
                                </div>

                                <div className="space-y-3 text-slate-300 text-sm leading-relaxed font-medium">
                                    <p className="flex items-start gap-2">
                                        <CheckCircle size={16} className="text-brand-primary mt-0.5 shrink-0" />
                                        <span><span className="font-bold text-white">&quot;어디로 가세요?&quot;</span> 입력창에 도시 이름만 넣으세요. (예: 오사카, 다낭, 파리)</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <CheckCircle size={16} className="text-brand-primary mt-0.5 shrink-0" />
                                        <span>누구와 가는지, 어떤 스타일(힐링/먹방 등)인지 고르면 끝!</span>
                                    </p>
                                    <div className="bg-brand-primary/10 p-3.5 rounded-2xl text-xs font-semibold text-brand-primary mt-2 border border-brand-primary/20">
                                        🤖 AI가 동선, 맛집, 숙소까지 완벽한 일정을 단 3초 만에 짜드립니다.
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Step 2 */}
                        <motion.div variants={fadeInUp} className="relative">
                            <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-white/10"></div>
                            <div className="relative bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 ml-4 shadow-xl">
                                <div className="absolute -left-[27px] top-6 w-6 h-6 rounded-full bg-brand-accent text-white flex items-center justify-center font-bold text-xs shadow-md z-10 border border-white/20">2</div>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-brand-accent/20 text-brand-accent rounded-2xl border border-brand-accent/10">
                                        <Coins size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">여행 전 포인트 쌓기</h3>
                                </div>

                                <div className="space-y-3 text-slate-300 text-sm leading-relaxed font-medium">
                                    <p className="flex items-start gap-2">
                                        <BrainCircuit size={16} className="text-brand-accent mt-0.5 shrink-0" />
                                        <span><span className="font-bold text-white">매일 퀴즈:</span> 여행지 상식 퀴즈를 풀고 포인트를 모으세요.</span>
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <MapPin size={16} className="text-brand-accent mt-0.5 shrink-0" />
                                        <span><span className="font-bold text-white">출석 체크:</span> 매일 들어오기만 해도 여행 지원금이 차곡차곡!</span>
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2 font-semibold">
                                        * 모은 포인트는 추후 여행 상품권 등으로 교환 가능합니다. (오픈 예정)
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Step 3 */}
                        <motion.div variants={fadeInUp} className="relative">
                            <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-white/10"></div>
                            <div className="relative bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 ml-4 shadow-xl">
                                <div className="absolute -left-[27px] top-6 w-6 h-6 rounded-full bg-brand-secondary text-white flex items-center justify-center font-bold text-xs shadow-md z-10 border border-white/20">3</div>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-brand-secondary/20 text-brand-secondary rounded-2xl border border-brand-secondary/10">
                                        <Download size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">앱처럼 편하게 쓰기</h3>
                                </div>

                                <div className="space-y-3 text-slate-300 text-sm leading-relaxed font-medium">
                                    <p>매번 검색해서 들어오지 마세요. 🙅‍♂️</p>
                                    <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                        <p className="font-bold text-white mb-1">📲 설치 방법</p>
                                        <p className="text-xs text-slate-300 leading-normal">브라우저 메뉴에서 <span className="font-bold text-brand-secondary">&apos;홈 화면에 추가&apos;</span> 또는 <span className="font-bold text-brand-secondary">&apos;앱 설치&apos;</span>를 누르세요.</p>
                                    </div>
                                    <p className="text-xs text-slate-400 font-semibold">
                                        스마트폰 바탕화면에 아이콘이 생겨 언제든 1초 만에 접속할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Step 4 */}
                        <motion.div variants={fadeInUp} className="relative">
                            <div className="relative bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 ml-4 shadow-xl">
                                <div className="absolute -left-[27px] top-6 w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-xs shadow-md z-10 border border-white/20">4</div>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-brand-primary/20 text-brand-primary rounded-2xl border border-brand-primary/10">
                                        <Users size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">친구 초대하고 무한 적립</h3>
                                </div>

                                <div className="space-y-3 text-slate-300 text-sm leading-relaxed font-medium">
                                    <p>혼자 쓰기 아깝다면?</p>
                                    <p>
                                        <span className="font-bold text-white bg-white/10 border border-white/10 px-2.5 py-1 rounded-lg text-xs">마이페이지 &gt; 링크 복사하기</span>를 눌러 공유하세요.
                                    </p>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-sm text-center">
                                        <p className="text-brand-primary font-black mb-1">🎁 초대 혜택</p>
                                        <p className="text-white font-bold">
                                            친구도 <span className="text-brand-primary font-black">1,000P</span>, 나도 <span className="text-brand-primary font-black">1,000P</span>
                                        </p>
                                    </div>
                                    <p className="text-xs text-center text-slate-400 font-semibold">5명만 초대해도 커피 한 잔 값! ☕</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                </div>

                {/* 하단 CTA 버튼 */}
                <div
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[512px] px-6 z-40"
                >
                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-4 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-[24px] font-black text-lg shadow-xl shadow-brand-primary/20 hover:scale-102 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Sparkles size={20} className="text-yellow-400 fill-yellow-400" /> 지금 바로 여행 만들기
                    </button>
                </div>

            </div>
        </div>
    );
}