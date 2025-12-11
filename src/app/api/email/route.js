import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req) {
  try {
    const body = await req.json();
    // userInfo 데이터와 AI 결과(aiResult)를 받습니다.
    const { destination, startDate, endDate, people, budget, contact, requests, tourType, aiResult } = body;

    // 1. 전송자 설정 (Gmail SMTP)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // .env.local에 설정한 이메일
        pass: process.env.EMAIL_PASS, // .env.local에 설정한 앱 비밀번호
      },
    });

    // 2. 이메일 내용 작성 (HTML 형식)
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'iwingzpro@gmail.com', // ⭐️ 받는 사람 (사장님 이메일)
      subject: `[전문가 점검 요청] ${destination} 여행 계획 (${contact})`,
      html: `
        <div style="font-family: 'Pretendard', Arial, sans-serif; padding: 30px; border: 1px solid #eee; border-radius: 15px; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <h2 style="color: #FF5A5F; margin-bottom: 20px; text-align: center;">✈️ 전문가 점검 요청 도착!</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
            <h3 style="margin-top: 0; color: #333;">📍 고객 기본 정보</h3>
            <ul style="list-style: none; padding-left: 0; color: #555; line-height: 1.8;">
              <li><strong>📞 연락처:</strong> ${contact}</li>
              <li><strong>🌍 여행지:</strong> ${destination}</li>
              <li><strong>📅 일정:</strong> ${startDate} ~ ${endDate}</li>
              <li><strong>👥 인원/타입:</strong> ${people}명 (${tourType})</li>
              <li><strong>💰 예산:</strong> 인당 ${budget}만원</li>
              <li style="margin-top: 10px; background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #eee;">
                <strong>💬 추가 요청사항:</strong><br/>${requests || "없음"}
              </li>
            </ul>
          </div>

          <hr style="border: 0; border-top: 2px dashed #eee; margin: 30px 0;" />
          
          <h3 style="color: #333;">🤖 AI가 제안한 상세 일정표</h3>
          <div style="background: #fafafa; padding: 20px; border-radius: 12px; color: #333; line-height: 1.6; border: 1px solid #eee;">
            ${aiResult}
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
            <p>본 메일은 MyTrip.Pro에서 발송되었습니다.</p>
          </div>
        </div>
      `,
    };

    // 3. 발송!
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("이메일 전송 실패:", error);
    // 에러 상세 내용을 반환하여 디버깅을 돕습니다.
    return NextResponse.json({ error: '전송 실패', details: error.message }, { status: 500 });
  }
}