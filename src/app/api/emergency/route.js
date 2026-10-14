import { NextResponse } from 'next/server';
import { dataGoKrKey, encodedServiceKey } from '../../../lib/dataGoKr';

// 여행지 나라의 대한민국 대사관·총영사관 긴급연락처. 외교부_국가·지역별 재외공관 정보(EmbassyService2).
// GET ?iso=CZ&lat=50.08&lng=14.43 → { embassies: [{ name, type, urgencyTel, tel, consularTel, freeTel, address, lat, lng, distanceKm }] }
// 좌표를 주면 가까운 공관부터. 그 나라에 공관이 없으면 외교부가 '겸임' 공관을 돌려준다.
// 공공데이터 키(DATA_GO_KR_KEY)에 이 API 활용신청이 필요하다. 하루 캐시.
const CACHE = { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' };
const memo = new Map();

const num = (v) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : null);
const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();

function km(lat1, lng1, lat2, lng2) {
  const r = 6371; const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

async function fetchEmbassies(iso) {
  const hit = memo.get(iso);
  if (hit && Date.now() - hit.at < 86400000) return hit.list;
  const url = `https://apis.data.go.kr/1262000/EmbassyService2/getEmbassyList2?serviceKey=${encodedServiceKey()}&pageNo=1&numOfRows=50&returnType=JSON&cond[country_iso_alp2::EQ]=${iso}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
  const text = await res.text();
  if (!res.ok || text.trimStart().startsWith('<')) throw new Error(`embassy ${res.status} ${text.slice(0, 120)}`);
  const json = JSON.parse(text);
  const items = json?.data || json?.response?.body?.items?.item || [];
  const list = (Array.isArray(items) ? items : [items]).map((e) => ({
    name: clean(e.embassy_kor_nm),
    type: clean(e.embassy_ty_cd_nm),
    concurrent: /겸임/.test(clean(e.embassy_manage_ty_cd_nm || e.manageTyNm)),
    urgencyTel: clean(e.urgency_tel_no),
    tel: clean(e.tel_no),
    consularTel: clean(e.center_tel_no),
    freeTel: clean(e.free_tel_no),
    address: clean(e.embassy_addr),
    lat: num(e.embassy_lat),
    lng: num(e.embassy_lng),
  })).filter((e) => e.name);
  memo.set(iso, { at: Date.now(), list });
  return list;
}

export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const iso = String(sp.get('iso') || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso)) return NextResponse.json({ error: 'iso required' }, { status: 400 });
  if (iso === 'KR' || !dataGoKrKey()) return NextResponse.json({ embassies: [] }, { headers: CACHE });
  const lat = num(sp.get('lat'));
  const lng = num(sp.get('lng'));
  try {
    const list = await fetchEmbassies(iso);
    const out = list
      .map((e) => ({ ...e, distanceKm: lat != null && lng != null && e.lat != null && e.lng != null ? Math.round(km(lat, lng, e.lat, e.lng)) : null }))
      // 겸임이 아닌 공관 먼저, 그다음 가까운 순
      .sort((a, b) => Number(a.concurrent) - Number(b.concurrent) || (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9))
      .slice(0, 3);
    return NextResponse.json({ embassies: out }, { headers: CACHE });
  } catch (error) {
    console.warn('[emergency] embassy lookup failed:', String(error?.message || error).slice(0, 160));
    return NextResponse.json({ embassies: [], error: 'unavailable' }, { headers: { 'Cache-Control': 'public, s-maxage=600' } });
  }
}
