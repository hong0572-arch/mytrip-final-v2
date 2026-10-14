import { NextResponse } from 'next/server';

// 항공권 검색 목적지 자동완성(도시·공항 → IATA 코드). Travelpayouts places2(한국어 이름 지원).
// GET ?term=프라하&lang=ko → [{ code, name, country, type, airport }]
export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const term = String(sp.get('term') || '').trim().slice(0, 40);
  const locale = sp.get('lang') === 'en' ? 'en' : 'ko';
  if (term.length < 1) return NextResponse.json([]);
  try {
    const url = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(term)}&locale=${locale}&types[]=city&types[]=airport`;
    const list = await (await fetch(url, { next: { revalidate: 86400 } })).json();
    const out = (Array.isArray(list) ? list : []).slice(0, 8).map((p) => ({
      code: p.type === 'airport' ? p.code : p.code,
      name: p.type === 'airport' ? `${p.name}` : p.name,
      city: p.city_name || p.name,
      country: p.country_name || '',
      type: p.type,
      airport: p.main_airport_name || '',
    }));
    return NextResponse.json(out, { headers: { 'Cache-Control': 'public, s-maxage=86400' } });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
