import { NextResponse } from 'next/server';

// 🔑 Travelpayouts 설정 (Aviasales - 영어권/데이터 조회용)
const TP_TOKEN = '4c01a895965a510253489b6eef1e5fde';
const TP_MARKER = '695932';

// 🔑 Trip.com 설정 (한국어권 - 대표님 제휴 ID)
const TRIP_ALLIANCE_ID = '7681311';
const TRIP_SID = '287502125';
const TRIP_SUB3 = 'D11411381'; // 링크에 있는 최신 추적 코드

export async function POST(req) {
    try {
        const body = await req.json();
        // 프론트엔드에서 도시 이름(destinationName)도 받아오면 라벨 오류 방지에 좋습니다.
        const { destinationCode, destinationName, returnOriginCode, departureDate, returnDate, language } = body;

        // 필수 정보 확인
        if (!destinationCode || !departureDate) {
            return NextResponse.json({ error: "필수 정보 누락" }, { status: 400 });
        }

        const isKo = language !== 'en';

        // ---------------------------------------------------------
        // 🇰🇷 1. Trip.com 링크 생성 (보내주신 showfarefirst 참조)
        // ---------------------------------------------------------
        let tripUrl = null;
        if (isKo) {
            // ✨ 보내주신 링크의 엔드포인트 사용
            const tripBase = "https://kr.trip.com/flights/showfarefirst";

            // 보내주신 링크의 파라미터 구조를 그대로 적용
            // dcity: 출발지 (ICN) - 소문자 icn 사용
            // acity: 도착지 - 소문자 변환
            // ddate: 가는날
            // class: y
            // quantity: 1
            // lowpricesource: searchform (필수)
            // searchboxarg: t
            // nonstoponly: off
            // locale: ko-KR
            // curr: KRW

            let tripParams = `dcity=icn&acity=${destinationCode.toLowerCase()}&ddate=${departureDate}&class=y&quantity=1&lowpricesource=searchform&searchboxarg=t&nonstoponly=off&locale=ko-KR&curr=KRW`;

            // 만약 도시 이름이 있다면 추가 (검색창에 '오사카' 등이 예쁘게 뜨도록)
            if (destinationName) {
                tripParams += `&acityname=${encodeURIComponent(destinationName)}`;
            }

            if (returnDate && returnDate.length > 5) {
                // 왕복 (triptype=rt)
                tripParams += `&rdate=${returnDate}&triptype=rt`;
            } else {
                // 편도 (triptype=ow)
                tripParams += `&triptype=ow`;
            }

            // ✨ 제휴 ID 및 추적 코드 붙이기 (Allianceid, SID, trip_sub3)
            tripUrl = `${tripBase}?${tripParams}&Allianceid=${TRIP_ALLIANCE_ID}&SID=${TRIP_SID}&trip_sub3=${TRIP_SUB3}`;
        }

        // ---------------------------------------------------------
        // 🇺🇸 2. Aviasales 링크 생성 (글로벌 - 영어권 또는 비교용)
        // ---------------------------------------------------------
        let aviaUrl = "";
        const domain = "aviasales.com";
        const locale = isKo ? 'ko' : 'en';
        const currency = isKo ? 'KRW' : 'USD';

        // 날짜 변환 (2026-03-25 -> 2503)
        const depParts = departureDate.split('-');
        const depStr = `${depParts[2]}${depParts[1]}`;

        if (returnDate && returnDate.length > 5) {
            const retParts = returnDate.split('-');
            const retStr = `${retParts[2]}${retParts[1]}`;
            const inboundCode = returnOriginCode || destinationCode;

            if (inboundCode !== destinationCode) {
                // 다구간 (Open Jaw)
                aviaUrl = `https://www.${domain}/search/ICN${depStr}${destinationCode}-${inboundCode}${retStr}ICN1?marker=${TP_MARKER}&currency=${currency}&locale=${locale}`;
            } else {
                // 왕복
                aviaUrl = `https://www.${domain}/search/ICN${depStr}${destinationCode}${retStr}1?marker=${TP_MARKER}&currency=${currency}&locale=${locale}`;
            }
        } else {
            // 편도
            aviaUrl = `https://www.${domain}/search/ICN${depStr}${destinationCode}1?marker=${TP_MARKER}&currency=${currency}&locale=${locale}`;
        }

        // ---------------------------------------------------------
        // 3. API 데이터 조회 (가격 표시용 - Aviasales API 활용)
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
                // ✨ 두 개의 링크 전송
                linkTrip: tripUrl,     // Trip.com (showfarefirst - 바로 가격표)
                linkGlobal: aviaUrl,   // Aviasales
                isFallback: false
            }));
        }

        // 결과가 없거나 로딩 전 보여줄 기본 티켓
        if (flights.length === 0) {
            flights.push({
                id: "fallback_ticket",
                price: 0,
                airline: isKo ? "Trip.com 최저가 검색" : "Search All Airlines",
                carrierCode: "ALL",
                transfers: 0,
                outbound: { depTime: "--:--", duration: 0 },
                linkTrip: tripUrl,
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