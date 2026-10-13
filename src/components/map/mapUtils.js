// 지도 탭 공용 계산·아이콘

export const SEOUL = { lat: 37.5665, lng: 126.978 };

// 카테고리별 구글 장소 종류(nearbySearch는 한 번에 한 종류만 받는다)와 검색 반경(m)
export const CATEGORY_TYPES = {
  food: { types: ['restaurant'], radius: 1500 },
  cafe: { types: ['cafe', 'bakery'], radius: 1500 },
  sights: { types: ['tourist_attraction', 'museum', 'park'], radius: 2500 },
  shopping: { types: ['shopping_mall', 'department_store', 'clothing_store'], radius: 2000 },
  stay: { types: ['lodging'], radius: 3000 },
  safe: { types: ['convenience_store', 'pharmacy', 'police'], radius: 1200 },
};

// 제휴 상품(products.type) → 지도 카테고리
export const PRODUCT_CATEGORY = {
  restaurant: 'food', food: 'food', cafe: 'cafe',
  ticket: 'sights', tour: 'sights', event: 'sights',
  shopping: 'shopping', hotel: 'stay', lodging: 'stay',
};

// 두 좌표 사이 거리(m)
export function distanceM(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 걸어서 몇 분(분당 80m), 2km가 넘으면 km
export function formatDistance(m, copy) {
  if (m > 2000) return copy.km((m / 1000).toFixed(1));
  return copy.walk(Math.max(1, Math.round(m / 80)));
}

const svgIcon = (g, svg, w, h) => ({
  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
  scaledSize: new g.maps.Size(w, h),
  anchor: new g.maps.Point(w / 2, h / 2),
});

// 장소 핀: 흰 원 + 남색 테두리, 고르면 남색으로 크게. 제휴는 햇살색. (빨강은 SOS 전용이라 쓰지 않는다)
export function placeIcon(g, { selected = false, partner = false } = {}) {
  const size = selected ? 34 : 24;
  const c = size / 2;
  const stroke = partner ? '#F2B53A' : '#1B3D6B';
  const svg = selected
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${c}" cy="${c}" r="${c}" fill="${stroke}" fill-opacity=".18"/><circle cx="${c}" cy="${c}" r="${c - 6}" fill="${stroke}" stroke="#fff" stroke-width="3"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${c}" cy="${c}" r="${c - 3}" fill="#fff" stroke="${stroke}" stroke-width="3.5"/><circle cx="${c}" cy="${c}" r="3" fill="${stroke}"/></svg>`;
  return svgIcon(g, svg, size, size);
}

export function meIcon(g) {
  return { path: g.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#1AA7E0', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 };
}
