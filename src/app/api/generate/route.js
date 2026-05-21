import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const TOUR_API_KEY = "8ed14b467e021a7ef5801d0a9628602170d0414f8ade42814a9cde30ec04f2fb";

// 🌍 공통 CORS 헤더 설정
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // 모든 곳(앱 포함)에서 접속 허용
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

// 🛡️ 1. 사전 검사(OPTIONS) 요청 해결 (앱 통신 필수)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// 🌍 TourAPI 연동 함수 (기존 유지)
async function fetchRealTourData(keyword, language) {
  try {
    const serviceName = language === 'en' ? 'EngService1' : 'KorService1';
    const url = `https://apis.data.go.kr/B551011/${serviceName}/searchKeyword1?serviceKey=${TOUR_API_KEY}&numOfRows=40&pageNo=1&MobileOS=ETC&MobileApp=TripMaker&_type=json&listYN=Y&arrange=O&keyword=${encodeURIComponent(keyword)}`;

    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;

    const data = await res.json();
    const items = data?.response?.body?.items?.item;

    if (items && items.length > 0) {
      const placesList = items.map(item => {
        const type = item.contenttypeid === '39'
          ? (language === 'en' ? 'Restaurant/Cafe' : '음식점/카페')
          : (language === 'en' ? 'Tourist Attraction' : '관광지/명소');

        return `- ${item.title} (${type}, Address: ${item.addr1}, lat: ${item.mapy}, lng: ${item.mapx})`;
      }).join('\n');
      return placesList;
    }
    return null;
  } catch (error) {
    console.error("TourAPI Fetch Error:", error);
    return null;
  }
}

