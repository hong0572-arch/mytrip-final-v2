import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const body = await req.json();
    const { keyword, imageBase64, mimeType, location, date } = body;

    const systemPrompt = `You are a talented travel writer who writes personal travel diaries.
Your task is to write a short, emotional, and poetic diary entry based on the user's input.
The diary should feel like an essay, reflecting on the mood, the scenery, and the experience.

Guidelines:
1. Tone: Emotional, calm, and reflective (에세이 감성). Use polite but thoughtful Korean (해요체 or 해라체, but keep it poetic).
2. Length: Around 3-4 short paragraphs.
3. Incorporate the provided location and date naturally if available.
4. If an image is provided, describe the visual elements or the mood it evokes.
5. If keywords are provided, weave them seamlessly into the narrative.
6. The output MUST be formatted as a JSON object with two fields:
   - "title": A poetic title for this diary entry.
   - "content": The main diary text.`;

    const model = genAI.getGenerativeModel({ 
        model: 'gemini-3.1-flash-lite',
        systemInstruction: { parts: [{ text: systemPrompt }] }
    });

    const promptParts = [];
    
    let userPrompt = `Please write a diary entry.\n`;
    if (location) userPrompt += `Location: ${location}\n`;
    if (date) userPrompt += `Date: ${date}\n`;
    if (keyword) userPrompt += `Keywords: ${keyword}\n`;
    
    promptParts.push({ text: userPrompt });

    if (imageBase64 && mimeType) {
      promptParts.push({
        inlineData: {
          mimeType: mimeType,
          data: imageBase64
        }
      });
    }

    const result = await model.generateContent(promptParts);
    const responseText = result.response.text();
    
    // Parse JSON from response
    // Sometimes the model wraps JSON in markdown code blocks like ```json ... ```
    let parsedData = { title: '나의 여행 일기', content: responseText };
    try {
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            parsedData = JSON.parse(jsonStr);
        }
    } catch (parseError) {
        console.warn('Failed to parse JSON from AI response, using fallback.');
    }

    return NextResponse.json({ diary: parsedData });
  } catch (error) {
    console.error('Error generating diary:', error);
    return NextResponse.json({ error: 'Failed to generate diary' }, { status: 500 });
  }
}
