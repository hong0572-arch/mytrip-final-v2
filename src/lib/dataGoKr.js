// 공공데이터포털(data.go.kr) 일반 인증키. 한 키로 승인받은 API(기상청 단기예보·관광공사 TourAPI·관광사진·오디 오디오가이드)를 모두 쓴다.
// 서버 전용. DATA_GO_KR_KEY가 기본이고, 예전 이름 KMA_SERVICE_KEY도 받는다.
export function dataGoKrKey() {
  return (process.env.DATA_GO_KR_KEY || process.env.KMA_SERVICE_KEY || '').trim();
}

// 포털에서 받은 Decoding 키는 인코딩하고, 이미 인코딩된(Encoding) 키는 그대로 쓴다.
export function encodedServiceKey(key = dataGoKrKey()) {
  return key.includes('%') ? key : encodeURIComponent(key);
}

// 응답의 items.item 은 한 건이면 객체, 여러 건이면 배열로 온다.
export function itemsOf(json) {
  const item = json?.response?.body?.items?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}
