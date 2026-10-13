// 홈 '혼자 가기 좋은 도시' 카드와 '티미의 오늘 한마디'에 쓰는 도시 목록. 한/영을 항상 함께 고친다.
// image가 있는 도시만 카드로 보여 준다. 좌표는 실시간 날씨(Open-Meteo) 조회용.
export const HOME_CITIES = [
  {
    id: 'jeju', lat: 33.4996, lng: 126.5312, image: '/home/jeju.webp',
    ko: { name: '제주', note: '버스로 충분 · 밤 이동 적음', flight: '1h10m', tip: '바다 쪽 숙소에서 버스로 다니기 좋아요.', prompt: '혼자 제주 2박 3일, 버스로 다니는 일정 짜줘.' },
    en: { name: 'Jeju', note: 'Easy by bus · little night travel', flight: '1h10m', tip: 'Stay by the sea and get around by bus.', prompt: 'Plan a 3-day solo trip to Jeju by bus.' },
  },
  {
    id: 'paris', lat: 48.8566, lng: 2.3522, image: '/home/paris.webp',
    ko: { name: '파리', note: '역 가까운 숙소 · 지하철 촘촘', flight: '14h', tip: '밤에는 센강 남쪽 동네가 걷기 편해요.', prompt: '혼자 파리 5박, 밤에도 안전한 동네에 묵는 일정 짜줘.' },
    en: { name: 'Paris', note: 'Stay near a station · dense metro', flight: '14h', tip: 'South of the Seine is easier to walk at night.', prompt: 'Plan 6 days solo in Paris, staying in a neighborhood that feels safe at night.' },
  },
  {
    id: 'ronda', lat: 36.7423, lng: -5.1671, image: '/home/ronda.webp',
    ko: { name: '스페인 론다', note: '말라가에서 기차 2시간 · 작은 절벽 마을', flight: '경유', tip: '말라가에서 당일치기보다 1박이 여유로워요.', prompt: '혼자 스페인 남부 여행, 말라가와 론다 포함해서 일정 짜줘.' },
    en: { name: 'Ronda, Spain', note: '2h by train from Málaga · cliff town', flight: '1 stop', tip: 'Stay a night rather than a day trip from Málaga.', prompt: 'Plan a solo southern Spain trip including Málaga and Ronda.' },
  },
  {
    id: 'banff', lat: 51.1784, lng: -115.5708, image: '/home/banff.webp',
    ko: { name: '캐나다 밴프', note: '셔틀로 호수까지 · 자연 속 산책', flight: '경유', tip: '호수 셔틀은 미리 예약해 두면 혼자서도 편해요.', prompt: '혼자 캐나다 밴프 4박, 차 없이 셔틀로 다니는 일정 짜줘.' },
    en: { name: 'Banff, Canada', note: 'Lake shuttles · easy nature walks', flight: '1 stop', tip: 'Book the lake shuttles ahead — easy without a car.', prompt: 'Plan 5 days solo in Banff without a car, using shuttles.' },
  },
  {
    id: 'osaka', lat: 34.6937, lng: 135.5023,
    ko: { name: '오사카', tip: '난바 근처 숙소면 밤늦게도 걸어서 돌아오기 쉬워요.', prompt: '혼자 오사카 2박 3일, 맛집 위주로 일정 짜줘.' },
    en: { name: 'Osaka', tip: 'Stay near Namba to walk back easily at night.', prompt: 'Plan 3 days solo in Osaka, focused on food.' },
  },
  {
    id: 'taipei', lat: 25.033, lng: 121.5654,
    ko: { name: '타이베이', tip: '야시장도 혼자 다니기 편하고 MRT가 늦게까지 다녀요.', prompt: '혼자 타이베이 3박 4일, 야시장 포함해서 일정 짜줘.' },
    en: { name: 'Taipei', tip: 'Night markets are solo-friendly and the MRT runs late.', prompt: 'Plan 4 days solo in Taipei including night markets.' },
  },
];

// Google Weather API의 weatherCondition(type·현지어 설명) → 이모지·짧은 설명
export function weatherLabel(entry) {
  const type = String(entry?.type || '');
  const icon = /THUNDER/.test(type) ? '⛈️'
    : /SNOW|HAIL|SLEET/.test(type) ? '🌨️'
      : /RAIN|SHOWER|DRIZZLE/.test(type) ? '🌧️'
        : /FOG|HAZE|MIST/.test(type) ? '🌫️'
          : /WIND/.test(type) ? '💨'
            : type === 'CLEAR' ? '☀️'
              : /MOSTLY_CLEAR|PARTLY/.test(type) ? '🌤️'
                : /CLOUD/.test(type) ? '☁️' : '🌡️';
  return { icon, text: entry?.text || '' };
}
