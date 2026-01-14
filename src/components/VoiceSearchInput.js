"use client";

import { useState, useEffect } from 'react';

export default function VoiceSearchInput() {
    const [destination, setDestination] = useState(''); // 검색어 저장
    const [isListening, setIsListening] = useState(false); // 듣고 있는지 여부
    const [isSupported, setIsSupported] = useState(false); // 브라우저 지원 여부

    // 1. 브라우저가 음성 인식을 지원하는지 확인
    useEffect(() => {
        if (typeof window !== 'undefined' &&
            (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            setIsSupported(true);
        }
    }, []);

    // 2. 마이크 버튼 눌렀을 때 실행되는 함수
    const handleVoiceSearch = () => {
        if (!isSupported) {
            alert("현재 브라우저는 음성 인식을 지원하지 않습니다. 크롬(Chrome)을 권장합니다!");
            return;
        }

        // 음성 인식 기능 호출
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'ko-KR'; // 한국어 설정
        recognition.interimResults = false; // 중간 결과 말고 최종 결과만
        recognition.maxAlternatives = 1;

        setIsListening(true); // "듣고 있어요" 상태로 변경 (빨간불 켜기)
        recognition.start();  // 녹음 시작

        // 말이 인식되었을 때
        recognition.onresult = (event) => {
            const speechToText = event.results[0][0].transcript;
            setDestination(speechToText); // 입력창에 글자 넣기
            setIsListening(false); // 듣기 종료
        };

        // 녹음이 끝났거나 에러가 났을 때
        recognition.onspeechend = () => {
            setIsListening(false);
            recognition.stop();
        };

        recognition.onerror = (event) => {
            console.error("음성 인식 에러:", event.error);
            setIsListening(false);
        };
    };

    return (
        <div className="relative w-full">
            {/* 텍스트 입력창 */}
            <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={isListening ? "듣고 있어요... 말씀하세요! 🎤" : "국가 또는 도시 입력 (예: 오사카)"}
                className={`w-full p-4 pr-12 rounded-2xl border-2 outline-none transition-all duration-300
          ${isListening
                        ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50 text-gray-900 placeholder-rose-400'
                        : 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                    }
        `}
            />

            {/* 마이크 버튼 (지원하는 브라우저일 때만 보임) */}
            {isSupported && (
                <button
                    onClick={handleVoiceSearch}
                    disabled={isListening}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all 
            ${isListening
                            ? 'bg-rose-500 text-white animate-pulse scale-110 shadow-lg'
                            : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100'
                        }
          `}
                    title="음성으로 입력하기"
                >
                    {/* 마이크 아이콘 SVG */}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                </button>
            )}
        </div>
    );
}