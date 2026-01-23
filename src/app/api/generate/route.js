import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// API 키 환경변수 가져오기
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    // 1. 클라이언트(page.js)에서 보낸 데이터 받기
    const body = await req.json();
    const {
      destination, startDate, endDate, companion,
      budget, people, hotelType, tourType,
      themes, request, isLuxury, language // ✨ language 변수 추가됨
    } = body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // ✨ 언어 설정 (기본값: 한국어)
    const targetLang = language === 'en' ? 'English' : 'Korean';

    // 초호화 모드 처리 (언어에 따라 화폐 단위 변경)
    const budgetText = isLuxury
      ? (language === 'en'
        ? `**Ultra Luxury VIP Budget**: Unlimited (Best Luxury Service)`
        : `**초호화 VIP 예산**: 1인당 2,000만원 ~ 5,000만원 (최고급 서비스 이용)`)
      : (language === 'en'
        ? `Per person ${budget}0,000 KRW (Approx)`
        : `1인당 ${budget}0,000 원`);

    // 🚀 프롬프트 구성
    const prompt = `
      You are a professional travel planner and guide "Nyang-Pro".
      Plan a **${days}-day trip** to **${destination}** (${startDate} ~ ${endDate}).
      Also, create **3 interesting quiz questions** about **${destination}**.
      
      [Traveler Info]
      - Companion: ${companion}
      - People: ${people}
      - Budget: ${budgetText}
      - Style: ${tourType}
      - Themes: ${themes ? themes.join(", ") : "None"}
      - Request: ${request || "None"}
      - VIP Mode: ${isLuxury ? "ON (Recommend ONLY best luxury spots)" : "OFF"}

      [🚨 CRITICAL INSTRUCTIONS]
      1. **Language**:
         - **Write EVERYTHING in ${targetLang}.**
         - Place names should be in **${targetLang} (Local/English Name)** format.
         - Example (if Korean): "한시장 (Han Market)"
         - Example (if English): "Han Market (Chợ Hàn)"

      2. **Geographical Restriction**:
         - All recommendations MUST be real places inside **${destination}**.
         - Do NOT hallucinate places from other cities. Verify location before recommending.

      3. **Specific Place Names**:
         - ❌ NO abstract terms like "Shopping", "Lunch", "Massage".
         - ✅ USE real specific names searchable on Google Maps.
         - Example: "Lotte Mart Danang", "Cong Caphe Branch 1"

      4. **Coordinates**:
         - Provide accurate latitude/longitude for maps.

      5. **Quiz Generation**:
         - Create 3 fun trivia questions about **${destination}**.
         - Format: 4 options, answer index (0-3).
         - Write questions/options in **${targetLang}**.

      [Output Format (JSON Only)]
      Return ONLY the following JSON. Do NOT include markdown code blocks.
      {
        "tripTitle": "Creative Trip Title (in ${targetLang})",
        "weather": "Weather forecast (in ${targetLang})",
        "travelTips": ["Tip 1", "Tip 2", "Tip 3"],
        "budgetBreakdown": ["Flights: ...", "Accommodation: ...", ...],
        "estimatedCost": "Total Estimated Cost",
        "recommendedHotels": [
          {
            "name": "Hotel Name",
            "priceRange": "Price per night",
            "description": "Short description",
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
                "name": "Place Name", 
                "category": "Restaurant/Spot/Cafe",
                "description": "Description",
                "coordinates": { "lat": 35.xxxx, "lng": 139.xxxx }
              }
            ]
          }
        ],
        "quiz": [
          {
            "question": "Q1. Question in ${targetLang}?",
            "options": ["Opt1", "Opt2", "Opt3", "Opt4"],
            "answer": 0 
          },
          ... (Total 3 questions)
        ]
      }
    `;

    // 모델 설정 (Gemini 1.5 Flash 사용 권장 - 속도/비용 최적화)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // AI 생성 요청
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // JSON 파싱 (마크다운 제거)
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonResult = JSON.parse(text);

    return NextResponse.json({ result: jsonResult });

  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate plan." },
      { status: 500 }
    );
  }
}