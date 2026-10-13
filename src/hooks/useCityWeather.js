'use client';
import { useEffect, useState } from 'react';

// 도시들의 지금 날씨(Open-Meteo, 키 없음·사용자 정보 보내지 않음). 30분 동안 sessionStorage에 둔다.
const CACHE_KEY = 'tm_city_weather';
const TTL_MS = 30 * 60 * 1000;

export default function useCityWeather(cities) {
  const [weather, setWeather] = useState({}); // { [id]: { temp, code } }
  const key = cities.map((c) => c.id).join(',');

  useEffect(() => {
    let alive = true;
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (cached && cached.key === key && Date.now() - cached.at < TTL_MS) {
        Promise.resolve().then(() => alive && setWeather(cached.data));
        return () => { alive = false; };
      }
    } catch {}
    const lat = cities.map((c) => c.lat).join(',');
    const lng = cities.map((c) => c.lng).join(',');
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&timezone=auto`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => {
        const list = Array.isArray(json) ? json : [json];
        const data = {};
        list.forEach((row, i) => {
          const cur = row?.current;
          if (cities[i] && cur) data[cities[i].id] = { temp: Math.round(cur.temperature_2m), code: cur.weather_code };
        });
        if (!alive) return;
        setWeather(data);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ key, at: Date.now(), data })); } catch {}
      })
      .catch(() => {}); // 날씨가 없어도 화면은 그대로 쓴다
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return weather;
}
