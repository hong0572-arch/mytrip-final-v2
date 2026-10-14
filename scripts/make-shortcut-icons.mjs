// TWA 앱 아이콘 길게 누르기 바로가기 아이콘(192px PNG) 만들기. 사용: node scripts/make-shortcut-icons.mjs
// 결과: twa-build/app/src/main/res/drawable/shortcut_{trips,chat,safety}.png
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = 'twa-build/app/src/main/res/drawable';
mkdirSync(OUT, { recursive: true });

// lucide 아이콘 경로(24×24) — 내 일정(calendar) · 티미(message) · 안심(shield). 안심은 teal(안전 색), 나머지는 navy
const ICONS = {
  trips: { bg: '#1B3D6B', path: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
  chat: { bg: '#1B3D6B', path: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>' },
  safety: { bg: '#0E7357', path: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>' },
};

for (const [name, { bg, path }] of Object.entries(ICONS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <circle cx="96" cy="96" r="96" fill="${bg}"/>
  <g transform="translate(48 48) scale(4)" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</g>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/shortcut_${name}.png`);
  console.log('wrote', `${OUT}/shortcut_${name}.png`);
}
