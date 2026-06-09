import { NextResponse } from 'next/server';

export function middleware(request) {
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /Mobile|Android|iPhone|iPad|Tablet/i.test(userAgent);
    const { pathname, search, hostname } = request.nextUrl;

    // ✨ [핵심] hostname이 'localhost'인 로컬 개발 환경에서는 리다이렉트를 무시합니다!
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // PC/Tablet 유저가 메인 도메인(/)으로 접속 시 web.tripmaker.tips로 리다이렉트
    // (단, 로컬 개발 환경이 아닐 때만 작동하도록 조건 추가)
    if (!isLocalhost && !isMobile && pathname === '/') {
        return NextResponse.redirect(`https://web.tripmaker.tips${search}`);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/'], // 메인 페이지에 대해서만 리다이렉트 체크
};