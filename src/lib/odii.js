// 한국관광공사 관광지 오디오 가이드(오디, Odii) — 서버 전용. 공공데이터 일반 인증키(DATA_GO_KR_KEY)를 쓴다.
// 관광지(테마) → 그 관광지의 이야기(스토리) 오디오 목록. 장소 이름과 좌표로 가장 맞는 관광지를 고른다.
import { dataGoKrKey, encodedServiceKey, itemsOf } from './dataGoKr';

const BASE = 'https://apis.data.go.kr/B551011/Odii';
const TIMEOUT_MS = 8000;

async function call(op, params) {
  const qs = new URLSearchParams({ MobileOS: 'ETC', MobileApp: 'TripMaker', _type: 'json', numOfRows: '30', pageNo: '1', ...params });
  const res = await fetch(`${BASE}/${op}?serviceKey=${encodedServiceKey()}&${qs}`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
  const text = await res.text();
  if (!res.ok || text.trimStart().startsWith('<')) throw new Error(`odii ${op} ${res.status}`);
  const json = JSON.parse(text);
  const err = json?.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg;
  if (err) throw new Error(`odii ${op} ${err}`);
  return itemsOf(json);
}

const norm = (s) => String(s || '').toLowerCase().replace(/\(.*?\)|\[.*?\]/g, '').replace(/[^0-9a-z가-힣]/g, '');

// 이름이 얼마나 비슷한지(0~1). 한쪽이 다른 쪽을 품으면 높게 본다.
function nameScore(a, b) {
  const x = norm(a); const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.8;
  return 0;
}

function distanceM(lat1, lng1, lat2, lng2) {
  const r = 6371000; const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

const seconds = (v) => {
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return n;
  const m = /^(\d+):(\d{2})$/.exec(String(v || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/**
 * @param {{ names: string[], lat?: number, lng?: number, lang: 'ko'|'en' }} q
 * @returns {Promise<null | { title: string, tracks: { title: string, src: string, duration: number|null, script: string }[] }>}
 */
export async function findOdiiGuide({ names, lat, lng, lang }) {
  if (!dataGoKrKey()) return null;
  const langCode = lang === 'en' ? 'en' : 'ko';
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  // 1) 관광지 찾기: 좌표 주변 → 없으면 이름 검색
  let themes = [];
  if (hasCoords) themes = await call('themeLocationBasedList', { mapX: String(lng), mapY: String(lat), radius: '1500', langCode }).catch(() => []);
  if (!themes.length) {
    for (const keyword of names.filter(Boolean).slice(0, 2)) {
      themes = await call('themeSearchList', { keyword, langCode }).catch(() => []);
      if (themes.length) break;
    }
  }
  const scored = themes
    .map((t) => {
      const score = Math.max(...names.map((n) => nameScore(n, t.title)));
      const d = hasCoords && t.mapY && t.mapX ? distanceM(lat, lng, Number(t.mapY), Number(t.mapX)) : null;
      return { t, score, d };
    })
    // 이름이 맞거나, 아주 가까운(300m) 관광지만
    .filter((x) => x.score >= 0.8 || (x.d != null && x.d < 300))
    .sort((a, b) => b.score - a.score || (a.d ?? 1e9) - (b.d ?? 1e9));
  const theme = scored[0]?.t;
  if (!theme?.tid) return null;

  // 2) 그 관광지의 이야기 오디오
  const stories = await call('storyBasedList', { tid: String(theme.tid), tlid: String(theme.tlid || ''), langCode }).catch(() => []);
  const tracks = stories
    .filter((s) => /^https?:\/\//.test(s.audioUrl || ''))
    .map((s) => ({
      title: s.audioTitle || s.title || theme.title,
      src: String(s.audioUrl).replace(/^http:\/\//, 'https://'),
      duration: seconds(s.playTime),
      script: String(s.script || '').trim(),
    }))
    .slice(0, 12);
  if (!tracks.length) return null;
  return { title: theme.title, tracks };
}
