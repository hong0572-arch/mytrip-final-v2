import { NextResponse } from 'next/server';

// 🔑 Travelpayouts 설정
const TP_TOKEN = '4c01a895965a510253489b6eef1e5fde'; // 대표님 토큰 (확인됨)
const TP_MARKER = '695932'; // 🚨 [필수] 대시보드 우측 상단 숫자 ID로 꼭 변경하세요!

export async function POST(req) {
    try {
        const body = await req.json();
        const { destinationCode, departureDate, returnDate } = body;

        // 필수 정보 체크
        if (!destinationCode || !departureDate) {
            return NextResponse.json({ error: "필수 정보 누락" }, { status: 400 });
        }

        // 1. 딥링크(구매 페이지 URL) 미리 생성
        // 날짜 포맷 변환 (2026-03-25 -> 2503)
        const depParts = departureDate.split('-');
        const depStr = `${depParts[2]}${depParts[1]}`;

        let searchUrl = "";
        if (returnDate && returnDate.length > 5) {
            const retParts = returnDate.split('-');
            const retStr = `${retParts[2]}${retParts[1]}`;
            // 왕복 링크: ICN2503KIX27031
            searchUrl = `https://www.aviasales.com/search/ICN${depStr}${destinationCode}${retStr}1?marker=${TP_MARKER}&currency=krw&locale=ko`;
        } else {
            // 편도 링크: ICN2503KIX1
            searchUrl = `https://www.aviasales.com/search/ICN${depStr}${destinationCode}1?marker=${TP_MARKER}&currency=krw&locale=ko`;
        }

        // 2. API 호출 (캐시 데이터 조회)
        let baseUrl = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates`;
        let params = new URLSearchParams({
            origin: 'ICN',
            destination: destinationCode,
            departure_at: departureDate,
            currency: 'krw',
            sorting: 'price',
            direct: 'false',
            limit: '30',
            token: TP_TOKEN
        });

        if (returnDate && returnDate.length > 5) {
            params.append('return_at', returnDate);
        }

        console.log("✈️ API 요청:", `${baseUrl}?${params.toString()}`);

        const res = await fetch(`${baseUrl}?${params.toString()}`);
        const data = await res.json();
        let flights = [];

        // 3. 데이터가 있으면 가공
        if (data.success && data.data && data.data.length > 0) {
            flights = data.data.map((item) => ({
                id: (item.flight_number || 'FL') + item.departure_at + Math.random(),
                price: item.price,
                airline: item.airline,
                carrierCode: item.airline,
                transfers: item.transfers,
                outbound: {
                    depTime: item.departure_at.split('T')[1].substring(0, 5),
                    duration: item.duration,
                },
                deepLink: searchUrl,
                isFallback: false
            }));
        }

        // 4. 🚨 데이터가 없으면 '실시간 조회 버튼'용 가짜 티켓 생성
        if (flights.length === 0) {
            console.log("⚠️ 데이터 없음 -> 실시간 조회 링크 생성");
            flights.push({
                id: "fallback_ticket",
                price: 0, // 프론트엔드에서 0원이면 '최저가 확인'으로 표시
                airline: "전체 항공사 실시간 검색",
                carrierCode: "ALL",
                transfers: 0,
                outbound: { depTime: "--:--", duration: 0 },
                deepLink: searchUrl,
                isFallback: true // 프론트엔드 구분용 플래그
            });
        }

        return NextResponse.json({ flights });

    } catch (error) {
        console.error("🚨 서버 에러:", error);
        return NextResponse.json({ error: "서버 오류 발생" }, { status: 500 });
    }
}