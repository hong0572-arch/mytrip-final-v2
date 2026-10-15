import { NextResponse } from 'next/server';
import { dataGoKrKey, encodedServiceKey } from '../../../lib/dataGoKr';

// 여행지 나라의 긴급 연락처 — 외교부 공공데이터(공공데이터 일반 인증키 DATA_GO_KR_KEY, 각 API 활용신청 필요).
//  1) 외교부_국가∙지역별 현지연락처(LocalContactService2): contact_remark(HTML 안내문) → 줄 단위 글 + 경찰·소방·구급 번호 추출
//  2) 외교부_국가·지역별 재외공관 정보(EmbassyService2): 대사관·총영사관 긴급전화·대표전화(좌표가 있으면 가까운 순)
// GET ?iso=CZ&lat=&lng= → { local: { lines, numbers: { police, fire, ambulance, general }, updated }, embassies: [...] }
// 하나가 실패해도 나머지는 돌려준다. 하루 캐시.
const CACHE = { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' };
const BASE = 'https://apis.data.go.kr/1262000';
const memo = new Map();

const num = (v) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : null);
const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();

// 국가 조건을 넣는 방식이 서비스마다 달라 차례로 시도한다(성공한 방식은 기억). 마지막은 조건 없이 전체를 받아 걸러 낸다.
const VARIANTS = [
  (iso) => `&${encodeURIComponent('cond[country_iso_alp2::EQ]')}=${iso}`,
  (iso) => `&cond[country_iso_alp2::EQ]=${iso}`,
  () => '',
];
const working = {};

async function mofaOnce(path, query) {
  const url = `${BASE}/${path}?serviceKey=${encodedServiceKey()}&pageNo=1&numOfRows=${query ? 50 : 300}&returnType=JSON${query}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
  const text = await res.text();
  if (!res.ok || text.trimStart().startsWith('<')) throw new Error(`${res.status} ${text.replace(/\s+/g, ' ').slice(0, 80)}`);
  const json = JSON.parse(text);
  const portalErr = json?.OpenAPI_ServiceResponse?.cmmMsgHeader;
  if (portalErr) throw new Error(`${portalErr.errMsg || ''} ${portalErr.returnReasonCode || ''}`.trim());
  if (json?.resultCode && !['0', '00'].includes(String(json.resultCode))) throw new Error(`${json.resultCode} ${json.resultMsg}`);
  const items = json?.data || json?.response?.body?.items?.item || json?.items || [];
  return Array.isArray(items) ? items : [items];
}

async function mofa(path, iso) {
  const name = path.split('/')[0];
  const order = working[name] != null ? [working[name], ...VARIANTS.keys()] : [...VARIANTS.keys()];
  const errors = [];
  for (const v of [...new Set(order)]) {
    try {
      const list = await mofaOnce(path, VARIANTS[v](iso));
      working[name] = v;
      shapes[name] = `v${v} n=${list.length} first=${Object.keys(list[0] || {}).slice(0, 8).join(',')}`;
      return VARIANTS[v](iso) ? list : list.filter((x) => String(x.country_iso_alp2 || '').toUpperCase() === iso);
    } catch (e) {
      errors.push(`v${v}:${String(e.message).slice(0, 60)}`);
    }
  }
  throw new Error(`${name} ${errors.join(' / ')}`);
}
const shapes = {};

// HTML 안내문 → 줄 단위 글
function htmlToLines(html) {
  const text = String(html || '')
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, '\n')
    .replace(/<\s*(li)[^>]*>/gi, '\n• ')
    .replace(/<\s*\/?(td|th)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
  return text.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter((l) => l && l !== '•').slice(0, 40);
}

// 줄에서 '경찰 158', '화재: 150', '구급(앰뷸런스) 155' 같은 번호 찾기
const PHONE = /(\+?\d[\d\-\s().]{0,18}\d)/;
function pick(lines, label) {
  for (const line of lines) {
    const i = line.search(label);
    if (i < 0) continue;
    const m = line.slice(i).match(PHONE);
    if (m) {
      const n = m[1].replace(/[\s.]/g, '').replace(/[()]/g, '');
      if (n.replace(/\D/g, '').length >= 2) return n;
    }
  }
  return null;
}

function parseLocal(item) {
  const lines = htmlToLines(item.contact_remark);
  return {
    lines,
    numbers: {
      police: pick(lines, /경찰|police/i),
      fire: pick(lines, /화재|소방|fire/i),
      ambulance: pick(lines, /구급|앰뷸런스|응급|의료|ambulance/i),
      general: pick(lines, /통합\s*긴급|긴급\s*구조|긴급전화|emergency/i),
    },
    updated: clean(item.wrt_dt) || null,
  };
}

function km(lat1, lng1, lat2, lng2) {
  const r = 6371; const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

async function load(iso) {
  const hit = memo.get(iso);
  if (hit && Date.now() - hit.at < 86400000) return hit.data;
  const [local, emb] = await Promise.allSettled([mofa('LocalContactService2/getLocalContactList2', iso), mofa('EmbassyService2/getEmbassyList2', iso)]);
  const errors = [local, emb].filter((r) => r.status === 'rejected').map((r) => String(r.reason?.message || 'error').slice(0, 80));
  if (local.status === 'rejected') console.warn('[emergency] local contacts:', String(local.reason?.message).slice(0, 160));
  if (emb.status === 'rejected') console.warn('[emergency] embassies:', String(emb.reason?.message).slice(0, 160));
  const data = {
    errors,
    local: local.status === 'fulfilled' && local.value[0] ? parseLocal(local.value[0]) : null,
    embassies: emb.status === 'fulfilled' ? emb.value.map((e) => ({
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
    })).filter((e) => e.name) : [],
  };
  // 둘 다 실패면 짧게만 캐시
  if (data.local || data.embassies.length) memo.set(iso, { at: Date.now(), data });
  return data;
}

export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const iso = String(sp.get('iso') || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso)) return NextResponse.json({ error: 'iso required' }, { status: 400 });
  if (iso === 'KR' || !dataGoKrKey()) return NextResponse.json({ local: null, embassies: [] }, { headers: CACHE });
  const lat = num(sp.get('lat'));
  const lng = num(sp.get('lng'));
  try {
    const data = await load(iso);
    const embassies = data.embassies
      .map((e) => ({ ...e, distanceKm: lat != null && lng != null && e.lat != null && e.lng != null ? Math.round(km(lat, lng, e.lat, e.lng)) : null }))
      .sort((a, b) => Number(a.concurrent) - Number(b.concurrent) || (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9))
      .slice(0, 3);
    const ok = data.local || embassies.length;
    // 실패 이유(키 제외)를 헤더로 남겨 원인을 바로 볼 수 있게(x-emergency-error)
    const headers = ok ? { ...CACHE } : { 'Cache-Control': 'public, s-maxage=600' };
    headers['x-emergency-shape'] = JSON.stringify(shapes).replace(/[^ -~]/g, '').slice(0, 600);
    if (data.errors?.length) headers['x-emergency-error'] = data.errors.join(' | ').replace(/[^ -~]/g, '');
    return NextResponse.json({ local: data.local, embassies }, { headers });
  } catch (error) {
    console.warn('[emergency] failed:', String(error?.message || error).slice(0, 160));
    return NextResponse.json({ local: null, embassies: [], error: 'unavailable' }, { headers: { 'Cache-Control': 'public, s-maxage=600' } });
  }
}
