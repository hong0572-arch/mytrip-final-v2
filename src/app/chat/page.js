import ChatScreen from '../../components/home/ChatScreen';

export const metadata = {
  title: '티미와 대화하기',
  description: 'AI 여행 동반자 티미에게 일정, 숙소 동네, 이동 방법을 물어보세요.',
  robots: { index: false },
};

export default function ChatPage() {
  return <ChatScreen />;
}
