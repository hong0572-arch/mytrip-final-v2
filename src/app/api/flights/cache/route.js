import { NextResponse } from 'next/server';
import { admin } from '../../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const isMember = searchParams.get('isMember') === 'true';

        // 🌟 회원 전용 정책 엄수: 로그인하지 않은 비회원인 경우 조회 차단
        if (!isMember) {
            return NextResponse.json({ cache: {} });
        }

        const db = admin.firestore();
        const querySnapshot = await db.collection('flight_deals_cache').get();
        const cacheMap = {};
        
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.updatedAt) {
                // Firebase Admin의 Timestamp 객체는 toDate() 함수 제공
                const updatedDate = data.updatedAt.toDate();
                if (updatedDate >= fourteenDaysAgo) {
                    cacheMap[data.code] = {
                        price: data.price,
                        displayDate: data.displayDate,
                        displayDateEn: data.displayDateEn,
                        isReal: true
                    };
                }
            }
        });

        return NextResponse.json({ cache: cacheMap });
    } catch (error) {
        console.error("🚨 [Server Cache API] Failed to load flight cache:", error);
        return NextResponse.json({ cache: {} });
    }
}
