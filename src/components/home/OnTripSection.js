'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Camera, Check, Compass, Home as HomeIcon, Navigation } from 'lucide-react';
import { useStoredString } from '../../hooks/useLocalStore';
import { directionsUrl, getTodayPlaces, parseJsonObject } from '../../utils/tripPhase';
import { openTimmyPanel } from './homeActions';

// 오늘 다녀온 장소 표시는 기기에만 저장한다(여행 기록 서버 저장은 하지 않음).
const visitedKey = (tripId, dayKey) => `tm_visited_${tripId}_${dayKey}`;

export default function OnTripSection({ copy, trip, dayNumber }) {
  const router = useRouter();
  const places = getTodayPlaces(trip);
  const dayKey = `day${dayNumber}`;
  const [raw, setRaw] = useStoredString(visitedKey(trip.id, dayKey), '{}');
  const visited = parseJsonObject(raw);

  const toggleVisited = (index) => setRaw(JSON.stringify({ ...visited, [index]: !visited[index] }));

  const nextIndex = places.findIndex((_, i) => !visited[i]);
  const delay = (ms) => ({ animationDelay: `${ms}ms` });

  const quickActions = [
    { key: 'safe', label: copy.quick.safeReturn, sub: copy.quick.safeReturnSub, Icon: HomeIcon, onClick: () => openTimmyPanel('safe'), ring: true },
    { key: 'translate', label: copy.quick.translate, Icon: Camera, onClick: () => openTimmyPanel('chat') },
    { key: 'around', label: copy.quick.around, Icon: Compass, onClick: () => router.push('/plan?tab=around_me') },
    { key: 'diary', label: copy.quick.diary, Icon: BookOpen, onClick: () => openTimmyPanel('diary') },
  ];

  return (
    <>
      <section className="flex flex-col gap-3 rounded-[20px] bg-white p-4">
        <h2 className="text-[16px] font-bold text-tm-ink">{copy.today}</h2>

        {places.length === 0 && <p className="text-[14px] leading-normal text-tm-muted">{copy.noPlacesToday}</p>}

        <ol className="flex flex-col gap-2.5">
          {places.map((place, i) => {
            const done = Boolean(visited[i]);
            const isNext = i === nextIndex;
            const checkButton = (
              <button
                type="button"
                onClick={() => toggleVisited(i)}
                aria-label={done ? copy.markUndone : copy.markDone}
                aria-pressed={done}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-tm-muted"
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${done ? 'border-tm-muted bg-tm-muted text-white' : 'border-current'}`}>
                  {done && <Check size={14} strokeWidth={3} />}
                </span>
              </button>
            );

            if (isNext) {
              return (
                <li key={i} className="tm-rise flex flex-col gap-3 rounded-2xl bg-tm-sky-tint p-3.5" style={delay(100)}>
                  <div className="flex items-start gap-1">
                    {checkButton}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
                      <span className="text-[12px] font-bold text-tm-navy">{copy.nextPlace}</span>
                      <span className="text-[18px] font-bold text-tm-ink">{place.name}</span>
                      {place.category && <span className="text-[13px] text-tm-muted">{place.category}</span>}
                    </div>
                  </div>
                  <a
                    href={directionsUrl(place)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-tm-navy text-[16px] font-bold text-white"
                  >
                    <Navigation size={20} strokeWidth={2} className="tm-nudge" />
                    {copy.directions}
                  </a>
                  {place.transitToNext && <span className="text-[12px] text-tm-muted">{place.transitToNext}</span>}
                </li>
              );
            }

            return (
              <li key={i} className="flex items-center gap-1">
                {checkButton}
                <span className={`text-[14px] ${done ? 'text-tm-muted line-through' : 'text-tm-ink'}`}>{place.name}</span>
              </li>
            );
          })}
        </ol>

        <Link href={`/trip?id=${trip.id}`} className="flex min-h-11 items-center text-[14px] font-semibold text-tm-navy">
          {copy.fullItinerary}
        </Link>
      </section>

      <section aria-label="Quick actions" className="tm-rise grid grid-cols-2 gap-2.5" style={delay(240)}>
        {quickActions.map(({ key, label, sub, Icon, onClick, ring }) => (
          <button key={key} type="button" onClick={onClick} className="flex min-h-[72px] items-center gap-3 rounded-2xl bg-white p-3.5 text-left text-tm-ink">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tm-sky-tint">
              {ring && <span className="tm-ring bg-tm-sky [animation-duration:3s]" />}
              <Icon size={22} strokeWidth={1.8} className="relative text-tm-navy" />
            </span>
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold">{label}</span>
              {sub && <span className="text-[11px] text-tm-muted">{sub}</span>}
            </span>
          </button>
        ))}
      </section>
    </>
  );
}
