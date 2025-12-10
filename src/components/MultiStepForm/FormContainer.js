"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";

import Step1Basic from "./Step1Basic";
import Step2StayFlight from "./Step2StayFlight";
import Step3Theme from "./Step3Theme";
import Step4Transport from "./Step4Transport";
import ProgressBar from "./ProgressBar";
import AIResult from "../AIResult";

export default function FormContainer() {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showResult, setShowResult] = useState(false);

    const methods = useForm < TravelFormData > ({
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

    const onSubmit = async (data: TravelFormData) => {
        setIsSubmitting(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 3000));
        setIsSubmitting(false);
        setShowResult(true);
        console.log("Form Data:", data);
    };

    if (showResult) {
        return <AIResult data={methods.getValues()} />;
    }

    return (
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-xl md:p-10">
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
                                className="ml-auto rounded-lg bg-gradient-brand px-8 py-3 font-semibold text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-70"
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
