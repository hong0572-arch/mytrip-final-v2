"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export default function DogMascot({
    src = "/assets/dog.json",
    width = 170,
    initialMessage = "멍!"
}) {
    const [animationData, setAnimationData] = React.useState(null);
    const [message, setMessage] = useState(initialMessage);
    const [hearts, setHearts] = useState([]); // 클릭 시 하트 효과

    React.useEffect(() => {
        fetch(src)
            .then((res) => res.json())
            .then((data) => setAnimationData(data));
    }, [src]);

    // 강아지 클릭 핸들러
    const handleDogClick = () => {
        // 1. 랜덤 대사 변경
        const msgs = ["여행 가고 싶어요?!", "어디로 갈까요?", "일정 만들어 드릴게요."];
        setMessage(msgs[Math.floor(Math.random() * msgs.length)]);

        // 2. 하트 추가 (애니메이션)
        const newHeart = { id: Date.now(), x: Math.random() * 40 - 20 };
        setHearts((prev) => [...prev, newHeart]);

        // 1초 뒤 하트 삭제
        setTimeout(() => {
            setHearts((prev) => prev.filter(h => h.id !== newHeart.id));
        }, 1000);
    };

    if (!animationData) return null;

    return (
        <div
            onClick={handleDogClick}
            className="flex flex-col items-center justify-center relative cursor-pointer hover:scale-105 transition-transform"
        >
            {/* 하트 이펙트 */}
            <AnimatePresence>
                {hearts.map((heart) => (
                    <motion.div
                        key={heart.id}
                        initial={{ opacity: 1, y: 0, scale: 0.5 }}
                        animate={{ opacity: 0, y: -50, scale: 1.2 }}
                        exit={{ opacity: 0 }}
                        className="absolute text-2xl z-20"
                        style={{ x: heart.x, top: 0 }}
                    >
                        💖
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* 말풍선 */}
            <motion.div
                key={message} // 메시지가 바뀔 때마다 깜빡임 효과
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute -top-8 bg-white px-3 py-1.5 rounded-xl shadow-md border border-gray-100 mb-2 z-10 whitespace-nowrap"
            >
                <p className="text-xs font-bold text-gray-700">🐶 {message}</p>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-gray-100"></div>
            </motion.div>

            {/* 로티 애니메이션 (좌우반전 유지) */}
            <div style={{ width: width }} className="transform scale-x-[-1]" >
                <Lottie animationData={animationData} loop={true} autoplay={true} />
            </div>
        </div>
    );
}