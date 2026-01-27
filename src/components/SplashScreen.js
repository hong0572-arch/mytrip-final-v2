'use client';

import { motion } from "framer-motion";
import DogMascot from './DogMascot';

export default function SplashScreen({ onFinish }) {
    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
        >
            {/* 1. 배경 이미지 (밝고 또렷하게 수정됨) */}
            <div className="absolute inset-0 z-0">
                <img
                    // ✨ 더 밝고 선명한 이미지로 교체
                    src="/bgt.jpg"
                    alt="Intro Background"
                    className="w-full h-full object-cover scale-110 animate-kenburns" // 켄번 효과는 유지
                    style={{ animation: "kenburns 3s ease-out forwards" }}
                />
                {/* ✨ [수정핵심] 흐림(blur) 제거하고, 어두운 막을 아주 옅게(10%) 변경하여 선명도 극대화 */}
                <div className="absolute inset-0 bg-black/10" />
            </div>

            {/* 2. 로고 및 텍스트 콘텐츠 */}
            <div className="relative z-10 flex flex-col items-center gap-6 px-4">
                {/* 마스코트 컨테이너: 배경이 밝아져서 유리 효과를 조금 더 진하게 수정 */}
                <motion.div
                    initial={{ scale: 0.5, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "backOut" }}
                    className="bg-black/30 p-6 rounded-full backdrop-blur-md shadow-2xl border border-white/10"
                >
                    <motion.img
                        // ❗ public 폴더에 cat-mascot.png 파일이 있어야 합니다!
                        src="/cat.png"
                        alt="Cat Mascot"
                        className="w-32 h-32 object-contain drop-shadow-xl"
                        // 둥둥 떠다니는 애니메이션 추가
                        animate={{ y: [0, -10, 0] }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </motion.div>

                {/* 텍스트: 밝은 배경 대비 가독성을 위해 그림자 강화 */}
                <div className="text-center text-white space-y-2">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        // ✨ drop-shadow-xl 로 변경하여 그림자 강화
                        className="text-4xl font-black tracking-tighter drop-shadow-xl"
                    >
                        Trip Maker
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                        // ✨ drop-shadow-lg 로 변경하여 그림자 강화
                        className="text-lg font-medium text-gray-100 drop-shadow-lg"
                    >
                        나만의 특별한 여행을 시작하세요
                    </motion.p>
                </div>
            </div>

            {/* 3. 하단 로딩 바 */}
            <div className="absolute bottom-12 w-48 h-1.5 bg-black/30 rounded-full overflow-hidden z-10 backdrop-blur-sm">
                <motion.div
                    className="h-full bg-gradient-to-r from-[#FF5A5F] to-rose-400"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3.0, ease: "easeInOut" }}
                    onAnimationComplete={onFinish}
                />
            </div>

            <style jsx>{`
                @keyframes kenburns {
                    from { transform: scale(1.1); }
                    to { transform: scale(1.0); }
                }
            `}</style>
        </motion.div>
    );
}