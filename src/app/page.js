import AIHome from '../components/home/AIHome';

// AI 홈. 문구·카드는 클라이언트에서 여행 상태에 맞게 바뀌지만,
// 첫 HTML(검색엔진·느린 네트워크)은 '일정 없음' 화면이 그대로 렌더링된다.
export const metadata = {
  title: { absolute: 'Trip Maker - 혼자 떠나도 든든한 AI 여행 동반자' },
  description: '말로 하면 AI 티미가 여행 일정부터 안전한 숙소 동네, 밤 이동, 안심 귀가까지 챙겨 주는 자유여행 앱. 혼자 떠나는 여행자를 위한 Trip Maker.',
  alternates: { canonical: 'https://tripmaker.tips' },
};

export default function Home() {
  return <AIHome />;
}
