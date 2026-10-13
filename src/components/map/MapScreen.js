'use client';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LocateFixed, MessageCircle, Navigation, RotateCw, Star, X } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import useAppLanguage from '../../hooks/useAppLanguage';
import useMyTrips from '../../hooks/useMyTrips';
import { getAiHomeCopy } from '../../content/aiHomeCopy';
import { getMapCopy } from '../../content/mapCopy';
import { directionsUrl, getTodayPlaces, getTripPhase, pickActiveTrip } from '../../utils/tripPhase';
import useGoogleMaps from '../trip/useGoogleMaps';
import BottomNav from '../home/BottomNav';
import { startChat } from '../home/homeActions';
import MapFallback from './MapFallback';
import { CATEGORY_TYPES, PRODUCT_CATEGORY, SEOUL, distanceM, formatDistance, meIcon, placeIcon } from './mapUtils';

// 시트 위쪽 끝 위치(지도 영역 높이 대비). peek: 지도가 넓게, full: 목록이 넓게
const SHEET_TOP = { peek: 0.6, full: 0.12 };
const MAX_RESULTS = 40;
const SEARCH_AGAIN_M = 400;
const NO_RESULTS = [];

const placeCoords = (p) => {
  const lat = parseFloat(p?.coordinates?.lat ?? p?.lat);
  const lng = parseFloat(p?.coordinates?.lng ?? p?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

// 위치 권한이 없을 때 쓸 기준점: 여행 중이면 오늘 장소들, 출발 전이면 첫날 장소들의 가운데
function tripCenter(trip) {
  if (!trip) return null;
  const places = getTripPhase(trip) === 'during' ? getTodayPlaces(trip) : (trip.itinerary?.[0]?.places || []);
  const pts = places.map(placeCoords).filter(Boolean);
  if (!pts.length) return null;
  return { lat: pts.reduce((a, p) => a + p.lat, 0) / pts.length, lng: pts.reduce((a, p) => a + p.lng, 0) / pts.length };
}

// 지도 탭: 내 주변(또는 여행지)의 맛집·카페·볼거리·안심 장소를 지도와 목록으로 보여 준다.
export default function MapScreen() {
  const router = useRouter();
  const [language] = useAppLanguage();
  const copy = getMapCopy(language);
  const homeCopy = getAiHomeCopy(language);
  const { user, trips } = useMyTrips();

  const { ready, error } = useGoogleMaps();
  // ?cat=safe 처럼 카테고리를 정해 들어올 수 있다(안심 탭 → 안심 장소)
  const [category, setCategory] = useState(() => {
    const c = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('cat');
    return c && CATEGORY_TYPES[c] ? c : 'food';
  });
  const [openNow, setOpenNow] = useState(false);
  const [sheet, setSheet] = useState('peek');
  const [locating, setLocating] = useState(true);
  const [located, setLocated] = useState(null); // 내 위치 { lat, lng } | null
  const [locationDenied, setLocationDenied] = useState(false);
  // 사용자가 정한 기준점(내 위치·이 지역). 없으면 아래에서 여행 일정 → 서울 순으로 정한다
  const [chosenBase, setChosenBase] = useState(null); // { kind: 'me'|'area', center }
  const [search, setSearch] = useState({ key: '', results: [], failed: false });
  const [selectedId, setSelectedId] = useState(null);
  const [idleCenter, setIdleCenter] = useState(null);
  const [draggedFor, setDraggedFor] = useState(null); // 사용자가 지도를 직접 끈 기준점 키
  const [products, setProducts] = useState([]);

  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const meMarkerRef = useRef(null);
  const searchTokenRef = useRef(0);
  const dragRef = useRef(null);
  const baseKeyRef = useRef('');

  const areaH = useSyncExternalStore(
    (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb); },
    () => window.innerHeight - 64,
    () => 740
  );
  const sheetPx = Math.round(areaH * (1 - SHEET_TOP[sheet]));

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  const activeTrip = useMemo(() => pickActiveTrip(trips), [trips]);
  const fallbackCenter = useMemo(() => tripCenter(activeTrip), [activeTrip]);
  const tripDest = activeTrip?.destination || activeTrip?.tripTitle || '';
  const base = useMemo(() => {
    if (chosenBase) return chosenBase;
    if (locating) return null;
    if (fallbackCenter) return { kind: 'trip', center: fallbackCenter, dest: tripDest };
    return { kind: 'default', center: SEOUL };
  }, [chosenBase, locating, fallbackCenter, tripDest]);
  const searchKey = base ? `${base.center.lat},${base.center.lng}|${category}|${openNow}` : '';
  const searching = ready && Boolean(base) && search.key !== searchKey;
  const results = search.key === searchKey ? search.results : NO_RESULTS;
  const baseKey = base ? `${base.center.lat},${base.center.lng}` : '';
  // 장소를 골라 지도가 저절로 움직인 것은 빼고, 직접 끌어서 멀어졌을 때만 '다시 찾기'를 보여 준다
  const moved = draggedFor === baseKey && Boolean(idleCenter) && distanceM(base.center, idleCenter) > SEARCH_AGAIN_M;

  // 내 위치 찾기
  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      setLocationDenied(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocated(me);
        setLocationDenied(false);
        setLocating(false);
        setChosenBase({ kind: 'me', center: me });
      },
      () => {
        setLocationDenied(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => { locate(); }, [locate]);

  // 제휴 상품(공개 목록)은 한 번만 불러온다
  useEffect(() => {
    getDocs(collection(db, 'products'))
      .then((snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => placeCoords(p))))
      .catch(() => setProducts([]));
  }, []);

  // 지도 만들기
  useEffect(() => {
    if (!ready || !elRef.current || mapRef.current || !base) return;
    const g = window.google;
    const map = new g.maps.Map(elRef.current, {
      center: base.center,
      zoom: 15,
      disableDefaultUI: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
      styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
    });
    map.addListener('idle', () => {
      const c = map.getCenter();
      if (c) setIdleCenter({ lat: c.lat(), lng: c.lng() });
    });
    map.addListener('click', () => setSelectedId(null));
    map.addListener('dragstart', () => setDraggedFor(baseKeyRef.current));
    mapRef.current = map;
  }, [ready, base]);

  useEffect(() => { baseKeyRef.current = baseKey; }, [baseKey]);

  // 기준점이 바뀌면 지도를 옮긴다
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !base) return;
    map.panTo(base.center);
  }, [base, ready]);

  // 내 위치 표시
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    meMarkerRef.current?.setMap(null);
    meMarkerRef.current = located ? new window.google.maps.Marker({ position: located, map, icon: meIcon(window.google), zIndex: 1000 }) : null;
  }, [ready, located, base]);

  // 장소 찾기: 기준점·카테고리·영업 중 조건이 바뀔 때마다
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !base) return undefined;
    const g = window.google;
    const token = ++searchTokenRef.current;
    const { types, radius } = CATEGORY_TYPES[category];
    const service = new g.maps.places.PlacesService(map);
    const found = new Map();
    let pending = types.length;
    let failed = 0;
    types.forEach((type) => {
      service.nearbySearch({ location: base.center, radius, type, ...(openNow ? { openNow: true } : {}) }, (res, st) => {
        if (token !== searchTokenRef.current) return;
        const S = g.maps.places.PlacesServiceStatus;
        if (st === S.OK && res) {
          res.forEach((r) => {
            if (!r.geometry?.location || found.has(r.place_id)) return;
            const location = { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() };
            found.set(r.place_id, {
              id: r.place_id,
              name: r.name,
              rating: r.rating,
              ratings: r.user_ratings_total,
              address: r.vicinity,
              location,
              distance: distanceM(base.center, location),
              kind: category === 'safe' ? type : null,
            });
          });
        } else if (st !== S.ZERO_RESULTS) {
          failed++;
        }
        if (--pending === 0) {
          const list = [...found.values()].sort((a, b) => a.distance - b.distance).slice(0, MAX_RESULTS);
          setSearch({ key: searchKey, results: list, failed: !list.length && failed === types.length });
        }
      });
    });
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, searchKey]);

  // 제휴 상품: 같은 카테고리, 기준점 3km 안
  const partnerResults = useMemo(() => {
    if (!base || openNow) return [];
    return products
      .filter((p) => PRODUCT_CATEGORY[p.type || p.category] === category)
      .map((p) => {
        const location = placeCoords(p);
        return { id: `product-${p.id}`, productId: p.id, name: p.title, price: p.price, location, distance: distanceM(base.center, location), partner: true };
      })
      .filter((p) => p.distance <= 3000)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, [products, category, base, openNow]);

  const allResults = useMemo(() => [...partnerResults, ...results], [partnerResults, results]);
  const selected = allResults.find((r) => r.id === selectedId) || null;

  // 핀 그리기(목록이 바뀔 때)
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const g = window.google;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = new Map();
    allResults.forEach((r) => {
      const m = new g.maps.Marker({ position: r.location, map, icon: placeIcon(g, { partner: r.partner }), title: r.name, zIndex: r.partner ? 80 : 50 });
      m.addListener('click', () => setSelectedId(r.id));
      markersRef.current.set(r.id, m);
    });
  }, [ready, allResults]);

  // 고른 장소 강조 + 시트에 가리지 않는 곳으로 옮기기
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const g = window.google;
    markersRef.current.forEach((m, id) => {
      const r = allResults.find((x) => x.id === id);
      m.setIcon(placeIcon(g, { selected: id === selectedId, partner: r?.partner }));
      m.setZIndex(id === selectedId ? 900 : r?.partner ? 80 : 50);
    });
    if (selected) {
      map.panTo(selected.location);
      g.maps.event.addListenerOnce(map, 'idle', () => map.panBy(0, Math.round(sheetPx / 2)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedId]);

  const searchHere = () => {
    const c = mapRef.current?.getCenter();
    if (!c) return;
    setChosenBase({ kind: 'area', center: { lat: c.lat(), lng: c.lng() } });
  };

  const goMe = () => {
    if (located) setChosenBase({ kind: 'me', center: located });
    else locate();
  };

  const select = (r) => {
    setSelectedId(r.id);
    if (sheet === 'full') setSheet('peek');
  };

  const onHandleDown = (e) => { dragRef.current = e.clientY; };
  const onHandleUp = (e) => {
    const start = dragRef.current;
    dragRef.current = null;
    if (start == null) return;
    const dy = e.clientY - start;
    if (dy < -30) setSheet('full');
    else if (dy > 30) setSheet('peek');
    else setSheet((s) => (s === 'peek' ? 'full' : 'peek'));
  };

  const baseLabel = !base ? copy.loading
    : base.kind === 'me' ? copy.base.me
      : base.kind === 'trip' ? copy.base.trip(base.dest)
        : base.kind === 'area' ? copy.base.area
          : copy.base.default;
  const catLabel = copy.categories[category];
  const kindLabel = (r) => (r.kind === 'police' ? '🚓 ' : r.kind === 'pharmacy' ? '💊 ' : r.kind === 'convenience_store' ? '🏪 ' : '');
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(catLabel)}`;

  return (
    <div className="flex h-dvh select-none flex-col bg-tm-ground font-sans text-tm-ink">
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1 bg-[#EEF1EC]">
          <div ref={elRef} className="absolute inset-0 isolate" />
          {!ready && !error && <p role="status" className="absolute inset-x-0 top-40 text-center text-[14px] text-tm-muted">{copy.loading}</p>}
          {error && (
            <MapFallback
              language={language}
              className="absolute inset-x-0 top-0 pt-24"
              style={{ bottom: sheetPx }}
              onRetry={() => window.location.reload()}
              googleMapsUrl={googleMapsUrl}
            />
          )}

          {/* 위: 제목·기준점, 카테고리 */}
          <div className="absolute inset-x-3 top-3 z-10 flex flex-col gap-2">
            <div className="flex h-11 items-center gap-2 self-start rounded-full bg-white pl-4 pr-1.5 shadow-[0_2px_8px_rgba(21,48,79,.14)]">
              <h1 className="text-[15px] font-bold">{copy.title}</h1>
              <span className="text-[12px] text-tm-muted">· {baseLabel}</span>
              <span className="w-1" />
            </div>
            <div role="tablist" aria-label={copy.title} className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
              {Object.keys(CATEGORY_TYPES).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={category === key}
                  onClick={() => setCategory(key)}
                  className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold shadow-[0_2px_6px_rgba(21,48,79,.12)] ${category === key ? 'bg-tm-navy text-white' : 'bg-white text-tm-ink'}`}
                >
                  {copy.categories[key]}
                </button>
              ))}
            </div>
            {locationDenied && !located && (
              <div className="flex items-center gap-2 self-start rounded-2xl bg-white py-1 pl-3.5 pr-1 text-[12px] text-tm-ink shadow-[0_2px_8px_rgba(21,48,79,.12)]">
                <span>{copy.locationOff}</span>
                <button type="button" onClick={locate} className="h-9 rounded-xl px-2.5 font-bold text-tm-navy">{copy.locationRetry}</button>
              </div>
            )}
          </div>

          {/* 지도 위 버튼 */}
          {moved && !searching && (
            <button
              type="button"
              onClick={searchHere}
              style={{ bottom: sheetPx + 14 }}
              className="tm-rise absolute left-1/2 z-10 flex h-10 -translate-x-1/2 items-center gap-1.5 rounded-full bg-tm-navy px-4 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(21,48,79,.25)]"
            >
              <RotateCw size={15} /> {copy.searchHere}
            </button>
          )}
          <button
            type="button"
            onClick={goMe}
            aria-label={copy.myLocation}
            style={{ bottom: sheetPx + 12 }}
            className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-tm-navy shadow-[0_2px_8px_rgba(21,48,79,.16)]"
          >
            <LocateFixed size={20} strokeWidth={2} className={locating ? 'animate-pulse' : ''} />
          </button>

          {/* 고른 장소 카드 */}
          {selected && (
            <div className="tm-rise absolute inset-x-3 z-20 flex flex-col gap-3 rounded-2xl bg-white p-3.5 shadow-[0_6px_20px_rgba(21,48,79,.2)]" style={{ bottom: sheetPx + 66 }}>
              <div className="flex items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5">
                    {selected.partner && <span className="rounded-full bg-tm-warm-tint px-1.5 py-0.5 text-[11px] font-bold text-tm-warm">{copy.partner}</span>}
                    <span className="truncate text-[16px] font-bold">{kindLabel(selected)}{selected.name}</span>
                  </span>
                  <span className="truncate text-[12px] text-tm-muted">
                    {formatDistance(selected.distance, copy)}
                    {selected.rating ? ` · ★ ${selected.rating}` : ''}
                    {selected.address ? ` · ${selected.address}` : ''}
                    {selected.partner && selected.price ? ` · ₩${Number(selected.price).toLocaleString()}` : ''}
                  </span>
                </div>
                <button type="button" onClick={() => setSelectedId(null)} aria-label={copy.close} className="-mr-1.5 -mt-1.5 flex h-10 w-10 items-center justify-center text-tm-muted"><X size={18} /></button>
              </div>
              <div className="flex gap-2">
                <a
                  href={directionsUrl({ lat: selected.location.lat, lng: selected.location.lng })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-tm-navy text-[14px] font-bold text-white"
                >
                  <Navigation size={16} /> {copy.directions}
                </a>
                {selected.partner ? (
                  <Link href={`/product/${selected.productId}`} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-tm-line text-[14px] font-semibold">
                    {copy.detail}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => startChat(router, copy.askPrompt(selected.name, catLabel))}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-tm-line text-[14px] font-semibold"
                  >
                    <MessageCircle size={16} /> {copy.askTimmy}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 아래 시트: 장소 목록 */}
          <section
            aria-label={copy.listLabel}
            className="absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-[22px] bg-tm-ground shadow-[0_-6px_20px_rgba(21,48,79,.12)] transition-[top] duration-300 ease-out"
            style={{ top: `${SHEET_TOP[sheet] * 100}%` }}
          >
            <button
              type="button"
              aria-label={sheet === 'peek' ? copy.expand : copy.collapse}
              onPointerDown={onHandleDown}
              onPointerUp={onHandleUp}
              className="flex h-6 w-full shrink-0 touch-none items-center justify-center"
            >
              <span className="h-1 w-10 rounded-full bg-tm-line" />
            </button>
            <div className="flex shrink-0 items-center justify-between gap-2 px-5 pb-2">
              <span className="text-[15px] font-bold">
                {catLabel}
                <span className="ml-1.5 text-[13px] font-medium text-tm-muted">{error ? '' : searching ? copy.searching : copy.count(allResults.length)}</span>
              </span>
              <button
                type="button"
                aria-pressed={openNow}
                onClick={() => setOpenNow((v) => !v)}
                className={`h-9 rounded-full px-3 text-[13px] font-semibold ${openNow ? 'bg-tm-navy text-white' : 'border border-tm-line bg-white text-tm-ink'}`}
              >
                {copy.openNow}
              </button>
            </div>
            {category === 'safe' && <p className="shrink-0 px-5 pb-2 text-[12px] text-tm-safe-ink">{copy.safeHint}</p>}

            <ul className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              {!searching && search.failed && <li className="px-2 py-6 text-center text-[14px] text-tm-muted">{copy.failed}</li>}
              {!error && !searching && !search.failed && base && allResults.length === 0 && <li className="px-2 py-6 text-center text-[14px] text-tm-muted">{copy.empty}</li>}
              {allResults.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => select(r)}
                    aria-current={r.id === selectedId || undefined}
                    className={`flex min-h-[60px] w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${r.id === selectedId ? 'bg-tm-sky-tint' : 'active:bg-white'}`}
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-1.5">
                        {r.partner && <span className="shrink-0 rounded-full bg-tm-warm-tint px-1.5 py-0.5 text-[11px] font-bold text-tm-warm">{copy.partner}</span>}
                        <span className="truncate text-[15px] font-semibold">{kindLabel(r)}{r.name}</span>
                      </span>
                      <span className="flex items-center gap-1 truncate text-[12px] text-tm-muted">
                        {r.rating ? <><Star size={12} className="shrink-0 fill-tm-sun text-tm-sun" aria-hidden="true" />{r.rating}{r.ratings ? ` (${r.ratings.toLocaleString()})` : ''} · </> : null}
                        <span className="truncate">{r.partner && r.price ? `₩${Number(r.price).toLocaleString()}` : r.address}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] font-semibold tabular-nums text-tm-navy">{formatDistance(r.distance, copy)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="relative z-30">
          <BottomNav copy={homeCopy} user={user} active="map" />
        </div>
      </div>
    </div>
  );
}
