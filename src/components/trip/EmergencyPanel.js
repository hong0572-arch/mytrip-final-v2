'use client';
import { useEffect, useState } from 'react';
import { Building2, ChevronDown, Phone } from 'lucide-react';
import { CONSULAR_CALL, findCountry } from '../../lib/emergency';

const tel = (n) => `tel:${String(n).replace(/[^\d+]/g, '')}`;

const COPY = {
  ko: {
    title: (c) => `${c} 긴급번호`,
    police: '경찰', ambulance: '구급', fire: '소방', ambulanceFire: '구급·소방', all: '경찰·구급·소방', touristPolice: '관광경찰',
    embassy: '대한민국 공관', urgent: '긴급(24시간)', main: '대표',
    concurrent: '겸임 공관', far: (km) => `여행지에서 약 ${km.toLocaleString()}km`,
    consular: '외교부 영사콜센터 (서울, 24시간)',
    official: (d) => `외교부 현지 연락처 안내${d ? ` · ${d} 작성` : ''}`,
    source: (d) => `번호는 외교부 현지 연락처 안내${d ? `(${d})` : ''} 기준이에요. 바뀔 수 있으니 출발 전 한 번 더 확인해 주세요.`,
    unknown: '현지 긴급번호는 출발 전에 꼭 확인해 두세요.',
    note: '번호는 바뀔 수 있어요. 출발 전 외교부 해외안전여행(0404.go.kr)에서 한 번 더 확인해 주세요.',
  },
  en: {
    title: (c) => `Emergency numbers · ${c}`,
    police: 'Police', ambulance: 'Ambulance', fire: 'Fire', ambulanceFire: 'Ambulance/Fire', all: 'Police/Ambulance/Fire', touristPolice: 'Tourist police',
    embassy: 'Korean embassy', urgent: 'Emergency (24h)', main: 'Main',
    concurrent: 'Accredited mission', far: (km) => `About ${km.toLocaleString()} km away`,
    consular: 'Korean consular call center (Seoul, 24h)',
    official: () => '',
    source: () => 'Numbers can change. Check your government’s travel advice before you go.',
    unknown: 'Look up the local emergency number before you go.',
    note: 'Numbers can change. Check your government’s travel advice before you go.',
  },
};

function Big({ n, label }) {
  return (
    <a href={tel(n)} className="flex min-h-[72px] flex-col items-center justify-center gap-0.5 rounded-[14px] border-[1.5px] border-[#F2C6C2] bg-white px-1.5 text-tm-sos">
      <span className="text-[20px] font-bold tabular-nums">{n}</span>
      <span className="text-center text-[12px] font-semibold leading-tight">{label}</span>
    </a>
  );
}

// 안내문 한 줄 — 안의 전화번호는 눌러서 걸 수 있게
function Line({ text }) {
  const parts = text.split(/(\+?\d[\d\-\s()]{5,18}\d)/g);
  return (
    <li className="text-[13px] leading-relaxed text-tm-ink/85">
      {parts.map((p, i) => (i % 2 === 1 ? <a key={i} href={tel(p)} className="font-semibold text-tm-navy underline underline-offset-2">{p}</a> : p))}
    </li>
  );
}

