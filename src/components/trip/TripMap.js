'use client';
import { useEffect, useRef } from 'react';
import useGoogleMaps from './useGoogleMaps';
import { hasCoords } from './tripUtils';

const NAVY = '#1B3D6B';
const SKY = '#1AA7E0';

const pinIcon = (g, label, { active = false, dim = false } = {}) => {
  const size = active ? 40 : 30;
  const r = active ? 16 : 12;
  const fill = dim ? '#94A0AE' : NAVY;
  const halo = active ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${NAVY}" fill-opacity="0.15"/>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${halo}<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${fill}" stroke="#fff" stroke-width="3"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial, sans-serif" font-size="${active ? 15 : 12}" font-weight="700" fill="#fff">${label}</text></svg>`;
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new g.maps.Size(size, size), anchor: new g.maps.Point(size / 2, size / 2) };
};

const nearbyIcon = (g, selected) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="${selected ? 9 : 7}" fill="#fff" stroke="${selected ? NAVY : '#F2B53A'}" stroke-width="${selected ? 4 : 3}"/></svg>`;
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new g.maps.Size(22, 22), anchor: new g.maps.Point(11, 11) };
};

const hotelIcon = (g) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="24" viewBox="0 0 44 24"><rect x="1" y="1" width="42" height="22" rx="11" fill="#F2B53A" stroke="#fff" stroke-width="2"/><text x="22" y="16" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#15304F">H</text></svg>`;
  return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new g.maps.Size(44, 24), anchor: new g.maps.Point(22, 12) };
};

