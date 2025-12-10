import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const body = await req.json();
    let { destination, departure, days, budget, themes, hotelType } = body;

    if (!hotelType || hotelType === '상관없음') {
      hotelType = '위치 좋고 깔끔한 3~4성급 시티호텔';
    }

    const themeString = Array.isArray(themes) ? themes.join(', ') : themes;

    // AI에게 내리는 강력한 지침 (게으름 방지)
    const systemPrompt = `
      당신은 꼼꼼한 완벽주의자 여행 플래너입니다.
      
      [🚨 절대 규칙: 일정 완주]
      1. 사용자가 요청한 **여행 기간(${days}) 전체**를 빠짐없이 작성하세요.
      2. 2박 3일이면 **Day 1, Day 2, Day 3**가 모두 나와야 합니다.
      3. 절대 중간에 "이후 일정은 비슷합니다"라거나 생략하지 마세요.
      4. 응답이 길어져도 괜찮으니 **끝까지** 쓰세요.

      [🎨 디자인 지침: 인포그래픽 스타일]
      - 결과물은 **HTML 코드만** 출력하세요.
      - **구분선(<hr>)**과 **박스 스타일**을 적극 활용해 가독성을 높이세요.
      - 이모지(✈️, 🏨, 🍽️)를 풍부하게 사용하세요.

      [응답 형식 (HTML)]
      <div style="font-family: 'Pretendard', sans-serif; color: #333; line-height: 1.6;">
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 15px; margin-bottom: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 2.2rem;">✈️ ${destination} 프리미엄 리포트</h1>
            <p style="margin-top: 10px; opacity: 0.9; font-size: 1.1rem;">${departure} 출발 | ${days} 일정</p>
            <div style="margin-top: 15px;">
                <span style="background: rgba(255,255,255,0.2); padding: 5px 15px; border-radius: 20px; font-size: 0.9rem;">#${themeString}</span>
            </div>
        </div>

        <div style="border: 2px solid #e9ecef; border-radius: 15px; padding: 25px; margin-bottom: 30px;">
            <h3 style="margin-top: 0; text-align: center; border-bottom: 2px dashed #dee2e6; padding-bottom: 15px; margin-bottom: 20px;">🏨 추천 숙소 (거점별 2곳)</h3>
            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <div style="flex: 1; background: #e7f5ff; padding: 15px; border-radius: 10px; min-width: 250px;">
                    <strong style="color: #1c7ed6; font-size: 1.1rem;">🅰️ 옵션 1</strong>
                    <p style="font-size: 0.95rem; margin-top: 5px;">(호텔명/특징)</p>
                    <p style="font-weight: bold;">1박 약 (금액)원</p>
                </div>
                <div style="flex: 1; background: #fff5f5; padding: 15px; border-radius: 10px; min-width: 250px;">
                    <strong style="color: #fa5252; font-size: 1.1rem;">🅱️ 옵션 2</strong>
                    <p style="font-size: 0.95rem; margin-top: 5px;">(호텔명/특징)</p>
                    <p style="font-weight: bold;">1박 약 (금액)원</p>
                </div>
            </div>
        </div>

        <h2 style="text-align: center; margin-bottom: 20px;">🗓️ Day-by-Day 완벽 플랜</h2>
        
        <div style="margin-bottom: 30px; border: 1px solid #dee2e6; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #343a40; color: white; padding: 10px 20px; font-weight: bold;">
                Day N: (테마 제목)
            </div>
            <div style="padding: 20px;">
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="margin-bottom: 15px; border-bottom: 1px solid #f1f3f5; padding-bottom: 10px;">
                        <span style="display: inline-block; width: 60px; font-weight: bold; color: #868e96;">오전</span>
                        <strong style="color: #fa5252;">[일정]</strong> (내용)
                    </li>
                    <li style="margin-bottom: 15px; border-bottom: 1px solid #f1f3f5; padding-bottom: 10px;">
                        <span style="display: inline-block; width: 60px; font-weight: bold; color: #868e96;">점심</span>
                        <strong style="color: #228be6;">[맛집]</strong> (식당명 2곳)
                    </li>
                    <li style="margin-bottom: 15px; border-bottom: 1px solid #f1f3f5; padding-bottom: 10px;">
                        <span style="display: inline-block; width: 60px; font-weight: bold; color: #868e96;">오후</span>
                        <strong style="color: #fab005;">[관광]</strong> (내용)
                    </li>
                    <li>
                        <span style="display: inline-block; width: 60px; font-weight: bold; color: #868e96;">저녁</span>
                        <strong style="color: #7950f2;">[식사]</strong> (식당명 2곳)
                    </li>
                </ul>
            </div>
        </div>

        <div style="background-color: #fff9db; padding: 25px; border-radius: 15px; margin-top: 40px; border: 1px solid #ffe066;">
            <h3 style="margin-top: 0; text-align: center; color: #e67700;">💰 예상 견적 요약 (1인 기준)</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; background: white;">
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">✈️ 항공/교통</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold;">(금액)원</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">🏨 숙박</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold;">(금액)원</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">🍽️ 식비/기타</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold;">(금액)원</td>
                </tr>
                <tr style="background-color: #fff3bf;">
                    <td style="padding: 15px; font-weight: bold; font-size: 1.1rem;">총 합계</td>
                    <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 1.1rem; color: #d9480f;">(총액)원</td>
                </tr>
            </table>
        </div>

      </div>
    `;

    const userPrompt = `여행지: ${destination}, 기간: ${days}, 예산: ${budget}만원`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      // 중요: 답변이 잘리지 않도록 토큰 수를 넉넉하게 잡았습니다.
      max_tokens: 15000,
    });

    return NextResponse.json({ result: completion.choices[0].message.content });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}