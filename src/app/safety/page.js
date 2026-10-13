import SafetyScreen from '../../components/safety/SafetyScreen';

export const metadata = {
  title: '안심',
  description: '안심 귀가 타이머, 보호자 알림, SOS, 현지 긴급번호를 한곳에서.',
  robots: { index: false },
};

export default function SafetyPage() {
  return <SafetyScreen />;
}
