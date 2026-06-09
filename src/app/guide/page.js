"use client";

import { useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import { ChevronLeft, Sparkles, Coins, Download, Users, Zap, CheckCircle, MapPin, BrainCircuit } from "lucide-react";

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
        <div className="min-h-screen bg-[#F8F9FD] font-sans relative overflow-hidden">
            {/* 배경 데코레이션 */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-brand-primary/10 via-brand-secondary/5 to-transparent -z-10" />

            {/* 상단 네비게이션 */}
            <div className="px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-[#F8F9FD]/80 backdrop-blur-md">
                <button onClick={() => router.back()} className="text-gray-500 hover:text-black transition p-1 bg-white rounded-full shadow-sm border border-gray-100">
                    <ChevronLeft size={24} />
                </button>
                <span className="font-bold text-gray-800">사용 가이드</span>
                <div className="w-8"></div>
            </div>

            <div className="max-w-md mx-auto px-6 pb-32 pt-4">

                {/* 헤더 영역 */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10 text-center"
                >
                    <span className="inline-flex items-center gap-1 py-1 px-3 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold mb-4 animate-pulse">
                        <Zap size={12} fill="currentColor" /> My Trip Pro 100% 활용법
                    </span>
                    <h1 className="text-3xl font-black text-gray-900 leading-tight mb-3">
                        검색 없이 3초 완성!<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">AI 여행 플래너</span> 사용법
                    </h1>
                    <p className="text-gray-500 text-sm">
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
                        <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                        <div className="relative bg-white rounded-3xl p-6 shadow-lg border border-gray-100 ml-4">
                            <div className="absolute -left-[27px] top-6 w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-xs shadow-md z-10">1</div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl">
                                    <Sparkles size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">3초 만에 일정 생성하기</h3>
                            </div>

                            <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
                                <p className="flex items-start gap-2">
                                    <CheckCircle size={16} className="text-brand-primary/80 mt-0.5 shrink-0" />
                                    <span><span className="font-bold text-gray-800">&quot;어디로 가세요?&quot;</span> 입력창에 도시 이름만 넣으세요. (예: 오사카, 다낭, 파리)</span>
                                </p>
                                <p className="flex items-start gap-2">
                                    <CheckCircle size={16} className="text-brand-primary/80 mt-0.5 shrink-0" />
                                    <span>누구와 가는지, 어떤 스타일(힐링/먹방 등)인지 고르면 끝!</span>
                                </p>
                                <div className="bg-brand-primary/5 p-3 rounded-xl text-xs font-medium text-brand-primary mt-2">
                                    🤖 AI가 동선, 맛집, 숙소까지 완벽한 일정을 단 3초 만에 짜드립니다.
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Step 2 */}
                    <motion.div variants={fadeInUp} className="relative">
                        <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                        <div className="relative bg-white rounded-3xl p-6 shadow-lg border border-gray-100 ml-4">
                            <div className="absolute -left-[27px] top-6 w-6 h-6 rounded-full bg-brand-accent text-white flex items-center justify-center font-bold text-xs shadow-md z-10">2</div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-brand-accent/10 text-brand-accent rounded-2xl">
                                    <Coins size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">여행 전 포인트 쌓기</h3>
                            </div>

                            <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
                                <p className="flex items-start gap-2">
                                    <BrainCircuit size={16} className="text-brand-accent/80 mt-0.5 shrink-0" />
                                    <span><span className="font-bold text-gray-800">매일 퀴즈:</span> 여행지 상식 퀴즈를 풀고 포인트를 모으세요.</span>
                                </p>
                                <p className="flex items-start gap-2">
                                    <MapPin size={16} className="text-brand-accent/80 mt-0.5 shrink-0" />
                                    <span><span className="font-bold text-gray-800">출석 체크:</span> 매일 들어오기만 해도 여행 지원금이 차곡차곡!</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                    * 모은 포인트는 추후 여행 상품권 등으로 교환 가능합니다. (오픈 예정)
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Step 3 */}
                    <motion.div variants={fadeInUp} className="relative">
                        <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                        <div className="relative bg-white rounded-3xl p-6 shadow-lg border border-gray-100 ml-4">
                            <div className="absolute -left-[27px] top-6 w-6 h-6 rounded-full bg-brand-secondary text-white flex items-center justify-center font-bold text-xs shadow-md z-10">3</div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-brand-secondary/10 text-brand-secondary rounded-2xl">
                                    <Download size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">앱처럼 편하게 쓰기</h3>
                            </div>

                            <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
                                <p>매번 검색해서 들어오지 마세요. 🙅‍♂️</p>
                                <div className="bg-gray-100 p-4 rounded-xl">
                                    <p className="font-bold text-gray-800 mb-1">📲 설치 방법</p>
                                    <p className="text-xs">브라우저 메뉴에서 <span className="font-bold text-brand-secondary">&apos;홈 화면에 추가&apos;</span> 또는 <span className="font-bold text-brand-secondary">&apos;앱 설치&apos;</span>를 누르세요.</p>
                                </div>
                                <p className="text-xs text-gray-500">
                                    스마트폰 바탕화면에 아이콘이 생겨 언제든 1초 만에 접속할 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Step 4 */}
                    <motion.div variants={fadeInUp} className="relative">
                        {/* 마지막 라인은 없음 */}
                        <div className="relative bg-gradient-to-br from-brand-primary/5 to-white rounded-3xl p-6 shadow-lg border border-brand-primary/10 ml-4">
                            <div className="absolute -left-[27px] top-6 w-6 h-6 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold text-xs shadow-md z-10">4</div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl">
                                    <Users size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">친구 초대하고 무한 적립</h3>
                            </div>

                            <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
                                <p>혼자 쓰기 아깝다면?</p>
                                <p>
                                    <span className="font-bold text-gray-800 bg-white border border-gray-200 px-2 py-0.5 rounded">마이페이지 &gt; 링크 복사하기</span>를 눌러 공유하세요.
                                </p>
                                <div className="bg-white p-3 rounded-xl border border-brand-primary/10 shadow-sm text-center">
                                    <p className="text-brand-primary font-bold mb-1">🎁 초대 혜택</p>
                                    <p className="text-gray-800 font-medium">
                                        친구도 <span className="text-brand-primary font-black">1,000P</span>, 나도 <span className="text-brand-primary font-black">1,000P</span>
                                    </p>
                                </div>
                                <p className="text-xs text-center text-gray-400">5명만 초대해도 커피 한 잔 값! ☕</p>
                            </div>
                        </div>
                    </motion.div>

                </motion.div>

                {/* 하단 CTA 버튼 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white/95 to-transparent z-40"
                >
                    <button
                        onClick={() => router.push('/')}
                        className="w-full max-w-md mx-auto py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-brand-primary/10 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Sparkles size={20} className="text-yellow-400" /> 지금 바로 여행 만들기
                    </button>
                </motion.div>

            </div>
        </div>
    );
}