"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Coins, Download, MessageCircle, Shield, CalendarCheck } from "lucide-react";
import useAppLanguage from '../../hooks/useAppLanguage';

// 사용 가이드. AI 홈(/)과 같은 디자인·흐름(말로 시작 → 일정 저장 → 여행 중 사용 → 안심 기능)으로 안내한다.
const COPY = {
    ko: {
        title: '사용 가이드',
        back: '뒤로',
        heading: ['티미와 함께', '이렇게 떠나요'],
        intro: '혼자 떠나도 든든하게. 계획부터 여행 중 안심 기능까지, 다섯 가지만 알면 충분해요.',
        steps: [
            { Icon: MessageCircle, title: '말로 시작하기', body: '홈 입력창에 쓰거나 마이크를 눌러 말해 보세요. "11월 혼자 교토 3박, 밤에 도착해요"처럼 편하게요. 티미가 일정, 숙소 동네, 공항에서 숙소까지 가는 방법을 함께 정리해요.' },
            { Icon: CalendarCheck, title: '일정표로 저장하기', body: '"일정표 만들기"로 저장하면 홈이 여행에 맞게 바뀌어요. 출발 전엔 D-day와 안심 준비 체크리스트, 여행 중엔 오늘의 다음 장소와 길찾기가 바로 보여요.' },
            { Icon: Shield, title: '안심 기능 켜 두기', body: '아래 메뉴의 "안심"에서 비상 연락처를 등록하세요. 밤에 이동할 땐 안심 귀가 타이머를 켜 두면, 시간 안에 도착을 확인하지 않을 때 보호자에게 알림이 가요. 현재 위치도 보호자에게 바로 보낼 수 있어요.' },
            { Icon: Coins, title: '포인트 모으기', body: '여행지 상식 퀴즈와 출석 체크로 포인트를 모을 수 있어요. 마이페이지에서 초대 링크를 공유하면 친구와 나 모두 1,000P를 받아요.' },
            { Icon: Download, title: '앱처럼 설치하기', body: '브라우저 메뉴에서 "홈 화면에 추가" 또는 "앱 설치"를 누르면 바탕화면에서 바로 열 수 있어요.' },
        ],
        cta: '티미에게 말해 보기',
    },
    en: {
        title: 'How it works',
        back: 'Back',
        heading: ['Travel with Timmy,', 'step by step'],
        intro: 'Travel solo, travel sure. Five things are all you need, from planning to staying safe on the road.',
        steps: [
            { Icon: MessageCircle, title: 'Start by talking', body: 'Type on the home screen or tap the mic and just say it, like "Kyoto solo for 3 nights in November, landing at night". Timmy helps with the plan, where to stay and how to get from the airport.' },
            { Icon: CalendarCheck, title: 'Save it as an itinerary', body: 'Once you save an itinerary, the home screen follows your trip: a countdown and safety checklist before you leave, and your next stop with directions while you travel.' },
            { Icon: Shield, title: 'Turn on safety features', body: 'Add an emergency contact under "Safety" in the bottom menu. When you head back at night, start the safe-return timer: if you don’t confirm you arrived in time, your guardian is alerted. You can also send your location to them.' },
            { Icon: Coins, title: 'Earn points', body: 'Collect points with travel trivia and daily check-ins. Share your invite link from My Page and you and your friend both get 1,000P.' },
            { Icon: Download, title: 'Install it like an app', body: 'Choose "Add to Home Screen" or "Install app" in your browser menu to open Trip Maker straight from your phone.' },
        ],
        cta: 'Talk to Timmy',
    },
};

export default function GuidePage() {
    const router = useRouter();
    const [language] = useAppLanguage();
    const copy = COPY[language] || COPY.ko;

    return (
        <div className="min-h-dvh bg-tm-ground font-sans text-tm-ink">
            <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
                <header className="sticky top-0 z-10 flex items-center gap-1 bg-tm-ground/95 py-2 pl-1.5 pr-3 backdrop-blur">
                    <button type="button" onClick={() => router.back()} aria-label={copy.back} className="flex h-11 w-11 items-center justify-center text-tm-ink">
                        <ChevronLeft size={24} strokeWidth={2} />
                    </button>
                    <span className="text-[17px] font-bold">{copy.title}</span>
                </header>

                <main className="flex flex-1 flex-col gap-6 px-5 pb-8 pt-2">
                    <section className="flex flex-col gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/timmy.png" alt="" width={64} height={72} className="tm-float h-[72px] w-16 object-contain" />
                        <h1 className="tm-rise text-[28px] font-bold leading-[1.3] tracking-[-0.02em]">
                            {copy.heading[0]}<br />{copy.heading[1]}
                        </h1>
                        <p className="tm-rise text-[15px] leading-[1.55] text-tm-muted" style={{ animationDelay: '80ms' }}>{copy.intro}</p>
                    </section>

                    <ol className="flex flex-col gap-3">
                        {copy.steps.map(({ Icon, title, body }, i) => (
                            <li key={title} className="tm-rise flex gap-3.5 rounded-2xl bg-white p-4" style={{ animationDelay: `${160 + i * 70}ms` }}>
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tm-sky-tint text-tm-navy">
                                    <Icon size={20} strokeWidth={1.9} />
                                </span>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[12px] font-bold tabular-nums text-tm-navy">STEP {i + 1}</span>
                                    <h2 className="text-[16px] font-bold">{title}</h2>
                                    <p className="text-[14px] leading-[1.6] text-tm-muted">{body}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </main>

                <div className="sticky bottom-0 border-t border-tm-line bg-tm-ground px-5 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
                    <Link href="/" className="flex h-[52px] items-center justify-center rounded-[14px] bg-tm-navy text-[16px] font-bold text-white">
                        {copy.cta}
                    </Link>
                </div>
            </div>
        </div>
    );
}
