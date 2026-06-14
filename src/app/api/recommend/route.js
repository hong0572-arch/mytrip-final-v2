import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { destination, category, language } = body;
    const targetLang = language === 'en' ? 'English' : 'Korean';

    const prompt = `
      You are "Nyang-Pro", an elite AI travel advisor.
      Recommend exactly 3 safe, popular, and excellent places for the category "${category}" in "${destination}".
      For each place, provide a warm safety-focused recommendation.
      
      Return ONLY the following JSON. Do not use Markdown formatting blocks like \`\`\`json.
      {
        "places": [
          {
            "name": "Place Name",
            "category": "${category}",
            "description": "Short description of the place",
            "reason": "Why it is recommended (empathetic + safety description) in ${targetLang}",
            "address": "Street address of the place",
            "googleSearchQuery": "Place Name + City",
            "lat": 37.5665,
            "lng": 126.9780,
            "phone": "02-123-4567"
          }
        ]
      }
    `;

    // Using gemini-1.5-flash as it is fast and reliable for simple structured queries
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const jsonResult = JSON.parse(text);

    return NextResponse.json({ result: jsonResult }, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("AI Recommendation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation.", details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
