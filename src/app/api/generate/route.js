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
      themes, request, isLuxury, language
    } = body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // 언어 설정
    const targetLang = language === 'en' ? 'English' : 'Korean';

    // 초호화 모드 처리
    const budgetText = isLuxury
      ? (language === 'en'
        ? `**Ultra Luxury VIP Budget**: Unlimited (Best Luxury Service)`
        : `**초호화 VIP 예산**: 1인당 2,000만원 ~ 5,000만원 (최고급 서비스 이용)`)
      : (language === 'en'
        ? `Per person ${budget}0,000 KRW (Approx)`
        : `1인당 ${budget}0,000 원`);

    // 🚀 프롬프트 수정: 공항 코드(IATA) 자동 추출 로직 추가!
    const prompt = `
      You are a professional travel planner "Nyang-Pro".
      Plan a **${days}-day trip** to **${destination}** (${startDate} ~ ${endDate}).
      Also, create **3 interesting quiz questions** about **${destination}**.
      
      [Traveler Info]
      - Companion: ${companion}
      - People: ${people}
      - Budget: ${budgetText}
      - Style: ${tourType}
      - Themes: ${themes ? themes.join(", ") : "None"}
      - VIP Mode: ${isLuxury ? "ON" : "OFF"}

      [🚨 USER'S SPECIAL REQUEST - MUST FOLLOW PRIORITY]
      "${request || "No special request"}"

      [🚨 CRITICAL INSTRUCTIONS]
      1. **User's Custom Request Priority (Highest Priority)**:
         - If the user asked for "Shopping", include specific malls, outlets, or streets (e.g., 'The Mall' in Florence).
         - If the user asked for "Flea Markets", include famous local markets with their specific names.
         - If the user asked for "Restaurants", include specific local restaurant names.

      2. **Start & End City (Crucial for Open-Jaw Flights)**:
         - **IF** the user specified a "Start City" (e.g., "Nice IN") in the request, **Day 1 MUST** start in that city.
         - **IF** the user specified an "End City" (e.g., "Marseille OUT") in the request, **The Last Day MUST** end in that city.
         - **Explicitly write** "Arrive at [City Name]" in Day 1 description.
         - **Explicitly write** "Depart from [City Name]" in Last Day description.

      3. **Language & Naming Rule**:
         - **DESCRIPTIONS, TITLE, QUIZ**: Write in **${targetLang}**.
         - **PLACE NAMES (\`name\` field)**: MUST be in **English or Local Language** (e.g., "Senso-ji", "Eiffel Tower"). 
         - **DO NOT** use Korean for the 'name' field to ensure map accuracy.

      4. **Distance & Grouping**:
         - Daily Limit: Under 100km.
         - Proximity: Under 30km between spots.
         - Optimization: Group activities by Area.
         - NO TELEPORTING.

      5. **Map Data**:
         - NO GPS coordinates. Provide specific **Google Search Queries**.

      6. **Airport IATA Codes (CRUCIAL FOR FLIGHT SEARCH)**:
         - Find the most appropriate 3-letter IATA airport code for the starting city and ending city.
         - **arrivalIata**: The closest major airport to start the trip. (e.g., If destination is "Gili Islands", the nearest is "LOP" or "DPS").
         - **departureIata**: The closest major airport to end the trip. If it's a round trip, this is usually the same as arrivalIata.

      [Output Format (JSON Only)]
      Return ONLY the following JSON. Do NOT include markdown code blocks.
      {
        "tripTitle": "Creative Trip Title (in ${targetLang})",
        "arrivalIata": "3-letter IATA code (e.g., JFK)",
        "departureIata": "3-letter IATA code (e.g., LAX)",
        "weather": "Weather forecast (in ${targetLang})",
        "travelTips": ["Tip 1", "Tip 2", "Tip 3"],
        "budgetBreakdown": ["Flights: ...", "Accommodation: ...", ...],
        "estimatedCost": "Total Estimated Cost",
        "recommendedHotels": [
          {
            "name": "Hotel Name (English/Local)",
            "priceRange": "Price per night",
            "description": "Short description (in ${targetLang})",
            "address": "Short Address or Area (English/Local)",
            "googleSearchQuery": "Hotel Name + City"
          }
        ],
        "itinerary": [
          {
            "day": 1,
            "date": "YYYY-MM-DD",
            "places": [
              {
                "order": 1,
                "name": "Place Name (English/Local ONLY)", 
                "category": "Restaurant/Spot/Cafe/Shopping",
                "description": "Description (in ${targetLang}). Include 'Arrive at [City]' if Day 1.",
                "address": "Short Address (English/Local)",
                "googleSearchQuery": "Place Name + City"
              }
            ]
          }
        ],
        "quiz": [
          {
            "question": "Q1. Question in ${targetLang}?",
            "options": ["Opt1", "Opt2", "Opt3", "Opt4"],
            "answer": 0 
          }
        ]
      }
    `;

    // 모델 설정
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

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