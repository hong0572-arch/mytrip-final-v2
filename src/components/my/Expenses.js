'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { goToLogin } from '../home/homeActions';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { onSnapshotError } from '../../lib/snapshotError';
import useAppLanguage from '../../hooks/useAppLanguage';
import useMyTrips from '../../hooks/useMyTrips';
import { useIsClient } from '../../hooks/useLocalStore';
import { getMyCopy } from '../../content/myCopy';
import { groupTrips, toInputDate, tripTitle } from '../trips/tripsUtils';

// 여행 경비 기록(예전 '트립머니' 대신): 실제로 쓴 돈만 적는다. 돈이 오가거나 충전되지 않는다.
// 데이터: trips/{id}/expenses { name, amount, currency, category, date, byUid, byName, createdAt } · 예산 trips.budgetKRW
const CURRENCIES = ['KRW', 'JPY', 'USD', 'EUR', 'THB', 'CNY', 'HKD', 'SGD', 'TWD', 'VND', 'PHP', 'IDR', 'MYR', 'GBP', 'AUD', 'CAD', 'CHF'];
const CATS = ['stay', 'food', 'transport', 'sight', 'shopping', 'etc'];
const CAT_EMOJI = { stay: '🏨', food: '🍜', transport: '🚌', sight: '🎟️', shopping: '🛍️', etc: '🧾' };
const CAT_COLOR = { stay: '#1B3D6B', food: '#1AA7E0', transport: '#F2B53A', sight: '#0E7357', shopping: '#7FD3F5', etc: '#94A0AE' };
const LEGACY_CAT = { 숙소: 'stay', 식비: 'food', 교통: 'transport', 관광: 'sight', 쇼핑: 'shopping' };

const won = (n) => `₩${Math.round(n).toLocaleString()}`;
const fmt = (amount, currency) => (currency === 'KRW' ? won(amount) : `${Number(amount).toLocaleString()} ${currency}`);

