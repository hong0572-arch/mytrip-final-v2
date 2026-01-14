// app/api/flights/route.js
import { NextResponse } from 'next/server';

// 🔑 FlightAPI 키
const FLIGHT_API_KEY = '6965d01a980abf41757c9615';

// 💰 Travelpayouts 토큰
const TP_TOKEN = '4c01a895965a510253489b6eef1e5fde';

export async function POST(req) {
    try {
        const body = await req.json();
        const { destinationCode, departureDate, returnDate } = body;
        const isDetailSearch = !!departureDate;

        // ---------------------------------------------------------
        // 🟢 Case 1: 대시보드 시세 조회 (Travelpayouts)
        // ---------------------------------------------------------
        if (!isDetailSearch) {
            const today = new Date();
            today.setDate(today.getDate() + 30);
            const defaultDate = today.toISOString().split('T')[0];

            const url = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=ICN&destination=${destinationCode}&departure_at=${defaultDate}&currency=krw&limit=1&token=${TP_TOKEN}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.success && data.data && data.data.length > 0) {
                return NextResponse.json({
                    price: data.data[0].price,
                    airline: data.data[0].airline,
                    flightTime: "직항/경유",
                    isReal: true
                });
            }
            return NextResponse.json({ price: null });
        }

        // ---------------------------------------------------------
        // 🔵 Case 2: 상세 리스트 검색 (FlightAPI) - 시간 표시 오류 해결판!
        // ---------------------------------------------------------
        else {
            console.log(`✈️ [상세 검색] ICN <-> ${destinationCode} (${departureDate})`);

            const url = `https://api.flightapi.io/roundtrip/${FLIGHT_API_KEY}/ICN/${destinationCode}/${departureDate}/${returnDate}/1/0/0/Economy/KRW`;

            const res = await fetch(url);
            const textData = await res.text();

            try {
                const data = JSON.parse(textData);

                if (data.itineraries && data.itineraries.length > 0) {
                    const flights = data.itineraries.map(itinerary => {
                        // 1. Leg 정보 찾기
                        const outboundLegId = itinerary.leg_ids[0];
                        const inboundLegId = itinerary.leg_ids[1];

                        const outboundLeg = data.legs.find(l => l.id === outboundLegId);
                        const inboundLeg = data.legs.find(l => l.id === inboundLegId);

                        // 2. 항공사 정보
                        const carrierId = outboundLeg.marketing_carrier_ids ? outboundLeg.marketing_carrier_ids[0] : outboundLeg.carrier_ids[0];
                        const carrierObj = data.carriers ? data.carriers.find(c => c.id === carrierId) : null;
                        const airlineName = carrierObj ? carrierObj.name : (carrierId || "항공사");

                        // 3. 가격 정보
                        const priceOption = itinerary.pricing_options[0];
                        let price = priceOption.price.amount;
                        if (price < 10000) price = Math.round(price * 1450);
                        else price = Math.round(price);

                        // ✨ [핵심 수정] 시간 데이터 추출 로직 강화 (Robust Time Extraction)
                        const getTime = (leg) => {
                            // API가 departureTime(카멜)이나 departure_time(스네이크) 중 하나로 줌 -> 둘 다 체크
                            const rawTime = leg.departureTime || leg.departure_time || leg.departure;

                            if (!rawTime) return "00:00";

                            // Case A: "2026-04-12T09:30:00" (ISO 형식) -> T로 자르기
                            if (rawTime.includes("T")) return rawTime.split("T")[1].substring(0, 5);

                            // Case B: "2026-04-12 09:30:00" (공백 포함) -> 공백으로 자르기
                            if (rawTime.includes(" ")) return rawTime.split(" ")[1].substring(0, 5);

                            // Case C: "09:30" (시간만 있는 경우)
                            return rawTime.substring(0, 5);
                        };

                        // 도착 시간도 동일하게 처리
                        const getArrTime = (leg) => {
                            const rawTime = leg.arrivalTime || leg.arrival_time || leg.arrival;
                            if (!rawTime) return "00:00";
                            if (rawTime.includes("T")) return rawTime.split("T")[1].substring(0, 5);
                            if (rawTime.includes(" ")) return rawTime.split(" ")[1].substring(0, 5);
                            return rawTime.substring(0, 5);
                        };

                        // 5. 소요 시간 계산 (데이터가 없을 경우 계산)
                        const formatDuration = (leg) => {
                            if (leg.duration) {
                                const mins = leg.duration;
                                const h = Math.floor(mins / 60);
                                const m = mins % 60;
                                return `${h}시간 ${m}분`;
                            }
                            return "시간 정보";
                        };

                        return {
                            id: itinerary.id,
                            price: price,
                            airline: airlineName,
                            carrierCode: carrierObj ? carrierObj.code : "N/A",
                            outbound: {
                                duration: formatDuration(outboundLeg),
                                depTime: getTime(outboundLeg), // ✨ 강화된 함수 적용
                                arrTime: getArrTime(outboundLeg)
                            },
                            inbound: {
                                duration: inboundLeg ? formatDuration(inboundLeg) : "오는 편"
                            }
                        };
                    }).slice(0, 10);

                    return NextResponse.json({ flights });
                }

                return NextResponse.json({ flights: [] });

            } catch (e) {
                console.error("JSON Error:", e);
                return NextResponse.json({ flights: [] });
            }
        }

    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}