import { NextResponse } from 'next/server';

export function middleware(request) {
    const userAgent = request.headers.get('user-agent') || '';

    // 모바일 기기 키워드 체크
    const isMobile = /Mobile|Android|iPhone|iPad|Tablet/i.test(userAgent);

    // iPad나 Tablet도 PC 버전으로 보내고 싶다면 아래와 같이 수정
    // const isMobileOnly = /Mobile|Android|iPhone/i.test(userAgent) && !/iPad|Tablet/i.test(userAgent);

    const { pathname, search } = request.nextUrl;

    // PC/Tablet 유저가 메인 도메인(/)으로 접속 시 web.mytrip2.pro로 리다이렉트
    if (!isMobile && pathname === '/') {
        // 쿼리 스트링(search)도 함께 전달하여 데이터 유실 방지
        return NextResponse.redirect(`https://web.mytrip2.pro${search}`);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/'], // 메인 페이지에 대해서만 리다이렉트 체크
};
