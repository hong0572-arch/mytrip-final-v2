import { NextResponse } from 'next/server';

// 앱 안 항공권 검색(/flights). Travelpayouts(Aviasales) 가격 데이터 — 다른 여행자들이 최근 검색해서 찾은 가격을 모은 것이라
// 실시간 좌석 조회는 아니다. 정확한 날짜 결과가 없으면 같은 달의 날짜별 최저가를 보여 준다. 예약은 파트너 사이트로 연결.
// GET ?from=SEL&to=PRG&depart=YYYY-MM-DD&return=YYYY-MM-DD(선택)&adults=1&direct=0&lang=ko
// 키: TRAVELPAYOUTS_TOKEN / TRAVELPAYOUTS_MARKER (없으면 예전 설정값)
const TOKEN = process.env.TRAVELPAYOUTS_TOKEN || '4c01a895965a510253489b6eef1e5fde';
const MARKER = process.env.TRAVELPAYOUTS_MARKER || '695932';
const API = 'https://api.travelpayouts.com/aviasales/v3';
const CACHE = { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' };

const AIRLINE_KO = {
  KE: '대한항공', OZ: '아시아나항공', '7C': '제주항공', LJ: '진에어', TW: '티웨이항공', ZE: '이스타항공', BX: '에어부산', RS: '에어서울', YP: '에어프레미아', RF: '에어로케이',
  NH: 'ANA', JL: '일본항공', MM: '피치항공', GK: '젯스타 재팬', BC: '스카이마크', CA: '중국국제항공', MU: '중국동방항공', CZ: '중국남방항공', SC: '산둥항공', HO: '준야오항공', '9C': '춘추항공',
  CX: '캐세이퍼시픽', UO: '홍콩익스프레스', HX: '홍콩항공', BR: '에바항공', CI: '중화항공', IT: '타이거에어 타이완', JX: '스타럭스항공', SQ: '싱가포르항공', TR: '스쿠트', TG: '타이항공', FD: '타이에어아시아', VZ: '타이 비엣젯',
  VN: '베트남항공', VJ: '비엣젯항공', QH: '뱀부항공', PR: '필리핀항공', '5J': '세부퍼시픽', MH: '말레이시아항공', AK: '에어아시아', D7: '에어아시아X', GA: '가루다인도네시아', QR: '카타르항공', EK: '에미레이트항공', EY: '에티하드항공',
  TK: '터키항공', LH: '루프트한자', AF: '에어프랑스', KL: 'KLM', BA: '영국항공', AY: '핀에어', LO: '폴란드항공', OK: '체코항공', LX: '스위스항공', OS: '오스트리아항공', AZ: 'ITA 항공', IB: '이베리아항공', SK: '스칸디나비아항공',
  DL: '델타항공', UA: '유나이티드항공', AA: '아메리칸항공', AC: '에어캐나다', HA: '하와이안항공', QF: '콴타스항공', JQ: '젯스타', NZ: '에어뉴질랜드', AI: '에어인디아', ET: '에티오피아항공',
};

let airlineNames = null;
async function airlines() {
  if (airlineNames) return airlineNames;
  try {
    const list = await (await fetch('https://api.travelpayouts.com/data/en/airlines.json', { next: { revalidate: 86400 } })).json();
    airlineNames = Object.fromEntries(list.map((a) => [a.code, a.name || a.name_translations?.en || a.code]));
  } catch {
    airlineNames = {};
  }
  return airlineNames;
}

const iata = (v) => (/^[A-Za-z]{3}$/.test(String(v || '')) ? String(v).toUpperCase() : null);
const ymd = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);

async function prices(params) {
  const qs = new URLSearchParams({ currency: 'krw', sorting: 'price', limit: '60', token: TOKEN, ...params });
  const res = await fetch(`${API}/prices_for_dates?${qs}`, { next: { revalidate: 900 } });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.success && Array.isArray(json.data) ? json.data : [];
}