// 지도: 선택한 날의 장소 번호 핀과 경로, 주변 장소, 내 위치.
// 경로 계산 결과(구간별 분)는 onLegs로 올려 일정 목록의 이동 시간에 쓴다.
export default function TripMap({
  plan, dayIdx, selectedIdx, travelMode, bottomInset = 0, recenterKey = 0,
  nearby = [], selectedNearbyId = null, myLocation = null,
  onSelectPlace, onSelectNearby, onLegs, onMapReady, loadingLabel,
}) {
  const { ready, error } = useGoogleMaps();
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const linesRef = useRef([]);
  const nearbyMarkersRef = useRef([]);
  const meMarkerRef = useRef(null);
  const routeTokenRef = useRef(0);
  const insetRef = useRef(bottomInset);
  useEffect(() => { insetRef.current = bottomInset; }, [bottomInset]);

  const day = plan?.itinerary?.[dayIdx];
  const places = day?.places || [];

  // 지도 만들기
  useEffect(() => {
    if (!ready || !elRef.current || mapRef.current) return;
    const g = window.google;
    const first = plan?.itinerary?.flatMap((d) => d.places).find(hasCoords)?.coordinates || { lat: 37.5665, lng: 126.978 };
    mapRef.current = new g.maps.Map(elRef.current, {
      center: first,
      zoom: 13,
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit.station', elementType: 'labels.icon', stylers: [{ saturation: -60 }] },
      ],
    });
    onMapReady?.(mapRef.current);
  }, [ready, plan, onMapReady]);

  const fitDay = (g, map, pts) => {
    if (!pts.length) return;
    const padding = { top: 130, right: 48, bottom: insetRef.current + 32, left: 48 };
    if (pts.length === 1) {
      map.panTo(pts[0]);
      map.setZoom(15);
      return;
    }
    const bounds = new g.maps.LatLngBounds();
    pts.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, padding);
  };

  // 그날의 핀·경로 다시 그리기
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const g = window.google;
    markersRef.current.forEach((m) => m.setMap(null));
    linesRef.current.forEach((l) => l.setMap(null));
    markersRef.current = [];
    linesRef.current = [];

    places.forEach((p, i) => {
      if (!hasCoords(p)) return;
      const marker = new g.maps.Marker({ position: p.coordinates, map, icon: pinIcon(g, i + 1), zIndex: 100 + i, title: p.name });
      marker.addListener('click', () => onSelectPlace?.(i));
      markersRef.current[i] = marker;
    });
    (plan?.recommendedHotels || []).forEach((h) => {
      if (!hasCoords(h)) return;
      markersRef.current.push(new g.maps.Marker({ position: h.coordinates, map, icon: hotelIcon(g), zIndex: 50, title: h.name }));
    });

    const pts = places.filter(hasCoords).map((p) => p.coordinates);
    fitDay(g, map, pts);

    const token = ++routeTokenRef.current;
    const walking = travelMode === 'WALKING';
    const lineOpts = {
      map,
      strokeColor: NAVY,
      strokeOpacity: walking ? 0 : 0.85,
      strokeWeight: 5,
      zIndex: 10,
      icons: walking ? [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, strokeColor: NAVY, scale: 3 }, offset: '0', repeat: '14px' }] : [],
    };
    const legsMin = new Array(Math.max(places.length - 1, 0)).fill(null);
    const report = () => token === routeTokenRef.current && onLegs?.([...legsMin]);
    onLegs?.([...legsMin]); // 새 경로를 계산하는 동안에는 AI가 준 이동 정보를 보여 준다

    if (pts.length < 2) { report(); return; }
    const service = new g.maps.DirectionsService();
    const straight = () => {
      if (token !== routeTokenRef.current) return;
      linesRef.current.push(new g.maps.Polyline({ ...lineOpts, path: pts, strokeOpacity: walking ? 0 : 0.5 }));
    };

    // 좌표가 있는 장소들끼리의 원래 인덱스(구간 시간을 일정 순서에 맞추기 위해)
    const idx = places.map((p, i) => (hasCoords(p) ? i : -1)).filter((i) => i >= 0);
    if (travelMode === 'TRANSIT') {
      let pending = idx.length - 1;
      for (let k = 0; k < idx.length - 1; k++) {
        service.route({ origin: places[idx[k]].coordinates, destination: places[idx[k + 1]].coordinates, travelMode: g.maps.TravelMode.TRANSIT }, (res, status) => {
          if (token !== routeTokenRef.current) return;
          if (status === 'OK') {
            linesRef.current.push(new g.maps.Polyline({ ...lineOpts, path: res.routes[0].overview_path }));
            if (idx[k + 1] === idx[k] + 1) legsMin[idx[k]] = Math.round(res.routes[0].legs[0].duration.value / 60);
          } else {
            linesRef.current.push(new g.maps.Polyline({ ...lineOpts, path: [places[idx[k]].coordinates, places[idx[k + 1]].coordinates], strokeOpacity: 0.4 }));
          }
          if (--pending === 0) report();
        });
      }
    } else {
      service.route({
        origin: pts[0],
        destination: pts[pts.length - 1],
        waypoints: pts.slice(1, -1).slice(0, 23).map((location) => ({ location, stopover: true })),
        travelMode: g.maps.TravelMode[travelMode] || g.maps.TravelMode.WALKING,
      }, (res, status) => {
        if (token !== routeTokenRef.current) return;
        if (status === 'OK') {
          linesRef.current.push(new g.maps.Polyline({ ...lineOpts, path: res.routes[0].overview_path }));
          res.routes[0].legs.forEach((leg, k) => {
            if (idx[k + 1] === idx[k] + 1) legsMin[idx[k]] = Math.round(leg.duration.value / 60);
          });
        } else {
          straight();
        }
        report();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, plan, dayIdx, travelMode, recenterKey]);

  // 선택한 장소 강조·이동
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const g = window.google;
    markersRef.current.forEach((m, i) => {
      if (!m || i >= places.length) return;
      const active = selectedIdx === i;
      m.setIcon(pinIcon(g, i + 1, { active, dim: selectedIdx != null && !active }));
      m.setZIndex(active ? 999 : 100 + i);
    });
    const p = places[selectedIdx];
    if (selectedIdx != null && hasCoords(p)) {
      if (map.getZoom() < 15) map.setZoom(16);
      map.setCenter(p.coordinates);
      // 아래 시트에 가리지 않게: 보이는 지도 영역(시트 위)의 가운데로 옮긴다
      const offset = Math.round(insetRef.current / 2);
      g.maps.event.addListenerOnce(map, 'idle', () => map.panBy(0, offset));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedIdx, plan, dayIdx]);

  // 주변 장소
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const g = window.google;
    nearbyMarkersRef.current.forEach((m) => m.setMap(null));
    nearbyMarkersRef.current = nearby.map((n) => {
      const m = new g.maps.Marker({ position: n.location, map, icon: nearbyIcon(g, n.id === selectedNearbyId), zIndex: n.id === selectedNearbyId ? 900 : 60, title: n.name });
      m.addListener('click', () => onSelectNearby?.(n));
      return m;
    });
  }, [ready, nearby, selectedNearbyId, onSelectNearby]);

  // 내 위치
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const g = window.google;
    meMarkerRef.current?.setMap(null);
    if (!myLocation) return;
    meMarkerRef.current = new g.maps.Marker({
      position: myLocation, map, zIndex: 1000,
      icon: { path: g.maps.SymbolPath.CIRCLE, scale: 8, fillColor: SKY, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
    });
    map.panTo(myLocation);
  }, [ready, myLocation]);

  return (
    <div className="absolute inset-0 bg-[#EEF1EC]">
      <div ref={elRef} className="h-full w-full" />
      {!ready && (
        <div className="absolute inset-0 flex items-start justify-center pt-40 text-[14px] text-tm-muted" role="status">
          {error ? '' : loadingLabel}
        </div>
      )}
    </div>
  );
}
