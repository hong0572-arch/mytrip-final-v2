import { ImageResponse } from 'next/og';
import { getShareSummary } from '../../../lib/shareMeta';

// 공유 링크 미리보기 이미지(1200×630). 한글 글꼴은 필요한 글자만 Google Fonts에서 받아 쓴다.
export const alt = 'Trip Maker 여행 일정';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

const C = { ground: '#F8F7F4', ink: '#15304F', navy: '#1B3D6B', muted: '#5B6577', tint: '#E4F4FB', sky: '#7FD3F5', line: '#E3E6EA' };

async function font(text, weight) {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return [{ id: 'dummy' }];
}

export default async function Image({ params }) {
  const { id } = await params;
  const s = await getShareSummary(id);
  const title = s?.title || s?.destination || '여행 일정';
  const en = Boolean(s?.en);
  const meta = s
    ? [s.destination, s.days ? (en ? `${s.days} days` : `${s.days}일`) : '', s.placeCount ? (en ? `${s.placeCount} stops` : `장소 ${s.placeCount}곳`) : ''].filter(Boolean).join('  ·  ')
    : '친구가 공유한 여행 일정';
  const places = s?.places || [];
  const brand = en ? 'Trip Maker · Planned with Timmy, your AI travel companion' : 'Trip Maker · AI 티미가 짠 여행 일정';
  const allText = `${title}${meta}${places.join('')}${brand}→·…0123456789`;
  const [bold, regular] = await Promise.all([font(allText, 700), font(allText, 500)]);
  const fonts = [bold && { name: 'NotoKR', data: bold, weight: 700 }, regular && { name: 'NotoKR', data: regular, weight: 500 }].filter(Boolean);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: C.ground, padding: '64px 72px', fontFamily: 'NotoKR' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src="https://tripmaker.tips/timmy-face.png" width={64} height={64} style={{ borderRadius: 32, border: `3px solid ${C.navy}`, background: C.tint }} />
          <span style={{ fontSize: 28, fontWeight: 500, color: C.muted }}>{brand}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={{ fontSize: title.length > 18 ? 64 : 80, fontWeight: 700, color: C.ink, lineHeight: 1.15 }}>{title}</span>
          <span style={{ fontSize: 34, fontWeight: 500, color: C.navy }}>{meta}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {places.map((p, i) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ display: 'flex', background: '#FFFFFF', border: `2px solid ${C.line}`, borderRadius: 40, padding: '12px 26px', fontSize: 28, fontWeight: 500, color: C.ink }}>{p}</span>
              {i < places.length - 1 && <span style={{ fontSize: 28, color: C.muted }}>→</span>}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined }
  );
}
