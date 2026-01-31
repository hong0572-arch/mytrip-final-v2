import { NextResponse } from 'next/server';

// 🔑 Travelpayouts 설정
const TP_TOKEN = '4c01a895965a510253489b6eef1e5fde';
const TP_MARKER = '695932';

// 🔑 Trip.com 설정
const TRIP_ALLIANCE_ID = '7681311';
const TRIP_SID = '287502125';
const TRIP_SUB3 = 'D11410520';

export async function POST(req) {
    try {
        const body = await req.json();
        const { destinationCode, destinationName, returnOriginCode, departureDate, returnDate, language } = body;

        if (!destinationCode || !departureDate) {
            return NextResponse.json({ error: "필수 정보 누락" }, { status: 400 });
        }

        const isKo = language !== 'en';

        // ---------------------------------------------------------
        // 🇰🇷 1. Trip.com 링크 생성 (PC vs Mobile 분리)
        // ---------------------------------------------------------
        let tripUrl = null;       // PC용 (showfarefirst - 가격 바로 노출)
        let tripUrlMobile = null; // Mobile용 (메인 페이지 - 안전한 검색)

        if (isKo) {
            // [PC용] showfarefirst 사용 (가격 바로 보임)
            const tripBasePC = "https://kr.trip.com/flights/showfarefirst";
            let paramsPC = `dcity=icn&acity=${destinationCode.toLowerCase()}&ddate=${departureDate}&class=y&quantity=1&lowpricesource=searchform&searchboxarg=t&nonstoponly=off&locale=ko-KR&curr=KRW`;

            // [Mobile용] 일반 메인 페이지 사용 (showfarefirst는 모바일에서 깨짐)
            const tripBaseMobile = "https://kr.trip.com/flights";
            let paramsMobile = `dcity=icn&acity=${destinationCode.toLowerCase()}&ddate=${departureDate}&class=y&quantity=1&locale=ko-KR&curr=KRW`;

            // 도시 이름 추가 (라벨 오류 방지)
            if (destinationName) {
                const encName = encodeURIComponent(destinationName);
                paramsPC += `&acityname=${encName}`;
                paramsMobile += `&acityname=${encName}`;
            }

            if (returnDate && returnDate.length > 5) {
                // 왕복
                paramsPC += `&rdate=${returnDate}&triptype=rt`;
                paramsMobile += `&rdate=${returnDate}&flighttype=rt`; // 모바일은 flighttype 파라미터 선호
            } else {
                // 편도
                paramsPC += `&triptype=ow`;
                paramsMobile += `&flighttype=ow`;
            }

            // 제휴 ID 붙이기
            const ids = `&Allianceid=${TRIP_ALLIANCE_ID}&SID=${TRIP_SID}&trip_sub3=${TRIP_SUB3}`;

            tripUrl = `${tripBasePC}?${paramsPC}${ids}`;
            tripUrlMobile = `${tripBaseMobile}?${paramsMobile}${ids}`;
        }

        // ---------------------------------------------------------
        // 🇺🇸 2. Aviasales 링크 생성 (글로벌)
        // ---------------------------------------------------------
        let aviaUrl = "";
        const domain = "aviasales.com";
        const locale = isKo ? 'ko' : 'en';
        const currency = isKo ? 'KRW' : 'USD';
        const depParts = departureDate.split('-');
        const depStr = `${depParts[2]}${depParts[1]}`;

        if (returnDate && returnDate.length > 5) {
            const retParts = returnDate.split('-');
            const retStr = `${retParts[2]}${retParts[1]}`;
            const inboundCode = returnOriginCode || destinationCode;

            if (inboundCode !== destinationCode) {
                aviaUrl = `https://www.${domain}/search/ICN${depStr}${destinationCode}-${inboundCode}${retStr}ICN1?marker=${TP_MARKER}&currency=${currency}&locale=${locale}`;
            } else {
                aviaUrl = `https://www.${domain}/search/ICN${depStr}${destinationCode}${retStr}1?marker=${TP_MARKER}&currency=${currency}&locale=${locale}`;
            }
        } else {
            aviaUrl = `https://www.${domain}/search/ICN${depStr}${destinationCode}1?marker=${TP_MARKER}&currency=${currency}&locale=${locale}`;
        }

        // ---------------------------------------------------------
        // 3. API 데이터 조회
        // ---------------------------------------------------------
        let apiCurrency = isKo ? 'krw' : 'usd';
        let baseUrl = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates`;
        let params = new URLSearchParams({
            origin: 'ICN',
            destination: destinationCode,
            departure_at: departureDate,
            currency: apiCurrency,
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
                linkTrip: tripUrl,           // PC용
                linkTripMobile: tripUrlMobile, // Mobile용 ✨
                linkGlobal: aviaUrl,         // 글로벌용
                isFallback: false
            }));
        }

        if (flights.length === 0) {
            flights.push({
                id: "fallback_ticket",
                price: 0,
                airline: isKo ? "Trip.com 최저가 검색" : "Search All Airlines",
                carrierCode: "ALL",
                transfers: 0,
                outbound: { depTime: "--:--", duration: 0 },
                linkTrip: tripUrl,
                linkTripMobile: tripUrlMobile,
                linkGlobal: aviaUrl,
                isFallback: true
            });
        }

        return NextResponse.json({ flights });

    } catch (error) {
        console.error("🚨 서버 에러:", error);
        return NextResponse.json({ error: "서버 오류 발생" }, { status: 500 });
    }
}