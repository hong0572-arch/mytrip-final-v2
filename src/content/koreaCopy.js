// 한국 여행 모드(영어 화면 + 한국에서 접속) 문구. 한/영을 함께 둔다(한국어 화면에서는 보통 쓰지 않는다).
export const koreaCopy = {
  en: {
    heroAsk: ['Exploring Korea?', "Let's plan it together."],
    citiesTitle: 'Where to in Korea',
    cityGuides: 'Korea city guides for solo travelers →',
    essentialsTitle: 'Korea essentials',
    essentials: [
      { icon: '🚇', title: 'T-money & subway', body: 'One card for subway, bus and convenience stores', prompt: 'How do I get and use a T-money card in Korea? Explain subway and bus tips for a first-time visitor.' },
      { icon: '🗺️', title: 'Naver Map · KakaoMap', body: "Google Maps can't do walking directions here", prompt: 'Which map apps should I use in Korea instead of Google Maps, and how do I set them up in English?' },
      { icon: '🚕', title: 'Taxis at night', body: 'Kakao T, plate check, sit in the back', prompt: 'How do I take a taxi safely in Korea at night as a woman traveling alone? Include Kakao T tips.' },
      { icon: '🛂', title: 'Before you fly', body: 'Entry permit, SIM or eSIM, cash or card', prompt: 'What do I need to prepare before flying to Korea: entry permit (K-ETA), SIM or eSIM, money and apps?' },
      { icon: '📞', title: '1330 & 112', body: '24h English tourist hotline · police', prompt: 'What emergency and help numbers should I know in Korea as a tourist?' },
    ],
    askedTitle: 'What solo travelers ask about Korea',
    asked: [
      { icon: '🌙', q: 'Is Seoul safe at night for women alone?', where: 'Seoul', prompt: 'Is Seoul safe at night for a woman traveling alone? Which areas are best to stay in and what should I watch out for?' },
      { icon: '✈️', q: 'Late arrival at Incheon — getting to the city', where: 'Incheon → Seoul', prompt: "I'm landing at Incheon Airport late at night. How do I get to Myeongdong or Hongdae safely?" },
      { icon: '🏨', q: 'Best neighborhoods to stay solo', where: 'Seoul · Busan', prompt: 'Recommend safe, convenient neighborhoods to stay in Seoul and Busan for a solo female traveler.', plan: false },
    ],
    hotline: '1330 Korea Travel Hotline (24h, English)',
  },
  ko: {
    heroAsk: ['한국 여행 중이세요?', '같이 계획해 볼까요?'],
    citiesTitle: '한국 어디로 갈까요',
    cityGuides: '한국 도시별 혼자 여행 가이드 →',
    essentialsTitle: '한국 여행 필수 정보',
    essentials: [
      { icon: '🚇', title: '티머니·지하철', body: '카드 한 장으로 지하철·버스·편의점', prompt: '한국에서 티머니 카드 사고 쓰는 법, 지하철·버스 팁 알려줘.' },
      { icon: '🗺️', title: '네이버지도·카카오맵', body: '구글 지도는 길찾기가 잘 안 돼요', prompt: '한국에서 구글 지도 대신 쓸 지도 앱과 쓰는 법 알려줘.' },
      { icon: '🚕', title: '밤 택시', body: '카카오T · 번호판 확인 · 뒷좌석', prompt: '밤에 혼자 택시 안전하게 타는 법 알려줘. 카카오T 팁 포함.' },
      { icon: '🛂', title: '출발 전 준비', body: '입국 허가 · 유심/eSIM · 결제', prompt: '한국 여행 오기 전 준비할 것(K-ETA, 유심, 결제 수단, 앱) 알려줘.' },
      { icon: '📞', title: '1330 · 112', body: '24시간 관광 안내 · 경찰', prompt: '한국 여행 중 알아 둘 긴급·안내 전화번호 알려줘.' },
    ],
    askedTitle: '한국 여행에서 많이 묻는 것',
    asked: [
      { icon: '🌙', q: '서울, 밤에 혼자 다녀도 괜찮을까?', where: '서울', prompt: '서울을 밤에 혼자 다녀도 괜찮은지, 묵기 좋은 동네와 조심할 점 알려줘.' },
      { icon: '✈️', q: '인천공항 밤 도착, 시내까지', where: '인천 → 서울', prompt: '인천공항에 밤늦게 도착해요. 명동이나 홍대까지 안전하게 가는 방법 알려줘.' },
      { icon: '🏨', q: '혼자 묵기 좋은 동네', where: '서울 · 부산', prompt: '서울과 부산에서 혼자 묵기 좋은 안전한 동네 추천해줘.' },
    ],
    hotline: '1330 관광안내전화 (24시간, 외국어)',
  },
};

export const getKoreaCopy = (language) => koreaCopy[language] || koreaCopy.en;
