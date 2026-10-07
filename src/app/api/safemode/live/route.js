import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { admin } from '../../../../lib/firebaseAdmin';

// 보호자용 안심 귀가 실시간 정보.
// 보호자는 앱 회원이 아닐 수 있으므로 로그인 대신, 안전모드를 켤 때 만든 일회용 키(t)로 확인한다.
// 키가 맞을 때만 보호자에게 필요한 항목(이름·상태·위치·종료 예정 시각)만 돌려준다. 보호자 연락처 등은 내보내지 않는다.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

function sameToken(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

const toIso = (value) => (typeof value?.toDate === 'function' ? value.toDate().toISOString() : null);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get('u');
  const token = searchParams.get('t');

  // 키가 틀렸는지, 보호가 끝났는지 구분하지 않고 같은 응답을 준다(키 추측에 단서를 주지 않음).
  const notFound = () => NextResponse.json({ active: false }, { status: 404, headers: NO_STORE });
  if (!uid || !token || token.length !== 32) return notFound();

  try {
    const snap = await admin.firestore().collection('safemode_sessions').doc(uid).get();
    const data = snap.exists ? snap.data() : null;
    if (!data?.shareToken || !sameToken(data.shareToken, token)) return notFound();

    return NextResponse.json(
      {
        active: true,
        userName: data.userName || null,
        status: data.status === 'expired' ? 'expired' : 'active',
        endTime: typeof data.endTime === 'number' ? data.endTime : null,
        location: data.location && typeof data.location.lat === 'number' ? { lat: data.location.lat, lng: data.location.lng } : null,
        locationError: Boolean(data.locationError),
        locationUpdatedAt: toIso(data.locationUpdatedAt) || toIso(data.updatedAt),
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error('safemode live lookup failed:', error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500, headers: NO_STORE });
  }
}
