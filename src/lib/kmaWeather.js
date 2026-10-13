// 기상청 단기예보 조회서비스(공공데이터포털 VilageFcstInfoService_2.0)로 한국 도시의 지금 날씨를 가져온다.
// Google Weather API가 한국을 지원하지 않아서 한국 도시만 이걸 쓴다. 서버 전용(키: KMA_SERVICE_KEY).
const BASE = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';

// 위경도 → 기상청 격자(nx, ny). 기상청 Lambert Conformal Conic 변환식.
export function toKmaGrid(lat, lng) {
  const RE = 6371.00877; const GRID = 5.0;
  const SLAT1 = 30.0; const SLAT2 = 60.0; const OLON = 126.0; const OLAT = 38.0;
  const XO = 43; const YO = 136;
  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD; const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD; const olat = OLAT * DEGRAD;
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (sf ** sn * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / ro ** sn;
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / ra ** sn;
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;
  return { nx: Math.floor(ra * Math.sin(theta) + XO + 0.5), ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5) };
}

// 한국 시간(KST) 기준 발표 시각. 실황은 매시 정각 발표(약 40분 뒤 제공), 초단기예보는 매시 30분 발표(약 45분 뒤 제공).
function kstParts(date, minusMinutes) {
  const d = new Date(date.getTime() + 9 * 3600 * 1000 - minusMinutes * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return { ymd: `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`, hh: pad(d.getUTCHours()) };
}

async function call(op, key, params) {
  const serviceKey = key.includes('%') ? key : encodeURIComponent(key); // 인코딩·디코딩 키 모두 받는다
  const qs = new URLSearchParams({ pageNo: '1', numOfRows: '100', dataType: 'JSON', ...params }).toString();
  const res = await fetch(`${BASE}/${op}?serviceKey=${serviceKey}&${qs}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`kma ${op} ${res.status}`);
  const json = await res.json().catch(() => null); // 키 오류 등은 XML로 온다
  const code = json?.response?.header?.resultCode;
  if (code !== '00') throw new Error(`kma ${op} result ${code || 'non-json'}`);
  return json.response.body?.items?.item || [];
}

const TEXT = {
  CLEAR: { ko: '맑음', en: 'Clear' },
  PARTLY_CLOUDY: { ko: '구름 많음', en: 'Mostly cloudy' },
  CLOUDY: { ko: '흐림', en: 'Cloudy' },
  RAIN: { ko: '비', en: 'Rain' },
  RAIN_AND_SNOW: { ko: '비 또는 눈', en: 'Rain and snow' },
  SNOW: { ko: '눈', en: 'Snow' },
  SHOWER: { ko: '소나기', en: 'Showers' },
};

// 반환: { temp, type, text } — type은 Google Weather API와 같은 이름을 써서 화면 아이콘을 공유한다.
export async function kmaCurrent({ lat, lng }, lang, key) {
  const { nx, ny } = toKmaGrid(lat, lng);
  const now = new Date();
  const ncst = kstParts(now, 45);
  const fcst = kstParts(now, 50);
  const [obs, fc] = await Promise.all([
    call('getUltraSrtNcst', key, { base_date: ncst.ymd, base_time: `${ncst.hh}00`, nx: String(nx), ny: String(ny) }),
    call('getUltraSrtFcst', key, { base_date: fcst.ymd, base_time: `${fcst.hh}30`, nx: String(nx), ny: String(ny), numOfRows: '60' }).catch(() => []),
  ]);
  const t1h = Number(obs.find((i) => i.category === 'T1H')?.obsrValue);
  if (!Number.isFinite(t1h)) throw new Error('kma no temperature');
  const pty = Number(obs.find((i) => i.category === 'PTY')?.obsrValue || 0); // 0 없음 1 비 2 비/눈 3 눈 5 빗방울 6 빗방울눈날림 7 눈날림
  const skyItem = fc.filter((i) => i.category === 'SKY').sort((a, b) => `${a.fcstDate}${a.fcstTime}`.localeCompare(`${b.fcstDate}${b.fcstTime}`))[0];
  const sky = Number(skyItem?.fcstValue || 1); // 1 맑음 3 구름많음 4 흐림
  const type = pty === 1 || pty === 5 ? 'RAIN'
    : pty === 2 || pty === 6 ? 'RAIN_AND_SNOW'
      : pty === 3 || pty === 7 ? 'SNOW'
        : pty === 4 ? 'SHOWER'
          : sky >= 4 ? 'CLOUDY' : sky === 3 ? 'PARTLY_CLOUDY' : 'CLEAR';
  return { temp: Math.round(t1h), type, text: TEXT[type][lang === 'en' ? 'en' : 'ko'] };
}
