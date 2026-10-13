'use client';
import { MapPinOff } from 'lucide-react';
import { getMapCopy } from '../../content/mapCopy';

// 지도를 못 불러왔을 때(네트워크·키·결제 문제) 지도 자리에 보여 준다.
export default function MapFallback({ language = 'ko', onRetry, googleMapsUrl, className = '', style }) {
  const copy = getMapCopy(language);
  return (
    <div role="alert" style={style} className={`z-[5] flex flex-col items-center justify-center gap-3 bg-[#EEF1EC] px-8 text-center ${className}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-tm-muted shadow-[0_2px_8px_rgba(21,48,79,.1)]">
        <MapPinOff size={22} strokeWidth={1.8} />
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-bold text-tm-ink">{copy.fallbackTitle}</span>
        <span className="text-[13px] leading-normal text-tm-muted">{copy.fallbackBody}</span>
      </div>
      <div className="flex gap-2">
        {onRetry && (
          <button type="button" onClick={onRetry} className="h-11 rounded-xl bg-tm-navy px-4 text-[14px] font-bold text-white">{copy.retry}</button>
        )}
        {googleMapsUrl && (
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center rounded-xl border border-tm-line bg-white px-4 text-[14px] font-semibold text-tm-ink">
            {copy.openGoogleMaps}
          </a>
        )}
      </div>
    </div>
  );
}
