import { inKorea, kakaoDirectionsUrl } from '../../utils/tripPhase';
import { CONSULAR_CALL, findCountry } from '../../lib/emergency';
// 일정 상세 화면에서 쓰는 순수 함수들(데이터 정리·이동 시간·링크·긴급번호·동선 정리·인쇄)

// AI 응답·Firestore 문서를 화면에서 쓰기 좋은 형태로 정리한다(원본은 바꾸지 않음).
export function normalizePlan(raw) {
  let data = raw;
  if (typeof data === 'string') {
    data = JSON.parse(data.replace(/```json/gi, '').replace(/```/g, '').trim());
  }
  const plan = JSON.parse(JSON.stringify(data || {}));
  plan.itinerary = Array.isArray(plan.itinerary) ? plan.itinerary : [];
  plan.itinerary.forEach((day, i) => {
    day.day = day.day || i + 1;
    day.places = Array.isArray(day.places) ? day.places : [];
    day.places.forEach((p) => {
      const lat = parseFloat(p.coordinates?.lat ?? p.lat);
      const lng = parseFloat(p.coordinates?.lng ?? p.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) p.coordinates = { lat, lng };
    });
  });
  plan.budgetBreakdown = Array.isArray(plan.budgetBreakdown) ? plan.budgetBreakdown : [];
  plan.recommendedHotels = Array.isArray(plan.recommendedHotels) ? plan.recommendedHotels : [];
  plan.travelTips = Array.isArray(plan.travelTips) ? plan.travelTips : [];
  return plan;
}

// Firestore에 넣을 수 있게 undefined 등을 걷어낸다
export const sanitize = (value) => JSON.parse(JSON.stringify(value));

export const hasCoords = (p) => Number.isFinite(p?.coordinates?.lat) && Number.isFinite(p?.coordinates?.lng);

// "🚶 도보 10분" 같은 AI 이동 정보 → { kind, minutes, text }
export function parseTransit(text) {
  if (!text) return null;
  const t = String(text);
  const lower = t.toLowerCase();
  let kind = 'drive';
  if (/도보|걸어|walk|🚶/.test(lower)) kind = 'walk';
  else if (/버스|지하철|전철|기차|대중교통|트램|transit|bus|subway|metro|train|tram|🚌|🚇|🚆/.test(lower)) kind = 'transit';
  let minutes = null;
  const hour = t.match(/(\d+)\s*(시간|h|hr|hour)/i);
  const min = t.match(/(\d+)\s*(분|m(?!i)|min)/i);
  if (hour) minutes = Number(hour[1]) * 60 + (min ? Number(min[1]) : 0);
  else if (min) minutes = Number(min[1]);
  const clean = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}️‍]/gu, '').trim();
  return { kind, minutes, text: clean };
}

// 저녁 일정인지(밤 귀가 안내용): 카테고리·이름·설명에 저녁/야경 단서가 있거나, 그날 마지막 장소가 식사·바일 때
export function isEveningStop(place, index, total) {
  const s = `${place?.category || ''} ${place?.name || ''} ${place?.description || ''}`.toLowerCase();
  if (/야경|저녁|밤|야시장|디너|이자카야|바\b|펍|night|evening|dinner|bar|pub|izakaya/.test(s)) return true;
  return index === total - 1 && /식당|맛집|레스토랑|restaurant|dining/.test(s);
}

export function directionsUrl(place, destination = '') {
  if (hasCoords(place) && inKorea(place.coordinates.lat, place.coordinates.lng)) {
    return kakaoDirectionsUrl(place.name, place.coordinates.lat, place.coordinates.lng);
  }
  if (hasCoords(place)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${place.coordinates.lat},${place.coordinates.lng}`;
  }
  const q = `${place?.name || ''} ${destination}`.trim();
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

export function placeSearchUrl(place, destination = '', language = 'ko') {
  const q = `${place?.name || ''} ${destination}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}&hl=${language}`;
}

// 숙소 가격 비교(제휴 링크는 기존 화면과 동일한 Trip.com)
export function hotelCompareUrl(hotel, destination = '') {
  const keyword = (hotel?.googleSearchQuery || `${hotel?.name || ''} ${destination}`).replace(/\([^)]*\)/g, '').trim();
  return `https://kr.trip.com/hotels/list?keyword=${encodeURIComponent(keyword)}&Allianceid=7681311&SID=287502125`;
}

