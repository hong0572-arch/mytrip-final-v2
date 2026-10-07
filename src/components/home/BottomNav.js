'use client';
import { useRouter } from 'next/navigation';
import { CalendarDays, MapPin, Shield, Sparkles, UserRound } from 'lucide-react';
import { goToLogin, openTimmyPanel } from './homeActions';

// 앱 공통 아래 메뉴: 홈 / 내 일정 / 지도 / 안심 / 마이
// active: 'home' | 'trips' | 'map' | 'my' | null (현재 화면이 메뉴에 없으면 null)
export default function BottomNav({ copy, user, active = 'home', onSelect }) {
  const router = useRouter();

  const go = (key, action) => () => {
    if (onSelect?.(key)) return; // 화면 안에서 처리했으면(예: /plan의 지도 탭) 이동하지 않는다
    action();
  };

  const items = [
    { key: 'home', label: copy.nav.home, Icon: Sparkles, action: () => (active === 'home' ? window.scrollTo({ top: 0, behavior: 'smooth' }) : router.push('/')) },
    { key: 'trips', label: copy.nav.trips, Icon: CalendarDays, action: () => (user ? router.push('/mypage?tab=schedule') : goToLogin(router)) },
    { key: 'map', label: copy.nav.map, Icon: MapPin, action: () => router.push('/plan?tab=around_me') },
    { key: 'safety', label: copy.nav.safety, Icon: Shield, action: () => (user ? openTimmyPanel('safe') : goToLogin(router)) },
    { key: 'my', label: copy.nav.my, Icon: UserRound, action: () => (user ? router.push('/mypage') : goToLogin(router)) },
  ];

  return (
    <nav aria-label="Main" className="grid grid-cols-5 border-t border-tm-line bg-white px-1 pb-[calc(10px+env(safe-area-inset-bottom))] pt-1.5">
      {items.map(({ key, label, Icon, action }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            onClick={go(key, action)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-[3px] ${isActive ? 'text-tm-navy' : 'text-tm-muted'}`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
            <span className={`text-[11px] ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
