import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req) {
    try {
        const body = await req.json();
        const { contact, destination, planData } = body;

        // 안전장치
        const safePlanData = planData || "";

        if (!contact) {
            return NextResponse.json({ error: '이메일 주소가 없습니다.' }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        let cleanHtml = safePlanData.replace(/```html/g, '').replace(/```/g, '');

        const mailOptions = {
            from: `"My Trip .Pro" <${process.env.EMAIL_USER}>`,
            to: contact,
            subject: `✈️ [전문가 리포트] ${destination} 여행 견적 의뢰서`, // 제목도 전문가스럽게 변경
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${destination} 여행 견적서</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">
          
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td align="center" style="padding: 20px;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                  
                  <tr>
                    <td style="background-color: #000000; padding: 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: -1px;">My Trip .Pro</h1>
                      <p style="color: #cccccc; margin: 5px 0 0 0; font-size: 12px; text-transform: uppercase;">Premium AI Concierge</p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 40px 30px; color: #333333; line-height: 1.6;">
                      ${cleanHtml ? cleanHtml : '<p style="text-align:center;">내용이 없습니다.</p>'}
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="margin: 0; font-size: 11px; color: #999;">
                        본 메일은 고객 요청에 의해 자동 발송된 견적서입니다.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>

        </body>
        </html>
      `,
        };

        await transporter.sendMail(mailOptions);
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Email Send Error:', error);
        return NextResponse.json({ error: '메일 전송 실패' }, { status: 500 });
    }
}