'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Check, MessageSquare, Phone, Timer, Volume2, VolumeX } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { onSnapshotError } from '../../lib/snapshotError';
import useAppLanguage from '../../hooks/useAppLanguage';
import { getSafetyCopy } from '../../content/safetyCopy';
import useSafety from '../../lib/safety/useSafety';
import { endSafety, enterGrace, extendSafety, raiseAlert, smsHref, smsText, toggleSiren, updateLocation } from '../../lib/safety/actions';
import { liveSessionPath } from '../../lib/safety/store';
import { startSiren, stopSiren } from '../../lib/safety/siren';
import { emergencyNumbers } from '../trip/tripUtils';

const clock = (ms, language) => new Date(ms).toLocaleTimeString(language === 'en' ? 'en-US' : 'ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

// 앱 전체에 하나: 안심 귀가 타이머·만료(1분 유예)·경보 화면·위치 갱신, 그리고 보호자 기기의 경보 수신.
export default function SafetyRuntime() {
  const [language] = useAppLanguage();
  const copy = getSafetyCopy(language);
  const s = useSafety();
  const pathname = usePathname() || '';
  const [user, setUser] = useState(null);
  const [now, setNow] = useState(0);
  const [wardAlerts, setWardAlerts] = useState([]);
  const [dismissed, setDismissed] = useState({});
  const [smsBody, setSmsBody] = useState('');

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  // 1초 시계(진행 중일 때만)
  useEffect(() => {
    if (s.phase === 'idle') return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [s.phase]);

  // 약속 시간 → 1분 유예 → 경보
  useEffect(() => {
    if (!now) return;
    if (s.phase === 'active' && now >= s.endTime) enterGrace();
    else if (s.phase === 'grace' && now >= s.graceEndsAt) raiseAlert(copy);
  }, [now, s.phase, s.endTime, s.graceEndsAt, copy]);

  // 진행 중 15초마다 위치 갱신(보호자 실시간 지도용)
  useEffect(() => {
    if (s.phase === 'idle' || !user) return undefined;
    updateLocation();
    const id = setInterval(updateLocation, 15000);
    return () => clearInterval(id);
  }, [s.phase, user]);

  // 경보 화면의 문자 본문(위치 포함)
  useEffect(() => {
    if (s.phase !== 'alert') return;
    let alive = true;
    updateLocation().then((loc) => alive && setSmsBody(smsText(copy, loc)));
    return () => { alive = false; };
  }, [s.phase, copy]);

  // [보호자] 내가 지켜 주는 사람의 경보(약속 시간 지남·SOS)
  useEffect(() => {
    if (!user) return undefined;
    const buckets = { list: [], legacy: [] };
    const publish = () => {
      const map = new Map([...buckets.list, ...buckets.legacy].map((d) => [d.id, d]));
      setWardAlerts([...map.values()]);
    };
    const listen = (field, op, bucket) => onSnapshot(
      query(collection(db, 'safemode_sessions'), where(field, op, user.uid), where('status', '==', 'expired')),
      (snap) => { buckets[bucket] = snap.docs.map((d) => ({ id: d.id, ...d.data() })); publish(); },
      onSnapshotError(`safety/ward-${bucket}`)
    );
    const a = listen('guardianUserIds', 'array-contains', 'list');
    const b = listen('guardianUserId', '==', 'legacy');
    return () => { a(); b(); };
  }, [user]);

  const ward = wardAlerts.find((w) => w.id !== user?.uid && !dismissed[`${w.id}-${w.endTime}`]);
  useEffect(() => {
    if (!ward || s.phase === 'alert') return undefined;
    startSiren({ type: 'sawtooth', low: 850, high: 1350, volume: 0.8 });
    return () => stopSiren();
  }, [ward, s.phase]);

  const destination = s.dest || '';
  const nums = emergencyNumbers(destination);
  const phoneGuardians = s.guardians.filter((g) => g.type === 'phone');

  // ── 내 화면: 1분 유예 ──
  if (s.phase === 'grace' && now) {
    const left = Math.max(0, Math.ceil((s.graceEndsAt - now) / 1000));
    return (
      <div role="alertdialog" aria-modal="true" aria-label={copy.graceTitle} className="fixed inset-0 z-[300] flex justify-center bg-gradient-to-b from-tm-navy-deep to-tm-navy text-white">
        <div className="flex w-full max-w-md flex-col items-center gap-4 px-6 pb-[calc(28px+env(safe-area-inset-bottom))] pt-16 text-center">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/10 text-tm-sky-soft"><Timer size={36} strokeWidth={1.8} aria-hidden="true" /></span>
          <h1 className="text-[26px] font-bold">{copy.graceTitle}</h1>
          <p className="text-[15px] leading-relaxed text-[#C9D6E5]">{copy.graceBody(clock(s.endTime, language))}<br /><b className="tabular-nums text-white">{copy.graceCount(left)}</b></p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15"><div className="h-full bg-tm-sky-soft transition-[width] duration-1000 ease-linear" style={{ width: `${(left / 60) * 100}%` }} /></div>
          <div className="flex-1" />
          <button type="button" onClick={() => endSafety(copy)} className="h-[60px] w-full rounded-[18px] bg-white text-[18px] font-bold text-tm-navy">{copy.arrived}</button>
          <button type="button" onClick={() => extendSafety(15)} className="h-[52px] w-full rounded-2xl border border-white/30 text-[15px] font-semibold">{copy.stillGoing}</button>
          <button type="button" onClick={() => raiseAlert(copy, { sos: true })} className="h-14 w-full rounded-2xl bg-tm-sos text-[16px] font-bold">{copy.needHelp}</button>
        </div>
      </div>
    );
  }

  // ── 내 화면: 경보(보호자에게 알림·사이렌) ──
  if (s.phase === 'alert') {
    return (
      <div role="alertdialog" aria-modal="true" aria-label={s.sos ? copy.alertTitleSos : copy.alertTitleExpire} className="fixed inset-0 z-[300] flex justify-center bg-[#2A0E0B] text-white">
        <div className="flex w-full max-w-md flex-col gap-3 overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-12">
          <h1 className="text-[26px] font-bold">{s.sos ? copy.alertTitleSos : copy.alertTitleExpire}</h1>
          <p className="text-[14px] leading-relaxed text-white/80">{copy.alertBody}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {nums && (
              <a href={`tel:${nums.police}`} className="col-span-2 flex h-16 items-center justify-center gap-2 rounded-[18px] bg-tm-sos text-[20px] font-bold">
                <Phone size={22} aria-hidden="true" /> {copy.callPolice(nums.police)}
              </a>
            )}
            {!nums && (
              <a href="/safety" className="col-span-2 flex h-14 items-center justify-center gap-2 rounded-[18px] bg-tm-sos text-[17px] font-bold">
                <Phone size={20} aria-hidden="true" /> {copy.callLocal}
              </a>
            )}
            {phoneGuardians.map((g) => (
              <a key={g.id} href={smsHref(g.phone, smsBody || smsText(copy, null))} className="col-span-2 flex h-14 items-center justify-center gap-2 rounded-2xl bg-white text-[15px] font-bold text-tm-ink">
                <MessageSquare size={18} aria-hidden="true" /> {copy.smsTo(g.name)}
              </a>
            ))}
            <button type="button" onClick={toggleSiren} className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/30 text-[14px] font-semibold">
              {s.siren ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />} {s.siren ? copy.sirenOff : copy.sirenOn}
            </button>
            <button type="button" onClick={() => endSafety(copy)} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-tm-safe text-[14px] font-bold">
              <Check size={18} aria-hidden="true" /> {copy.imSafe}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 보호자 기기: 지켜 주는 사람의 경보 ──
  if (ward && !pathname.startsWith('/share/live_safemode')) {
    const link = liveSessionPath(ward.id, ward.shareToken);
    const dismiss = () => { stopSiren(); setDismissed((d) => ({ ...d, [`${ward.id}-${ward.endTime}`]: true })); };
    return (
      <div role="alertdialog" aria-modal="true" aria-label={copy.guardianAlertTitle(ward.userName || '')} className="fixed inset-x-0 top-0 z-[300] flex justify-center p-3">
        <div className="flex w-full max-w-md flex-col gap-3 rounded-[22px] bg-[#2A0E0B] p-4 text-white shadow-2xl">
          <span className="text-[17px] font-bold">{copy.guardianAlertTitle(ward.userName || copy.traveler)}</span>
          <span className="text-[14px] text-white/80">{copy.guardianAlertExpire}</span>
          <div className="flex gap-2">
            {link && <a href={link} onClick={() => stopSiren()} className="flex h-12 flex-1 items-center justify-center rounded-xl bg-tm-sos text-[14px] font-bold">{copy.guardianViewMap}</a>}
            <button type="button" onClick={dismiss} className="h-12 flex-1 rounded-xl border border-white/30 text-[14px] font-semibold">{copy.guardianDismiss}</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
