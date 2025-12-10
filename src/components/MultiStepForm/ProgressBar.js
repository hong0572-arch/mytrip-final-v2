"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
    currentStep: number;
    totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
    const progress = (currentStep / totalSteps) * 100;

    return (
        <div className="mb-8">
            <div className="flex justify-between mb-2 text-sm font-medium text-gray-500">
                <span>Step {currentStep} of {totalSteps}</span>
                <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <motion.div
                    className="h-full bg-gradient-brand"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                />
            </div>
        </div>
    );
}
