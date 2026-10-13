'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import useAppLanguage from '../../hooks/useAppLanguage';
import { getSafetyCopy } from '../../content/safetyCopy';
import { goToLogin } from '../home/homeActions';

// 보호자 초대 수락(/safety/join?t=<128비트 키>). 수락하면 초대한 사람의 안심 귀가 경보를 받는다.
export default function GuardianJoin() {
  const router = useRouter();
  const [language] = useAppLanguage();
  const copy = getSafetyCopy(language);
  const [token] = useState(() => (typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('t') || ''));
  const [user, setUser] = useState(undefined);
  const [invite, setInvite] = useState(null); // null 로딩 · false 없음
  const [state, setState] = useState('idle'); // idle | busy | done | error

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  useEffect(() => {
    if (!user || !/^[0-9a-f]{32}$/.test(token)) {
      if (user !== undefined && !/^[0-9a-f]{32}$/.test(token)) Promise.resolve().then(() => setInvite(false));
      return;
    }
    getDoc(doc(db, 'guardian_invites', token))
      .then((snap) => setInvite(snap.exists() ? { id: snap.id, ...snap.data() } : false))
      .catch(() => setInvite(false));
  }, [user, token]);

  const accept = async () => {
    setState('busy');
    try {
      await updateDoc(doc(db, 'guardian_invites', token), { status: 'accepted', acceptedBy: user.uid, acceptedName: user.displayName || '', acceptedAt: serverTimestamp() });
      setState('done');
    } catch {
      setState('error');
    }
  };

  const owner = invite?.ownerName || copy.traveler;
  const mine = invite && user && invite.ownerUid === user.uid;
  const already = invite && user && invite.status === 'accepted' && invite.acceptedBy === user.uid;
  const unusable = invite === false || (invite && invite.status !== 'pending' && !already);

  return (
    <div className="flex min-h-dvh justify-center bg-tm-ground font-sans text-tm-ink">
      <main className="flex w-full max-w-md flex-col items-center gap-5 px-6 pb-10 pt-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tm-sky-tint text-tm-navy"><Shield size={30} aria-hidden="true" /></span>
        <h1 className="text-[22px] font-bold">{copy.joinTitle}</h1>

        {user === null && (
          <>
            <p className="text-[14px] leading-relaxed text-tm-muted">{copy.joinBody(copy.traveler)}</p>
            <button type="button" onClick={() => goToLogin(router)} className="h-[52px] w-full rounded-[14px] bg-tm-navy text-[15px] font-bold text-white">{copy.joinLogin}</button>
          </>
        )}

        {user && invite === null && <p role="status" className="text-[14px] text-tm-muted">…</p>}
        {user && unusable && <p className="text-[14px] text-tm-muted">{copy.joinInvalid}</p>}
        {user && mine && <p className="text-[14px] text-tm-muted">{copy.joinSelf}</p>}

        {user && invite && !mine && !unusable && (
          state === 'done' || already ? (
            <p className="text-[16px] font-semibold text-tm-safe-ink">{copy.joinDone(owner)}</p>
          ) : (
            <>
              <p className="text-[14px] leading-relaxed text-tm-muted">{copy.joinBody(owner)}</p>
              <button type="button" onClick={accept} disabled={state === 'busy'} className="h-[52px] w-full rounded-[14px] bg-tm-navy text-[15px] font-bold text-white disabled:opacity-60">{copy.joinAccept}</button>
              {state === 'error' && <p role="alert" className="text-[13px] text-tm-warm">{copy.failed}</p>}
            </>
          )
        )}

        <Link href="/safety" className="min-h-11 text-[14px] font-semibold text-tm-navy">{copy.joinGo}</Link>
      </main>
    </div>
  );
}
