import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const destination = searchParams.get("destination");
    const language = searchParams.get("lang") || "ko";

    if (!destination) {
      return NextResponse.json({ recommendations: [] });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    const prompt = `
      You are an expert travel assistant.
      The user wants to travel to "${destination}", but this location does not have its own major airport or needs alternative entry points.
      Provide up to 3 of the nearest or most commonly used alternative airports for traveling to "${destination}".
      For each airport, provide the airport name, its 3-letter IATA code, and the transit method with estimated travel time from that airport to "${destination}".

      You MUST respond ONLY with a raw JSON array. Do not include any explanation or markdown formatting like \`\`\`json.
      Ensure the language of the 'name' and 'desc' fields matches the requested language: "${language === 'en' ? 'English' : 'Korean'}".

      JSON Schema:
      [
        {
          "name": "Airport Name (e.g., 후쿠오카 공항 or Fukuoka Airport)",
          "code": "3-letter IATA code (e.g., FUK)",
          "desc": "Transit description (e.g., 고속 버스 1시간 40분 or Highway Bus 1h 40m)"
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // 마크다운 백틱 청소
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const recommendations = JSON.parse(cleanText);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("🚨 [AI Airport Recommendation API] Error:", error);
    
    // Fallback: 오류 발생 시 빈 배열 반환
    return NextResponse.json({ recommendations: [] });
  }
}
