import { NextResponse } from 'next/server';

// 접속 국가 코드(Vercel이 IP로 붙여 주는 헤더). IP나 위치는 저장하지 않고 국가 코드만 돌려준다.
// 영어 사용자가 한국에 있으면 홈·안심 화면을 한국 여행용으로 보여 주는 데 쓴다.
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const country = req.headers.get('x-vercel-ip-country') || null;
  return NextResponse.json({ country }, { headers: { 'Cache-Control': 'private, no-store' } });
}
