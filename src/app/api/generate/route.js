import OpenAI from "openai";

export async function POST(req) {
  try {
    const { destination, startDate, endDate, people, budget, hotelType, tourType, themes, contact, request } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "API Key 설정 오류 (OPENAI_API_KEY 확인 필요)" }, { status: 500 });
    }

    // ✅ 사장님이 선택하신 최신 모델 적용!
    const MODEL_NAME = "gpt-5-nano";

    const openai = new OpenAI({ apiKey: apiKey });

    // 날짜 계산 (여행 기간)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // ✅ 일정 요약 로직 (11일 이상이면 주간 요약)
    const scheduleFormat = diffDays >= 11
      ? "장기 여행이므로 '주 단위(Week 1, Week 2...)'로 일정을 묶어서 핵심 위주로 요약하세요. 매일의 세부 동선보다는 해당 주차의 테마와 이동 계획이 중요합니다."
      : "여행 기간에 맞춰 '일자별(Day 1, Day 2...)' 상세 스케줄을 오전/오후/저녁으로 나누어 구체적으로 작성하세요.";

    // ✅ 시스템 프롬프트 (전문가 페르소나)
    const systemPrompt = `
    당신은 20년 경력의 VIP 전담 여행 컨설턴트입니다. 
    최신 AI 모델(${MODEL_NAME})의 빠르고 정확한 능력을 발휘하여 최고의 여행 계획을 설계하세요.
    문체는 정중하고 신뢰감 있게(~입니다/합니다) 작성하세요.
    
    [작성 규칙]
    1. **일정 포맷:** ${scheduleFormat}
    2. **예산 분석:** 총 예산을 항공/숙박/식비/교통비/예비비 등으로 쪼개서 비중(%)과 금액을 구체적으로 제안하세요.
    3. **전문가 Tip:** 단순 정보가 아니라, 현지 날씨, 환전 팁, 주의사항 등 실질적인 조언을 포함하세요.
    4. **가독성:** <h3>, <b>, <ul> 태그를 사용하여 깔끔하게 정리하세요. (마크다운 코드블럭 사용 금지)
    `;

    // ✅ 사용자 요청 데이터
    const userPrompt = `
    [고객 여행 정보]
    - 여행지: ${destination}
    - 일정: ${startDate} ~ ${endDate} (총 ${diffDays}일)
    - 인원: ${people}명
    - 예산: ${budget}만원
    - 숙소: ${hotelType}
    - 스타일: ${tourType}
    - 테마: ${themes.join(', ')}
    - 추가 요청: ${request || "없음"}
    
    위 조건을 바탕으로 고객이 감동할 만한 여행 계획서를 작성해줘.
    `;

    // ✅ OpenAI 요청
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // 일관성 있는 답변 (0에 가까울수록 사실적)
      max_tokens: 4000, // 긴 여행 일정도 잘리지 않게 넉넉히
    });

    const resultText = completion.choices[0].message.content;

    return Response.json({ result: resultText });

  } catch (error) {
    console.error("OpenAI Error:", error);
    // 에러 발생 시 원인을 명확히 보여줌 (혹시 모델명 오타일 경우를 대비)
    return Response.json({ error: `AI 요청 실패: ${error.message}` }, { status: 500 });
  }
}