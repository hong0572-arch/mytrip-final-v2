'use client';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Map as MapIcon, MoreHorizontal, Navigation, Share } from 'lucide-react';
import { getTripCopy } from '../../content/tripCopy';
import { getAiHomeCopy } from '../../content/aiHomeCopy';
import { getApiUrl } from '../../utils/api';
import { auth } from '../../lib/firebase';
import { completePendingSave, createShareLink, saveNewTrip, updateItinerary } from '../../lib/tripStore';
import { goToLogin, openTimmyPanel } from '../home/homeActions';
import TripMap from './TripMap';
import { DayTabs, PlaceDetail, PlanList } from './TripParts';
import { BudgetTab, SafetyTab, StayTab } from './TripInfoTabs';
import { EditDay } from './TripEdit';
import { MoreMenu, NearbyCard, SaveSheet, Toast } from './TripSheets';
import { formatTripText, hasCoords, normalizePlan, parseTransit, printTrip, renumber } from './tripUtils';

const KAKAO_CONSULT_URL = 'https://pf.kakao.com/_xcJhrn/chat';
const SHEET_TOP = { half: 0.46, place: 0.5, full: 0 };
const NEARBY_TYPES = { restaurant: ['restaurant'], cafe: ['cafe'], attraction: ['tourist_attraction'], essentials: ['pharmacy', 'convenience_store'] };

const parseDate = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

function inferMode(plan) {
  const count = { walk: 0, transit: 0, drive: 0 };
  plan.itinerary.forEach((d) => d.places.forEach((p) => { const t = parseTransit(p.transitToNext); if (t) count[t.kind] += 1; }));
  if (count.transit > count.walk && count.transit >= count.drive) return 'TRANSIT';
  if (count.drive > count.walk && count.drive > count.transit) return 'DRIVING';
  return 'WALKING';
}

