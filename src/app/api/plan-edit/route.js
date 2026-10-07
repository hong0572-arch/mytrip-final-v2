import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateWithRetry } from '../../../lib/geminiRetry';

// 하루 일정 고치기: "4번 대신 조용한 저녁 식당 넣어 줘" 같은 요청으로 그날 장소 목록을 바꾼다.
// 그대로 둔 장소는 이름을 똑같이 돌려줘서 화면이 기존 좌표·설명을 다시 쓸 수 있게 한다.
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { destination = '', dayNumber = 1, places = [], instruction = '', language = 'ko' } = await req.json();
    const text = String(instruction).slice(0, 500).trim();
    if (!text || !Array.isArray(places)) {
      return NextResponse.json({ error: 'Missing instruction' }, { status: 400, headers: corsHeaders });
    }
    const lang = language === 'en' ? 'English' : 'Korean';
    const list = places.slice(0, 15).map((p, i) => `${i + 1}. ${String(p.name || '').slice(0, 80)} (${String(p.category || '').slice(0, 30)})`).join('\n');

    const prompt = `
You edit one day of a travel itinerary in ${destination}. Day ${dayNumber}. Write text in ${lang}.
Current stops (in order):
${list || '(none)'}

Traveler's request: "${text}"

Apply the request with the smallest sensible change. Keep stops the traveler did not mention, using EXACTLY the same names.
New stops must be real, well-known places in ${destination}, close to the other stops, and safe for a solo traveler (busy, well-lit areas in the evening).
Return ONLY JSON:
{"places":[{"name":"...","category":"short category","description":"one sentence","reason":"why it fits and why it is safe/comfortable","lat":number|null,"lng":number|null}],"message":"one short sentence describing what changed"}
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite', generationConfig: { responseMimeType: 'application/json', temperature: 0.4 } });
    const result = await generateWithRetry(model, prompt);
    const data = JSON.parse(result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim());
    if (!Array.isArray(data?.places)) throw new Error('Unexpected model output');

    return NextResponse.json({
      places: data.places.slice(0, 15).map((p) => ({
        name: String(p.name || '').slice(0, 120),
        category: p.category ? String(p.category).slice(0, 40) : '',
        description: p.description ? String(p.description).slice(0, 300) : '',
        reason: p.reason ? String(p.reason).slice(0, 300) : '',
        lat: Number.isFinite(Number(p.lat)) ? Number(p.lat) : null,
        lng: Number.isFinite(Number(p.lng)) ? Number(p.lng) : null,
      })).filter((p) => p.name),
      message: data.message ? String(data.message).slice(0, 200) : '',
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('plan-edit error:', error);
    return NextResponse.json({ error: 'Failed to edit plan' }, { status: 500, headers: corsHeaders });
  }
}
