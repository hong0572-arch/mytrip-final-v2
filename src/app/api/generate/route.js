import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { destination, startDate, endDate, people, budget, hotelType, tourType, themes, contact, request } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return Response.json({ error: "API Key failed" }, { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      // ✅ 창의성(Temperature)을 0.3으로 낮춰서 일관성 있고 전문적인 톤 유지
      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        topK: 40,
      }
    });

    // 날짜 차이 계산 (일수 구하기)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // ✅ 일정 방식 결정 (11일 이상이면 주간 요약, 그 외엔 일자별)
    const scheduleFormat = diffDays >= 11
      ? "장기 여행이므로 '주 단위(Week 1, Week 2...)'로 핵심 내용을 요약해서 일정을 짜라. 매일매일의 세부 일정보다는 주차별 테마와 주요 이동 동선, 꼭 가야 할 곳 위주로 서술해라."
      : "여행 기간에 맞춰 '일자별(Day 1, Day 2...)' 상세 스케줄을 짜라. 오전/오후/저녁으로 나누어 구체적인 동선을 짜라.";

    const prompt = `
    당신은 20년 경력의 VIP 전담 여행 컨설턴트입니다. 
    고객에게 신뢰감을 주는 '정중하고 전문적인 문체(~입니다/합니다)'를 사용하세요.
    단순한 여행지 나열이 아니라, 전문가의 시선에서 왜 이곳을 추천하는지 이유를 곁들이세요.
    
    [고객 요청 정보]
    - 여행지: ${destination}
    - 일정: ${startDate} ~ ${endDate} (총 ${diffDays}일)
    - 인원: ${people}명
    - 1인당 예산: ${budget}만원
    - 숙소 취향: ${hotelType}
    - 여행 스타일: ${tourType}
    - 선호 테마: ${themes.join(', ')}
    - 추가 요청사항: ${request || "없음"}

    [필수 포함 내용 및 규칙]
    1. **일정 포맷:** ${scheduleFormat}
    2. **예산 상세 분석:** 예산을 단순히 총액으로 보여주지 말고, [항공/숙박/식비/입장료/예비비] 비중을 퍼센트(%)와 대략적인 금액으로 쪼개서 제안하세요. (현실적인 물가 반영)
    3. **전문가 Tip:** 현지 날씨, 환전 팁, 주의사항, 현지인 맛집 추천 등 실질적인 조언을 별도 섹션으로 제공하세요.
    4. **HTML 포맷팅:** 가독성을 위해 <h3>, <b>, <ul> 태그를 적절히 사용하세요.
    
    [보고서 구조]
    1. **[여행 컨셉 요약]:** 이 여행의 핵심 포인트와 테마 3줄 요약.
    2. **[예상 견적 상세 분석]:** 항목별 예산 배분 제안.
    3. **[추천 항공 및 숙소 가이드]:** (구체적인 예약 링크는 제외하고) 추천 지역이나 등급, 출발 시간대 가이드.
    4. **[상세 일정]:** 위에서 정한 규칙(일자별/주별)에 따른 코스.
    5. **[담당 컨설턴트의 조언 (Tip)]:** 여행 꿀팁.

    위 규칙을 엄격히 준수하여 고객이 감동할 만한 최고의 여행 제안서를 작성해주세요.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return Response.json({ result: text });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "AI 요청 실패" }, { status: 500 });
  }
}