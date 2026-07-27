import { NextResponse } from 'next/server';
import { admin } from '../../../../lib/firebaseAdmin';

const TP_TOKEN = '4c01a895965a510253489b6eef1e5fde';

// 🌟 POST - 새로운 항공권 가격 트래커 생성
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, userEmail, destination, destinationName, departureDate, returnDate, fcmToken, currentPrice, replace } = body;

    if (!userId || !destination || !departureDate) {
      return NextResponse.json(
        { error: '필수 항목(userId, destination, departureDate)이 누락되었습니다.' },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const trackersRef = db.collection('flight_price_trackers');

    // 🚨 이미 활성화된 트래커가 있는지 확인 (사용자당 1개 제한)
    const existingTracker = await trackersRef
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    if (!existingTracker.empty) {
      if (replace) {
        // 기존 알림 해제 로직 실행
        const batch = db.batch();
        existingTracker.docs.forEach((doc) => {
          batch.update(doc.ref, { 
            isActive: false, 
            updatedAt: admin.firestore.FieldValue.serverTimestamp() 
          });
        });
        await batch.commit();
      } else {
        return NextResponse.json(
          { code: 'ALREADY_EXISTS', error: '이미 활성화된 가격 알림이 있습니다. 기존 알림을 해제하고 교체하시겠습니까?' },
          { status: 409 }
        );
      }
    }

    let price = currentPrice;

    // ✈️ 현재 가격이 제공되지 않은 경우 Travelpayouts API를 통해 가격 조회
    if (!price) {
      const baseUrl = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates';
      const params = new URLSearchParams({
        origin: 'ICN',
        destination: destination,
        departure_at: departureDate,
        currency: 'krw',
        sorting: 'price',
        direct: 'false',
        limit: '1',
        token: TP_TOKEN
      });
      if (returnDate) params.append('return_at', returnDate);

      const res = await fetch(`${baseUrl}?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          price = data.data[0].price;
        }
      }
    }

    if (!price) {
      // ✈️ 가격을 찾지 못해도 추적은 등록할 수 있게 허용 (0으로 설정)
      // 다음날 Cron Job이 실행될 때 가격이 발견되면 첫 가격으로 설정됨
      price = 0;
    }

    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const now = new Date().toISOString();

    const newTracker = {
      userId,
      userEmail: userEmail || '',
      origin: 'ICN',
      destination,
      destinationName: destinationName || destination,
      departureDate,
      returnDate: returnDate || null,
      lastKnownPrice: price,
      initialPrice: price,
      lowestPrice: price,
      highestPrice: price,
      isActive: true,
      fcmToken: fcmToken || '',
      createdAt: timestamp,
      updatedAt: timestamp,
      priceHistory: [{ price, checkedAt: now }]
    };

    const docRef = await trackersRef.add(newTracker);

    return NextResponse.json({
      id: docRef.id,
      ...newTracker,
      createdAt: now, // 클라이언트 반환용 임시 값
      updatedAt: now
    });

  } catch (error) {
    console.error('Error creating tracker:', error);
    return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}

// 🌟 GET - 사용자의 활성 트래커 조회
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId가 필요합니다.' }, { status: 400 });
    }

    const db = admin.firestore();
    const trackersRef = db.collection('flight_price_trackers');

    const snapshot = await trackersRef
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ tracker: null });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // 🔑 Timestamp 변환
    return NextResponse.json({
      tracker: {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      }
    });

  } catch (error) {
    console.error('Error fetching tracker:', error);
    return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}

// 🌟 DELETE - 트래커 비활성화 (소프트 삭제)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const trackerId = searchParams.get('trackerId');

    if (!userId || !trackerId) {
      return NextResponse.json({ error: 'userId와 trackerId가 필요합니다.' }, { status: 400 });
    }

    const db = admin.firestore();
    const trackerRef = db.collection('flight_price_trackers').doc(trackerId);

    const doc = await trackerRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: '트래커를 찾을 수 없습니다.' }, { status: 404 });
    }

    const data = doc.data();
    if (data.userId !== userId) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // 🚨 소프트 삭제 처리
    await trackerRef.update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true, message: '트래커가 비활성화되었습니다.' });

  } catch (error) {
    console.error('Error deactivating tracker:', error);
    return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}