// 🤖 AI 생성 메인 함수
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      destination, startDate, endDate, companion,
      budget, people, hotelType, tourType, transport,
      themes, request, isLuxury, language,
      currentTime, startLocation
    } = body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
    const targetLang = language === 'en' ? 'English' : 'Korean';

    const timeContext = currentTime ? `현재 시간은 ${currentTime}입니다. 만약 오늘(${startDate}) 일정이라면, 이 시간 이후부터 가능한 일정을 짜주세요.` : "";
    const startContext = startLocation ? `사용자의 현재 출발 위치는 "${startLocation}"입니다. 이 위치에서 이동 시간을 고려하여 일정을 짜주세요.` : "";

    const budgetText = isLuxury
      ? (language === 'en' ? `Unlimited` : `1인당 2,000만원 ~ 5,000만원`)
      : (language === 'en' ? `Per person ${budget}0,000 KRW` : `1인당 ${budget}0,000 원`);

    const realTourData = await fetchRealTourData(destination, language);

    const tourApiPrompt = realTourData ? `
      [🚨 TOUR API REAL DATA - CRITICAL PRIORITY]
      You MUST use the following REAL places to build the itinerary.
      IMPORTANT: If you use a place from this list, you MUST include its exact 'lat' and 'lng' in the JSON output!
      
      <Real Places List>
      ${realTourData}
      </Real Places List>
    ` : "";

    const prompt = `
      You are an elite "AI Travel Safety Expert" and a professional travel therapist named "Nyang-Pro".
      Your mission is to plan a **safe and worry-free ${days}-day trip** for a traveler (specifically catering to solo and female travelers where applicable).
      Plan based on the user's input (${startDate} ~ ${endDate}).
      
      [Traveler Context]
      ${timeContext}
      ${startContext}
      
      [Traveler Info]
      User Input (Destination or Mood/Purpose): "${destination}"
      Companion: ${companion}, People: ${people}, Budget: ${budgetText}, Style: ${tourType}
      Preferred Transportation: ${transport ? transport.join(", ") : "Any"}
      
      [🚨 USER REQUEST]
      "${request || "No special request"}"
      
      [CRITICAL SAFETY & SOLO/FEMALE INSTRUCTIONS]
      1. **Safety First**: Prioritize safe neighborhoods with low crime rates. Choose locations that are well-lit and popular (avoiding deserted areas at night).
      2. **Female-Friendly**: Recommend accommodations known for excellent security and positive reviews from female solo travelers.
      3. **Safe Transportation**: Suggest safe and reliable ways to move between places (e.g., well-lit subway stations, reputable taxi apps).
      4. **Peace of Mind**: For every place, emphasize why it is "safe and comfortable" in the "reason" field.
      
      [CRITICAL INSTRUCTIONS FOR TIME & LOCATION]
      1. If "currentTime" is provided and the trip is for today, skip early morning activities and focus on what's possible from now on.
      2. If "startLocation" is provided, ensure the first destination of the day is reachable from the starting point within a reasonable time.
      3. Talk like a caring therapist/safety expert, reassuring the user.

      [CRITICAL INSTRUCTIONS FOR TRANSPORTATION]
      1. Between every place on the same day, you MUST provide a realistic 'transitToNext' string based on the user's Preferred Transportation.
      2. Keep it concise, e.g., "🚗 렌트카 15분", "🚶‍♂️ 도보 5분", "🚌 대중교통 30분", "🚕 택시 10분".
      
      [CRITICAL INSTRUCTIONS FOR DESTINATION INFERENCE]
      1. If the "User Input" is a specific city/country (e.g., "Paris", "Jeju"), plan the trip there.
      2. IF the "User Input" is a MOOD or PURPOSE:
         - YOU MUST INFER AND CHOOSE the absolutely most perfect destination (city/country) that is "Safe" and fits the mood.
         - Make sure to clearly state this chosen destination in the "destination" JSON field.

      [CRITICAL INSTRUCTIONS FOR EMPATHY]
      For EVERY place or food you recommend, you MUST include a "reason" field explaining WHY this matches their mood AND why it is a safe/comfortable choice.

      ${tourApiPrompt}

      [Output Format (JSON Only)]
      Return ONLY the following JSON. Do not use Markdown formatting blocks like \`\`\`json.
      {
        "tripTitle": "Catchy, emotional title reflecting the mood in ${targetLang}",
        "destination": "The exact City/Country chosen (e.g., '삿포로, 일본' or '제주도, 한국')",
        "theme": "The main emotional theme (e.g., 힐링, 로맨스, 안전)",
        "arrivalIata": "3-letter IATA for the chosen destination",
        "departureIata": "3-letter IATA",
        "weather": "Expected weather info",
        "safetyAdvice": "A comprehensive summary of safety tips for this specific destination and traveler type in ${targetLang}",
        "travelTips": ["Practical tip 1", "Tip 2"],
        "budgetBreakdown": ["Detail..."],
        "estimatedCost": "Total Cost String",
        "recommendedHotels": [
          {
            "name": "Hotel Name",
            "priceRange": "Price",
            "description": "Desc explaining the security/comfort level",
            "address": "Address",
            "googleSearchQuery": "Name + City",
            "safetyScore": 9.8,
            "isMainStreet": true,
            "soloFriendly": true
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
                "category": "Category",
                "description": "Description",
                "reason": "Empathetic + Safety-focused reason in ${targetLang}. Why it's good for them and why it's safe.",
                "address": "Address",
                "googleSearchQuery": "Name + City",
                "lat": "Lat",
                "lng": "Lng",
                "transitToNext": "Transit method and estimated time to the next place on the same day (e.g., 🚗 렌트카 15분). Leave empty if it's the last place of the day."
              }
            ]
          }
        ],
        "quiz": [{"question": "Q?", "options": ["A","B","C","D"], "answer": 0}]
      }
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" }); // 모델명 최신화 권장
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const jsonResult = JSON.parse(text);

    // ✅ 응답 시 CORS 헤더를 포함하여 전송
    return NextResponse.json({ result: jsonResult }, {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error("AI Generation Error:", error);
    // ✅ 에러 시에도 CORS 헤더를 보내야 앱에서 에러 메시지를 읽을 수 있음
    return NextResponse.json(
      { error: "Failed to generate plan.", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}