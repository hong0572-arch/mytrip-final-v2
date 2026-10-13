'use client';
import { useEffect, useState } from 'react';

// 지금 한국에 있는지: 기기 시간대가 서울이거나, 접속 국가(/api/geo)가 KR.
// 위치 권한을 묻지 않는다. 결과는 이 탭에서만 기억한다. 서버 렌더·첫 화면은 false.
const KEY = 'tm_in_korea';

export default function useInKorea() {
  const [inKorea, setInKorea] = useState(false);

  useEffect(() => {
    let alive = true;
    const done = (v) => {
      if (!alive) return;
      setInKorea(v);
      try { sessionStorage.setItem(KEY, v ? '1' : '0'); } catch {}
    };
    let cached = null;
    try { cached = sessionStorage.getItem(KEY); } catch {}
    const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ''; } })();
    if (cached !== null) Promise.resolve().then(() => done(cached === '1'));
    else if (tz === 'Asia/Seoul') Promise.resolve().then(() => done(true));
    else {
      fetch('/api/geo/').then((r) => r.json()).then((j) => done(j?.country === 'KR')).catch(() => done(false));
    }
    return () => { alive = false; };
  }, []);

  return inKorea;
}
