import { NextResponse } from 'next/server';

// 여행 경비 기록의 원화 환산용 환율(유럽중앙은행 기준, Frankfurter — 키 없음, 사용자 정보 없음).
// 응답: { base: 'KRW', date, rates: { JPY: 0.107, ... } } → 외화 금액 / rate = 원화. 6시간 캐시.
const TTL_MS = 6 * 3600 * 1000;
let cached = null;

export async function GET() {
  const headers = { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600' };
  if (cached && Date.now() - cached.at < TTL_MS) return NextResponse.json(cached.data, { headers });
  try {
    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=KRW', { cache: 'no-store' });
    if (!res.ok) throw new Error(`fx ${res.status}`);
    const json = await res.json();
    const data = { base: 'KRW', date: json.date, rates: { KRW: 1, ...json.rates } };
    cached = { at: Date.now(), data };
    return NextResponse.json(data, { headers });
  } catch (error) {
    console.warn('[fx] failed:', error.message);
    return NextResponse.json({ base: 'KRW', date: null, rates: { KRW: 1 } }, { headers: { 'Cache-Control': 'public, s-maxage=600' } });
  }
}
