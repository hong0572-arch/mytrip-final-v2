import ClientPage from './ClientPage';

// ✨ 빈 배열 대신 가짜(dummy) 데이터를 쥐어줘서 Next.js를 속입니다!
export function generateStaticParams() {
    return [{ id: 'dummy' }];
}

export default function Page({ params }) {
    return <ClientPage params={params} />;
}