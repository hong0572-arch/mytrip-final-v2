import { NextResponse } from 'next/server';
import { HOME_CITIES } from '../../../content/homeCities';
import { kmaCurrent } from '../../../lib/kmaWeather';

// 홈 추천 도시들의 지금 날씨. 한국(country 'KR')은 기상청 단기예보(KMA_SERVICE_KEY), 나머지는 Google Maps Platform Weather API.
// Google은 한국·일본을 지원하지 않는다(일본은 지금 날씨 없이 보여 준다).
// 서버가 대신 조회하고 30분 동안 캐시한다 → 방문자 수와 상관없이 호출 수가 거의 일정하고,
// 방문자 IP·위치는 날씨 API로 가지 않는다. 키는 GOOGLE_WEATHER_API_KEY(없으면 지도 키)를 쓴다.
// Weather API가 꺼져 있거나 실패하면 빈 객체를 돌려주고, 화면은 날씨 없이 그린다.
// 공공데이터포털(기상청)은 해외 IP 요청을 막을 수 있어 함수는 서울 리전(vercel.json regions: icn1)에서 실행한다.

const TTL_MS = 30 * 60 * 1000;
const cache = new Map(); // lang → { at, data }

async function lookup(city, lang, key) {
  const url = `https://weather.googleapis.com/v1/currentConditions:lookup?key=${key}`
    + `&location.latitude=${city.lat}&location.longitude=${city.lng}&languageCode=${lang}&unitsSystem=METRIC`;
  const res = await fetch(url, { headers: { Referer: 'https://tripmaker.tips/' }, cache: 'no-store' });
  if (!res.ok) throw new Error(`weather ${res.status}`);
  const json = await res.json();
  const temp = json?.temperature?.degrees;
  if (typeof temp !== 'number') throw new Error('no temperature');
  return { temp: Math.round(temp), type: json?.weatherCondition?.type || '', text: json?.weatherCondition?.description?.text || '' };
}

export async function GET(req) {
  const lang = new URL(req.url).searchParams.get('lang') === 'en' ? 'en' : 'ko';
  const headers = { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=600' };
  const hit = cache.get(lang);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json(hit.data, { headers });

  const key = process.env.GOOGLE_WEATHER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const kmaKey = process.env.KMA_SERVICE_KEY;
  const fetchCity = (c) => {
    if (c.country === 'KR') return kmaKey ? kmaCurrent(c, lang, kmaKey) : Promise.reject(new Error('no KMA_SERVICE_KEY'));
    if (c.country === 'JP') return Promise.reject(new Error('not supported'));
    return key ? lookup(c, lang, key) : Promise.reject(new Error('no Google key'));
  };

  const results = await Promise.allSettled(HOME_CITIES.map(fetchCity));
  // 한국 도시 실패 이유(키 제외)를 로그와 응답 헤더(x-weather-kma)에 남겨 원인을 바로 볼 수 있게 한다
  const kmaErrors = [...new Set(results.filter((r, i) => r.status === 'rejected' && HOME_CITIES[i].country === 'KR').map((r) => String(r.reason?.message || 'error').slice(0, 60)))];
  if (kmaErrors.length) console.warn('[weather] kma failed:', kmaErrors.join('; '));
  const data = {};
  results.forEach((r, i) => { if (r.status === 'fulfilled') data[HOME_CITIES[i].id] = r.value; });
  if (Object.keys(data).length === 0) {
    const reason = results[0]?.reason?.message || 'unknown';
    console.warn('[weather] lookup failed:', reason);
    return NextResponse.json({}, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
  }
  if (!kmaErrors.length) cache.set(lang, { at: Date.now(), data });
  return NextResponse.json(data, { headers: kmaErrors.length ? { 'Cache-Control': 'public, s-maxage=300', 'x-weather-kma': kmaErrors.join('; ') } : headers });
}
