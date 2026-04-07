'use client';

import React, { useEffect, useState } from 'react';
import { RotateCcw, Smartphone } from 'lucide-react';

const PortraitOnly = () => {
    const [isLandscape, setIsLandscape] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            // 태블릿 이상(768px 초과)에서는 가로 모드 허용, 모바일에서만 제한
            const isMobile = window.innerWidth <= 768;
            const landscape = window.innerHeight < window.innerWidth;
            setIsLandscape(isMobile && landscape);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    if (!isLandscape) return null;

    return (
        <div className="fixed inset-0 z-[99999] bg-[#030712] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
                <div className="relative bg-gray-900/50 backdrop-blur-xl border border-white/10 p-6 rounded-[32px] shadow-2xl">
                    <Smartphone size={64} className="text-white animate-bounce-slow" />
                    <RotateCcw 
                        size={24} 
                        className="absolute -top-2 -right-2 text-indigo-400 animate-spin-slow bg-gray-900 rounded-full p-1 border border-white/20" 
                    />
                </div>
            </div>
            
            <h2 className="text-2xl font-black text-white mb-4 tracking-tight">
                세로 모드로 전환해 주세요
            </h2>
            
            <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-[240px] break-keep">
                Trip Maker는 세로 화면에 최적화되어 있습니다.<br/>
                기기를 세로로 돌려주시면 편리하게 이용하실 수 있습니다.
            </p>

            <div className="mt-12 flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-75"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse delay-150"></div>
            </div>

            <style jsx global>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0) rotate(0); }
                    50% { transform: translateY(-10px) rotate(5deg); }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s ease-in-out infinite;
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default PortraitOnly;