function AddSheet({ copy, trip, me, lastCurrency, onClose, onSave }) {
  const members = Array.isArray(trip.membersInfo) && trip.membersInfo.length ? trip.membersInfo : [{ uid: me.uid, name: me.displayName || copy.me }];
  const [form, setForm] = useState({ name: '', amount: '', currency: lastCurrency, category: 'food', date: toInputDate(new Date()), byUid: me.uid });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim() && Number(form.amount) > 0;
  const field = 'h-12 w-full rounded-xl border border-tm-line bg-tm-ground px-3.5 text-[16px] outline-none focus:border-tm-navy';

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button type="button" aria-label={copy.expCancel} tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-[rgba(13,31,54,0.45)]" />
      <form
        role="dialog"
        aria-label={copy.expAdd}
        onSubmit={(e) => { e.preventDefault(); if (valid) onSave(form, members); }}
        className="tm-rise relative flex max-h-[90dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-t-3xl bg-white px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-[#D5D9DF]" />
        <h2 className="text-[18px] font-bold">{copy.expAdd}</h2>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">{copy.expName}
          <input value={form.name} onChange={set('name')} placeholder={copy.expNamePh} maxLength={60} autoFocus className={field} />
        </label>
        <div className="grid grid-cols-[1fr_120px] gap-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">{copy.expAmount}
            <input value={form.amount} onChange={set('amount')} inputMode="decimal" type="number" min="0" step="any" className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">{copy.expCurrency}
            <select value={form.currency} onChange={set('currency')} className={field}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[13px] font-semibold">{copy.expCategory}</legend>
          <div className="flex flex-wrap gap-1.5">
            {CATS.map((c) => (
              <button key={c} type="button" aria-pressed={form.category === c} onClick={() => setForm((f) => ({ ...f, category: c }))}
                className={`h-10 rounded-full px-3 text-[13px] font-semibold ${form.category === c ? 'bg-tm-navy text-white' : 'border border-tm-line bg-white text-tm-ink'}`}>
                {CAT_EMOJI[c]} {copy.categories[c]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">{copy.expDate}
            <input type="date" value={form.date} onChange={set('date')} className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">{copy.expPaidBy}
            <select value={form.byUid} onChange={set('byUid')} className={field}>
              {members.map((m) => <option key={m.uid} value={m.uid}>{m.uid === me.uid ? copy.me : m.name || '…'}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-1 flex gap-2">
          <button type="button" onClick={onClose} className="h-12 flex-1 rounded-xl border border-tm-line text-[15px] font-semibold">{copy.expCancel}</button>
          <button type="submit" disabled={!valid} className="h-12 flex-1 rounded-xl bg-tm-navy text-[15px] font-bold text-white disabled:opacity-50">{copy.expSave}</button>
        </div>
      </form>
    </div>
  );
}

export default function Expenses() {
  const router = useRouter();
  const [language] = useAppLanguage();
  const copy = getMyCopy(language);
  const { user, authReady, trips } = useMyTrips();
  const mounted = useIsClient();
  // ?trip=<id>로 들어오면 그 여행을 먼저 보여 준다(목록은 마운트 뒤에만 그려서 하이드레이션과 무관)
  const [tripId, setTripId] = useState(() => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('trip')));
  const [list, setList] = useState({ id: null, items: [] });
  const [fx, setFx] = useState({ rates: { KRW: 1 }, date: null });
  const [adding, setAdding] = useState(false);
  const [budgetEdit, setBudgetEdit] = useState(null);
  const [toast, setToast] = useState('');

  // 다가오는(여행 중 포함) 여행 → 지난 여행 순
  const ordered = useMemo(() => {
    if (!mounted) return [];
    const { upcoming, past } = groupTrips(trips);
    return [...upcoming, ...past];
  }, [mounted, trips]);
  const trip = ordered.find((t) => t.id === tripId) || ordered[0] || null;

  useEffect(() => {
    fetch('/api/fx/').then((r) => r.json()).then((j) => j?.rates && setFx(j)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!trip?.id) return undefined;
    const id = trip.id;
    return onSnapshot(
      query(collection(db, 'trips', id, 'expenses'), orderBy('createdAt', 'desc')),
      (snap) => setList({ id, items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }),
      onSnapshotError('expenses')
    );
  }, [trip?.id]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  const items = useMemo(() => (list.id === trip?.id ? list.items : [])
    .filter((e) => e.category !== '환전') // 예전 '트립머니' 환전 기록은 지출이 아니다
    .map((e) => {
      const currency = e.currency || 'KRW';
      const rate = fx.rates[currency];
      const amount = Number(e.amount) || 0;
      return {
        ...e,
        currency,
        amount,
        cat: CATS.includes(e.category) ? e.category : LEGACY_CAT[e.category] || 'etc',
        krw: currency === 'KRW' ? amount : rate ? amount / rate : null,
        day: e.date || (e.createdAt?.toDate ? toInputDate(e.createdAt.toDate()) : ''),
        payer: e.byUid || '',
        payerName: e.byName || e.by || '',
      };
    }), [list, trip?.id, fx]);

  const total = items.reduce((s, e) => s + (e.krw || 0), 0);
  const missing = [...new Set(items.filter((e) => e.krw == null).map((e) => e.currency))];
  const byCat = CATS.map((c) => [c, items.filter((e) => e.cat === c).reduce((s, e) => s + (e.krw || 0), 0)]).filter(([, v]) => v > 0);
  const budget = Number(trip?.budgetKRW || trip?.targetTotalCost || 0);
  const members = Array.isArray(trip?.membersInfo) ? trip.membersInfo : [];
  const days = [...new Set(items.map((e) => e.day))].sort().reverse();
  const nameOf = (e) => (e.payer && e.payer === user?.uid ? copy.me : members.find((m) => m.uid === e.payer)?.name || e.payerName || '');

  const save = async (form, mem) => {
    const by = mem.find((m) => m.uid === form.byUid);
    setAdding(false);
    try {
      await addDoc(collection(db, 'trips', trip.id, 'expenses'), {
        name: form.name.trim(), amount: Number(form.amount), currency: form.currency, category: form.category, date: form.date,
        byUid: form.byUid, byName: by?.name || user.displayName || '', createdAt: serverTimestamp(),
      });
    } catch { flash(copy.failed); }
  };

  const remove = async (e) => {
    try { await deleteDoc(doc(db, 'trips', trip.id, 'expenses', e.id)); } catch { flash(copy.failed); }
  };

  const saveBudget = async () => {
    const v = Math.max(0, Math.round(Number(budgetEdit) || 0));
    setBudgetEdit(null);
    try { await updateDoc(doc(db, 'trips', trip.id), { budgetKRW: v }); } catch { flash(copy.failed); }
  };

  const share = async () => {
    const paid = {};
    items.forEach((e) => { const n = nameOf(e) || '?'; paid[n] = (paid[n] || 0) + (e.krw || 0); });
    const lines = Object.entries(paid).map(([n, v]) => `· ${n}: ${won(v)}`).join('\n');
    const text = copy.shareText(tripTitle(trip), won(total), lines, members.length > 1 ? copy.expPerPerson(members.length, won(total / members.length)) : '');
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); flash(copy.expShareCopied); }
    } catch {}
  };

  return (
    <div className="flex min-h-dvh flex-col bg-tm-ground font-sans text-tm-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="flex items-center gap-1 py-2 pl-1.5 pr-3">
          <Link href="/mypage" aria-label="back" className="flex h-11 w-11 items-center justify-center"><ChevronLeft size={24} strokeWidth={2} /></Link>
          <h1 className="flex-1 text-[18px] font-bold">{copy.expTitle}</h1>
        </header>

        {authReady && !user && (
          <div className="flex flex-col items-center gap-3 px-8 py-10 text-center">
            <p className="text-[14px] text-tm-muted">{copy.loginTitle}</p>
            <button type="button" onClick={() => goToLogin(router)} className="h-12 rounded-[14px] bg-tm-navy px-6 text-[15px] font-bold text-white">{copy.login}</button>
          </div>
        )}
        {authReady && user && mounted && ordered.length === 0 && <p className="px-5 py-10 text-center text-[14px] text-tm-muted">{copy.expNoTrips}</p>}

        {trip && (
          <>
            <div className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 pt-1 [scrollbar-width:none]">
              {ordered.map((t) => (
                <button key={t.id} type="button" onClick={() => setTripId(t.id)} aria-pressed={t.id === trip.id}
                  className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] ${t.id === trip.id ? 'bg-tm-navy font-bold text-white' : 'border border-tm-line bg-white font-medium text-tm-muted'}`}>
                  {tripTitle(t)}
                </button>
              ))}
            </div>

            <main className="flex flex-1 flex-col gap-3.5 px-4 pb-28">
              <section className="flex flex-col gap-3 rounded-[20px] bg-white p-4">
                <div className="flex items-end justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] text-tm-muted">{copy.expSpent}</span>
                    <span className="text-[26px] font-bold tabular-nums">{won(total)}</span>
                  </div>
                  {budgetEdit == null ? (
                    <button type="button" onClick={() => setBudgetEdit(budget || '')} className="min-h-11 text-[12px] font-semibold tabular-nums text-tm-navy">
                      {budget ? copy.expBudget(won(budget)) : copy.expSetBudget}
                    </button>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); saveBudget(); }} className="flex items-center gap-1.5">
                      <input aria-label={copy.expBudgetLabel} value={budgetEdit} onChange={(e) => setBudgetEdit(e.target.value)} type="number" inputMode="numeric" autoFocus className="h-10 w-28 rounded-lg border border-tm-line px-2 text-[15px]" />
                      <button type="submit" className="h-10 rounded-lg bg-tm-navy px-3 text-[13px] font-bold text-white">{copy.expSave}</button>
                    </form>
                  )}
                </div>
                {budget > 0 && (
                  <div className="h-2 overflow-hidden rounded-full bg-tm-sky-tint">
                    <div className={`h-full rounded-full ${total > budget ? 'bg-tm-warm' : 'bg-tm-navy'}`} style={{ width: `${Math.min(100, (total / budget) * 100)}%` }} />
                  </div>
                )}
                {byCat.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-tm-muted">
                    {byCat.map(([c, v]) => (
                      <span key={c} className="inline-flex items-center gap-1 tabular-nums"><span className="h-2 w-2 rounded-full" style={{ background: CAT_COLOR[c] }} />{copy.categories[c]} {won(v)}</span>
                    ))}
                  </div>
                )}
                <span className="text-[11px] text-tm-muted">
                  {copy.expRateNote(fx.date)}{missing.length > 0 && ` · ${copy.expNoRate(missing.join(', '))}`}
                </span>
              </section>

              {members.length > 1 && total > 0 && (
                <section className="flex items-center gap-2.5 rounded-2xl bg-tm-sky-tint px-3.5 py-3">
                  <span aria-hidden="true" className="text-[18px]">🤝</span>
                  <span className="flex-1 text-[13px] leading-snug">{copy.expPerPerson(members.length, won(total / members.length))}</span>
                  <button type="button" onClick={share} className="h-9 rounded-xl bg-white px-3 text-[13px] font-bold text-tm-navy">{copy.expShare}</button>
                </section>
              )}

              {items.length === 0 && <p className="py-6 text-center text-[14px] text-tm-muted">{copy.expEmpty}</p>}

              {days.map((d) => (
                <section key={d || 'none'} className="flex flex-col gap-2">
                  <h2 className="mx-1 text-[13px] font-bold tabular-nums text-tm-muted">{copy.expDayLabel(d)}</h2>
                  <ul className="overflow-hidden rounded-[18px] bg-white">
                    {items.filter((e) => e.day === d).map((e) => (
                      <li key={e.id} className="flex min-h-14 items-center gap-3 border-t border-[#EEF0F2] py-2 pl-3.5 pr-1 first:border-t-0">
                        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tm-ground text-[18px]">{CAT_EMOJI[e.cat]}</span>
                        <span className="flex min-w-0 flex-1 flex-col gap-px">
                          <span className="truncate text-[15px] font-semibold">{e.name}</span>
                          <span className="truncate text-[12px] text-tm-muted">{copy.categories[e.cat]}{nameOf(e) ? ` · ${nameOf(e)}` : ''}</span>
                        </span>
                        <span className="flex flex-col items-end text-right">
                          <span className="text-[15px] font-bold tabular-nums">{fmt(e.amount, e.currency)}</span>
                          {e.currency !== 'KRW' && e.krw != null && <span className="text-[11px] tabular-nums text-tm-muted">{won(e.krw)}</span>}
                        </span>
                        <button type="button" onClick={() => remove(e)} aria-label={`${copy.expDelete} ${e.name}`} className="flex h-11 w-10 shrink-0 items-center justify-center text-tm-muted">
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </main>

            <div className="pointer-events-none fixed inset-x-0 bottom-[calc(24px+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-md justify-end px-4">
              <button type="button" onClick={() => setAdding(true)}
                className="pointer-events-auto flex h-[52px] items-center gap-1.5 rounded-full bg-tm-navy px-5 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(21,48,79,.25)]">
                <Plus size={18} strokeWidth={2.4} /> {copy.expAdd}
              </button>
            </div>
            {adding && user && (
              <AddSheet copy={copy} trip={trip} me={user} lastCurrency={items[0]?.currency || 'KRW'} onClose={() => setAdding(false)} onSave={save} />
            )}
          </>
        )}
      </div>
      {toast && (
        <div role="status" className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex justify-center px-6">
          <span className="tm-rise rounded-full bg-tm-ink px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg">{toast}</span>
        </div>
      )}
    </div>
  );
}
