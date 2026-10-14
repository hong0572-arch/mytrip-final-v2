import ClientPage from './ClientPage';
import { getShareSummary } from '../../../lib/shareMeta';

// 정적 내보내기(앱 빌드)용 자리표시 경로. 웹에서는 다른 id도 요청 때 렌더링된다.
export function generateStaticParams() {
    return [{ id: 'dummy' }];
}

// 카카오톡·메신저 미리보기: 일정 이름·도시·일수(꺼졌거나 지난 링크는 일반 문구). 개인 일정이라 검색엔진에는 올리지 않는다.
export async function generateMetadata({ params }) {
    const { id } = await params;
    const s = await getShareSummary(id);
    const title = s ? `${s.title || s.destination} · Trip Maker` : '여행 일정 공유 · Trip Maker';
    const description = s
        ? [s.destination, s.days ? `${s.days}일` : '', s.placeCount ? `장소 ${s.placeCount}곳` : '', 'AI 티미가 짠 여행 일정'].filter(Boolean).join(' · ')
        : '친구가 공유한 여행 일정을 확인해 보세요.';
    return {
        title: { absolute: title },
        description,
        robots: { index: false, follow: false },
        openGraph: { title, description, type: 'article', url: `https://tripmaker.tips/share/${id}/` },
        twitter: { card: 'summary_large_image', title, description },
    };
}

export default function Page({ params }) {
    return <ClientPage params={params} />;
}
