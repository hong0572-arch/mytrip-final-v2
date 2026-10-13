'use client';
import { useEffect, useState } from 'react';

// 홈 추천 도시들의 지금 날씨. 서버(/api/weather, Google Weather API)가 조회·캐시한 값을 받는다.
// 날씨가 없거나 실패해도 화면은 그대로 쓴다.
export default function useCityWeather(language = 'ko') {
  const [weather, setWeather] = useState({}); // { [cityId]: { temp, type, text } }

  useEffect(() => {
    let alive = true;
    fetch(`/api/weather/?lang=${language === 'en' ? 'en' : 'ko'}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => alive && data && typeof data === 'object' && setWeather(data))
      .catch(() => {});
    return () => { alive = false; };
  }, [language]);

  return weather;
}
