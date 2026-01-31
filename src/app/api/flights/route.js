import { NextResponse } from 'next/server';

// 🔑 Travelpayouts 설정
const TP_TOKEN = '4c01a895965a510253489b6eef1e5fde';
const TP_MARKER = '695932';

export async function POST(req) {
    try {
        const body = await req.json();
        // ✨ [핵심] language 변수를 받아옵니다.
        const { destinationCode, returnOriginCode, departureDate, returnDate, language } = body;

        if (!destinationCode || !departureDate) {
            return NextResponse.json({ error: "필수 정보 누락" }, { status: 400 });
        }

        // 🌍 언어 및 통화 설정 (동적 처리)
        const isKo = language !== 'en'; // 기본값은 한국어
        const locale = isKo ? 'ko' : 'en';
        const currency = isKo ? 'KRW' : 'USD';

        // 날짜 변환 (2026-03-25 -> 2503)
        const depParts = departureDate.split('-');
        const depStr = `${depParts[2]}${depParts[1]}`;

        let searchUrl = "";

        // ✈️ 딥링크 생성 로직
        if (returnDate && returnDate.length > 5) {
            const retParts = returnDate.split('-');
            const retStr = `${retParts[2]}${retParts[1]}`;

            const inboundCode = returnOriginCode || destinationCode;

            if (inboundCode !== destinationCode) {
                // 다구간 (Open Jaw)
                searchUrl = `https://www.aviasales.com/search/ICN${depStr}${destinationCode}-${inboundCode}${retStr}ICN1?marker=${TP_MARKER}&currency=${currency}&locale=${locale}`;
            } else {
                // 왕복
                searchUrl = `https://www.aviasales.com/search/ICN${depStr}${destinationCode}${retStr}1?marker=${TP_MARKER}&currency=${currency}&locale=${locale}`;
            }
        } else {
            // 편도
            searchUrl = `https://www.aviasales.com/search/ICN${depStr}${destinationCode}1?marker=${TP_MARKER}&currency=${currency}&locale=${locale}`;
        }

        // API 조회 (단순 가격 표시용 - API는 항상 KRW로 조회해도 무방하나 통일성 위해 currency 적용)
        let baseUrl = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates`;
        let params = new URLSearchParams({
            origin: 'ICN',
            destination: destinationCode,
            departure_at: departureDate,
            currency: currency.toLowerCase(), // api는 소문자 krw/usd 사용
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
                deepLink: searchUrl,
                isFallback: false
            }));
        }

        if (flights.length === 0) {
            flights.push({
                id: "fallback_ticket",
                price: 0,
                airline: isKo ? "전체 항공사 실시간 검색" : "Search All Airlines",
                carrierCode: "ALL",
                transfers: 0,
                outbound: { depTime: "--:--", duration: 0 },
                deepLink: searchUrl,
                isFallback: true
            });
        }

        return NextResponse.json({ flights });

    } catch (error) {
        console.error("🚨 서버 에러:", error);
        return NextResponse.json({ error: "서버 오류 발생" }, { status: 500 });
    }
}