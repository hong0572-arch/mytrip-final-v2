import MapScreen from '../../components/map/MapScreen';

export const metadata = {
  title: '내 주변',
  description: '지금 있는 곳 주변의 맛집·카페·볼거리와 늦은 시간에도 들를 수 있는 안심 장소를 지도로 찾아보세요.',
  robots: { index: false },
};

export default function MapPage() {
  return <MapScreen />;
}
