/* eslint-disable @next/next/no-img-element */

// 티미 얼굴 아바타(하늘색 원). 작은 크기에서도 얼굴이 보이도록 전신 그림(timmy.png) 대신 쓴다.
// 전신 그림은 스플래시처럼 크게 보여 줄 때만 쓴다. ring: 흰 테두리 + 남색 선(홈 첫 화면 등 크게 쓸 때)
export default function TimmyAvatar({ size = 32, ring = false, className = '' }) {
  const style = ring
    ? { width: size, height: size, border: '3px solid #fff', outline: '1.5px solid var(--color-tm-navy)' }
    : { width: size, height: size, outline: '1px solid var(--color-tm-line)' };
  return (
    <span aria-hidden="true" className={`inline-block shrink-0 overflow-hidden rounded-full bg-tm-sky-tint ${className}`} style={style}>
      <img src="/timmy-face.png" alt="" width={size} height={size} className="block h-full w-full object-cover" />
    </span>
  );
}
