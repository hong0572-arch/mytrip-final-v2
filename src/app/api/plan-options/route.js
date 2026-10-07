import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateWithRetry } from '../../../lib/geminiRetry';

// 대화 → 일정 후보 3개.
// 1) 대화에서 여행 조건(여행지·날짜·동행·취향)을 읽는다. 꼭 필요한 정보가 없으면 질문 하나와 빠른 답변을 돌려준다.
// 2) 조건이 갖춰지면 콘셉트가 서로 다른 일정 후보 3개를 짧게 만든다(전체 일정은 사용자가 고른 뒤 /api/generate가 만든다).
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

const MAX_TURNS = 16;
const MAX_CHARS = 1200;

export async function POST(req) {
  try {
    const { messages = [], language = 'ko', today } = await req.json();
    const lang = language === 'en' ? 'English' : 'Korean';
    const todayStr = /^\d{4}-\d{2}-\d{2}$/.test(today || '') ? today : new Date().toISOString().slice(0, 10);

    const transcript = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-MAX_TURNS)
      .map((m) => `${m.role === 'user' ? 'Traveler' : 'Timmy'}: ${m.content.slice(0, MAX_CHARS)}`)
      .join('\n');

    if (!transcript) {
      return NextResponse.json({ error: 'Empty conversation' }, { status: 400, headers: corsHeaders });
    }

    const prompt = `
You are Timmy, a travel planner for independent travelers, especially solo and female travelers. Safety and comfort matter.
Today is ${todayStr}. Write all user-facing text in ${lang}.

Read the conversation and decide:

A) If the DESTINATION (a city/region/country, or a clear mood like "warm beach" you can turn into one) or the TRAVEL DATES/LENGTH are missing or ambiguous, ask ONE short friendly question for the most important missing item. Provide 3-4 short quick replies the traveler can tap.
   - Vague dates like "next month", "11월 첫째 주", "3박 4일" are fine: turn them into concrete dates after today. If only the length is known, ask when.
   - Do not ask about things that are optional (budget, companions, style); use sensible defaults.

B) Otherwise, extract the trip request and create THREE clearly different itinerary options (e.g. relaxed vs. packed, different neighborhoods to stay in, different themes). Keep them realistic for the dates. For solo/female travelers, prefer well-lit, central, safe neighborhoods to stay and avoid late-night isolated moves.

STRICT RULES
- If the traveler named a destination, use EXACTLY that place for "request.destination" and all three options. Never replace it with another city. Only choose a destination yourself when the traveler gave a mood instead of a place.
- Dates: compute them carefully from today. "N월 셋째 주" means the third week of that month (around the 15th-21st); "N박 M일" means M days. endDate - startDate + 1 must equal the number of days. "days" must have exactly one line per day.
- "estimatedCost" must be a readable amount with currency, e.g. "1인 약 70만원" or "about $500 per person".
- Respect what the traveler said they like or dislike in every option.

Return ONLY JSON in one of these shapes:

{"type":"question","question":"...","quickReplies":["...","..."]}

{"type":"options",
 "request":{"destination":"City, Country","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","companion":"혼자|연인|친구|가족|비즈니스","people":1,"budget":"per-person budget in units of 10,000 KRW as a number string, e.g. \\"150\\"","tourType":"short style label","request":"traveler's special requests in one sentence"},
 "intro":"one short sentence introducing the three options",
 "options":[
   {"title":"short catchy title","pace":"relaxed|balanced|packed","summary":"one or two sentences","stayArea":"neighborhood to stay","stayAreaReason":"why it is convenient and safe","days":["Day 1: ...","Day 2: ..."],"bestFor":"who this suits","estimatedCost":"rough per-person cost excluding flights"}
 ]}

Conversation:
${transcript}
`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { responseMimeType: 'application/json', temperature: 0.5 },
    });
    const result = await generateWithRetry(model, prompt);
    const text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = JSON.parse(text);

    if (data?.type === 'question' && data.question) {
      return NextResponse.json({
        type: 'question',
        question: String(data.question),
        quickReplies: Array.isArray(data.quickReplies) ? data.quickReplies.slice(0, 4).map(String) : [],
      }, { headers: corsHeaders });
    }

    if (data?.type === 'options' && Array.isArray(data.options) && data.options.length > 0 && data.request?.destination) {
      return NextResponse.json({
        type: 'options',
        request: data.request,
        intro: data.intro || '',
        options: data.options.slice(0, 3).map((o, i) => ({ id: `opt${i + 1}`, ...o, days: Array.isArray(o.days) ? o.days.slice(0, 10) : [] })),
      }, { headers: corsHeaders });
    }

    throw new Error('Unexpected model output');
  } catch (error) {
    console.error('plan-options error:', error);
    return NextResponse.json({ error: 'Failed to create options' }, { status: 500, headers: corsHeaders });
  }
}
