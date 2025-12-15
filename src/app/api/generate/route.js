import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { destination, startDate, endDate, people, budget, hotelType, tourType, themes, contact, request } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return Response.json({ error: "API Key Error" }, { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);

    // ✅ [수정 완료] 사장님 지시대로 설정했습니다!
    // 1. 모델: gemini-2.5-flash-lite (속도 최강)
    // 2. 온도: 0.3 (전문성, 일관성, 규칙 준수)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
      }
    });

    // 날짜 계산
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

    const scheduleFormat = diffDays >= 11
      ? "장기 여행이므로 '주 단위(Week 1, Week 2...)'로 요약하여 작성하세요."
      : "여행 기간에 맞춰 '일자별(Day 1, Day 2...)' 상세 스케줄을 작성하세요.";

    // ✅ 디자인 깨짐 방지: "HTML 절대 금지 & 마크다운 전용" 명령
    const prompt = `
    당신은 20년 경력의 VIP 전담 여행 컨설턴트입니다. 
    
    [🚨 절대 규칙 - 디자인을 위해 필수]
    1. **절대 HTML 태그(<h3>, <b>, <span> 등)를 사용하지 마세요.**
    2. 무조건 **순수 마크다운(Markdown)** 문법만 사용하세요.
       - 제목: ### (O), <h3> (X)
       - 강조: **단어** (O), <b>단어</b> (X)
       - 리스트: - 항목 (O), <ul><li> (X)
    3. 구분선이 필요하면 '---'를 사용하세요.

    [여행 정보]
    - 여행지: ${destination} (${diffDays}일)
    - 인원: ${people}명
    - 예산: ${budget}만원 (구체적인 항목별 배분 제안 포함)
    - 스타일: ${tourType}, 숙소: ${hotelType}
    - 테마: ${themes.join(', ')}
    - 일정 포맷: ${scheduleFormat}
    
    위 정보를 바탕으로 읽기 편하고 전문적인 여행 계획서를 작성해주세요.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return Response.json({ result: text });

  } catch (error) {
    console.error("Gemini Error:", error);
    return Response.json({ error: `AI Error: ${error.message}` }, { status: 500 });
  }
}