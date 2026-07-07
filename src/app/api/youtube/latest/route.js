import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const fallbackVideos = [
    { id: 'y1', title: '왕복 5만원으로 다녀온 제주 동쪽 여행브이로그 ✈️', channel: '해도 HAEDO', yid: 'XiLRFEKfysE', url: 'https://www.youtube.com/watch?v=XiLRFEKfysE', date: '4일 전', viewCount: '조회수 1.5만회' },
    { id: 'y2', title: '보고도 믿기지 않는, 캐나다 밴쿠버의 일상 🇨🇦', channel: '희철리즘 Heechulism', yid: 'tmow4E_F3xo', url: 'https://www.youtube.com/watch?v=tmow4E_F3xo', date: '4일 전', viewCount: '조회수 1.2만회' },
    { id: 'y3', title: '1n년 친구랑 베트남 나트랑 그냥 먹고 놀기 🇻🇳', channel: '그 유미 말고', yid: '7PFcyPSpnMc', url: 'https://www.youtube.com/watch?v=7PFcyPSpnMc', date: '5일 전', viewCount: '조회수 8900회' },
    { id: 'y4', title: '죽기전에 꼭 리스본에 가봐야 하는이유 🇵🇹', channel: '여락이들', yid: 'o3bQPvDfQGU', url: 'https://www.youtube.com/watch?v=o3bQPvDfQGU', date: '6일 전', viewCount: '조회수 7800회' },
    { id: 'y5', title: '다낭 여행 브이로그 | 맥주로 시작해서 맥주로 끝나는 찐 알콜러들의 여행기 🍻', channel: '열매달', yid: '3SEj5jzX7BA', url: 'https://www.youtube.com/watch?v=3SEj5jzX7BA', date: '2일 전', viewCount: '조회수 6100회' },
    { id: 'y6', title: '[삿포로 Vlog] 비에이 투어 핵심 코스 완벽 정복! ❄️', channel: '민경 Minkyung', yid: 'EjJneqNikLE', url: 'https://www.youtube.com/watch?v=EjJneqNikLE', date: '6일 전', viewCount: '조회수 4200회' },
    { id: 'y7', title: '10년지기 친구랑 오사카 여행 브이로그 🎢', channel: '소소한 여행기', yid: 'BMp2Eqr2Pvw', url: 'https://www.youtube.com/watch?v=BMp2Eqr2Pvw', date: '5일 전', viewCount: '조회수 3800회' },
    { id: 'y8', title: '싱가폴 마리나베이샌즈 호텔로 아기와여행하기! 🏨', channel: '싱가포르 아기여행', yid: 'tshv3hhHkRg', url: 'https://www.youtube.com/watch?v=tshv3hhHkRg', date: '3일 전', viewCount: '조회수 2900회' },
    { id: 'y9', title: '여름 제주 동쪽 여행 브이로그 | 맛집, 카페, 소품샵 🌊', channel: '제주 여행기', yid: 'Zuh810k6nsI', url: 'https://www.youtube.com/watch?v=Zuh810k6nsI', date: '5일 전', viewCount: '조회수 2400회' },
    { id: 'y10', title: '스위스에서 가장 예쁜 동네 : 뮤렌 🏔️', channel: '스위스에서 가장 예쁜 동네 : 뮤렌', yid: 'pTqmzCvzUOc', url: 'https://www.youtube.com/watch?v=pTqmzCvzUOc', date: '4일 전', viewCount: '조회수 1800회' }
];

// 인메모리 캐시 변수 (Next.js Data Cache 2MB 초과 에러 방지용)
let cachedVideos = null;
let cacheTime = 0;

export async function GET() {
    const url = 'https://www.youtube.com/results?search_query=%EC%97%AC%ED%96%89&sp=CAI%3D';
    const now = Date.now();

    // 5분(300,000ms) 동안은 유튜브 스크래핑 부하를 막기 위해 인메모리 캐시 반환
    if (cachedVideos && (now - cacheTime < 300000)) {
        return NextResponse.json({ success: true, data: cachedVideos });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            cache: 'no-store' // ✨ 중요: Next.js의 2MB 캐시 크기 제한 에러 예방을 위해 fetch 캐싱 비활성화
        });
        const html = await response.text();
        const match = html.match(/var ytInitialData\s*=\s*({.+?});/);
        
        if (!match) {
            return NextResponse.json({ success: false, data: fallbackVideos });
        }
        
        const data = JSON.parse(match[1]);
        const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
        if (!contents || contents.length === 0) {
            return NextResponse.json({ success: false, data: fallbackVideos });
        }
        
        const items = contents[0]?.itemSectionRenderer?.contents;
        if (!items || items.length === 0) {
            return NextResponse.json({ success: false, data: fallbackVideos });
        }
        
        const videos = [];
        for (const item of items) {
            if (item.videoRenderer) {
                const vr = item.videoRenderer;
                const videoId = vr.videoId;
                const title = vr.title?.runs?.[0]?.text || "제목 없음";
                const channel = vr.ownerText?.runs?.[0]?.text || "채널 없음";
                const date = vr.publishedTimeText?.simpleText || "최근";
                const viewCount = vr.viewCountText?.simpleText || "조회수 없음";
                
                // 1달 이상 경과한 비디오 필터링
                if (date.includes("년 전") || date.includes("개월 전")) {
                    continue;
                }
                
                videos.push({
                    id: videoId,
                    title,
                    channel,
                    yid: videoId,
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    date,
                    viewCount
                });
            }
        }
        
        if (videos.length === 0) {
            return NextResponse.json({ success: false, data: fallbackVideos });
        }
        
        const finalVideos = videos.slice(0, 10);
        
        // 인메모리 캐싱 데이터 업데이트
        cachedVideos = finalVideos;
        cacheTime = now;

        return NextResponse.json({ success: true, data: finalVideos });
    } catch (err) {
        console.error("YouTube scrape error:", err);
        return NextResponse.json({ success: false, data: fallbackVideos });
    }
}
