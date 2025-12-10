"use client";

import { useFormContext } from "react-hook-form";


const THEMES = [
    "🛍️ 쇼핑",
    "🍽️ 미식/맛집",
    "💆‍♀️ 힐링/스파",
    "🎨 문화/예술",
    "🏄‍♀️ 액티비티",
    "📸 인생샷/관광",
];

export default function Step3Theme() {
    const { register, formState: { errors } } = useFormContext();

    return (
        <div className="space-y-8">
            <h3 className="text-2xl font-bold text-gray-800">여행 테마</h3>

            <div className="space-y-4">
                <label className="text-lg font-medium text-gray-700">어떤 여행을 원하시나요? (중복 선택 가능)</label>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {THEMES.map((theme) => (
                        <label
                            key={theme}
                            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-gray-200 p-6 text-center transition-all hover:border-purple-500 hover:bg-purple-50 hover:shadow-md"
                        >
                            <input
                                type="checkbox"
                                value={theme}
                                {...register("themes", { required: "테마를 하나 이상 선택해주세요" })}
                                className="mb-3 h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="font-medium text-gray-700">{theme}</span>
                        </label>
                    ))}
                </div>
                {errors.themes && (
                    <p className="text-sm text-red-500">{errors.themes.message}</p>
                )}
            </div>

            <div className="space-y-4">
                <label className="text-lg font-medium text-gray-700">가이드가 필요하신가요?</label>
                <div className="flex gap-4">
                    <label className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                        <input
                            type="radio"
                            value="true"
                            {...register("guide")}
                            className="mr-3 h-5 w-5 border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-gray-700">네, 필요해요</span>
                    </label>
                    <label className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                        <input
                            type="radio"
                            value="false"
                            {...register("guide")}
                            className="mr-3 h-5 w-5 border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-gray-700">아니요, 자유여행이 좋아요</span>
                    </label>
                </div>
            </div>
        </div>
    );
}
