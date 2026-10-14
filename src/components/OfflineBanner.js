'use client';
import { useEffect, useState } from 'react';
import { CloudOff, Wifi } from 'lucide-react';
import useAppLanguage from '../hooks/useAppLanguage';

const COPY = {
  ko: { off: '오프라인이에요 · 전에 연 일정과 들은 해설은 볼 수 있어요', back: '다시 연결됐어요' },
  en: { off: "You're offline · trips you've opened and guides you've heard still work", back: 'Back online' },
};

// 앱 전체 공통: 인터넷이 끊기면 위쪽에 얇은 안내를 띄운다(지도·AI 대화는 연결이 필요하다).
export default function OfflineBanner() {
  const [language] = useAppLanguage();
  const copy = COPY[language === 'en' ? 'en' : 'ko'];
  const [state, setState] = useState('online'); // online | offline | back

  useEffect(() => {
    let timer;
    const off = () => { clearTimeout(timer); setState('offline'); };
    const on = () => { setState('back'); timer = setTimeout(() => setState('online'), 2500); };
    if (navigator.onLine === false) Promise.resolve().then(off);
    window.addEventListener('offline', off);
    window.addEventListener('online', on);
    return () => { clearTimeout(timer); window.removeEventListener('offline', off); window.removeEventListener('online', on); };
  }, []);

  if (state === 'online') return null;
  const offline = state === 'offline';
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex justify-center px-3 pt-[calc(6px+env(safe-area-inset-top))]">
      <span className={`flex max-w-md items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-semibold shadow-[0_4px_14px_rgba(21,48,79,.2)] ${offline ? 'bg-tm-ink text-white' : 'bg-tm-sky-tint text-tm-navy'}`}>
        {offline ? <CloudOff size={15} aria-hidden="true" /> : <Wifi size={15} aria-hidden="true" />}
        {offline ? copy.off : copy.back}
      </span>
    </div>
  );
}
