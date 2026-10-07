// 여행 날짜 계산. 'YYYY-MM-DD'는 UTC가 아닌 기기 현지 날짜로 해석한다
// (new Date('2026-11-19')는 UTC 자정이라 한국 외 시간대에서 하루가 밀린다).
export function parseLocalDate(value) {
  if (!value) return null;
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  if (typeof value?.toDate === 'function') return parseLocalDate(value.toDate());
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parseLocalDate(parsed);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// 출발까지 남은 날 수(오늘 출발이면 0, 이미 출발했으면 음수). 날짜가 없으면 null.
export function daysUntil(dateValue, now) {
  const date = parseLocalDate(dateValue);
  if (!date) return null;
  return Math.round((date - startOfToday(now)) / DAY_MS);
}

// 'prep' 출발 전 · 'during' 여행 중 · 'post' 끝난 여행 · 'none' 날짜 없음
export function getTripPhase(trip, now) {
  const start = parseLocalDate(trip?.startDate);
  if (!start) return 'none';
  const end = parseLocalDate(trip.endDate) || start;
  const today = startOfToday(now);
  if (today < start) return 'prep';
  if (today <= end) return 'during';
  return 'post';
}

// 여행 중이면 몇 번째 날인지(1부터)
export function getTripDayNumber(trip, now) {
  const start = parseLocalDate(trip?.startDate);
  if (!start) return null;
  return Math.round((startOfToday(now) - start) / DAY_MS) + 1;
}

// 홈에 띄울 여행 하나를 고른다: 여행 중인 것 → 가장 가까운 출발 예정 → 없음
export function pickActiveTrip(trips, now) {
  if (!Array.isArray(trips) || trips.length === 0) return null;
  const during = trips.find((t) => getTripPhase(t, now) === 'during');
  if (during) return during;
  const upcoming = trips
    .filter((t) => getTripPhase(t, now) === 'prep')
    .sort((a, b) => daysUntil(a.startDate, now) - daysUntil(b.startDate, now));
  return upcoming[0] || null;
}

export function formatDDay(days) {
  if (days === null || days === undefined) return 'D-?';
  if (days === 0) return 'D-Day';
  return days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;
}

// 11.19 목 – 11.24 화 / Thu 11.19 – Tue 11.24
export function formatTripRange(trip, language = 'ko') {
  const start = parseLocalDate(trip?.startDate);
  if (!start) return '';
  const end = parseLocalDate(trip.endDate);
  const locale = language === 'en' ? 'en-US' : 'ko-KR';
  const fmt = (d) => {
    const md = `${d.getMonth() + 1}.${d.getDate()}`;
    const wd = d.toLocaleDateString(locale, { weekday: 'short' });
    return language === 'en' ? `${wd} ${md}` : `${md} ${wd}`;
  };
  return end && end.getTime() !== start.getTime() ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}

// 오늘 일정(장소 목록). itinerary[n].date가 있으면 날짜로, 없으면 n일차로 찾는다.
export function getTodayPlaces(trip, now) {
  const itinerary = Array.isArray(trip?.itinerary) ? trip.itinerary : [];
  if (itinerary.length === 0) return [];
  const today = startOfToday(now).getTime();
  const byDate = itinerary.find((d) => parseLocalDate(d?.date)?.getTime() === today);
  const dayNumber = getTripDayNumber(trip, now);
  const day = byDate || itinerary.find((d) => Number(d?.day) === dayNumber) || itinerary[dayNumber - 1];
  return Array.isArray(day?.places) ? day.places : [];
}

// 기기에 저장한 체크 상태(JSON 객체 문자열)를 안전하게 읽는다.
export function parseJsonObject(raw) {
  try {
    const value = JSON.parse(raw || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

// 구글 지도 길찾기 링크(좌표가 있으면 좌표, 없으면 검색어)
export function directionsUrl(place) {
  const lat = parseFloat(place?.lat ?? place?.coordinates?.lat);
  const lng = parseFloat(place?.lng ?? place?.coordinates?.lng);
  const destination = Number.isFinite(lat) && Number.isFinite(lng)
    ? `${lat},${lng}`
    : place?.googleSearchQuery || place?.address || place?.name || '';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
