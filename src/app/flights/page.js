import FlightSearch from '../../components/flights/FlightSearch';

export const metadata = {
  title: '항공권 찾기',
  description: '출발지·도착지·날짜를 고르면 날짜별 최저가와 항공권을 앱 안에서 바로 비교해요.',
  alternates: { canonical: 'https://tripmaker.tips/flights/' },
};

export default function FlightsPage() {
  return <FlightSearch />;
}
