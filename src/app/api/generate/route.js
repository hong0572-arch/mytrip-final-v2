import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { destination, startDate, endDate, people, budget, hotelType, tourType, themes, contact, request } = await req.json();

    // ✅ 구글 API 키 확인
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "API Key 설정 오류 (GEMINI_API_KEY 확인 필요)" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // ✅ 사장님이 선택하신 스피드스터 모델!
    // (혹시 2.5 버전이 아직 지역 제한이 있다면 'gemini-1.5-flash'로 바꾸면 됩니다)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        // 온도를 낮춰서 빠르고 정확하게
        temperature: 0.3,
        maxOutputTokens: 4000,
      }
    });

    // 날짜 계산
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // 일정 방식
    const scheduleFormat = diffDays >= 11
      ? "장기 여행이므로 '주 단위(Week 1, Week 2...)'로 요약. 세부 일정보다 핵심 테마와 이동 경로 위주."
      : "여행 기간에 맞춰 '일자별(Day 1, Day 2...)' 상세 스케줄 작성 (오전/오후/저녁).";

    // ✅ 프롬프트 합치기 (Gemini는 시스템/유저 메시지를 합쳐서 주는 게 성능이 좋습니다)
    const finalPrompt = `
    당신은 20년 경력의 VIP 전담 여행 컨설턴트입니다. 
    빠르고 정확하게 최고의 여행 계획을 설계하세요.
    문체는 정중하고 신뢰감 있게(~입니다/합니다) 작성하세요.

    [작성 규칙]
    1. **일정 포맷:** ${scheduleFormat}
    2. **예산 분석:** 항공/숙박/식비/교통비/예비비 비중(%)과 금액 제안.
    3. **전문가 Tip:** 날씨, 환전, 주의사항 등 실질적인 조언 포함.
    4. **가독성:** <h3>, <b>, <ul> 태그 사용 (마크다운 금지).

    [고객 요청 정보]
    - 여행지: ${destination}
    - 일정: ${startDate} ~ ${endDate} (총 ${diffDays}일)
    - 인원: ${people}명
    - 예산: ${budget}만원
    - 숙소: ${hotelType}
    - 스타일: ${tourType}
    - 테마: ${themes.join(', ')}
    - 추가 요청: ${request || "없음"}

    위 조건을 바탕으로 고객이 감동할 만한 여행 계획서를 작성해주세요.
    `;

    // 요청 보내기
    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    return Response.json({ result: text });

  } catch (error) {
    console.error("Gemini Error:", error);
    return Response.json({ error: `AI 요청 실패: ${error.message}` }, { status: 500 });
  }
}