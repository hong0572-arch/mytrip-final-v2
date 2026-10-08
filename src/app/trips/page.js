import MyTrips from '../../components/trips/MyTrips';

export const metadata = {
  title: '내 일정',
  description: '저장한 여행 일정을 한곳에서 확인하고, 여행 중에는 오늘 일정과 안전모드를 바로 여세요.',
  robots: { index: false },
};

export default function TripsPage() {
  return <MyTrips />;
}
