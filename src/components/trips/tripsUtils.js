import { daysUntil, getTripPhase, parseLocalDate } from '../../utils/tripPhase';

export const tripTitle = (trip) => trip?.tripTitle || trip?.destination || '';
export const tripDestination = (trip) => trip?.destination || trip?.tripTitle || '';

// 여행 일수: 날짜가 있으면 날짜로, 없으면 일정 일수로
export function tripLength(trip) {
  const start = parseLocalDate(trip?.startDate);
  const end = parseLocalDate(trip?.endDate);
  if (start && end) return Math.max(Math.round((end - start) / 86400000) + 1, 1);
  return Math.max(Array.isArray(trip?.itinerary) ? trip.itinerary.length : 0, 1);
}

export function placeCount(trip) {
  const days = Array.isArray(trip?.itinerary) ? trip.itinerary : [];
  return days.reduce((sum, day) => sum + (Array.isArray(day?.places) ? day.places.length : 0), 0);
}

export function companionLabel(trip, copy) {
  const members = Array.isArray(trip?.membersInfo) ? trip.membersInfo.length : 1;
  if (members > 1) return copy.companions.withN(members);
  return trip?.companion || copy.companions.solo;
}

const createdAtMs = (trip) => trip?.createdAt?.toMillis?.() ?? 0;

// 다가오는 여행: 여행 중 → 출발 임박 순 → 날짜 미정(최근 만든 순) / 지난 여행: 최근에 끝난 순
export function groupTrips(trips, now) {
  const during = [];
  const prep = [];
  const undated = [];
  const past = [];
  for (const trip of trips) {
    const phase = getTripPhase(trip, now);
    if (phase === 'during') during.push(trip);
    else if (phase === 'prep') prep.push(trip);
    else if (phase === 'post') past.push(trip);
    else undated.push(trip);
  }
  prep.sort((a, b) => daysUntil(a.startDate, now) - daysUntil(b.startDate, now));
  undated.sort((a, b) => createdAtMs(b) - createdAtMs(a));
  const endOf = (t) => (parseLocalDate(t.endDate) || parseLocalDate(t.startDate))?.getTime() ?? 0;
  past.sort((a, b) => endOf(b) - endOf(a));
  return { upcoming: [...during, ...prep, ...undated], past };
}

// 끝난 지 며칠 됐는지(오늘 끝났으면 0은 아님: 끝난 다음 날이 1)
export function daysSinceEnd(trip, now) {
  const end = parseLocalDate(trip?.endDate) || parseLocalDate(trip?.startDate);
  if (!end) return null;
  return -daysUntil(end, now);
}

// 'YYYY-MM-DD' (기기 현지 날짜)
export function toInputDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 붙여 넣은 초대 링크에서 열 경로를 꺼낸다. 새 1회성 링크(/j/?k=…)는 그대로, 예전 /join/ 링크는 닫힌 안내 화면으로.
export function parseInviteLink(text) {
  const value = String(text || '').trim();
  const key = /[?&]k=([A-Za-z0-9]{10,40}\.[0-9a-f]{32})/.exec(value);
  if (key) return `/j/?k=${key[1]}`;
  const legacy = /\/join\/([A-Za-z0-9_-]{6,})/.exec(value);
  if (legacy) return `/join/${legacy[1]}`;
  return null;
}
