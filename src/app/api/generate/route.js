import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { destination, startDate, endDate, people, budget, hotelType, tourType, themes, contact, request } = await req.json();

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // [수정 사항] Google Generative AI 모델 설정 강제 고정
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
      }
    });

    const prompt = `
    당신은 20년 경력의 VIP 전담 여행 컨설턴트입니다. 
    
    	[필수 포함 내용]
	1. 각 일정에 맞는 **추천 숙소** (사용자 예산 고려)
	2. 점심/저녁 식사로 **로컬 맛집** (구체적인 식당 이름 포함)
	3. **쇼핑 리스트** 섹션 추가 (로컬 시장 및 벼룩시장 정보 포함)
	
	[🚨 절대 규칙 1 - 디자인]
	1. **절대 HTML 태그(<h3>, <b>, <span> 등)를 사용하지 마세요.**
	2. 무조건 **순수 마크다운(Markdown)** 문법만 사용하세요.
	3. 구분선이 필요하면 '---'를 사용하세요.
    4. **모든 장소 이름**에는 반드시 **구글맵 검색 링크**를 걸어주세요.
       - 형식: [장소명](https://www.google.com/maps/search/?api=1&query=장소명)
       
    [맨 마지막에 JSON 데이터 추가]
    모든 마크다운 출력이 끝난 후, 반드시 아래 형식의 JSON 데이터를 **코드 블럭 없이** pure text로 추가해주세요.
    (AI 이미지 생성을 위한 영문 키워드를 포함해야 합니다.)

    ---MAP_DATA_START---
    {
      "image_keyword": "Best photogenic spot in ${destination} landscape, travel photography, 8k", 
      "markers": [
        { "lat": 35.6895, "lng": 139.6917, "title": "도쿄 타워", "day": 1 },
        ...
      ],
      "polylines": [
        { "day": 1, "path": [[35.6, 139.6], [35.7, 139.7]] },
        ...
      ]
    }
    ---MAP_DATA_END---
    
    * image_keyword 설명: 여행지의 가장 대표적이고 아름다운 풍경을 생성할 수 있는 **영문 검색어** (예: "Eiffel Tower Paris sunny day", "Santorini Greece blue dome")
    * markers 설명: 일정에 언급된 모든 장소의 좌표
    * polylines 설명: 일자별 이동 경로
    * 주의: JSON 데이터 외에는 어떤 텍스트도 start/end 마커 사이에 넣지 마세요.
    
    [여행 정보]
    - 여행지: ${destination} (${diffDays}일)
    - 인원: ${people}명
    - 예산: ${budget}만원 (구체적인 항목별 배분 제안 포함)
    - 스타일: ${tourType}, 숙소: ${hotelType}
    - 테마: ${themes.join(', ')}
    - 추가 요청: ${request || "없음"}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ result: text });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
