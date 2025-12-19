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
      ? `**SUPER LUXURY VIP BUDGET**: 20,000,000 KRW ~ 50,000,000 KRW per person.`
      : `${budget}0,000 KRW per person`;

    // ❗프롬프트 수정: 날씨, 꿀팁, 그리고 **정확한 좌표** 요구
    const prompt = `
      You are a professional travel planner.
      Plan a trip to **${destination}** for **${days} days** (${startDate} ~ ${endDate}).
      
      [User Info]
      - Companion: ${companion}
      - People: ${people}
      - Budget: ${budgetText}
      - Style: ${tourType}
      - Interests: ${themes.join(", ")}
      
      ${isLuxury ? `[💎 LUXURY MODE] Use budget 20m~50m KRW. High-end only.` : ""}

      [CRITICAL INSTRUCTION FOR COORDINATES]
      - **DO NOT GUESS COORDINATES.** If you guess, hotels end up in the ocean.
      - Provide REAL, PRECISE latitude/longitude for the specific hotel/place.
      - If you are unsure of the exact location, use the city center coordinates of ${destination}, but try to be precise.

      [Response Format]
      Return ONLY raw JSON. Structure:
      {
        "tripTitle": "Title",
        "weather": "Brief weather forecast for ${startDate} in ${destination} (e.g., '맑음, 평균 20도').",
        "travelTips": ["Tip 1", "Tip 2", "Tip 3"],
        "budgetBreakdown": ["Item: Cost", ...],
        "estimatedCost": "Total Cost",
        "recommendedHotels": [
          {
            "name": "Hotel Name",
            "priceRange": "Price",
            "description": "Desc",
            "coordinates": { "lat": 35.xxxx, "lng": 139.xxxx } 
          }
        ],
        "itinerary": [
          {
            "day": 1,
            "date": "Date",
            "places": [
              {
                "order": 1,
                "name": "Place",
                "category": "Cat",
                "description": "Desc",
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