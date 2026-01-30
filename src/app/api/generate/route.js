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
      themes, request, isLuxury, language // ✨ language 변수
    } = body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // ✨ 언어 설정
    const targetLang = language === 'en' ? 'English' : 'Korean';

    // 초호화 모드 처리
    const budgetText = isLuxury
      ? (language === 'en'
        ? `**Ultra Luxury VIP Budget**: Unlimited (Best Luxury Service)`
        : `**초호화 VIP 예산**: 1인당 2,000만원 ~ 5,000만원 (최고급 서비스 이용)`)
      : (language === 'en'
        ? `Per person ${budget}0,000 KRW (Approx)`
        : `1인당 ${budget}0,000 원`);

    // 🚀 프롬프트 수정: 빌드 에러 방지를 위해 내부 백틱(\`) 앞에 역슬래시(\) 추가
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
      1. **Language & Naming Rule (VERY IMPORTANT)**:
         - **DESCRIPTIONS, TITLE, QUIZ**: Write in **${targetLang}**.
         - **PLACE NAMES (\`name\` field)**: MUST be in **English or Local Language** (e.g., "Senso-ji", "Eiffel Tower", "Universal Studios Japan"). 
         - **DO NOT** use Korean for the 'name' field to ensure map accuracy.

      2. **Distance & Grouping (Strict Limits)**:
         - **Daily Limit**: Total travel distance per day must be **under 100km**.
         - **Proximity**: Distance between spots on the same day must be **under 30km**.
         - **Optimization**: Group activities by **Neighborhood/Area** (e.g., Day 1: North Area, Day 2: Central Area).
         - **NO TELEPORTING**: Do not verify locations that are far apart.

      3. **Map Data**:
         - **STOP generating GPS coordinates (lat/long).**
         - Instead, provide the **specific search query** for Google Maps.
         - Provide a short **Address** or Area name in English/Local.

      4. **Quiz Generation**:
         - Create 3 fun trivia questions about **${destination}**.
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
                "category": "Restaurant/Spot/Cafe",
                "description": "Description (in ${targetLang})",
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
          },
          ... (Total 3 questions)
        ]
      }
    `;

    // 모델 설정 (gemini-2.5-flash-lite)
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