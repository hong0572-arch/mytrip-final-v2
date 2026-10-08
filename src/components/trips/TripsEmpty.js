'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { startChat } from '../home/homeActions';
import { parseInviteId } from './tripsUtils';

// 점선 경로와 핀(장식). 캐릭터 대신 쓴다.
function RouteArt() {
  return (
    <svg width="220" height="170" viewBox="0 0 220 170" aria-hidden="true">
      <ellipse cx="110" cy="90" rx="104" ry="76" fill="var(--color-tm-sky-tint)" />
      <g stroke="#fff" strokeWidth="6" fill="none" opacity=".9">
        <path d="M10 112 H210" />
        <path d="M70 18 V162" />
        <path d="M150 22 L190 150" />
      </g>
      <path className="tm-route" d="M36 128 C 70 100, 84 140, 116 104 S 160 58, 178 52" fill="none" stroke="var(--color-tm-sky)" strokeWidth="3" strokeDasharray="3 8" strokeLinecap="round" />
      <circle cx="36" cy="128" r="7" fill="#fff" stroke="var(--color-tm-navy)" strokeWidth="3" />
      <circle cx="116" cy="104" r="5" fill="var(--color-tm-navy)" />
      <g className="tm-float" style={{ transformBox: 'fill-box' }}>
        <path d="M178 18 c-11 0 -19 8 -19 19 c0 14 19 30 19 30 s19 -16 19 -30 c0 -11 -8 -19 -19 -19 Z" fill="var(--color-tm-navy)" />
        <circle cx="178" cy="37" r="7" fill="#fff" />
      </g>
      <path d="M96 52 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" fill="var(--color-tm-sun)" />
    </svg>
  );
}

export default function TripsEmpty({ copy }) {
  const router = useRouter();
  const [pasting, setPasting] = useState(false);
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  const openInvite = (e) => {
    e.preventDefault();
    const id = parseInviteId(link);
    if (!id) return setError(copy.emptyInviteInvalid);
    router.push(`/join/${id}`);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[18px] py-6 text-center">
      <RouteArt />
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[21px] font-bold tracking-[-0.01em]">{copy.emptyTitle}</h2>
        <p className="text-[14px] leading-relaxed text-tm-ink/80">
          {copy.emptyBody[0]}
          <br />
          {copy.emptyBody[1]}
        </p>
      </div>

      <div className="flex max-w-[330px] flex-wrap justify-center gap-2">
        {copy.emptyChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => startChat(router, chip.prompt, { plan: true })}
            className="h-11 rounded-full border border-[#D6E6F0] bg-white px-4 text-[14px] font-semibold text-tm-ink active:bg-tm-sky-tint"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => startChat(router, '', { plan: true })}
        className="flex h-[52px] w-full max-w-[330px] items-center justify-center gap-2 rounded-2xl bg-tm-navy text-[16px] font-bold text-white"
      >
        <Sparkles size={18} />
        {copy.emptyCta}
      </button>

      <div className="flex w-full max-w-[330px] flex-col items-center gap-1 text-[13px] text-tm-muted">
        {pasting ? (
          <form onSubmit={openInvite} className="flex w-full flex-col gap-1.5">
            <div className="flex w-full gap-2">
              <input
                value={link}
                onChange={(e) => { setLink(e.target.value); setError(''); }}
                placeholder={copy.emptyInvitePlaceholder}
                aria-label={copy.emptyInvite}
                autoFocus
                inputMode="url"
                className="h-11 min-w-0 flex-1 rounded-xl border border-tm-line bg-white px-3 text-[15px] text-tm-ink outline-none focus:border-tm-navy"
              />
              <button type="submit" className="h-11 rounded-xl bg-tm-sky-tint px-4 text-[14px] font-bold text-tm-navy">{copy.emptyInviteGo}</button>
            </div>
            {error && <span role="alert" className="text-left text-[12px] text-tm-warm">{error}</span>}
          </form>
        ) : (
          <span className="flex items-center">
            {copy.emptyInvite}
            <button type="button" onClick={() => setPasting(true)} className="min-h-11 px-1.5 font-bold text-tm-navy">{copy.emptyInviteAction}</button>
          </span>
        )}
        <span className="flex items-center">
          {copy.emptyFeed}
          <Link href="/mypage?tab=social" className="flex min-h-11 items-center px-1.5 font-bold text-tm-navy">{copy.emptyFeedAction}</Link>
        </span>
      </div>
    </div>
  );
}
