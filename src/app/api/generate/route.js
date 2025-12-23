import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const body = await req.json();
    const { destination, startDate, endDate, companion, budget, people, hotelType, tourType, themes, request, isLuxury } = body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // 초호화 모드 처리
    const budgetText = isLuxury
      ? `**초호화 VIP 예산**: 1인당 2,000만원 ~ 5,000만원. (최고급 서비스 이용)`
      : `1인당 ${budget}0,000 원`;

    // 🚀 프롬프트 업그레이드: 지역 제한 + 한국어 강제
    const prompt = `
      당신은 전문 여행 플래너입니다.
      **${destination}** 여행 일정을 **${days}일간** (${startDate} ~ ${endDate}) 계획해주세요.
      
      [여행자 정보]
      - 동행: ${companion}
      - 인원: ${people}명
      - 예산: ${budgetText}
      - 스타일: ${tourType}
      - 관심사: ${themes.join(", ")}
      - 추가 요청: ${request}
      
      ${isLuxury ? `[💎 LUXURY MODE] 예산 2,000만원 이상. 최고급 호텔, 파인다이닝, 전용 차량 등 럭셔리 옵션만 포함할 것.` : ""}

      [🚨 절대 준수 사항 (CRITICAL INSTRUCTIONS)]
      1. **언어 (Language)**:
         - **무조건 한국어로 작성할 것.**
         - 단, 장소명은 **한국어 (현지/영어명)** 형식으로 병기할 것. 
         - 예시: "한시장 (Han Market)", "마담란 (Madam Lan)"

      2. **지역 제한 (Geographical Restriction)**:
         - 모든 추천 장소(호텔, 식당, 관광지)는 반드시 **${destination}** 지역 내에 실제로 존재하는 곳이어야 함.
         - ❌ 다른 국가나 도시의 동명 이인 장소를 절대 포함하지 말 것. (예: 다낭 여행인데 서울의 용다리를 추천하지 말 것)
         - 장소를 선정하기 전, 해당 장소가 **${destination}**에 있는지 스스로 검증할 것.

      3. **구체적인 장소명 (Specific Place Names)**:
         - ❌ "쇼핑", "점심 식사", "마사지", "호텔 체크인" 같은 추상적인 표현 금지.
         - ✅ 구글 지도에서 검색 가능한 **실제 상호명**을 사용할 것.
         - 예시: "롯데마트 다낭점 (Lotte Mart Danang)", "콩카페 1호점 (Cong Caphe)"

      4. **좌표 (Coordinates)**:
         - 해당 장소의 정확한 위도(lat)/경도(lng)를 제공할 것.
         - 대충 추측하지 말고 정확한 위치를 찾아서 입력할 것.

      [응답 형식 (JSON Only)]
      반드시 아래 JSON 형식만 반환하시오:
      {
        "tripTitle": "여행 제목 (예: 다낭 3박 4일 힐링 여행)",
        "weather": "${startDate} 무렵 ${destination}의 예상 날씨 설명.",
        "travelTips": ["꿀팁 1", "꿀팁 2", "꿀팁 3"],
        "budgetBreakdown": ["항공권: 약 00만원", "숙박: 약 00만원", ...],
        "estimatedCost": "총 예상 비용",
        "recommendedHotels": [
          {
            "name": "호텔 이름 (영문명)",
            "priceRange": "1박 가격대",
            "description": "호텔 설명",
            "coordinates": { "lat": 35.xxxx, "lng": 139.xxxx } 
          }
        ],
        "itinerary": [
          {
            "day": 1,
            "date": "YYYY-MM-DD",
            "places": [
              {
                "order": 1,
                "name": "장소명 (영문명)", 
                "category": "식당/관광/카페 등",
                "description": "방문 이유 및 설명",
                "coordinates": { "lat": 35.xxxx, "lng": 139.xxxx }
              }
            ]
          }
        ]
      }
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonResult = JSON.parse(text);

    return NextResponse.json({ result: jsonResult });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to generate plan." }, { status: 500 });
  }
}