function toItem(x, names, lang, adults) {
  const code = x.airline;
  return {
    airline: code,
    airlineName: (lang === 'ko' && AIRLINE_KO[code]) || names[code] || code,
    logo: `https://pics.avs.io/96/96/${code}.png`,
    price: x.price,
    totalPrice: x.price * adults,
    depart: x.departure_at,
    return: x.return_at || null,
    from: x.origin_airport,
    to: x.destination_airport,
    transfers: x.transfers ?? 0,
    returnTransfers: x.return_transfers ?? null,
    durationTo: x.duration_to || x.duration || null,
    durationBack: x.duration_back || null,
    flightNumber: x.flight_number ? `${code}${x.flight_number}` : null,
    // 이 일정 그대로 파트너 예약 화면으로
    link: x.link ? `https://www.aviasales.com${x.link}${x.link.includes('?') ? '&' : '?'}marker=${MARKER}&locale=${lang === 'en' ? 'en' : 'ko'}&currency=krw&adults=${adults}` : null,
  };
}

export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const from = iata(sp.get('from')) || 'SEL';
  const to = iata(sp.get('to'));
  const depart = ymd(sp.get('depart'));
  const ret = ymd(sp.get('return'));
  const adults = Math.min(9, Math.max(1, Number(sp.get('adults')) || 1));
  const direct = sp.get('direct') === '1';
  const lang = sp.get('lang') === 'en' ? 'en' : 'ko';
  if (!to || !depart) return NextResponse.json({ error: 'to and depart required' }, { status: 400 });

  const base = { origin: from, destination: to, ...(direct ? { direct: 'true' } : {}) };
  const oneWay = !ret;
  try {
    const [names, exact, month] = await Promise.all([
      airlines(),
      prices({ ...base, departure_at: depart, ...(ret ? { return_at: ret } : { one_way: 'true' }) }),
      prices({ ...base, departure_at: depart.slice(0, 7), ...(ret ? { return_at: ret.slice(0, 7) } : { one_way: 'true' }) }),
    ]);
    // 귀국까지 기간이 비슷한 것만 '같은 달 다른 날짜'로(왕복 기간 ±3일)
    const stay = ret ? (Date.parse(ret) - Date.parse(depart)) / 86400000 : null;
    const near = month.filter((x) => {
      if (x.departure_at.slice(0, 10) === depart && (!ret || (x.return_at || '').slice(0, 10) === ret)) return false;
      if (stay == null || !x.return_at) return true;
      const s = (Date.parse(x.return_at.slice(0, 10)) - Date.parse(x.departure_at.slice(0, 10))) / 86400000;
      return Math.abs(s - stay) <= 3;
    });
    // 날짜별 최저가(달력)
    const calendar = {};
    for (const x of [...exact, ...month]) {
      const d = x.departure_at.slice(0, 10);
      if (!calendar[d] || x.price < calendar[d]) calendar[d] = x.price;
    }
    const tripCom = `https://${lang === 'en' ? 'us' : 'kr'}.trip.com/flights/showfarefirst?dcity=${from.toLowerCase()}&acity=${to.toLowerCase()}&ddate=${depart}${ret ? `&rdate=${ret}&triptype=rt` : '&triptype=ow'}&class=y&quantity=${adults}&locale=${lang === 'en' ? 'en-US' : 'ko-KR'}&curr=KRW`;
    const aviasales = `https://www.aviasales.com/search/${from}${depart.slice(8, 10)}${depart.slice(5, 7)}${to}${ret ? `${ret.slice(8, 10)}${ret.slice(5, 7)}` : ''}${adults}?marker=${MARKER}&locale=${lang === 'en' ? 'en' : 'ko'}&currency=krw`;
    return NextResponse.json({
      from, to, depart, return: ret, adults, oneWay, direct,
      exact: exact.slice(0, 20).map((x) => toItem(x, names, lang, adults)),
      nearby: near.slice(0, 20).map((x) => toItem(x, names, lang, adults)),
      calendar,
      links: { tripCom, aviasales },
      source: 'travelpayouts',
    }, { headers: CACHE });
  } catch (error) {
    console.error('[flights/search] failed:', error);
    return NextResponse.json({ error: 'search failed' }, { status: 502 });
  }
}
