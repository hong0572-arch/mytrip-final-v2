import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const body = await req.json();
    // ✅ requests(요청사항) 추가
    let { destination, startDate, endDate, people, budget, themes, hotelType, tourType, requests } = body;

    let daysText = "일정 미정";
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      daysText = `${diffDays - 1}박 ${diffDays}일`;
    }

    const safePeople = people || 2;
    const safeHotel = hotelType || "호텔";
    const safeTourType = tourType || "자유여행";
    const totalBudget = budget * safePeople;
    const safeRequests = requests || "없음";

    const systemPrompt = `
      당신은 '감성 여행 슈퍼앱'의 AI 엔진입니다. 
      사용자에게 보여질 **모바일 앱 화면(View) HTML**을 생성하세요.

      [🎨 디자인 컨셉: Emotional Coral]
      1. 메인 컬러: 코랄 핑크(#FF5A5F).
      2. UI: 흰색 둥근 카드, 부드러운 그림자.
      3. 필수: 장소명 옆에 <a href='https://www.google.com/maps/search/?api=1&query=장소명' target='_blank'>📍</a> 링크 삽입.

      [🚨 작성 규칙]
      1. **❌ 제목/헤더 금지:** 앱 상단에 표시되므로 본문만 작성.
      2. **✅ 고객 요청 반영:** 사용자의 **추가 요청사항("${safeRequests}")**을 꼼꼼히 반영하여 일정이나 꿀팁에 적으세요.
      3. **통합 타임라인:** 맛집/쇼핑을 일정 중간에 자연스럽게 배치.
      4. **완주 필수:** ${daysText} 전체 일정 작성.

      [📱 HTML 구조]
      <div style="font-family: 'Pretendard', sans-serif;">
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
           </div>

        <div style="background: white; border-radius: 20px; padding: 20px; margin-bottom: 20px; border: 1px solid #eee;">
           <h3 style="color: #333; margin: 0 0 10px 0;">🏨 ${safeHotel} 추천</h3>
           </div>
        
        <div style="background: #FFF5F6; padding: 15px; border-radius: 15px; margin-bottom: 20px;">
           <strong style="color: #FF5A5F;">💡 맞춤 여행 Tip</strong>
           <p style="font-size: 13px; color: #555; margin-top:5px;">고객님의 요청("${safeRequests}")을 반영하여... (AI의 답변)</p>
        </div>

        <details open style="background: white; border-radius: 20px; padding: 15px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
           <summary style="font-weight: 800; color: #FF5A5F; cursor: pointer; list-style: none; font-size: 18px;">Day 1 🔽</summary>
           <div style="margin-top: 15px; padding-left: 10px; border-left: 2px solid #FFEDEE;">
              </div>
        </details>
        <div style="text-align: center; margin-top: 30px; margin-bottom: 50px; color: #888; font-size: 12px;">
           예상 총 경비: <strong style="color: #FF5A5F; font-size: 18px;">약 ${totalBudget}만원</strong>
        </div>
      </div>
    `;

    const userPrompt = `여행지: ${destination}, 기간: ${daysText}, 투어형태: ${safeTourType}, 인원: ${safePeople}명, 숙소: ${safeHotel}, 추가요청: ${safeRequests}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 10000,
    });

    let cleanHtml = completion.choices[0].message.content
      .replace(/```html/g, '')
      .replace(/```/g, '');

    return NextResponse.json({ result: cleanHtml });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'AI 응답 중 오류 발생' }, { status: 500 });
  }
}