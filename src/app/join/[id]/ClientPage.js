'use client';
import useAppLanguage from '../../../hooks/useAppLanguage';
import { InviteClosed } from '../../../components/invite/InviteAccept';

// 예전 초대 링크(/join/<일정 id>)는 id만 알면 누구나 들어올 수 있어 닫았다. 새 초대는 /j/?k=… (1회성·기간 제한).
export default function LegacyJoinPage() {
  const [language] = useAppLanguage();
  return <InviteClosed language={language} legacy />;
}
