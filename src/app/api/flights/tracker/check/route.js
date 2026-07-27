import { NextResponse } from 'next/server';
import { admin } from '../../../../../lib/firebaseAdmin';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TP_TOKEN = '4c01a895965a510253489b6eef1e5fde';
const TP_MARKER = '695932';

// 💰 가격 포맷팅 헬퍼 함수
function formatPrice(price) {
    return price.toLocaleString('ko-KR');
}

// 📧 이메일 전송기 설정
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function GET(req) {
    try {
        // 🚨 Vercel Cron 인증 확인
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 🗄️ 활성화된 트래커 조회
        const db = admin.firestore();
        const trackersSnapshot = await db.collection('flight_price_trackers')
            .where('isActive', '==', true)
            .get();

        if (trackersSnapshot.empty) {
            return NextResponse.json({ message: 'No active trackers found' });
        }

        let checkedCount = 0;
        let notifiedCount = 0;
        const results = [];

        // 🔄 각 트래커별 가격 확인
        for (const doc of trackersSnapshot.docs) {
            const tracker = doc.data();
            const trackerId = doc.id;
            checkedCount++;

            try {
                // ✈️ Travelpayouts API 호출
                let baseUrl = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates`;
                let params = new URLSearchParams({
                    origin: tracker.origin,
                    destination: tracker.destination,
                    departure_at: tracker.departureDate,
                    currency: 'krw',
                    sorting: 'price',
                    direct: 'false',
                    limit: '1',
                    token: TP_TOKEN
                });
                if (tracker.returnDate) {
                    params.append('return_at', tracker.returnDate);
                }

                const response = await fetch(`${baseUrl}?${params.toString()}`);
                if (!response.ok) {
                    console.error(`Failed to fetch price for tracker ${trackerId}`);
                    continue;
                }

                const data = await response.json();
                if (!data.data || data.data.length === 0) {
                    console.log(`No flights found for tracker ${trackerId}`);
                    continue;
                }

                const newPrice = data.data[0].price;
                const lastKnownPrice = tracker.lastKnownPrice;
                
                let notified = false;
                let priceDiff = 0;
                let percentChange = 0;

                // 📊 이전 가격이 0인 경우 (최초 등록 시 가격을 못 가져왔던 경우) 
                // 이번에 처음 가격을 발견한 것이므로 알림은 생략하고 초기 가격으로 설정
                if (lastKnownPrice === 0) {
                    priceDiff = 0;
                    percentChange = 0;
                } else {
                    priceDiff = newPrice - lastKnownPrice;
                    percentChange = ((newPrice - lastKnownPrice) / lastKnownPrice) * 100;
                }
                
                // 🔔 가격 변동이 5% 이상인 경우 알림 발송 (절댓값 기준)
                if (lastKnownPrice > 0 && Math.abs(percentChange) >= 5) {
                    notified = true;
                    notifiedCount++;

                    // 1. FCM 푸시 알림 발송
                    if (tracker.fcmToken) {
                        try {
                            const message = {
                                token: tracker.fcmToken,
                                notification: {
                                    title: priceDiff < 0 
                                        ? `✈️ ${tracker.destinationName || tracker.destination}행 항공권 가격 하락!`
                                        : `📈 ${tracker.destinationName || tracker.destination}행 항공권 가격 상승`,
                                    body: `₩${formatPrice(tracker.lastKnownPrice)} → ₩${formatPrice(newPrice)} (${priceDiff < 0 ? '↓' : '↑'}${Math.abs(percentChange).toFixed(1)}%)\n${tracker.origin} → ${tracker.destination} | ${tracker.departureDate}`
                                },
                                data: {
                                    type: 'FLIGHT_PRICE_ALERT',
                                    destination: tracker.destination,
                                    url: '/mypage'
                                }
                            };
                            await admin.messaging().send(message);
                        } catch (fcmError) {
                            console.error(`FCM error for tracker ${trackerId}:`, fcmError);
                        }
                    }

                    // 2. 이메일 알림 발송
                    if (tracker.userEmail) {
                        try {
                            const isDrop = priceDiff < 0;
                            const color = isDrop ? '#00875a' : '#de350b';
                            const title = isDrop ? '항공권 가격이 하락했습니다!' : '항공권 가격이 상승했습니다.';
                            
                            // 예약 링크 생성
                            const dcity = tracker.origin ? tracker.origin.toLowerCase() : 'icn';
                            const acity = tracker.destination.toLowerCase();
                            
                            const tripComUrl = `https://kr.trip.com/flights/showfarefirst?dcity=${dcity}&acity=${acity}&ddate=${tracker.departureDate}&class=y&quantity=1&locale=ko-KR&curr=KRW&triptype=${tracker.returnDate ? 'rt' : 'ow'}${tracker.returnDate ? '&rdate=' + tracker.returnDate : ''}&Allianceid=7681311&SID=287502125&trip_sub3=D11411381`;
                            
                            const aviasalesUrl = `https://search.aviasales.com/${tracker.origin}${tracker.departureDate.replace(/-/g, '').slice(4,8)}${tracker.destination}${tracker.returnDate ? tracker.returnDate.replace(/-/g, '').slice(4,8) : ''}1?marker=${TP_MARKER}`;

                            const emailHtml = `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                                <h2 style="color: ${color}; text-align: center;">${title}</h2>
                                
                                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <h3 style="margin: 0 0 10px 0; color: #333;">여정 정보</h3>
                                    <p style="margin: 5px 0;"><strong>출발:</strong> ${tracker.originName || tracker.origin}</p>
                                    <p style="margin: 5px 0;"><strong>도착:</strong> ${tracker.destinationName || tracker.destination}</p>
                                    <p style="margin: 5px 0;"><strong>날짜:</strong> ${tracker.departureDate} ${tracker.returnDate ? `~ ${tracker.returnDate}` : ''}</p>
                                </div>

                                <div style="text-align: center; margin: 30px 0;">
                                    <p style="color: #666; text-decoration: line-through; margin: 0;">이전 가격: ₩${formatPrice(lastKnownPrice)}</p>
                                    <p style="font-size: 32px; font-weight: bold; color: ${color}; margin: 5px 0;">현재 가격: ₩${formatPrice(newPrice)}</p>
                                    <p style="color: ${color}; font-weight: bold; margin: 0;">(${isDrop ? '↓' : '↑'} ${Math.abs(percentChange).toFixed(1)}%)</p>
                                </div>

                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${tripComUrl}" style="background-color: #0052cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; margin: 0 5px;">Trip.com에서 보기</a>
                                    <a href="${aviasalesUrl}" style="background-color: #ff7b00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; margin: 0 5px;">Aviasales에서 보기</a>
                                </div>
                            </div>
                            `;

                            await transporter.sendMail({
                                from: '"MyTrip 알림" <' + process.env.EMAIL_USER + '>',
                                to: tracker.userEmail,
                                subject: `[MyTrip] ✈️ ${tracker.destinationName || tracker.destination}행 항공권 가격 변동 알림`,
                                html: emailHtml
                            });
                            });
                        } catch (emailError) {
                            console.error(`Email error for tracker ${trackerId}:`, emailError);
                        }
                    }
                }

                // 💾 Firestore 업데이트
                await db.collection('flight_price_trackers').doc(trackerId).update({
                    lastKnownPrice: newPrice,
                    initialPrice: (tracker.initialPrice === 0 || !tracker.initialPrice) ? newPrice : tracker.initialPrice,
                    lowestPrice: (tracker.lowestPrice === 0 || !tracker.lowestPrice) ? newPrice : Math.min(tracker.lowestPrice, newPrice),
                    highestPrice: (tracker.highestPrice === 0 || !tracker.highestPrice) ? newPrice : Math.max(tracker.highestPrice, newPrice),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    priceHistory: admin.firestore.FieldValue.arrayUnion({
                        price: newPrice,
                        checkedAt: new Date().toISOString()
                    })
                });

                results.push({
                    trackerId,
                    oldPrice: lastKnownPrice,
                    newPrice,
                    percentChange: percentChange.toFixed(2),
                    notified
                });

            } catch (err) {
                console.error(`Error processing tracker ${trackerId}:`, err);
            }
        }

        // ✅ 처리 결과 반환
        return NextResponse.json({
            success: true,
            message: 'Price check completed',
            summary: {
                totalActive: checkedCount,
                notified: notifiedCount
            },
            results
        });

    } catch (error) {
        console.error('Cron job error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
