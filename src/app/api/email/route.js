import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { destination, period, people, budget, contact, plan } = await req.json();

    // ✅ 사장님 지메일 계정으로 전송 준비
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Vercel에 등록할 사장님 이메일
        pass: process.env.EMAIL_PASS, // Vercel에 등록할 앱 비밀번호
      },
    });

    // ✅ 메일 내용 설정
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: "iwingzpro@gmail.com", // ⭐️ 무조건 사장님 메일로 도착!
      subject: `[견적요청] ${destination} 여행 (${people}명)`,
      html: `
        <h2>✈️ 새로운 여행 견적 요청이 도착했습니다!</h2>
        <p><strong>여행지:</strong> ${destination}</p>
        <p><strong>일정:</strong> ${period}</p>
        <p><strong>인원:</strong> ${people}명</p>
        <p><strong>예산:</strong> ${budget}만원</p>
        <p><strong>고객 연락처:</strong> ${contact || "미입력"}</p>
        <hr />
        <h3>📝 AI 제안 일정</h3>
        <pre style="white-space: pre-wrap; font-family: sans-serif; background: #f4f4f4; padding: 20px; border-radius: 10px;">${plan}</pre>
      `,
    };

    // 전송!
    await transporter.sendMail(mailOptions);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Email Error:", error);
    return Response.json({ error: "메일 전송 실패" }, { status: 500 });
  }
}