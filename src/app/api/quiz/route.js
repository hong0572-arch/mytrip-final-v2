// src/app/api/quiz/route.js
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
    try {
        const { destination } = await req.json();

        // 🎲 매번 다른 퀴즈를 위해 랜덤성 강화 프롬프트
        const prompt = `
      당신은 여행 전문가입니다. 
      **${destination}** 여행과 관련된 **재미있는 상식 퀴즈 3문제**를 새로 만들어주세요.
      
      [조건]
      1. 한국어로 작성하세요.
      2. 4지 선다형(options)으로 만드세요.
      3. 정답(answer)은 0~3 사이의 숫자 인덱스입니다.
      4. 뻔한 문제보다는 흥미로운 문화, 음식, 장소, 역사 관련 문제를 섞어주세요.
      5. 매번 요청할 때마다 다른 문제를 내려고 노력하세요.

      [출력 형식 (JSON Only)]
      {
        "quiz": [
          {
            "question": "Q1. 질문 내용?",
            "options": ["보기1", "보기2", "보기3", "보기4"],
            "answer": 0,
            "rationale": "정답에 대한 짧은 해설"
          },
          ...
        ]
      }
    `;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" }); // 가볍고 빠른 모델 추천
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // JSON 정제
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const jsonResult = JSON.parse(text);

        return NextResponse.json({ result: jsonResult.quiz });

    } catch (error) {
        console.error("Quiz Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate quiz." }, { status: 500 });
    }
}