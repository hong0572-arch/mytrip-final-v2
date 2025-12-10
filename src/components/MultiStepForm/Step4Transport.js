"use client";

import { useFormContext } from "react-hook-form";


const TRANSPORT_TYPES = [
    "Uber/Grab 등 호출 차량",
    "렌터카 (직접 운전)",
    "대중교통 (지하철/버스)",
    "전용 차량 & 기사",
];

export default function Step4Transport() {
    const { register, formState: { errors } } = useFormContext();

    return (
        <div className="space-y-8">
            <h3 className="text-2xl font-bold text-gray-800">이동 및 연락처</h3>

            <div className="space-y-4">
                <label className="text-lg font-medium text-gray-700">선호하는 이동 수단 (중복 선택 가능)</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {TRANSPORT_TYPES.map((type) => (
                        <label
                            key={type}
                            className="flex cursor-pointer items-center space-x-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                        >
                            <input
                                type="checkbox"
                                value={type}
                                {...register("transport", { required: "이동 수단을 하나 이상 선택해주세요" })}
                                className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-gray-700">{type}</span>
                        </label>
                    ))}
                </div>
                {errors.transport && (
                    <p className="text-sm text-red-500">{errors.transport.message}</p>
                )}
            </div>

            <div className="space-y-4">
                <label className="text-lg font-medium text-gray-700">연락처 (카카오톡 ID 또는 인스타그램 ID)</label>
                <input
                    {...register("contact", { required: "연락처를 입력해주세요" })}
                    placeholder="예: kakao_id_123"
                    className="w-full rounded-lg border border-gray-300 p-4 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                {errors.contact && (
                    <p className="text-sm text-red-500">{errors.contact.message}</p>
                )}
            </div>

            <div className="space-y-4">
                <label className="text-lg font-medium text-gray-700">기타 요청사항</label>
                <textarea
                    {...register("additionalRequests")}
                    placeholder="특별히 원하시는 점이나 알레르기 등 참고할 사항이 있다면 적어주세요."
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 p-4 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
            </div>
        </div>
    );
}
