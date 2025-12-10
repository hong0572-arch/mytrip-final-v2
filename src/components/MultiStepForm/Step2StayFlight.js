"use client";

import { useFormContext } from "react-hook-form";

const ACCOMMODATION_TYPES = [
    "5성급 호텔",
    "부티크 호텔",
    "리조트/풀빌라",
    "현지 가옥 체험",
    "상관없음",
];

const AIRLINE_TYPES = [
    "국적기 (대한항공/아시아나)",
    "LCC (저비용 항공사)",
    "상관없음",
];

export default function Step2StayFlight() {
    const { register, formState: { errors } } = useFormContext();

    return (
        <div className="space-y-8">
            <h3 className="text-2xl font-bold text-gray-800">숙소 및 항공</h3>

            <div className="space-y-4">
                <label className="text-lg font-medium text-gray-700">선호하는 숙소 유형 (중복 선택 가능)</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {ACCOMMODATION_TYPES.map((type) => (
                        <label
                            key={type}
                            className="flex cursor-pointer items-center space-x-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                        >
                            <input
                                type="checkbox"
                                value={type}
                                {...register("accommodationType", { required: "숙소 유형을 하나 이상 선택해주세요" })}
                                className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-gray-700">{type}</span>
                        </label>
                    ))}
                </div>
                {errors.accommodationType && (
                    <p className="text-sm text-red-500">{errors.accommodationType.message}</p>
                )}
            </div>

            <div className="space-y-4">
                <label className="text-lg font-medium text-gray-700">선호하는 항공사</label>
                <div className="space-y-3">
                    {AIRLINE_TYPES.map((type) => (
                        <label
                            key={type}
                            className="flex cursor-pointer items-center space-x-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                        >
                            <input
                                type="radio"
                                value={type}
                                {...register("airlineType", { required: "항공사 선호를 선택해주세요" })}
                                className="h-5 w-5 border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-gray-700">{type}</span>
                        </label>
                    ))}
                </div>
                {errors.airlineType && (
                    <p className="text-sm text-red-500">{errors.airlineType.message}</p>
                )}
            </div>
        </div>
    );
}
