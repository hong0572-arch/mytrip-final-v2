export default function PrivacyPage() {
    return (
        <div className="max-w-3xl mx-auto p-8 text-gray-800 font-sans leading-relaxed">
            <h1 className="text-3xl font-bold mb-6">개인정보처리방침</h1>
            <p className="mb-4"><strong>Trip Maker</strong>(이하 '서비스')는 이용자의 개인정보를 중요시하며, '개인정보 보호법'을 준수하고 있습니다.</p>

            <h2 className="text-xl font-bold mt-8 mb-2">1. 수집하는 개인정보 항목</h2>
            <ul className="list-disc pl-5 mb-4">
                <li>로그인 시: 이메일, 프로필 사진, 닉네임 (Google/Firebase 인증 정보)</li>
                <li>서비스 이용 시: 여행 일정 데이터, 쿠키</li>
            </ul>

            <h2 className="text-xl font-bold mt-8 mb-2">2. 개인정보의 수집 및 이용 목적</h2>
            <ul className="list-disc pl-5 mb-4">
                <li>서비스 제공 및 여행 일정 저장</li>
                <li>회원 식별 및 관리</li>
            </ul>

            <h2 className="text-xl font-bold mt-8 mb-2">3. 개인정보의 보유 및 이용 기간</h2>
            <p className="mb-4">이용자가 회원 탈퇴를 요청하거나 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.</p>

            <h2 className="text-xl font-bold mt-8 mb-2">4. 문의처</h2>
            <p className="mb-4">서비스 이용 중 발생하는 모든 개인정보 보호 관련 문의는 관리자에게 연락해 주시기 바랍니다.</p>
            <p className="text-gray-500 text-sm mt-8">시행일자: 2024년 1월 1일</p>
        </div>
    );
}