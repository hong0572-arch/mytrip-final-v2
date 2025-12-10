import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const body = await request.json();

        // 여기에 메일 보내는 로직 등이 들어갑니다.
        // 일단 성공 응답을 보내도록 설정합니다.
        console.log("데이터 받음:", body);

        return NextResponse.json({ success: true, message: "전송 성공!" });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}