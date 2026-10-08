'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { MoreVertical, Navigation, Plus, Shield, Sparkles, UserPlus } from 'lucide-react';
import { useStoredString } from '../../hooks/useLocalStore';
import { daysUntil, directionsUrl, formatDDay, formatTripRange, getTodayPlaces, parseJsonObject } from '../../utils/tripPhase';
import { openTimmyPanel } from '../home/homeActions';
import { companionLabel, placeCount, tripDestination, tripLength, tripTitle } from './tripsUtils';

// 일정마다 조금씩 다른 지도 무늬 썸네일(사진이 없어서 대신 쓴다). id로 정해지므로 렌더마다 같다.
const THUMBS = [
  { water: 'M0 52 C 20 44, 40 60, 72 48 V72 H0 Z', roads: ['M0 24 H72', 'M30 0 V72'], pin: [44, 30] },
  { water: 'M0 20 C 25 30, 45 10, 72 22 V0 H0 Z', roads: ['M0 46 H72', 'M42 0 V72'], pin: [28, 38] },
  { water: 'M48 0 C 40 24, 60 44, 50 72 H72 V0 Z', roads: ['M0 30 H72', 'M18 0 L 30 72'], pin: [24, 50] },
  { water: 'M0 60 C 30 50, 50 66, 72 58 V72 H0 Z', roads: ['M0 16 L72 36', 'M36 0 V72'], pin: [50, 22] },
];
const hash = (text) => [...String(text || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function TripThumb({ trip, size = 72, className = '' }) {
  const t = THUMBS[hash(trip?.id) % THUMBS.length];
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true" className={`block shrink-0 rounded-xl ${className}`}>
      <rect width="72" height="72" fill="#EEF1EC" />
      <path d={t.water} fill="#C6E2F0" />
      <g stroke="#fff" strokeWidth="4" fill="none">{t.roads.map((d) => <path key={d} d={d} />)}</g>
      <circle cx={t.pin[0]} cy={t.pin[1]} r="7" fill="var(--color-tm-navy)" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

function Avatars({ trip }) {
  const members = Array.isArray(trip?.membersInfo) ? trip.membersInfo : [];
  if (members.length < 2) return null;
  return (
    <span className="flex -space-x-1.5" aria-hidden="true">
      {members.slice(0, 3).map((m, i) => (
        m?.avatar
          ? <img key={m.uid || i} src={m.avatar} alt="" width={22} height={22} referrerPolicy="no-referrer" className="h-[22px] w-[22px] rounded-full border-2 border-white object-cover" />
          : <span key={m?.uid || i} className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-white bg-tm-sky-tint text-[10px] font-bold text-tm-navy">{(m?.name || '?').slice(0, 1)}</span>
      ))}
    </span>
  );
}

function MoreButton({ label, onClick, dark = false }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${dark ? 'text-white/80 active:bg-white/10' : 'text-tm-muted active:bg-tm-sky-tint'}`}>
      <MoreVertical size={20} />
    </button>
  );
}

export function InviteBanner({ copy, invite }) {
  return (
    <div className="tm-rise flex items-center gap-3 rounded-2xl bg-tm-sky-tint py-2 pl-4 pr-2">
      <UserPlus size={20} className="shrink-0 text-tm-navy" />
      <span className="flex-1 text-[14px] leading-snug text-tm-ink">{copy.invite(invite.senderName || '…', invite.destination || '')}</span>
      <Link href={`/join/${invite.tripId}`} className="flex h-11 items-center rounded-xl bg-white px-4 text-[14px] font-bold text-tm-navy">
        {copy.inviteView}
      </Link>
    </div>
  );
}

// 출발 전 가장 가까운 여행
export function NextTripHero({ copy, homeCopy, language, trip, onMenu, onInvite }) {
  const [raw] = useStoredString(`tm_readiness_${trip.id}`, '{}');
  const checked = parseJsonObject(raw);
  const total = homeCopy.readiness.length;
  const done = homeCopy.readiness.filter((item) => checked[item.id]).length;

  return (
    <article className="tm-rise flex flex-col gap-4 rounded-[20px] bg-tm-ink p-5 text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[13px] text-[#B9C8DA]">{copy.nearest}</span>
          <span className="truncate text-[24px] font-bold tracking-[-0.01em]">{tripTitle(trip)}</span>
          <span className="text-[13px] tabular-nums text-[#B9C8DA]">{formatTripRange(trip, language)} · {companionLabel(trip, copy)}</span>
        </div>
        <span className="shrink-0 text-[30px] font-bold tabular-nums tracking-tight text-tm-sky-soft">{formatDDay(daysUntil(trip.startDate))}</span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-[#B9C8DA]">{copy.readiness}</span>
          <span className="tabular-nums">{done} / {total}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-tm-sky-soft transition-[width] duration-500" style={{ width: `${Math.round((done / total) * 100)}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link href={`/trip?id=${trip.id}`} className="flex h-12 flex-1 items-center justify-center rounded-[14px] bg-white text-[15px] font-bold text-tm-navy">
          {copy.openTrip}
        </Link>
        <button type="button" onClick={onInvite} aria-label={copy.inviteCompanion} className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/10 text-white">
          <UserPlus size={20} />
        </button>
        <MoreButton dark label={copy.more(tripTitle(trip))} onClick={onMenu} />
      </div>
    </article>
  );
}

// 여행 중: 며칠째인지, 다음 장소, 안전모드
export function OnTripHero({ copy, trip, dayNumber }) {
  const total = tripLength(trip);
  const places = getTodayPlaces(trip);
  const [raw] = useStoredString(`tm_visited_${trip.id}_day${dayNumber}`, '{}');
  const visited = parseJsonObject(raw);
  const next = places.find((_, i) => !visited[i]);

  return (
    <article className="tm-rise flex flex-col gap-3.5 rounded-[20px] border-[1.5px] border-tm-navy bg-white p-[18px]">
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-tm-safe-ink">
          <span className="relative h-2 w-2 rounded-full bg-tm-safe"><span className="tm-beacon bg-tm-safe" /></span>
          {copy.onTrip(dayNumber)}
        </span>
        <span className="text-[24px] font-bold tracking-[-0.01em]">{tripTitle(trip)}</span>
      </div>

      <div role="img" aria-label={copy.dayProgress(dayNumber, total)} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(total, 14)}, minmax(0, 1fr))` }}>
        {Array.from({ length: Math.min(total, 14) }, (_, i) => (
          <span key={i} className={`h-1.5 rounded-full ${i + 1 < dayNumber ? 'bg-tm-navy' : i + 1 === dayNumber ? 'bg-tm-sky' : 'bg-tm-line'}`} />
        ))}
      </div>

      {next ? (
        <div className="flex items-center gap-3 rounded-[14px] bg-tm-sky-tint p-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[12px] font-bold text-tm-navy">{copy.nextPlace}</span>
            <span className="truncate text-[16px] font-bold">{next.name}</span>
            {next.transitToNext && <span className="truncate text-[12px] text-tm-muted">{next.transitToNext}</span>}
          </div>
          <a href={directionsUrl(next)} target="_blank" rel="noopener noreferrer" aria-label={copy.directions(next.name)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tm-navy text-white">
            <Navigation size={18} />
          </a>
        </div>
      ) : (
        <p className="text-[14px] text-tm-muted">{copy.noPlaceToday}</p>
      )}

      <div className="flex gap-2">
        <Link href={`/trip?id=${trip.id}`} className="flex h-12 flex-1 items-center justify-center rounded-[14px] bg-tm-navy text-[15px] font-bold text-white">
          {copy.todayPlan}
        </Link>
        <button type="button" onClick={() => openTimmyPanel('safe')} className="flex h-12 items-center gap-1.5 rounded-[14px] bg-tm-safe-tint px-3.5 text-[14px] font-bold text-tm-safe-ink">
          <Shield size={18} />
          {copy.safeMode}
        </button>
      </div>
    </article>
  );
}

// 목록 한 줄(다가오는 여행·날짜 미정)
export function TripRow({ copy, language, trip, onMenu, style }) {
  const dDay = daysUntil(trip.startDate);
  return (
    <article className="tm-rise flex items-center gap-3 rounded-2xl bg-white p-3" style={style}>
      <Link href={`/trip?id=${trip.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <TripThumb trip={trip} />
        <span className="flex min-w-0 flex-col gap-1">
          <span className={`self-start rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums ${dDay === null ? 'bg-tm-warm-tint text-tm-warm' : 'bg-tm-sky-tint text-tm-navy'}`}>
            {dDay === null ? copy.undated : formatDDay(dDay)}
          </span>
          <span className="truncate text-[16px] font-bold">{tripTitle(trip)}</span>
          <span className="flex min-w-0 items-center gap-2 text-[12px] tabular-nums text-tm-muted">
            <span className="truncate">
              {formatTripRange(trip, language) ? `${formatTripRange(trip, language)}${(trip.membersInfo?.length || 1) > 1 ? '' : ` · ${companionLabel(trip, copy)}`}` : copy.places(placeCount(trip))}
            </span>
            <Avatars trip={trip} />
          </span>
        </span>
      </Link>
      <MoreButton label={copy.more(tripTitle(trip))} onClick={onMenu} />
    </article>
  );
}

// 지난 여행 한 줄
export function PastRow({ copy, language, trip, onMenu, onReuse, style }) {
  return (
    <article className="tm-rise flex items-center gap-3 rounded-2xl bg-white p-2.5" style={style}>
      <Link href={`/trip?id=${trip.id}`} aria-label={tripTitle(trip)} className="shrink-0">
        <TripThumb trip={trip} size={76} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link href={`/trip?id=${trip.id}`} className="truncate text-[16px] font-bold">{tripTitle(trip)}</Link>
        <span className="truncate text-[12px] tabular-nums text-tm-muted">{formatTripRange(trip, language)} · {companionLabel(trip, copy)} · {copy.places(placeCount(trip))}</span>
        <button type="button" onClick={onReuse} className="-my-1 flex min-h-11 items-center self-start whitespace-nowrap text-[13px] font-bold text-tm-navy">{copy.reuse} →</button>
      </div>
      <MoreButton label={copy.more(tripTitle(trip))} onClick={onMenu} />
    </article>
  );
}

// 방금 끝난 여행: 일기·피드 공유를 권한다(여행 중 위치 노출을 막기 위해 끝난 뒤에만).
export function PostTripPrompt({ copy, trip, onShare, sharing }) {
  return (
    <section className="tm-rise flex flex-col gap-3 rounded-[18px] bg-tm-warm-tint p-4">
      <div className="flex items-start gap-3">
        <TripThumb trip={trip} size={56} />
        <div className="flex flex-col gap-1">
          <span className="text-[16px] font-bold">{copy.postTitle(tripDestination(trip))}</span>
          <span className="text-[13px] leading-normal text-tm-ink/80">{copy.postBody}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => openTimmyPanel('diary')} className="h-11 flex-1 rounded-xl bg-tm-navy text-[14px] font-bold text-white">
          {copy.writeDiary}
        </button>
        <button type="button" onClick={onShare} disabled={sharing} className="h-11 flex-1 rounded-xl border border-[#E8D5A8] bg-white text-[14px] font-semibold text-tm-ink disabled:opacity-60">
          {copy.shareFeed}
        </button>
      </div>
      <span className="text-[12px] text-tm-warm">{copy.postSafeNote}</span>
    </section>
  );
}

export function NewTripCard({ copy, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-[72px] items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-tm-line bg-transparent px-4 py-3 text-left active:bg-white">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tm-sky-tint text-tm-navy">
        <Sparkles size={20} />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-bold text-tm-ink">{copy.createWithTimmy}</span>
        <span className="text-[12px] text-tm-muted">{copy.createWithTimmySub}</span>
      </span>
      <Plus size={20} className="text-tm-muted" />
    </button>
  );
}
