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
const EMERGENCY = [
  { match: /일본|japan|도쿄|tokyo|오사카|osaka|교토|kyoto|후쿠오카|fukuoka|삿포로|sapporo|오키나와|okinawa|나고야|nagoya|나라|nara|고베|kobe/i, police: '110', ambulance: '119' },
  { match: /대한민국|한국|korea|서울|seoul|부산|busan|제주|jeju|강릉|경주/i, police: '112', ambulance: '119' },
  { match: /대만|taiwan|타이베이|taipei|가오슝|타이중/i, police: '110', ambulance: '119' },
  { match: /홍콩|hong kong/i, police: '999', ambulance: '999' },
  { match: /중국|china|베이징|beijing|상하이|shanghai|칭다오|청두/i, police: '110', ambulance: '120' },
  { match: /태국|thailand|방콕|bangkok|푸켓|phuket|치앙마이|chiang mai|파타야/i, police: '1155', policeLabel: 'touristPolice', ambulance: '1669' },
  { match: /베트남|vietnam|다낭|da nang|하노이|hanoi|호치민|ho chi minh|나트랑|nha trang|푸꾸옥|phu quoc|호이안/i, police: '113', ambulance: '115' },
  { match: /필리핀|philippines|세부|cebu|마닐라|manila|보라카이|boracay/i, police: '911', ambulance: '911' },
  { match: /싱가포르|singapore/i, police: '999', ambulance: '995' },
  { match: /말레이시아|malaysia|쿠알라룸푸르|kuala lumpur|코타키나발루/i, police: '999', ambulance: '999' },
  { match: /미국|usa|united states|뉴욕|new york|la\b|로스앤젤레스|los angeles|샌프란시스코|하와이|hawaii|괌|guam|사이판|saipan|라스베이거스/i, police: '911', ambulance: '911' },
  { match: /캐나다|canada|밴쿠버|토론토/i, police: '911', ambulance: '911' },
  { match: /영국|uk\b|united kingdom|런던|london|에든버러/i, police: '999', ambulance: '999' },
  { match: /호주|australia|시드니|sydney|멜버른|melbourne|브리즈번/i, police: '000', ambulance: '000' },
  { match: /뉴질랜드|new zealand|오클랜드|퀸스타운/i, police: '111', ambulance: '111' },
  { match: /프랑스|france|파리|paris|이탈리아|italy|로마|rome|밀라노|피렌체|베네치아|스페인|spain|바르셀로나|barcelona|마드리드|독일|germany|베를린|뮌헨|스위스|switzerland|체코|prague|프라하|오스트리아|비엔나|포르투갈|리스본|portugal|네덜란드|암스테르담|그리스|아테네|산토리니|튀르키예|터키|turkey|이스탄불|크로아티아|헝가리|부다페스트|벨기에|덴마크|스웨덴|노르웨이|핀란드|아일랜드|폴란드/i, police: '112', ambulance: '112' },
];

export function emergencyNumbers(destination = '') {
  const found = EMERGENCY.find((e) => e.match.test(destination));
  return found ? { police: found.police, ambulance: found.ambulance, policeLabel: found.policeLabel || 'police' } : null;
}

export const CONSULAR_CALL = '+82-2-3210-0404';

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