// 일정 상세(지도 + 일정). mode: 'draft'(저장 전) | 'saved'(내 일정, 편집하면 바로 저장) | 'shared'(보기 전용)
export default function TripDetail({ data, userInfo, tripId, mode = 'draft', language = 'ko', onBack, onOpenChat }) {
  const router = useRouter();
  const copy = getTripCopy(language);
  const homeCopy = getAiHomeCopy(language);
  const canEdit = mode !== 'shared';

  const [plan, setPlan] = useState(() => normalizePlan(data));
  const [dayIdx, setDayIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [sheet, setSheet] = useState('half');
  const [tab, setTab] = useState('plan');
  const [travelMode, setTravelMode] = useState(() => inferMode(normalizePlan(data)));
  const [legs, setLegs] = useState([]);
  const [recenterKey, setRecenterKey] = useState(0);
  const [nearbyCat, setNearbyCat] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [selectedNearby, setSelectedNearby] = useState(null);
  const [myLocation, setMyLocation] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  // 화면 높이(시트 높이 계산용). 서버 렌더에서는 800으로 둔다
  const vh = useSyncExternalStore(
    (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb); },
    () => window.innerHeight,
    () => 800
  );

  const mapRef = useRef(null);
  const filledRef = useRef(false);
  const shareUrlRef = useRef(null);
  const dragRef = useRef(null);
  const toastTimer = useRef(null);

  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  // 리디렉트 로그인 후 돌아왔으면 맡겨 둔 저장을 마친다
  useEffect(() => {
    completePendingSave(language)
      .then((res) => {
        if (res?.tripId) {
          notify(res.isNewUser ? copy.welcomeToast : copy.savedToast);
          router.replace(`/trip?id=${res.tripId}`);
        }
      })
      .catch((err) => { console.error('pending save failed:', err); notify(copy.saveError); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const destination = plan.destination || userInfo?.destination || '';
  const destShort = destination.split(',')[0].split('#')[0].trim();
  const day = plan.itinerary[dayIdx];
  const places = useMemo(() => day?.places || [], [day]);

  const start = parseDate(userInfo?.startDate || plan.startDate || plan.itinerary[0]?.date);
  const dates = plan.itinerary.map((d, i) => {
    const dt = parseDate(d.date) || (start ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + i) : null);
    return dt ? `${dt.getMonth() + 1}.${dt.getDate()}` : '';
  });
  const nDays = plan.itinerary.length;
  const headerTitle = language === 'en'
    ? `${destShort} · ${nDays} days`
    : `${destShort} ${nDays > 1 ? `${nDays - 1}박 ${nDays}일` : '당일'}`;
  const companion = userInfo?.companion || plan.companion;
  const dateRange = dates[0] ? `${dates[0]} – ${dates[nDays - 1]}` : '';

  // ── 데이터 바꾸기 ───────────────────────────────────────────
  const persist = useCallback((next) => {
    if (mode === 'saved' && tripId) {
      updateItinerary(tripId, next.itinerary).catch((err) => { console.error('update failed:', err); notify(copy.saveError); });
    }
  }, [mode, tripId, notify, copy.saveError]);

  const commitDay = useCallback((idx, nextPlaces) => {
    setPlan((prev) => {
      const old = prev.itinerary[idx]?.places || [];
      const oldNext = new Map(old.map((p, i) => [p.name, old[i + 1]?.name]));
      const fixed = renumber(nextPlaces).map((p, i, arr) => ({
        ...p,
        transitToNext: i < arr.length - 1 && oldNext.get(p.name) === arr[i + 1].name ? p.transitToNext || '' : '',
      }));
      const next = { ...prev, itinerary: prev.itinerary.map((d, i) => (i === idx ? { ...d, places: fixed } : d)), isEdited: true };
      persist(next);
      shareUrlRef.current = null;
      return next;
    });
  }, [persist]);

  // 좌표 찾기(구글 장소). AI가 준 좌표는 틀릴 때가 많아 이름으로 찾는다
  const findCoords = useCallback((query) => new Promise((resolve) => {
    const g = window.google;
    if (!g?.maps?.places || !mapRef.current) return resolve(null);
    new g.maps.places.PlacesService(mapRef.current).findPlaceFromQuery({ query, fields: ['geometry', 'formatted_address'] }, (res, status) => {
      if (status === g.maps.places.PlacesServiceStatus.OK && res?.[0]?.geometry) {
        resolve({ coordinates: { lat: res[0].geometry.location.lat(), lng: res[0].geometry.location.lng() }, address: res[0].formatted_address });
      } else resolve(null);
    });
  }), []);

  const withCoords = useCallback(async (list) => {
    const out = [];
    for (const p of list) {
      if (hasCoords(p)) { out.push(p); continue; }
      const found = await findCoords(`${p.googleSearchQuery || p.name} ${destShort}`.trim());
      out.push(found ? { ...p, coordinates: found.coordinates, address: p.address || found.address } : p);
    }
    return out;
  }, [findCoords, destShort]);

  // 지도가 준비되면 좌표 없는 장소를 한 번 채운다
  const onMapReady = useCallback((map) => {
    mapRef.current = map;
    if (filledRef.current) return;
    filledRef.current = true;
    (async () => {
      const missing = plan.itinerary.some((d) => d.places.some((p) => !hasCoords(p)));
      if (!missing) return;
      const itinerary = [];
      for (const d of plan.itinerary) itinerary.push({ ...d, places: await withCoords(d.places) });
      setPlan((prev) => ({ ...prev, itinerary }));
    })();
  }, [plan, withCoords]);

  // ── 지도 관련 동작 ─────────────────────────────────────────
  const selectPlace = (i) => {
    setSelectedNearby(null);
    setSelectedIdx(i);
    setSheet('place');
  };
  const closePlace = () => {
    setSelectedIdx(null);
    setSheet('half');
    setRecenterKey((k) => k + 1);
  };
  const changeDay = (i) => {
    setDayIdx(i);
    setSelectedIdx(null);
    if (sheet === 'place') setSheet('half');
  };

  const searchNearby = (cat) => {
    if (nearbyCat === cat) { setNearbyCat(null); setNearby([]); setSelectedNearby(null); return; }
    const g = window.google;
    if (!g?.maps?.places || !mapRef.current) return;
    setNearbyCat(cat);
    setSelectedNearby(null);
    const service = new g.maps.places.PlacesService(mapRef.current);
    // 지도 한가운데는 아래 시트에 가려 있으니, 선택한 장소나 그날 장소들의 가운데를 기준으로 찾는다
    const pts = (selectedIdx != null && hasCoords(places[selectedIdx]) ? [places[selectedIdx]] : places.filter(hasCoords)).map((p) => p.coordinates);
    const center = pts.length
      ? { lat: pts.reduce((a, p) => a + p.lat, 0) / pts.length, lng: pts.reduce((a, p) => a + p.lng, 0) / pts.length }
      : mapRef.current.getCenter();
    const results = [];
    let pending = NEARBY_TYPES[cat].length;
    NEARBY_TYPES[cat].forEach((type) => {
      service.nearbySearch({ location: center, radius: 1500, type }, (res, status) => {
        if (status === g.maps.places.PlacesServiceStatus.OK && res) {
          res.slice(0, 10).forEach((r) => results.push({
            id: r.place_id, name: r.name, rating: r.rating, address: r.vicinity,
            location: { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() },
            category: copy.nearby[cat],
          }));
        }
        if (--pending === 0) {
          setNearby(results);
          if (!results.length) notify(copy.nearbyEmpty);
        }
      });
    });
  };

  const addNearby = () => {
    const n = selectedNearby;
    if (!n) return;
    commitDay(dayIdx, [...places, { name: n.name, category: n.category, address: n.address, coordinates: n.location, rating: n.rating || null }]);
    setSelectedNearby(null);
    notify(copy.added(n.name));
  };

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  // ── AI 도움 ────────────────────────────────────────────────
  const recommendPlaces = useCallback(async (category) => {
    const res = await fetch(getApiUrl('/api/recommend/'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: destShort, category, language }),
    });
    const json = await res.json();
    return (json?.result?.places || []).map((p) => ({
      name: p.name, category: p.category || category, description: p.description || '', reason: p.reason || '',
      address: p.address || '', googleSearchQuery: p.googleSearchQuery || '',
    }));
  }, [destShort, language]);

  const searchPlaces = useCallback((query) => new Promise((resolve) => {
    const g = window.google;
    if (!g?.maps?.places || !mapRef.current) return resolve([]);
    new g.maps.places.PlacesService(mapRef.current).textSearch({ query: `${query} ${destShort}`.trim(), location: mapRef.current.getCenter(), radius: 20000 }, (res, status) => {
      if (status !== g.maps.places.PlacesServiceStatus.OK || !res) return resolve([]);
      resolve(res.slice(0, 8).map((r) => ({
        name: r.name, address: r.formatted_address, rating: r.rating || null,
        category: (r.types || []).includes('restaurant') ? copy.nearby.restaurant : (r.types || []).includes('cafe') ? copy.nearby.cafe : copy.nearby.attraction,
        coordinates: { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() },
      })));
    });
  }), [destShort, copy.nearby]);

  const askEdit = useCallback(async (instruction, current) => {
    try {
      const res = await fetch(getApiUrl('/api/plan-edit/'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: destShort, dayNumber: day?.day || dayIdx + 1, places: current.map((p) => ({ name: p.name, category: p.category })), instruction, language }),
      });
      const json = await res.json();
      if (!res.ok || !Array.isArray(json.places)) throw new Error(json?.error || 'edit failed');
      const byName = new Map(current.map((p) => [p.name, p]));
      return json.places.map((p) => byName.get(p.name) || { name: p.name, category: p.category, description: p.description, reason: p.reason });
    } catch (err) {
      console.error('ask edit failed:', err);
      notify(copy.askError);
      return null;
    }
  }, [destShort, day, dayIdx, language, notify, copy.askError]);

  const swapPlace = async () => {
    const current = places[selectedIdx];
    if (!current) return;
    setBusy(true);
    notify(copy.swapping);
    try {
      const picks = await recommendPlaces(current.category || copy.nearby.attraction);
      const names = new Set(places.map((p) => p.name));
      const pick = picks.find((p) => !names.has(p.name));
      if (!pick) throw new Error('no pick');
      const [resolved] = await withCoords([pick]);
      commitDay(dayIdx, places.map((p, i) => (i === selectedIdx ? resolved : p)));
      notify(copy.swapped(resolved.name));
    } catch {
      notify(copy.askError);
    } finally {
      setBusy(false);
    }
  };

  const removePlace = () => {
    const current = places[selectedIdx];
    if (!current || !window.confirm(copy.removeConfirm(current.name))) return;
    commitDay(dayIdx, places.filter((_, i) => i !== selectedIdx));
    closePlace();
  };

  const finishEdit = async (nextPlaces) => {
    setBusy(true);
    try {
      commitDay(dayIdx, await withCoords(nextPlaces));
      setEditing(false);
      setSelectedIdx(null);
      setRecenterKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  // ── 저장·공유·더 보기 ──────────────────────────────────────
  const confirmSave = async (shareToFeed) => {
    setSaving(true);
    try {
      const res = await saveNewTrip({ plan, userInfo, shareToFeed, language });
      if (res.redirecting) return;
      notify(res.isNewUser ? copy.welcomeToast : copy.savedToast);
      router.replace(`/trip?id=${res.tripId}`);
    } catch (err) {
      console.error('save failed:', err);
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') notify(copy.saveError);
    } finally {
      setSaving(false);
      setSaveOpen(false);
    }
  };

  const shareLink = async () => {
    if (!shareUrlRef.current) shareUrlRef.current = await createShareLink(plan, userInfo);
    return shareUrlRef.current;
  };

  const share = async () => {
    try {
      const url = await shareLink();
      if (navigator.share) {
        await navigator.share({ title: plan.tripTitle || headerTitle, url }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(url);
        notify(copy.shareCopied);
      }
    } catch (err) {
      console.error('share failed:', err);
    }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${tripId}`);
      notify(copy.inviteCopied);
    } catch {}
  };

  const menuItems = [
    { key: 'copyText', onClick: async () => { try { await navigator.clipboard.writeText(formatTripText(plan, null, copy)); notify(copy.textCopied); } catch {} } },
    { key: 'print', onClick: () => printTrip(plan, copy, dateRange) },
    ...(mode === 'saved' && onOpenChat ? [{ key: 'chat', onClick: onOpenChat }] : []),
    ...(mode === 'saved' && tripId ? [{ key: 'invite', onClick: copyInvite }] : []),
    { key: 'consult', onClick: () => {
      window.open(KAKAO_CONSULT_URL, '_blank');
      shareLink().then((url) => navigator.clipboard?.writeText(formatTripText(plan, url, copy))).catch(() => {});
    } },
  ];

  const openSafeMode = () => (auth.currentUser ? openTimmyPanel('safe') : goToLogin(router));

  // ── 화면 ───────────────────────────────────────────────────
  const top = SHEET_TOP[sheet];
  const sheetPx = Math.round(vh * (1 - top));
  const showMapChrome = sheet !== 'full';
  const legSum = legs.filter((x) => x != null).reduce((a, b) => a + b, 0);
  const parsedSum = places.map((p) => parseTransit(p.transitToNext)?.minutes || 0).reduce((a, b) => a + b, 0);
  const selectedPlace = selectedIdx != null ? places[selectedIdx] : null;

  const onHandleDown = (e) => { dragRef.current = e.clientY; };
  const onHandleUp = (e) => {
    const start = dragRef.current;
    dragRef.current = null;
    if (start == null) return;
    const dy = e.clientY - start;
    if (sheet === 'place') { if (dy > 30) closePlace(); return; }
    if (dy < -30) setSheet('full');
    else if (dy > 30) setSheet('half');
    else setSheet((s) => (s === 'half' ? 'full' : 'half'));
  };

  const primaryCta = mode === 'saved'
    ? { label: copy.invite, onClick: copyInvite }
    : { label: mode === 'shared' ? copy.saveCopy : copy.save, onClick: () => setSaveOpen(true) };

  return (
    <div className="fixed inset-0 z-[100] flex justify-center bg-tm-ground font-sans text-tm-ink">
      <div className="relative h-full w-full max-w-md overflow-hidden bg-[#EEF1EC]">
        <TripMap
          plan={plan}
          dayIdx={dayIdx}
          selectedIdx={selectedIdx}
          travelMode={travelMode}
          bottomInset={sheetPx}
          recenterKey={recenterKey}
          nearby={nearby}
          selectedNearbyId={selectedNearby?.id}
          myLocation={myLocation}
          onSelectPlace={selectPlace}
          onSelectNearby={setSelectedNearby}
          onLegs={setLegs}
          onMapReady={onMapReady}
          loadingLabel={copy.mapLoading}
        />

        {showMapChrome && (
          <>
            <div className="absolute inset-x-3 top-3 z-10 flex items-center gap-2">
              <button type="button" onClick={sheet === 'place' ? closePlace : onBack} aria-label={copy.back} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-tm-ink shadow-[0_2px_8px_rgba(21,48,79,.14)]">
                <ChevronLeft size={22} strokeWidth={2} />
              </button>
              <div className="flex h-11 min-w-0 flex-1 flex-col justify-center rounded-full bg-white px-4 shadow-[0_2px_8px_rgba(21,48,79,.14)]">
                <span className="truncate text-[14px] font-bold leading-tight">{headerTitle}{companion ? ` · ${companion}` : ''}</span>
                {dateRange && <span className="text-[11px] tabular-nums text-tm-muted">{dateRange}</span>}
              </div>
              <button type="button" onClick={share} aria-label={copy.share} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-tm-ink shadow-[0_2px_8px_rgba(21,48,79,.14)]">
                <Share size={19} strokeWidth={2} />
              </button>
            </div>
            {sheet === 'half' && (
              <div aria-label="nearby" className="absolute inset-x-3 top-[66px] z-10 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
                {Object.keys(NEARBY_TYPES).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={nearbyCat === cat}
                    onClick={() => searchNearby(cat)}
                    className={`h-[34px] shrink-0 rounded-full px-3 text-[13px] font-semibold shadow-[0_2px_6px_rgba(21,48,79,.1)] ${nearbyCat === cat ? 'bg-tm-navy text-white' : 'bg-white text-tm-ink'}`}
                  >
                    {copy.nearby[cat]}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={locateMe}
              aria-label={copy.myLocation}
              style={{ bottom: sheetPx + 12 }}
              className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-tm-navy shadow-[0_2px_8px_rgba(21,48,79,.16)]"
            >
              <Navigation size={19} strokeWidth={2} />
            </button>
            {selectedNearby && (
              <div className="absolute inset-x-0 z-10" style={{ bottom: sheetPx + 64 }}>
                <NearbyCard copy={copy} place={selectedNearby} canAdd={canEdit} onAdd={addNearby} onClose={() => setSelectedNearby(null)} />
              </div>
            )}
          </>
        )}

        <section
          className="absolute inset-x-0 bottom-0 z-20 flex flex-col bg-tm-ground shadow-[0_-6px_20px_rgba(21,48,79,.12)] transition-[top,border-radius] duration-300 ease-out"
          style={{ top: `${top * 100}%`, borderRadius: sheet === 'full' ? 0 : '22px 22px 0 0' }}
        >
          {sheet === 'full' ? (
            <header className="flex items-center gap-1 py-2 pl-1 pr-2">
              <button type="button" onClick={onBack} aria-label={copy.back} className="flex h-11 w-11 items-center justify-center text-tm-ink"><ChevronLeft size={24} strokeWidth={2} /></button>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[16px] font-bold">{headerTitle}{companion ? ` · ${companion}` : ''}</span>
                {dateRange && <span className="text-[12px] tabular-nums text-tm-muted">{dateRange}{plan.stayArea ? ` · ${plan.stayArea}` : ''}</span>}
              </div>
              <button type="button" onClick={share} aria-label={copy.share} className="flex h-11 w-11 items-center justify-center text-tm-ink"><Share size={19} strokeWidth={2} /></button>
            </header>
          ) : (
            <button
              type="button"
              aria-label={sheet === 'half' ? copy.tabs.plan : copy.mapView}
              onPointerDown={onHandleDown}
              onPointerUp={onHandleUp}
              className="flex h-6 w-full shrink-0 touch-none items-center justify-center"
            >
              <span className="h-1 w-10 rounded-full bg-tm-line" />
            </button>
          )}

          {sheet === 'place' && selectedPlace ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PlaceDetail
                copy={copy}
                place={selectedPlace}
                index={selectedIdx}
                total={places.length}
                dayNumber={day?.day || dayIdx + 1}
                destination={destShort}
                language={language}
                canEdit={canEdit}
                busy={busy}
                onPrev={() => setSelectedIdx((i) => Math.max(0, i - 1))}
                onNext={() => setSelectedIdx((i) => Math.min(places.length - 1, i + 1))}
                onSwap={swapPlace}
                onRemove={removePlace}
              />
            </div>
          ) : (
            <>
              <nav role="tablist" aria-label="trip" className="grid shrink-0 grid-cols-4 border-b border-tm-line px-2">
                {Object.keys(copy.tabs).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={`h-11 border-b-[2.5px] text-[14px] ${tab === key ? 'border-tm-navy font-bold text-tm-ink' : 'border-transparent font-medium text-tm-muted'}`}
                  >
                    {copy.tabs[key]}
                  </button>
                ))}
              </nav>

              <div className="min-h-0 flex-1 overflow-y-auto pt-3">
                {tab === 'plan' && (
                  <>
                    <DayTabs copy={copy} days={plan.itinerary} dayIdx={dayIdx} dates={dates} onChange={changeDay} />
                    <div className="flex items-center justify-between gap-2 px-4 pb-2.5">
                      <span className="min-w-0 truncate text-[13px] text-tm-muted">{copy.daySummary(places.length, legSum || parsedSum, copy.modes[travelMode])}</span>
                      <div role="group" aria-label={copy.modeGroup} className="flex shrink-0 rounded-[10px] bg-tm-line p-0.5">
                        {['WALKING', 'TRANSIT', 'DRIVING'].map((m) => (
                          <button key={m} type="button" aria-pressed={travelMode === m} onClick={() => setTravelMode(m)} className={`h-[30px] rounded-lg px-2.5 text-[12px] ${travelMode === m ? 'bg-white font-bold text-tm-ink' : 'font-semibold text-tm-muted'}`}>
                            {copy.modes[m]}
                          </button>
                        ))}
                      </div>
                    </div>
                    {sheet === 'full' && plan.tripTitle && <p className="px-4 pb-3 text-[13px] leading-normal text-tm-muted">{plan.tripTitle}</p>}
                    <div className="px-4 pb-4">
                      <PlanList copy={copy} places={places} legs={legs} travelMode={travelMode} selectedIdx={selectedIdx} onSelect={selectPlace} compact={sheet !== 'full'} />
                    </div>
                  </>
                )}
                {tab === 'stay' && <StayTab copy={copy} plan={plan} destination={destShort} language={language} onShowHotel={(h) => { setSheet('half'); mapRef.current?.panTo(h.coordinates); mapRef.current?.setZoom(16); }} />}
                {tab === 'safety' && <SafetyTab copy={copy} plan={plan} destination={destination} onSafeMode={openSafeMode} />}
                {tab === 'budget' && <BudgetTab copy={copy} plan={plan} saved={mode === 'saved'} />}
              </div>
            </>
          )}

          {sheet !== 'place' && (
            <div className="flex shrink-0 gap-2 border-t border-tm-line bg-tm-ground px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2.5">
              <button type="button" onClick={primaryCta.onClick} className="h-[52px] flex-1 rounded-[14px] bg-tm-navy text-[16px] font-bold text-white">{primaryCta.label}</button>
              {canEdit && tab === 'plan' && (
                <button type="button" onClick={() => setEditing(true)} className="h-[52px] rounded-[14px] border border-tm-line bg-white px-4 text-[15px] font-semibold text-tm-ink">{copy.edit}</button>
              )}
              <button type="button" onClick={() => setMenuOpen(true)} aria-label={copy.more} className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border border-tm-line bg-white text-tm-ink">
                <MoreHorizontal size={20} />
              </button>
            </div>
          )}
        </section>

        {sheet === 'full' && tab === 'plan' && (
          <button
            type="button"
            onClick={() => setSheet('half')}
            className="absolute bottom-[92px] left-1/2 z-30 flex h-11 -translate-x-1/2 items-center gap-1.5 rounded-full bg-tm-ink px-[18px] text-[14px] font-bold text-white shadow-[0_6px_16px_rgba(21,48,79,.25)]"
          >
            <MapIcon size={18} aria-hidden="true" /> {copy.mapView}
          </button>
        )}

        {editing && day && (
          <EditDay
            copy={copy}
            homeCopy={homeCopy}
            language={language}
            dayNumber={day.day || dayIdx + 1}
            places={places}
            busy={busy}
            onCancel={() => setEditing(false)}
            onDone={finishEdit}
            onAsk={askEdit}
            searchPlaces={searchPlaces}
            recommendPlaces={recommendPlaces}
            notify={notify}
          />
        )}
        {saveOpen && <SaveSheet copy={copy} saving={saving} onCancel={() => setSaveOpen(false)} onConfirm={confirmSave} />}
        {menuOpen && <MoreMenu copy={copy} onClose={() => setMenuOpen(false)} items={menuItems} />}
        <Toast message={toast} />
      </div>
    </div>
  );
}
