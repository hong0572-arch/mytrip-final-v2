import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ⚠️ .env.local 파일에 GEMINI_API_KEY가 설정되어 있어야 합니다.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const body = await req.json();
    const { destination, startDate, endDate, companion, budget, people, hotelType, tourType, themes, request } = body;

    // 날짜 계산
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // AI에게 보낼 프롬프트 (상세 예산 리스트 + 숙소 2개 요청)
    const prompt = `
      You are a professional travel planner with 20 years of experience.
      Plan a detailed trip to **${destination}** for **${days} days** (${startDate} ~ ${endDate}).
      
      [User Info]
      - Companion: ${companion}
      - People: ${people} person(s)
      - Budget per person: ${budget}0,000 KRW (Total: ${budget * people}0,000 KRW)
      - Accommodation: ${hotelType}
      - Style: ${tourType}
      - Interests: ${themes.join(", ")}
      - Request: ${request || "None"}

      [Response Format]
      Return ONLY raw JSON. No Markdown.
      Structure:
      {
        "tripTitle": "Catchy title (e.g., 'Tokyo 3-Day Free Trip with Friends')",
        "budgetBreakdown": [
          "항공권: 00만원 (1인당 00만원)",
          "숙박비: 00만원 (${days - 1}박, 2인 1실 기준)",
          "식비: 00만원 (1인당 약 0만원/일)",
          "교통비: 00만원 (패스권 등 포함)",
          "쇼핑 및 예비비: 00만원"
        ],
        "recommendedHotels": [
          // Recommend exactly 2 hotels
          {
            "name": "Hotel Name",
            "priceRange": "1박 약 00만원",
            "description": "Reason for recommendation (location, vibe, etc.)",
            "coordinates": { "lat": 35.1234, "lng": 139.1234 } 
          },
          {
            "name": "Hotel Name 2",
            "priceRange": "1박 약 00만원",
            "description": "Reason for recommendation",
            "coordinates": { "lat": 35.5678, "lng": 139.5678 } 
          }
        ],
        "itinerary": [
          {
            "day": 1,
            "date": "MM.DD/Day",
            "places": [
              {
                "order": 1,
                "name": "Place Name",
                "category": "Sightseeing/Food/Shopping",
                "description": "Short description of the activity.",
                "coordinates": { "lat": 35.xxxx, "lng": 139.xxxx }
              }
            ]
          }
          // ... Continue for all ${days} days
        ]
      }

      [Rules]
      1. Language: **Korean (한국어)** only.
      2. Coordinates: Must estimate Google Maps lat/lng for every place and hotel.
      3. Budget: Strictly fit within total ${budget * people}0,000 KRW.
    `;

    // 🚀 [사장님 지시사항 절대 준수] Gemini 2.5 Flash Lite 모델 적용
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // 마크다운 제거 및 JSON 파싱
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonResult = JSON.parse(text);

    return NextResponse.json({ result: jsonResult });

  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json(
      { error: "여행 일정을 생성하는 도중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}