"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

// Lottie는 클라이언트 사이드에서만 돌아가므로 dynamic import를 씁니다.
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export default function DogMascot({
    src = "/assets/dog.json", // 기본 경로 (아까 다운받은 파일)
    width = 150,              // 크기 조절
    message = ""              // 말풍선 대사 (옵션)
}) {
    // JSON 파일을 fetch로 불러오거나 import 해야 하는데, 
    // 편의상 public 폴더에 있는 파일을 fetch 해서 쓰는 방식으로 짰습니다.
    const [animationData, setAnimationData] = React.useState(null);

    React.useEffect(() => {
        fetch(src)
            .then((res) => res.json())
            .then((data) => setAnimationData(data));
    }, [src]);

    if (!animationData) return null; // 로딩 중일 땐 아무것도 안 보임

    return (
        <div className="flex flex-col items-center justify-center relative">
            {/* 말풍선 (메시지가 있을 때만 보임) */}
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute -top-10 bg-white px-3 py-1.5 rounded-xl shadow-md border border-gray-100 mb-2 z-10 whitespace-nowrap"
                >
                    <p className="text-xs font-bold text-gray-700">🐶 {message}</p>
                    {/* 말풍선 꼬리 */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-gray-100"></div>
                </motion.div>
            )}

            {/* 로티 애니메이션 */}
            <div style={{ width: width }} className="transform scale-x-[-1]" >
                <Lottie
                    animationData={animationData}
                    loop={true}
                    autoplay={true}
                />
            </div>
        </div>
    );
}