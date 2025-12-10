import { useFormContext } from "react-hook-form";

export default function Step1Basic() {
    // <TravelFormData> 같은 꺽쇠 괄호를 지웠습니다.
    const { register, formState: { errors } } = useFormContext();

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold">기본 정보</h2>

            {/* 여행지 입력 */}
            <div>
                <label className="block text-sm font-medium mb-1">여행지</label>
                <input
                    {...register("destination", { required: "여행지를 입력해주세요" })}
                    className="w-full p-2 border rounded-md"
                    placeholder="예: 파리, 도쿄, 제주도"
                />
                {errors.destination && (
                    <p className="text-red-500 text-sm">{errors.destination.message}</p>
                )}
            </div>

            {/* 여행 기간 입력 */}
            <div>
                <label className="block text-sm font-medium mb-1">여행 기간</label>
                <input
                    {...register("duration", { required: "기간을 입력해주세요" })}
                    className="w-full p-2 border rounded-md"
                    placeholder="예: 3박 4일"
                />
                {errors.duration && (
                    <p className="text-red-500 text-sm">{errors.duration.message}</p>
                )}
            </div>
        </div>
    );
}