'use client';
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, ChevronLeft, ExternalLink, Minus, Plane, Plus, Search } from 'lucide-react';
import useAppLanguage from '../../hooks/useAppLanguage';
import { getFlightsCopy } from '../../content/flightsCopy';

const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseYmd = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const hhmm = (iso) => String(iso || '').slice(11, 16);

function FlightCard({ copy, f, oneWay, adults }) {
  const dep = parseYmd(f.depart);
  const ret = f.return ? parseYmd(f.return) : null;
  const stops = f.transfers === 0 ? copy.direct : copy.transfers(f.transfers);
  return (
    <li className="flex flex-col gap-2.5 rounded-2xl bg-white p-4">
      <div className="flex items-center gap-3">
        <img src={f.logo} alt="" width={36} height={36} loading="lazy" className="h-9 w-9 shrink-0 rounded-lg bg-tm-ground object-contain" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-bold text-tm-ink">{f.airlineName}</span>
          <span className="text-[12px] text-tm-muted">{[stops, f.durationTo ? copy.duration(f.durationTo) : '', f.flightNumber].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[17px] font-bold tabular-nums text-tm-ink">{copy.won(f.price)}</span>
          <span className="text-[11px] text-tm-muted">{oneWay ? copy.perPerson : `${copy.roundTrip} · ${copy.perPerson}`}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[13px] tabular-nums text-tm-ink">
        <span className="rounded-lg bg-tm-sky-tint px-2 py-1 font-semibold text-tm-navy">{copy.dateLabel(dep, copy.weekday[dep.getDay()])} {hhmm(f.depart)}</span>
        <span className="text-tm-muted">{f.from} → {f.to}</span>
        {ret && <span className="ml-auto rounded-lg bg-tm-ground px-2 py-1 font-semibold">{copy.dateLabel(ret, copy.weekday[ret.getDay()])} {hhmm(f.return)}</span>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] tabular-nums text-tm-muted">{adults > 1 ? copy.total(copy.won(f.totalPrice)) : ''}</span>
        {f.link && (
          <a href={f.link} target="_blank" rel="noopener noreferrer sponsored" className="flex h-11 items-center gap-1.5 rounded-xl bg-tm-navy px-4 text-[14px] font-bold text-white">
            {copy.book}<ExternalLink size={14} aria-hidden="true" />
          </a>
        )}
      </div>
    </li>
  );
}

// 앱 안 항공권 검색. 주소 쿼리로 미리 채울 수 있다: /flights/?to=PRG&name=프라하&depart=2026-11-17&return=2026-11-24&adults=1
export default function FlightSearch() {
  const router = useRouter();
  const [language] = useAppLanguage();
  const copy = getFlightsCopy(language);
  const [from, setFrom] = useState('SEL');
  const [to, setTo] = useState(null); // { code, name }
  const [query, setQuery] = useState('');
  const [suggest, setSuggest] = useState([]);
  const [depart, setDepart] = useState('');
  const [ret, setRet] = useState('');
  const [oneWay, setOneWay] = useState(false);
  const [adults, setAdults] = useState(1);
  const [direct, setDirect] = useState(false);
  const [state, setState] = useState('idle'); // idle | busy | done | error
  const [result, setResult] = useState(null);
  const [formError, setFormError] = useState('');
  const [today] = useState(() => localDate(new Date()));
  const resultsRef = useRef(null);

  const search = useCallback(async (opts = {}) => {
    const target = opts.to || to;
    const d = opts.depart || depart;
    const r = opts.oneWay ?? oneWay ? '' : (opts.ret ?? ret);
    if (!target?.code) { setFormError(copy.needTo); return; }
    if (!d) { setFormError(copy.needDepart); return; }
    setFormError('');
    setState('busy');
    try {
      const qs = new URLSearchParams({ from: opts.from || from, to: target.code, depart: d, adults: String(opts.adults || adults), direct: direct ? '1' : '0', lang: language === 'en' ? 'en' : 'ko', ...(r ? { return: r } : {}) });
      const res = await fetch(`/api/flights/search/?${qs}`);
      if (!res.ok) throw new Error(String(res.status));
      setResult(await res.json());
      setState('done');
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch {
      setState('error');
    }
  }, [to, depart, ret, oneWay, from, adults, direct, language, copy]);

  // 주소로 미리 채우기(+자동 검색)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const code = (sp.get('to') || '').toUpperCase();
    const q = sp.get('q') || '';
    const d = sp.get('depart') || '';
    const r = sp.get('return') || '';
    const a = Math.max(1, Math.min(9, Number(sp.get('adults')) || 1));
    Promise.resolve().then(() => {
      if (/^[A-Z]{3}$/.test(code)) { const t = { code, name: sp.get('name') || code }; setTo(t); setQuery(t.name); }
      else if (q) setQuery(q);
      if (d) setDepart(d);
      if (r) setRet(r); else if (d) setOneWay(true);
      setAdults(a);
      if (/^[A-Z]{3}$/.test(code) && d) search({ to: { code, name: sp.get('name') || code }, depart: d, ret: r, oneWay: !r, adults: a });
    });
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 도시 자동완성
  useEffect(() => {
    const term = query.trim();
    if (!term || (to && to.name === term)) { Promise.resolve().then(() => setSuggest([])); return; }
    const t = setTimeout(async () => {
      try {
        const list = await (await fetch(`/api/flights/places/?term=${encodeURIComponent(term)}&lang=${language === 'en' ? 'en' : 'ko'}`)).json();
        setSuggest(Array.isArray(list) ? list : []);
      } catch { setSuggest([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [query, to, language]);

  const month = depart ? Number(depart.slice(5, 7)) : null;
  const calendar = result ? Object.entries(result.calendar || {}).sort(([a], [b]) => a.localeCompare(b)) : [];
  const minPrice = calendar.length ? Math.min(...calendar.map(([, p]) => p)) : 0;
  const stayDays = result?.return ? Math.round((parseYmd(result.return) - parseYmd(result.depart)) / 86400000) : null;
  const pickDate = (d) => {
    setDepart(d);
    let r = ret;
    if (stayDays != null) { const x = parseYmd(d); x.setDate(x.getDate() + stayDays); r = localDate(x); setRet(r); }
    search({ depart: d, ret: r });
  };

  const input = 'h-12 w-full rounded-xl border border-tm-line bg-white px-3.5 text-[16px] text-tm-ink outline-none focus:border-tm-navy';

  return (
    <div className="min-h-dvh bg-tm-ground font-sans text-tm-ink">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-[calc(32px+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-10 -mx-4 flex items-center gap-1 border-b border-tm-line bg-tm-ground/95 px-1.5 py-2 backdrop-blur">
          <button type="button" onClick={() => router.back()} aria-label={copy.back} className="flex h-11 w-11 items-center justify-center"><ChevronLeft size={24} /></button>
          <h1 className="flex items-center gap-2 text-[17px] font-bold"><Plane size={18} className="text-tm-navy" aria-hidden="true" />{copy.title}</h1>
        </header>

        <form className="flex flex-col gap-3 rounded-[20px] bg-white p-4" onSubmit={(e) => { e.preventDefault(); search(); }}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-[12px] font-semibold text-tm-muted">{copy.from}</span>
              <select id="fl-from" value={from} onChange={(e) => setFrom(e.target.value)} className={`${input} pr-2`}>
                {copy.origins.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </label>
            <ArrowLeftRight size={18} className="mb-3.5 text-tm-muted" aria-hidden="true" />
            <div className="relative flex min-w-0 flex-col gap-1">
              <label htmlFor="fl-to" className="text-[12px] font-semibold text-tm-muted">{copy.to}</label>
              <input
                id="fl-to"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setTo(null); }}
                placeholder={copy.toPlaceholder}
                autoComplete="off"
                role="combobox"
                aria-expanded={suggest.length > 0}
                aria-controls="fl-to-list"
                className={input}
              />
              {suggest.length > 0 && (
                <ul id="fl-to-list" role="listbox" className="absolute left-0 right-[-60px] top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-tm-line bg-white py-1 shadow-[0_8px_24px_rgba(21,48,79,.15)]">
                  {suggest.map((s) => (
                    <li key={`${s.type}-${s.code}`} role="option" aria-selected="false">
                      <button type="button" onClick={() => { setTo({ code: s.code, name: s.name }); setQuery(s.name); setSuggest([]); }} className="flex min-h-11 w-full items-center gap-2 px-3 text-left">
                        <span className="w-10 shrink-0 font-mono text-[13px] font-bold text-tm-navy">{s.code}</span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-[14px] font-semibold">{s.name}</span>
                          <span className="truncate text-[12px] text-tm-muted">{[s.type === 'airport' ? s.city : s.airport, s.country].filter(Boolean).join(' · ')}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold text-tm-muted">{copy.depart}</span>
              <input id="fl-depart" type="date" min={today} value={depart} onChange={(e) => { setDepart(e.target.value); if (ret && e.target.value > ret) setRet(''); }} className={input} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold text-tm-muted">{copy.ret}</span>
              <input id="fl-return" type="date" min={depart || today} value={oneWay ? '' : ret} disabled={oneWay} onChange={(e) => setRet(e.target.value)} className={`${input} disabled:opacity-40`} />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1" role="group" aria-label={copy.adults}>
              <button type="button" onClick={() => setAdults((n) => Math.max(1, n - 1))} aria-label={copy.minus} className="flex h-11 w-11 items-center justify-center rounded-xl border border-tm-line"><Minus size={16} /></button>
              <span className="min-w-14 text-center text-[15px] font-semibold tabular-nums">{copy.person(adults)}</span>
              <button type="button" onClick={() => setAdults((n) => Math.min(9, n + 1))} aria-label={copy.plus} className="flex h-11 w-11 items-center justify-center rounded-xl border border-tm-line"><Plus size={16} /></button>
            </div>
            <div className="flex gap-2">
              <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-tm-line px-3 text-[14px] font-semibold">
                <input id="fl-oneway" type="checkbox" checked={oneWay} onChange={(e) => setOneWay(e.target.checked)} className="h-4 w-4 accent-tm-navy" />{copy.oneWay}
              </label>
              <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-tm-line px-3 text-[14px] font-semibold">
                <input id="fl-direct" type="checkbox" checked={direct} onChange={(e) => setDirect(e.target.checked)} className="h-4 w-4 accent-tm-navy" />{copy.directOnly}
              </label>
            </div>
          </div>

          {formError && <p role="alert" className="text-[13px] font-semibold text-tm-warm">{formError}</p>}
          <button type="submit" disabled={state === 'busy'} className="flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-tm-navy text-[16px] font-bold text-white disabled:opacity-60">
            <Search size={18} aria-hidden="true" />{state === 'busy' ? copy.searching : copy.search}
          </button>
        </form>

        <div ref={resultsRef} className="flex scroll-mt-16 flex-col gap-4" aria-live="polite">
          {state === 'error' && <p role="alert" className="rounded-2xl bg-tm-warm-tint p-4 text-[14px] text-tm-warm">{copy.error}</p>}

          {result && state !== 'error' && (
            <>
              {calendar.length > 1 && (
                <section className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-[15px] font-bold">{copy.calendarTitle}</h2>
                    <span className="text-[12px] text-tm-muted">{copy.calendarHint}</span>
                  </div>
                  <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                    {calendar.map(([d, p]) => {
                      const dt = parseYmd(d);
                      const on = d === result.depart;
                      return (
                        <li key={d} className="shrink-0">
                          <button type="button" onClick={() => pickDate(d)} aria-pressed={on} className={`flex min-h-[64px] w-[84px] flex-col items-center justify-center rounded-xl border px-1 ${on ? 'border-tm-navy bg-tm-navy text-white' : 'border-tm-line bg-white text-tm-ink'}`}>
                            <span className="text-[12px] tabular-nums">{copy.dateLabel(dt, copy.weekday[dt.getDay()])}</span>
                            <span className={`text-[13px] font-bold tabular-nums ${!on && p === minPrice ? 'text-tm-safe' : ''}`}>{Math.round(p / 1000).toLocaleString()}{language === 'en' ? 'k' : '천'}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <section className="flex flex-col gap-2">
                <h2 className="text-[15px] font-bold">{copy.exactTitle}</h2>
                {result.exact.length > 0 ? (
                  <ul className="flex flex-col gap-2">{result.exact.map((f, i) => <FlightCard key={`e${i}`} copy={copy} f={f} oneWay={result.oneWay} adults={result.adults} />)}</ul>
                ) : (
                  <p className="rounded-2xl bg-white p-4 text-[14px] leading-relaxed text-tm-muted">{result.nearby.length ? copy.noExact : copy.noResults}</p>
                )}
              </section>

              {result.nearby.length > 0 && (
                <section className="flex flex-col gap-2">
                  <h2 className="text-[15px] font-bold">{copy.nearbyTitle(month || Number(result.depart.slice(5, 7)))}</h2>
                  <ul className="flex flex-col gap-2">{result.nearby.map((f, i) => <FlightCard key={`n${i}`} copy={copy} f={f} oneWay={result.oneWay} adults={result.adults} />)}</ul>
                </section>
              )}

              <section className="flex flex-col gap-2 rounded-2xl bg-white p-4">
                <h2 className="text-[15px] font-bold">{copy.partnerTitle}</h2>
                <p className="text-[13px] text-tm-muted">{copy.partnerNote}</p>
                <div className="grid grid-cols-2 gap-2">
                  <a href={result.links.tripCom} target="_blank" rel="noopener noreferrer sponsored" className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-tm-line text-[14px] font-semibold">{copy.tripCom}<ExternalLink size={14} aria-hidden="true" /></a>
                  <a href={result.links.aviasales} target="_blank" rel="noopener noreferrer sponsored" className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-tm-line text-[14px] font-semibold">{copy.aviasales}<ExternalLink size={14} aria-hidden="true" /></a>
                </div>
              </section>
              <p className="px-1 text-[12px] leading-relaxed text-tm-muted">{copy.notice}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
