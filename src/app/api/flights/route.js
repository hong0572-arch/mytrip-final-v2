import { NextResponse } from 'next/server';
import { admin } from '../../../lib/firebaseAdmin';

// 🔑 Travelpayouts 설정
const TP_TOKEN = '4c01a895965a510253489b6eef1e5fde';
const TP_MARKER = '695932';

// 🔑 Trip.com 설정
const TRIP_ALLIANCE_ID = '7681311';
const TRIP_SID = '287502125';
const TRIP_SUB3 = 'D11411381';

export async function POST(req) {
    try {
        const body = await req.json();
        const { destinationCode, destinationName, returnOriginCode, departureDate, returnDate, language, isMember } = body;

        if (!destinationCode || !departureDate) {
            return NextResponse.json({ error: "필수 정보 누락" }, { status: 400 });
        }

        const isKo = language !== 'en';

        // ---------------------------------------------------------
        // 🇰🇷 1. Trip.com 링크 생성 (✨ 찾아주신 링크 포맷 적용)
        // ---------------------------------------------------------
        let tripUrl = null;
        let tripUrlMobile = null;

        if (isKo) {
            // ✨ Endpoint를 'showfarefirst'로 변경
            const tripBase = "https://kr.trip.com/flights/showfarefirst";

            // 공항 코드: 예시 링크처럼 소문자로 변환 (sel, bki 등)
            const depCode = 'icn';
            const arrCode = destinationCode.toLowerCase();

            // ✨ 파라미터 구성 (찾아주신 링크 참조)
            // dcity, acity, ddate, class=y, quantity=1, locale, curr 등
            let params = `dcity=${depCode}&acity=${arrCode}&ddate=${departureDate}&class=y&quantity=1&locale=ko-KR&curr=KRW`;

            // 추가 옵션 파라미터
            params += `&lowpricesource=searchform&searchboxarg=t&nonstoponly=off`;

            // ✨ 중요: 왕복/편도 파라미터가 'flighttype' -> 'triptype'으로 변경됨
            if (returnDate && returnDate.length > 5) {
                params += `&rdate=${returnDate}&triptype=rt`; // 왕복
            } else {
                params += `&triptype=ow`; // 편도
            }

            // 제휴 ID 붙이기
            const ids = `&Allianceid=${TRIP_ALLIANCE_ID}&SID=${TRIP_SID}&trip_sub3=${TRIP_SUB3}`;

            // 최종 URL 생성
            tripUrl = `${tripBase}?${params}${ids}`;
            tripUrlMobile = tripUrl; // 모바일도 동일 링크 사용
        }

        // ---------------------------------------------------------
        // 🇺🇸 2. Aviasales 링크 생성 (기존 유지)
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
        // 3. API 데이터 조회 (기존 유지)
        // ---------------------------------------------------------
        let apiCurrency = isKo ? 'krw' : 'usd';
        let baseUrl = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates`;
        let paramsAPI = new URLSearchParams({
            origin: 'ICN',
            destination: destinationCode,
            departure_at: departureDate,
            currency: apiCurrency,
            sorting: 'price',
            direct: 'false',
            limit: '30',
            token: TP_TOKEN
        });
        if (returnDate) paramsAPI.append('return_at', returnDate);

        const res = await fetch(`${baseUrl}?${paramsAPI.toString()}`);
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
                linkTrip: tripUrl,
                linkTripMobile: tripUrlMobile,
                linkGlobal: aviaUrl,
                isFallback: false
            }));
        }

        // 결과 없을 때 Fallback Ticket
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

        // 🌟 [서버 사이드 캐싱] 사용자가 회원(isMember === true)인 경우에만 Firebase Admin 권한으로 Firestore 캐시 저장
        if (isMember && flights.length > 0) {
            const validFlights = flights.filter(f => !f.isFallback && f.price > 0);
            if (validFlights.length > 0) {
                const cheapestFlight = validFlights[0];
                try {
                    const db = admin.firestore();
                    const parsedDate = new Date(departureDate);
                    
                    const weekDaysKo = ['일', '월', '화', '수', '목', '금', '토'];
                    const weekDaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const dayNameKo = weekDaysKo[parsedDate.getDay()];
                    const dayNameEn = weekDaysEn[parsedDate.getDay()];

                    const CITY_NAME_MAP = {
                        'ICN': { ko: '서울', en: 'Seoul' },
                        'CJU': { ko: '제주', en: 'Jeju' },
                        'NRT': { ko: '도쿄', en: 'Tokyo' },
                        'KIX': { ko: '오사카', en: 'Osaka' },
                        'PVG': { ko: '상하이', en: 'Shanghai' },
                        'DAD': { ko: '다낭', en: 'Da Nang' },
                        'DPS': { ko: '발리', en: 'Bali' },
                        'BKK': { ko: '방콕', en: 'Bangkok' },
                        'CDG': { ko: '파리', en: 'Paris' },
                        'LHR': { ko: '런던', en: 'London' },
                        'FCO': { ko: '로마', en: 'Rome' },
                        'HNL': { ko: '하와이', en: 'Honolulu' }
                    };

                    const matchedNames = CITY_NAME_MAP[destinationCode] || { ko: destinationName || destinationCode, en: destinationCode };

                    await db.collection('flight_deals_cache').doc(destinationCode).set({
                        city: matchedNames.ko,
                        enCity: matchedNames.en,
                        code: destinationCode,
                        price: cheapestFlight.price,
                        depDate: departureDate,
                        displayDate: `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}(${dayNameKo}) 출발`,
                        displayDateEn: `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}(${dayNameEn}) Dep`,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        isReal: true
                    });
                    console.log(`[Server Flight Cache] Successfully saved ${destinationCode} cheapest deal: ₩${cheapestFlight.price}`);
                } catch (dbErr) {
                    console.error("🚨 [Server Flight Cache] Firebase Admin DB Save failed:", dbErr);
                }
            }
        }

        return NextResponse.json({ flights });

    } catch (error) {
        console.error("🚨 서버 에러:", error);
        return NextResponse.json({ error: "서버 오류 발생" }, { status: 500 });
    }
}