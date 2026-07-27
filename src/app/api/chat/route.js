import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, history = [], userContext = {}, imageUrl = null } = body;
    const { language = 'ko', memories = [], currentTrip, location, upcomingTrip } = userContext;

    // Build memory context
    const memoryContext = memories.length > 0
      ? `\n[User Memories - Things you know about this user]\n${memories.map(m => `- ${m.category}: ${m.content}`).join('\n')}\n`
      : '';

    // Build trip context  
    const tripContext = currentTrip
      ? `\n[Current Active Trip]\nDestination: ${currentTrip.destination}\nDates: ${currentTrip.startDate} ~ ${currentTrip.endDate}\nCompanion: ${currentTrip.companion || 'Unknown'}\n`
      : '';

    // Build location context
    const locationContext = location
      ? `\n[User's Current Location]\nLatitude: ${location.lat}, Longitude: ${location.lng}\n`
      : '';

    // Build upcoming trip context (Phase 3)
    const upcomingTripContext = upcomingTrip
      ? `\n[Upcoming Trip Context]\nDestination: ${upcomingTrip.destination}\nDays Until Departure: ${upcomingTrip.daysUntilDeparture}\nWeather Forecast: ${upcomingTrip.weatherForecast}\nNote: When suggesting a packing list or answering questions about this trip, make sure to consider this weather forecast.\n`
      : '';

    const targetLang = language === 'en' ? 'English' : 'Korean';

    const systemPrompt = `You are "Timmy" (티미), a professional AI travel assistant by TripMaker.

[Identity & Tone]
- You are a knowledgeable, reliable travel expert with a warm but professional demeanor.
- Speak in ${targetLang}.
- Be concise and actionable. Avoid unnecessary filler.
- Use a few relevant emojis sparingly for warmth (not excessively cute).
- You may use your cat character name naturally, but keep it professional.

[Core Capabilities]
1. Trip Planning: Create detailed itineraries based on user preferences.
2. Destination Recommendations: Suggest destinations based on mood, budget, season.
3. Packing Assistance: Weather-based packing checklists.
4. Safety Guidance: Safety tips, emergency contacts, safe neighborhoods.
5. Local Knowledge: Restaurant suggestions, cultural tips, etiquette.
6. Budget Estimation: Realistic cost breakdowns.
7. Translation Assistance: Help with phrases and communication. If an image is provided, analyze the text (e.g. menus, signs) and translate it naturally into ${targetLang}, providing cultural context if necessary.

[Response Guidelines]
- If the user asks to create an itinerary, gather key info (destination, dates, budget, companion, preferences) through natural conversation. Don't ask everything at once — be conversational.
- When you learn something new about the user (food preferences, travel style, allergies, etc.), mention it naturally: "참고로 기억해둘게요 — [preference] 🧠"
- For safety-related questions, always provide thorough, specific advice.
- If you don't have enough info, ask a focused follow-up question.
- Keep responses under 300 words unless the user asks for detailed information.

[App Usage & Feature Recommendations]
- Proactively suggest and explain the features of the TripMaker app when relevant to the user's conversation.
- Key features you should recommend and explain:
  1. AI Chat (나만의 AI 코치 티미): You! Provide travel planning, safety tips, and local insights.
  2. Safe Mode (안전 모드): A critical safety feature. When activated, the floating Timmy button turns into a red shield. Provides emergency contacts, safe zones, and location sharing.
  3. Travel Diary (여행 다이어리): Automatically summarizes and saves your travel memories. Accessible via the main floating Timmy button.
  4. Flight Search (항공권 검색): Find and compare real-time flights easily.
  5. Companion Matching (동행매칭): Find travel buddies safely.
  6. Trip Money (트립머니): Manage travel budget and track expenses.
- If the user asks "How do I use this app?", provide a friendly overview of these features and how to access them via the bottom navigation bar and the floating Timmy button.


[Memory Extraction]
After each response, if you detected new user preferences or important information, append a JSON block at the very end of your response in this exact format:
<!--MEMORY_EXTRACT:{"category":"dietary|travel_style|budget|accommodation|transport|general","content":"what you learned","confidence":0.9}-->
Only include this if you genuinely learned something new. Do not include it for every message.

${memoryContext}
${tripContext}
${locationContext}
${upcomingTripContext}`;

    // Build conversation history for Gemini (Extract text first)
    const rawHistory = history.slice(-20).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      text: msg.content
    }));

    // Ensure Gemini history rules: Alternating roles (merge consecutive messages of the same role)
    let chatHistory = [];
    for (const msg of rawHistory) {
      if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === msg.role) {
        // Merge texts
        chatHistory[chatHistory.length - 1].parts[0].text += `\n\n${msg.text}`;
      } else {
        // Add new message
        chatHistory.push({ role: msg.role, parts: [{ text: msg.text }] });
      }
    }

    // Ensure Gemini history rules: First message must be 'user'
    if (chatHistory.length > 0 && chatHistory[0].role === 'model') {
      chatHistory.unshift({ role: 'user', parts: [{ text: "안녕" }] });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: { parts: [{ text: systemPrompt }] },
    });

    let msgContent = message;
    if (imageUrl) {
      // Parse base64 image (assumes format like "data:image/jpeg;base64,...")
      const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        msgContent = [
          { text: message || "이 이미지에 있는 텍스트를 파악하고 번역해줘." },
          {
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          }
        ];
      }
    }

    const result = await chat.sendMessage(msgContent);
    const response = await result.response;
    const text = response.text();

    // Extract memory if present
    let extractedMemory = null;
    const memoryMatch = text.match(/<!--MEMORY_EXTRACT:(.*?)-->/s);
    if (memoryMatch) {
      try {
        extractedMemory = JSON.parse(memoryMatch[1]);
      } catch (e) {
        // ignore parse errors
      }
    }

    // Clean response text (remove memory extraction tag)
    const cleanText = text.replace(/<!--MEMORY_EXTRACT:.*?-->/s, '').trim();

    return NextResponse.json({
      reply: cleanText,
      memory: extractedMemory,
    }, { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message.', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
