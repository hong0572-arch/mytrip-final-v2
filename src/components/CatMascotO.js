'use client';

import React from 'react';
import { motion } from "framer-motion";

const CatMascot = ({ width = 100 }) => {
    return (
        <div className="relative flex justify-center items-center" style={{ width: width, height: width }}>

            {/* 1. 고양이 본체 애니메이션 (둥둥 떠다니기 + 살짝 갸우뚱) */}
            <motion.img
                src="/assets/caty.json"
                alt="여행하는 고양이"
                className="object-contain drop-shadow-xl relative z-10"
                style={{ width: '100%', height: '100%' }}
                animate={{
                    y: [0, -8, 0],        // 위아래로 둥둥 (Floating)
                    rotate: [0, 2, -2, 0] // 좌우로 살짝 까딱 (Wiggle)
                }}
                transition={{
                    duration: 4,          // 4초 주기로 반복
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* 2. 카메라 플래시 효과 (3초마다 번쩍!) */}
            <motion.div
                className="absolute z-20 bg-white rounded-full blur-md"
                style={{
                    width: '20%',       // 고양이 크기에 비례한 플래시 크기
                    height: '20%',
                    top: '40%',         // 카메라 렌즈 위치 (대략 중앙)
                    left: '40%',
                }}
                animate={{
                    opacity: [0, 0, 0.8, 0], // 투명 -> 번쩍 -> 투명
                    scale: [0.5, 0.5, 1.5, 2] // 작게 시작해서 커지며 사라짐
                }}
                transition={{
                    duration: 2,         // 3초마다 한 번씩
                    repeat: Infinity,
                    repeatDelay: 1,      // 1초 쉬고 다시
                    times: [0, 0.9, 0.95, 1] // 타이밍 조절 (마지막 순간에 팍 터짐)
                }}
            />

            {/* 3. 바닥 그림자 (고양이가 뜰 때 그림자는 작아짐) */}
            <motion.div
                className="absolute -bottom-2 w-[60%] h-3 bg-black/20 rounded-[100%] blur-sm z-0"
                animate={{
                    scale: [1, 0.8, 1],   // 고양이가 올라가면 그림자는 작아짐
                    opacity: [0.3, 0.1, 0.3]
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

        </div>
    );
};

export default CatMascot;