// 여행지별 긴급번호(정확히 아는 나라만. 모르면 영사콜센터만 보여 준다)
// 현지 긴급번호는 lib/emergency.js(나라별 경찰·구급·소방). 예전 호출부 호환: police·ambulance·policeLabel
export function emergencyNumbers(destination = '') {
  const c = findCountry(destination);
  if (!c) return null;
  return { iso: c.iso, country: c, police: c.police, ambulance: c.ambulance, fire: c.fire, touristPolice: c.touristPolice, policeLabel: 'police' };
}

export { CONSULAR_CALL };

// 가까운 순서로 다시 정렬(첫 장소는 고정). 기존 화면의 '동선 최적화'와 같은 방식
export function reorderByDistance(places) {
  if (places.length <= 2) return places;
  const withCoords = places.every(hasCoords);
  if (!withCoords) return places;
  const ordered = [places[0]];
  const rest = places.slice(1);
  while (rest.length) {
    const last = ordered[ordered.length - 1].coordinates;
    let best = 0;
    let bestDist = Infinity;
    rest.forEach((p, i) => {
      const d = (p.coordinates.lat - last.lat) ** 2 + (p.coordinates.lng - last.lng) ** 2;
      if (d < bestDist) { bestDist = d; best = i; }
    });
    ordered.push(rest.splice(best, 1)[0]);
  }
  return ordered;
}

// 순서가 바뀐 뒤 번호를 다시 매기고, AI가 준 이동 정보는 다음 장소가 같을 때만 남긴다
export function renumber(places) {
  return places.map((p, i) => ({ ...p, order: i + 1 }));
}

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function formatTripText(plan, url, copy) {
  const lines = [`[Trip Maker] ${plan.tripTitle || plan.destination || ''}`];
  plan.itinerary.forEach((day) => {
    lines.push('', `${copy.dayLabel(day.day)}`);
    day.places.forEach((p, i) => lines.push(`${i + 1}. ${p.name}`));
  });
  if (url) lines.push('', url);
  return lines.join('\n');
}

// 인쇄용 새 창(브라우저의 'PDF로 저장' 사용). 사용자 입력은 모두 이스케이프한다.
export function printTrip(plan, copy, dateRange) {
  const win = window.open('', '_blank');
  if (!win) return false;
  const days = plan.itinerary.map((day) => `
    <h2>${escapeHtml(copy.dayLabel(day.day))}</h2>
    <ol>${day.places.map((p) => `<li><b>${escapeHtml(p.name)}</b>${p.category ? ` · ${escapeHtml(p.category)}` : ''}${p.description ? `<br><span>${escapeHtml(p.description)}</span>` : ''}${p.transitToNext ? `<br><small>→ ${escapeHtml(parseTransit(p.transitToNext)?.text)}</small>` : ''}</li>`).join('')}</ol>`).join('');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(plan.tripTitle || 'Trip Maker')}</title>
    <style>body{font-family:-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#15304F;max-width:720px;margin:32px auto;padding:0 20px;line-height:1.6}h1{font-size:24px;margin:0}h2{font-size:17px;margin:24px 0 8px;border-bottom:1px solid #E3E6EA;padding-bottom:4px}li{margin:6px 0}span{color:#5B6577;font-size:14px}small{color:#5B6577}</style>
    </head><body><h1>${escapeHtml(plan.tripTitle || plan.destination || '')}</h1><p>${escapeHtml(plan.destination || '')} ${escapeHtml(dateRange || '')}</p>${days}<p style="margin-top:32px;color:#94A0AE;font-size:12px">tripmaker.tips</p></body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}
