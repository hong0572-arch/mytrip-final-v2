import { NextResponse } from 'next/server';

// 🔑 Travelpayouts 설정
const TP_TOKEN = '4c01a895965a510253489b6eef1e5fde';
const TP_MARKER = '695932'; // 대표님 ID

export async function POST(req) {
    try {
        const body = await req.json();
        // returnOriginCode: 돌아오는 편의 출발 공항 (다구간 지원)
        const { destinationCode, returnOriginCode, departureDate, returnDate } = body;

        if (!destinationCode || !departureDate) {
            return NextResponse.json({ error: "필수 정보 누락" }, { status: 400 });
        }

        // 날짜 변환 (2026-03-25 -> 2503)
        const depParts = departureDate.split('-');
        const depStr = `${depParts[2]}${depParts[1]}`;

        let searchUrl = "";

        // ✈️ 링크 생성 로직 (다구간 지원)
        if (returnDate && returnDate.length > 5) {
            const retParts = returnDate.split('-');
            const retStr = `${retParts[2]}${retParts[1]}`;

            // 오는 편 공항이 지정되어 있고, 가는 편 도착지와 다르면? (Open Jaw)
            const inboundCode = returnOriginCode || destinationCode;

            if (inboundCode !== destinationCode) {
                // 다구간 링크 형식: ICN2503NCE-MRS2803ICN1
                // (인천->니스, 마르세유->인천)
                searchUrl = `https://www.aviasales.com/search/ICN${depStr}${destinationCode}-${inboundCode}${retStr}ICN1?marker=${TP_MARKER}&currency=krw&locale=ko`;
            } else {
                // 일반 왕복: ICN2503NCE28031
                searchUrl = `https://www.aviasales.com/search/ICN${depStr}${destinationCode}${retStr}1?marker=${TP_MARKER}&currency=krw&locale=ko`;
            }
        } else {
            // 편도
            searchUrl = `https://www.aviasales.com/search/ICN${depStr}${destinationCode}1?marker=${TP_MARKER}&currency=krw&locale=ko`;
        }

        // 2. API 조회 (API는 단순 왕복 최저가만 조회 - 참고용)
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
        if (returnDate) params.append('return_at', returnDate);

        const res = await fetch(`${baseUrl}?${params.toString()}`);
        const data = await res.json();
        let flights = [];

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
                deepLink: searchUrl, // 위에서 만든 정교한 링크 사용
                isFallback: false
            }));
        }

        // Fallback 티켓 (실시간 조회 버튼)
        if (flights.length === 0) {
            flights.push({
                id: "fallback_ticket",
                price: 0,
                airline: "전체 항공사 실시간 검색",
                carrierCode: "ALL",
                transfers: 0,
                outbound: { depTime: "--:--", duration: 0 },
                deepLink: searchUrl, // ✨ 여기에 다구간 링크가 들어감
                isFallback: true
            });
        }

        return NextResponse.json({ flights });

    } catch (error) {
        console.error("🚨 서버 에러:", error);
        return NextResponse.json({ error: "서버 오류 발생" }, { status: 500 });
    }
}