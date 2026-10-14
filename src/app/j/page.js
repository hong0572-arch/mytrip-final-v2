import InviteAccept from '../../components/invite/InviteAccept';

export const metadata = {
  title: '여행 동행 초대',
  robots: { index: false },
};

// 동행 초대 링크(/j/?k=<일정>.<키> 또는 앱 안 초대 /j/?r=<요청>)
export default function InvitePage() {
  return <InviteAccept />;
}
