'use client';

import { useState, useEffect } from 'react';
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, increment, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Sparkles, Gift, Lock, RotateCcw, CheckCircle, XCircle } from 'lucide-react';

export default function TravelQuiz({ aiQuizData }) {
    const [user, setUser] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [loading, setLoading] = useState(false);

    // 🚫 하루 제한 상태
    const [canPlay, setCanPlay] = useState(true);
    const [dailySuccessCount, setDailySuccessCount] = useState(0);
    const MAX_DAILY_SUCCESS = 1;
    const REWARD_POINTS = 200;

    // 로그인 체크 & 오늘 성공 횟수 확인
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await checkDailyLimit(currentUser);
            }
        });
        return () => unsubscribe();
    }, []);

    const checkDailyLimit = async (currentUser) => {
        const today = new Date().toISOString().split('T')[0];
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            const stats = data.quizStats || { date: "", count: 0 };

            if (stats.date !== today) {
                setDailySuccessCount(0);
                setCanPlay(true);
            } else {
                setDailySuccessCount(stats.count);
                if (stats.count >= MAX_DAILY_SUCCESS) {
                    setCanPlay(false);
                }
            }
        }
    };

    const handleAnswer = (index) => {
        const activeQuiz = aiQuizData || [];
        const isCorrect = index === activeQuiz[currentStep].answer;

        if (isCorrect) setScore(prev => prev + 1);

        if (currentStep + 1 < activeQuiz.length) {
            setCurrentStep(currentStep + 1);
        } else {
            finishQuiz(score + (isCorrect ? 1 : 0));
        }
    };

    // 🏁 퀴즈 종료 & 보상 & 기록
    const finishQuiz = async (finalScore) => {
        setShowResult(true);
        const activeQuiz = aiQuizData || [];
        const isPerfect = finalScore === activeQuiz.length;

        if (!isPerfect || !user) return;

        if (canPlay) {
            setLoading(true);
            try {
                const today = new Date().toISOString().split('T')[0];
                const userRef = doc(db, "users", user.uid);

                // 1. 포인트 & 통계 업데이트
                await updateDoc(userRef, {
                    points: increment(REWARD_POINTS),
                    quizStats: { date: today, count: dailySuccessCount + 1 }
                });

                // 2. 🔥 [기록] 퀴즈 보상
                await addDoc(collection(db, "users", user.uid, "point_history"), {
                    desc: "일일 퀴즈 보상 (만점)",
                    amount: REWARD_POINTS,
                    createdAt: serverTimestamp()
                });

                setDailySuccessCount(prev => prev + 1);
                if (dailySuccessCount + 1 >= MAX_DAILY_SUCCESS) {
                    setCanPlay(false);
                }
            } catch (error) {
                console.error("보상 지급 에러:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleRetry = () => {
        setCurrentStep(0);
        setScore(0);
        setShowResult(false);
    };

    const activeQuiz = aiQuizData || [];

    if (activeQuiz.length === 0) return <div className="p-4 text-center text-gray-500">퀴즈 데이터가 없습니다.</div>;

    if (!canPlay && user) {
        return (
            <div className="bg-gray-100 rounded-2xl p-8 text-center border border-gray-300">
                <Lock className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-700 mb-2">오늘의 포인트 획득 완료!</h3>
                <p className="text-gray-500 text-sm">
                    하루에 {MAX_DAILY_SUCCESS}번, 최대 {MAX_DAILY_SUCCESS * REWARD_POINTS}P까지 획득 가능합니다.<br />
                    내일 다시 도전해서 포인트를 쌓으세요! 🌙
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-indigo-100">
            <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Sparkles size={18} /> 여행 퀴즈 도전</h3>
                <span className="text-xs bg-indigo-500 px-2 py-1 rounded text-white/90">오늘 성공: {dailySuccessCount}/{MAX_DAILY_SUCCESS}회</span>
            </div>

            <div className="p-6">
                {!showResult ? (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold text-indigo-500">Question {currentStep + 1} / {activeQuiz.length}</span>
                            <span className="text-xs font-bold text-gray-400">현재 점수: {score}점</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-6 min-h-[60px]">{activeQuiz[currentStep].question}</h2>
                        <div className="space-y-3">
                            {activeQuiz[currentStep].options.map((option, idx) => (
                                <button key={idx} onClick={() => handleAnswer(idx)} className="w-full text-left p-4 rounded-xl border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all font-medium text-gray-700 active:scale-98">
                                    {idx + 1}. {option}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-8">
                        {score === activeQuiz.length ? (
                            <>
                                <Gift size={64} className="mx-auto text-pink-500 mb-4 animate-bounce" />
                                <h3 className="text-2xl font-bold text-gray-900">축하합니다! 만점! 🎉</h3>
                                <p className="text-gray-600 mt-2 mb-6">{user ? `${REWARD_POINTS} 포인트가 적립되었습니다.` : "로그인하고 포인트를 받으세요!"}</p>
                                {!user && <p className="text-xs text-red-500 font-bold">* 포인트 적립을 위해 로그인이 필요합니다.</p>}
                            </>
                        ) : (
                            <>
                                <XCircle size={64} className="mx-auto text-gray-400 mb-4" />
                                <h3 className="text-2xl font-bold text-gray-800">아쉽네요! ({score}/{activeQuiz.length})</h3>
                                <p className="text-gray-500 mt-2 mb-6">3문제를 모두 맞혀야 포인트를 받을 수 있습니다.</p>
                                <button onClick={handleRetry} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2 mx-auto"><RotateCcw size={18} /> 다시 도전하기</button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}