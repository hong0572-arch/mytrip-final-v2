"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function Hero() {
    const scrollToForm = () => {
        const formElement = document.getElementById("quote-form");
        if (formElement) {
            formElement.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <section className="relative h-screen w-full overflow-hidden bg-gray-900 text-white">
            {/* Background Gradient/Image Placeholder */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 opacity-80" />
            <div className="absolute inset-0 bg-black/30" /> {/* Overlay */}

            <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="max-w-3xl"
                >
                    <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
                        당신만을 위한 완벽한 여행, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-200">
                            AI와 전문가가 함께 만듭니다
                        </span>
                    </h1>
                    <p className="mb-8 text-lg text-gray-100 md:text-xl font-light">
                        Premium travel planning for your perfect getaway.
                        <br />
                        복잡한 검색은 그만, 취향만 알려주세요.
                    </p>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={scrollToForm}
                        className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-purple-600 shadow-lg transition-colors hover:bg-gray-100"
                    >
                        여행 견적 받기
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </motion.button>
                </motion.div>
            </div>
        </section>
    );
}
