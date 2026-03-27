import NextAuth from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";

const handler = NextAuth({
    providers: [
        KakaoProvider({
            clientId: process.env.KAKAO_CLIENT_ID,
            clientSecret: process.env.KAKAO_CLIENT_SECRET,
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    // 로그인 성공 후 세션에 사용자 ID 등을 담고 싶을 때 설정
    callbacks: {
        async session({ session, token }) {
            session.user.id = token.sub;
            return session;
        },
    },
    pages: {
        signIn: '/login', // 커스텀 로그인 페이지를 쓸 경우
    }
});

export { handler as GET, handler as POST };