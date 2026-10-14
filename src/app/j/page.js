import InviteAccept from '../../components/invite/InviteAccept';

// 미리보기에는 일정 내용을 싣지 않는다(초대 링크는 참여 전 최소 정보만)
export const metadata = {
  title: '여행 동행 초대',
  description: '함께 여행 가자는 초대가 왔어요. 링크를 열어 일정 이름과 날짜를 확인하고 참여하세요.',
  robots: { index: false },
  openGraph: { title: '여행에 함께 가요 · Trip Maker', description: '함께 여행 가자는 초대가 왔어요. 링크를 열어 확인하고 참여하세요.', images: [{ url: '/og-image.jpg', width: 1200, height: 630 }] },
};

// 동행 초대 링크(/j/?k=<일정>.<키> 또는 앱 안 초대 /j/?r=<요청>)
export default function InvitePage() {
  return <InviteAccept />;
}
