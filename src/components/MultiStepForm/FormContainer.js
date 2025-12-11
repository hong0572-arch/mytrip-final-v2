"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";

import Step1Basic from "./Step1Basic";
import Step2StayFlight from "./Step2StayFlight"; // 만약 파일이 없다면 이 줄은 지워야 할 수도 있습니다.
import Step3Theme from "./Step3Theme";           // 만약 파일이 없다면 이 줄은 지워야 할 수도 있습니다.
import Step4Transport from "./Step4Transport";   // 만약 파일이 없다면 이 줄은 지워야 할 수도 있습니다.
import ProgressBar from "./ProgressBar";         // 만약 파일이 없다면 이 줄은 지워야 할 수도 있습니다.
import AIResult from "../AIResult";

// 초기 데이터 정의 (이게 없어서 에러가 날 뻔했습니다!)
const INITIAL_DATA = {
    destination: "",
    startDate: "",
    endDate: "",
    budget: 0,
    themes: [],
    hotelType: "상관없음",
};

export default function FormContainer() {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showResult, setShowResult] = useState(false);

    // 1. <TravelFormData> 삭제 (JS 문법으로 변경)
    const methods = useForm({
        defaultValues: INITIAL_DATA,
        mode: "onChange",
    });

    const nextStep = async () => {
        const isValid = await methods.trigger();
        if (isValid) {
            setStep((prev) => Math.min(prev + 1, 4));
        }
    };

    const prevStep = () => {
        setStep((prev) => Math.max(prev - 1, 1));
    };

    // 2. (data: TravelFormData) -> (data) 로 변경 (타입 제거)
    const onSubmit = async (data) => {
        setIsSubmitting(true);

        // 실제 AI 요청을 보내는 부분 (이전 코드와 연결)
        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const resultData = await response.json();
            // 여기서 결과 처리를 해야 하지만, 일단 로그만 찍습니다.
            console.log("AI Result:", resultData);

        } catch (error) {
            console.error(error);
            alert("오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
            setShowResult(true);
        }
    };

    // 결과 화면 보여주기
    if (showResult) {
        return <AIResult data={methods.getValues()} />;
    }

    return (
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-xl md:p-10">
            {/* ProgressBar 컴포넌트가 없다면 이 줄을 지우세요 */}
            <ProgressBar currentStep={step} totalSteps={4} />

            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)} className="mt-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* 각 단계별 컴포넌트가 실제로 존재하는지 확인해주세요! */}
                            {step === 1 && <Step1Basic />}
                            {step === 2 && <Step2StayFlight />}
                            {step === 3 && <Step3Theme />}
                            {step === 4 && <Step4Transport />}
                        </motion.div>
                    </AnimatePresence>

                    <div className="mt-8 flex justify-between">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="rounded-lg px-6 py-2 text-gray-600 hover:bg-gray-100"
                            >
                                이전
                            </button>
                        )}

                        {step < 4 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="ml-auto rounded-lg bg-black px-8 py-3 font-semibold text-white transition-transform hover:scale-105"
                            >
                                다음 단계
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="ml-auto rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-70"
                            >
                                {isSubmitting ? "AI 분석 중..." : "견적 요청하기"}
                            </button>
                        )}
                    </div>
                </form>
            </FormProvider>
        </div>
    );
}