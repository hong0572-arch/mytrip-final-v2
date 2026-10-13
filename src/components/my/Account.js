'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Download, FileText, LogOut, UserRound } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { signOut as nextAuthSignOut } from 'next-auth/react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import useAppLanguage from '../../hooks/useAppLanguage';
import useMyTrips from '../../hooks/useMyTrips';
import { getMyCopy } from '../../content/myCopy';
import { authHeaders } from '../../utils/authHeaders';
import { goToLogin } from '../home/homeActions';

const clean = (v) => JSON.parse(JSON.stringify(v, (k, x) => (x && typeof x.toDate === 'function' ? x.toDate().toISOString() : x)));

// 이 기기에 남은 개인 데이터(보관함·설정)까지 지운다
async function clearDevice() {
  try { localStorage.clear(); sessionStorage.clear(); } catch {}
  try { indexedDB.deleteDatabase('TripMakerVaultDB'); } catch {}
}

function DeleteSheet({ copy, onClose, onDone }) {
  const [summary, setSummary] = useState(null);
  const [feeds, setFeeds] = useState(false);
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // 지워질 항목 미리 보기
  useEffect(() => {
    let alive = true;
    authHeaders()
      .then((headers) => fetch('/api/account/delete/', { headers }))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((data) => alive && setSummary(data))
      .catch(() => alive && setSummary({ trips: 0, sharedTrips: [], diaries: 0, points: 0, feeds: 0 }));
    return () => { alive = false; };
  }, []);

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/account/delete/', { method: 'POST', headers: await authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ deleteFeeds: feeds }) });
      if (!res.ok) throw new Error();
      onDone();
    } catch {
      setError(copy.failed);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button type="button" aria-label={copy.delKeep} tabIndex={-1} onClick={busy ? undefined : onClose} className="absolute inset-0 bg-[rgba(13,31,54,0.45)]" />
      <section role="dialog" aria-modal="true" aria-label={copy.delTitle} className="tm-rise relative flex w-full max-w-md flex-col gap-3.5 rounded-t-3xl bg-white px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto h-1 w-10 rounded-full bg-[#D5D9DF]" />
        <h2 className="text-[20px] font-bold">{copy.delTitle}</h2>
        {!summary ? (
          <p role="status" className="text-[14px] text-tm-muted">{copy.delLoading}</p>
        ) : (
          <ul className="flex flex-col gap-2.5 text-[14px] leading-normal">
            {[
              copy.delTrips(summary.trips, summary.diaries, (summary.points || 0).toLocaleString()),
              summary.sharedTrips?.length ? copy.delShared(summary.sharedTrips.map((t) => `‘${t}’`).join(', ')) : null,
              copy.delSafety,
              copy.delDevice,
            ].filter(Boolean).map((t) => (
              <li key={t} className="flex gap-2"><Check size={18} strokeWidth={2.4} className="mt-0.5 shrink-0 text-tm-navy" aria-hidden="true" />{t}</li>
            ))}
          </ul>
        )}
        {summary?.feeds > 0 && (
          <label className="flex min-h-11 items-center gap-2.5 text-[14px]">
            <input type="checkbox" checked={feeds} onChange={(e) => setFeeds(e.target.checked)} className="h-5 w-5 accent-tm-navy" />
            {copy.delFeeds(summary.feeds)}
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-[13px] text-tm-muted">
          {copy.delType}
          <input value={word} onChange={(e) => setWord(e.target.value)} placeholder={copy.delWord} autoComplete="off" className="h-12 rounded-xl border border-tm-line bg-tm-ground px-3.5 text-[16px] text-tm-ink outline-none focus:border-tm-navy" />
        </label>
        {error && <p role="alert" className="text-[13px] text-tm-warm">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} autoFocus className="h-[52px] flex-1 rounded-[14px] bg-tm-navy text-[15px] font-bold text-white">{copy.delKeep}</button>
          <button type="button" onClick={confirm} disabled={busy || !summary || word.trim().toUpperCase() !== copy.delWord.toUpperCase()}
            className="h-[52px] flex-1 rounded-[14px] border border-tm-line text-[15px] font-semibold text-tm-muted disabled:opacity-50">
            {busy ? copy.delWorking : copy.delConfirm}
          </button>
        </div>
      </section>
    </div>
  );
}

function Row({ onClick, href, Icon, label, sub }) {
  const cls = 'flex min-h-14 w-full items-center gap-3 border-t border-[#EEF0F2] px-3.5 py-2 text-left first:border-t-0 active:bg-tm-ground';
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tm-sky-tint text-tm-navy"><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-px"><span className="text-[15px] font-semibold">{label}</span>{sub && <span className="truncate text-[12px] text-tm-muted">{sub}</span>}</span>
      {(href || onClick) && <ChevronRight size={18} className="shrink-0 text-tm-muted" aria-hidden="true" />}
    </>
  );
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

// 개인정보·계정: 로그인 정보 · 로그아웃 · 내 데이터 내려받기 · 개인정보처리방침 · 회원 탈퇴
export default function Account() {
  const router = useRouter();
  const [language] = useAppLanguage();
  const copy = getMyCopy(language);
  const { user, authReady } = useMyTrips();
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState(false);

  const provider = user?.providerData?.[0]?.providerId === 'google.com' ? 'Google' : user?.providerData?.[0]?.providerId || '';

  const logout = async () => {
    if (!window.confirm(copy.accLogoutConfirm)) return;
    await signOut(auth);
    await nextAuthSignOut({ redirect: false }).catch(() => {});
    router.replace('/');
  };

  const exportData = async () => {
    try {
      const [profile, trips, history] = await Promise.all([
        getDoc(doc(db, 'users', user.uid)),
        getDocs(query(collection(db, 'trips'), where('memberIds', 'array-contains', user.uid))),
        getDocs(collection(db, 'users', user.uid, 'point_history')),
      ]);
      const tripData = await Promise.all(trips.docs.map(async (t) => {
        const ex = await getDocs(collection(db, 'trips', t.id, 'expenses')).catch(() => ({ docs: [] }));
        return { id: t.id, ...t.data(), expenses: ex.docs.map((e) => ({ id: e.id, ...e.data() })) };
      }));
      const data = clean({ exportedAt: new Date().toISOString(), account: { uid: user.uid, email: user.email, provider }, profile: profile.data() || {}, trips: tripData, pointHistory: history.docs.map((d) => d.data()) });
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `tripmaker-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      window.alert(copy.failed);
    }
  };

  const afterDelete = async () => {
    await clearDevice();
    await signOut(auth).catch(() => {});
    await nextAuthSignOut({ redirect: false }).catch(() => {});
    setDeleting(false);
    setDone(true);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-tm-ground font-sans text-tm-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="flex items-center gap-1 py-2 pl-1.5 pr-3">
          <Link href="/mypage" aria-label="back" className="flex h-11 w-11 items-center justify-center"><ChevronLeft size={24} strokeWidth={2} /></Link>
          <h1 className="flex-1 text-[18px] font-bold">{copy.accTitle}</h1>
        </header>

        {done ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-[16px] font-semibold">{copy.delDone}</p>
            <button type="button" onClick={() => router.replace('/')} className="h-12 rounded-[14px] bg-tm-navy px-6 text-[15px] font-bold text-white">OK</button>
          </div>
        ) : authReady && !user ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8">
            <button type="button" onClick={() => goToLogin(router)} className="h-12 rounded-[14px] bg-tm-navy px-6 text-[15px] font-bold text-white">{copy.login}</button>
            <Link href="/privacy" className="min-h-11 text-[14px] font-semibold text-tm-navy">{copy.accPrivacy}</Link>
          </div>
        ) : user && (
          <main className="flex flex-col gap-[18px] px-4 pb-10 pt-1">
            <section className="flex flex-col gap-2">
              <div className="overflow-hidden rounded-[18px] bg-white">
                <Row Icon={UserRound} label={copy.accLogin} sub={[provider, user.email].filter(Boolean).join(' · ')} />
                <Row Icon={LogOut} label={copy.accLogout} onClick={logout} />
              </div>
            </section>
            <section className="overflow-hidden rounded-[18px] bg-white">
              <Row Icon={Download} label={copy.accExport} sub={copy.accExportSub} onClick={exportData} />
              <Row Icon={FileText} label={copy.accPrivacy} href="/privacy" />
            </section>
            <section className="flex flex-col gap-2.5 rounded-[18px] bg-white p-4">
              <h2 className="text-[15px] font-bold">{copy.accDeleteTitle}</h2>
              <p className="text-[13px] leading-relaxed text-tm-muted">{copy.accDeleteBody}</p>
              <button type="button" onClick={() => setDeleting(true)} className="h-11 self-start rounded-xl border border-tm-line px-4 text-[14px] font-semibold text-tm-muted">{copy.accDeleteStart}</button>
            </section>
          </main>
        )}
      </div>
      {deleting && <DeleteSheet copy={copy} onClose={() => setDeleting(false)} onDone={afterDelete} />}
    </div>
  );
}