// 안심·팁 탭의 긴급번호. 외교부 현지연락처에서 번호를 뽑아 쓰고, 못 뽑으면 앱의 나라별 표(lib/emergency.js).
// 한국어 화면에는 가장 가까운 대한민국 대사관·총영사관과 외교부 안내 원문도 보여 준다.
export default function EmergencyPanel({ destination, language = 'ko', coords }) {
  const ko = language !== 'en';
  const t = COPY[ko ? 'ko' : 'en'];
  const c = findCountry(destination);
  const [data, setData] = useState(null); // null 로딩 · { local, embassies }
  const [open, setOpen] = useState(false);
  const iso = c?.iso;
  const lat = coords?.lat;
  const lng = coords?.lng;
  const remote = Boolean(iso && iso !== 'KR');

  useEffect(() => {
    if (!remote) return;
    let alive = true;
    const qs = new URLSearchParams({ iso, ...(lat != null && lng != null ? { lat: String(lat), lng: String(lng) } : {}) });
    fetch(`/api/emergency/?${qs}`)
      .then((r) => r.json())
      .then((j) => { if (alive) setData({ local: j.local || null, embassies: Array.isArray(j.embassies) ? j.embassies : [] }); })
      .catch(() => { if (alive) setData({ local: null, embassies: [] }); });
    return () => { alive = false; };
  }, [remote, iso, lat, lng]);

  const m = data?.local?.numbers || {};
  const fromMofa = Boolean(m.police || m.fire || m.ambulance);
  const police = m.police || c?.police;
  const ambulance = m.ambulance || c?.ambulance;
  const fire = m.fire || c?.fire;
  const name = c ? (ko ? c.ko : c.en) : '';
  const cells = !c ? [] : police === ambulance && ambulance === fire
    ? [[police, t.all]]
    : ambulance === fire
      ? [[police, t.police], [ambulance, t.ambulanceFire]]
      : [[police, t.police], [ambulance, t.ambulance], [fire, t.fire]];
  if (c?.touristPolice && !fromMofa) cells.push([c.touristPolice, t.touristPolice]);
  const embassy = data?.embassies?.[0];
  const lines = data?.local?.lines || [];
  const updated = data?.local?.updated;

  return (
    <section aria-label={name ? t.title(name) : 'emergency'} className="flex flex-col gap-2">
      {c && <h3 className="text-[13px] font-bold text-tm-muted">{t.title(name)}</h3>}
      {cells.length > 0 && (
        <div className={`grid gap-2 ${cells.length >= 3 ? 'grid-cols-3' : cells.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} ${cells.length === 4 ? '[&>*:last-child]:col-span-3' : ''}`}>
          {cells.map(([n, label]) => <Big key={label} n={n} label={label} />)}
        </div>
      )}
      {!c && <p className="text-[12px] text-tm-muted">{t.unknown}</p>}

      {ko && remote && data === null && <div className="h-[84px] animate-pulse rounded-[14px] bg-white" aria-hidden="true" />}
      {ko && embassy && (
        <div className="flex flex-col gap-2 rounded-[14px] border border-tm-line bg-white p-3.5">
          <div className="flex items-start gap-2.5">
            <Building2 size={18} className="mt-0.5 shrink-0 text-tm-navy" aria-hidden="true" />
            <div className="flex min-w-0 flex-col">
              <span className="text-[12px] text-tm-muted">{t.embassy}{embassy.concurrent ? ` · ${t.concurrent}` : ''}</span>
              <span className="text-[15px] font-bold text-tm-ink">{embassy.name}</span>
              {embassy.distanceKm != null && embassy.distanceKm > 150 && <span className="text-[12px] text-tm-muted">{t.far(embassy.distanceKm)}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {embassy.urgencyTel && (
              <a href={tel(embassy.urgencyTel)} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-tm-navy px-3 text-[14px] font-bold text-white">
                <Phone size={15} aria-hidden="true" />{t.urgent} <span className="tabular-nums">{embassy.urgencyTel}</span>
              </a>
            )}
            {embassy.tel && (
              <a href={tel(embassy.tel)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-tm-line px-3 text-[13px] font-semibold text-tm-ink">
                {t.main} <span className="tabular-nums">{embassy.tel}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {ko && lines.length > 0 && (
        <div className="rounded-[14px] border border-tm-line bg-white">
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-h-12 w-full items-center gap-2 px-3.5 text-left">
            <Building2 size={16} className="shrink-0 text-tm-navy" aria-hidden="true" />
            <span className="flex-1 text-[13px] font-semibold text-tm-ink">{t.official(updated)}</span>
            <ChevronDown size={18} className={`shrink-0 text-tm-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {open && <ul className="flex flex-col gap-1 border-t border-tm-line px-3.5 py-3">{lines.map((l, i) => <Line key={i} text={l} />)}</ul>}
        </div>
      )}

      {ko && (
        <a href={tel(CONSULAR_CALL)} className="flex min-h-12 items-center gap-2.5 rounded-[14px] border border-tm-line bg-white px-3.5 text-tm-ink">
          <Phone size={16} className="shrink-0 text-tm-navy" aria-hidden="true" />
          <span className="flex-1 text-[13px] font-semibold">{t.consular}</span>
          <span className="text-[13px] tabular-nums text-tm-muted">{CONSULAR_CALL}</span>
        </a>
      )}
      {c && <p className="text-[11px] leading-snug text-tm-muted">{fromMofa ? t.source(updated) : t.note}</p>}
    </section>
  );
}
