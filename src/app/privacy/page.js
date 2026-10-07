import Link from 'next/link';

// 개인정보처리방침(개인정보 보호법 제30조, 위치정보법 관련 고지 포함).
// 내용은 2026-10 기준 실제 코드가 수집·저장·전송하는 항목을 근거로 작성했다. 기능을 추가·변경하면 이 문서도 함께 고친다.
// 운영자·책임자는 부서명으로 표기했다(개인정보 보호법상 허용). 사업자 정보가 정해지면 갱신한다.
export const metadata = {
    title: '개인정보처리방침',
    description: 'Trip Maker가 처리하는 개인정보의 항목, 목적, 보유 기간, 위탁·국외 이전, 위치정보 처리, 이용자 권리를 안내합니다.',
    alternates: { canonical: 'https://tripmaker.tips/privacy' },
};

const EFFECTIVE_DATE = '2026년 10월 7일';
const OPERATOR = 'Trip Maker 운영팀';
const PRIVACY_OFFICER = 'Trip Maker 개인정보 보호 담당';
const CONTACT_EMAIL = 'contact@tripmaker.tips';

const SECTIONS = [
    { id: 'items', title: '1. 처리하는 개인정보 항목과 목적' },
    { id: 'location', title: '2. 위치정보의 처리' },
    { id: 'retention', title: '3. 보유 및 이용 기간' },
    { id: 'share', title: '4. 다른 사람에게 보이거나 전달되는 정보' },
    { id: 'outsourcing', title: '5. 처리 위탁 및 국외 이전' },
    { id: 'destroy', title: '6. 파기 절차와 방법' },
    { id: 'rights', title: '7. 이용자의 권리와 행사 방법' },
    { id: 'auto', title: '8. 자동 수집 장치(쿠키 등)' },
    { id: 'security', title: '9. 안전성 확보 조치' },
    { id: 'children', title: '10. 만 14세 미만 아동' },
    { id: 'officer', title: '11. 개인정보 보호책임자와 문의처' },
    { id: 'changes', title: '12. 방침의 변경' },
];

// 기능별 처리 항목·목적. 필수/선택은 해당 기능을 쓸 때 기준이다.
const ITEMS = [
    { feature: '회원가입·로그인 (Google, 카카오)', items: '이메일, 이름(닉네임), 프로필 사진, 로그인 서비스 식별값', purpose: '회원 식별, 로그인 유지, 부정 이용 방지', basis: '필수' },
    { feature: '프로필', items: '닉네임, 소개글, 여행 취향 태그, 프로필 사진', purpose: '동행 추천과 프로필 표시', basis: '선택' },
    { feature: 'AI 일정 만들기·여행 일정', items: '여행지, 날짜, 동행 유형, 예산, 요청 사항, 생성된 일정, 일정 참여자', purpose: '일정 생성·저장·공유, 홈 화면의 출발 전·여행 중 안내', basis: '기능 이용 시 필수' },
    { feature: 'AI 대화(티미)', items: '대화 내용, 대화에 첨부한 사진, 대화에서 파악한 여행 취향(“기억”), 대화 시점의 현재 여행 정보', purpose: '질문 답변, 맞춤 추천, 대화 기록 보관', basis: '선택' },
    { feature: '음성 입력', items: '음성(브라우저·기기의 음성 인식 기능으로 글자로 바뀐 뒤 전송)', purpose: '말로 질문하기', basis: '선택' },
    { feature: '안전모드·안심 귀가', items: '보호자 이름·연락처(또는 보호자 회원 정보), 귀가 예정 시간, 보호 중 현재 위치', purpose: '귀가 확인, 경보 발생 시 보호자 알림, 보호자에게 위치 전달', basis: '선택' },
    { feature: '내 주변·지도', items: '현재 위치(위도·경도)', purpose: '주변 맛집·숙소·행사 안내', basis: '선택' },
    { feature: '여행 일기', items: '일기 내용과 사진, AI가 만든 일기 요약', purpose: '여행 기록 보관', basis: '선택' },
    { feature: '동행 찾기·여행자 피드', items: '동행 요청·응답 내역, 피드 글·사진, 좋아요·댓글', purpose: '동행 연결, 커뮤니티 기능', basis: '선택' },
    { feature: '트립머니·포인트', items: '경비 기록, 모임 잔액, 포인트 적립 내역, 퀴즈·출석 기록', purpose: '여행 경비 관리, 포인트 지급', basis: '선택' },
    { feature: '항공권 가격 알림', items: '추적 노선·날짜, 알림 받을 이메일', purpose: '가격 변동 알림 발송', basis: '선택' },
    { feature: '상품 문의·견적 요청', items: '문의 내용, 여행지·기간·인원·예산, 연락처', purpose: '문의 답변, 견적 안내', basis: '선택' },
    { feature: '푸시 알림', items: '기기 알림 토큰', purpose: 'D-day·가격·안전 알림 발송', basis: '선택' },
    { feature: '서비스 이용 과정에서 자동 생성', items: '접속 기록, 기기·브라우저 정보, 이용 통계, 오류 기록', purpose: '서비스 안정화, 이용 분석', basis: '자동 수집' },
];

const RETENTION = [
    ['회원 정보, 여행 일정, 대화 기록, 기억, 일기, 피드 등', '회원 탈퇴 시 지체 없이 삭제. 이용자가 개별 삭제한 항목은 삭제 즉시 파기'],
    ['안전모드 보호 기록(보호자 정보·위치)', '보호를 끝내면 즉시 삭제. 경보가 울린 경우 이용자가 해제할 때까지 보관'],
    ['기기에만 저장되는 정보(보호자 연락처, 보관함 사진, 체크리스트 등)', '서버로 보내지 않으며, 앱 삭제 또는 기기 데이터 삭제 시 함께 삭제'],
    ['상품 문의·견적 요청', '답변 완료 후 1년'],
    ['접속 기록', '통신비밀보호법에 따라 3개월'],
];

const OUTSOURCING = [
    { company: 'Google LLC (Firebase, Google Cloud)', task: '회원 인증, 데이터 저장(데이터베이스·파일), 푸시 알림', country: '미국 등 Google 데이터센터' },
    { company: 'Google LLC (Gemini API)', task: 'AI 일정 생성, AI 대화 답변, 일기 요약, 사진 속 글자 번역', country: '미국' },
    { company: 'Google LLC (Google 지도, Google 애널리틱스)', task: '지도·장소 정보 표시, 이용 통계 분석', country: '미국' },
    { company: 'Vercel Inc.', task: '웹 서비스 호스팅, 서버 기능 실행, 이용 통계(Vercel Analytics)', country: '미국' },
    { company: 'Kakao Corp.', task: '카카오 로그인', country: '대한민국' },
    { company: 'OpenStreetMap 기반 서비스 (Overpass API, Nominatim)', task: '내 주변 장소 검색, 위치를 주소로 변환 (위치 좌표만 전송하며 이름 등 식별 정보는 보내지 않음)', country: '독일, 영국' },
];

function Section({ id, title, children }) {
    return (
        <section id={id} className="scroll-mt-20 flex flex-col gap-3">
            <h2 className="text-[19px] font-bold text-tm-ink">{title}</h2>
            {children}
        </section>
    );
}

export default function PrivacyPage() {
    return (
        <div className="min-h-dvh bg-tm-ground font-sans text-tm-ink">
            <div className="mx-auto w-full max-w-2xl px-5 pb-16">
                <header className="sticky top-0 z-10 -mx-5 flex items-center gap-1 bg-tm-ground/95 py-2 pl-1.5 pr-5 backdrop-blur">
                    <Link href="/" aria-label="홈으로" className="flex h-11 w-11 items-center justify-center text-tm-ink">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
                    </Link>
                    <span className="text-[17px] font-bold">개인정보처리방침</span>
                </header>

                <div className="flex flex-col gap-9 pt-4 text-[15px] leading-[1.7] text-tm-ink">
                    <div className="flex flex-col gap-3">
                        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em]">개인정보처리방침</h1>
                        <p className="text-tm-muted">
                            {OPERATOR}(이하 “회사”)는 Trip Maker(웹 tripmaker.tips 및 Android 앱, 이하 “서비스”)를 운영하며 「개인정보 보호법」과 「위치정보의 보호 및 이용 등에 관한 법률」 등 관련 법령을 지킵니다.
                            이 방침은 회사가 어떤 개인정보를 왜 처리하고, 얼마나 보관하며, 이용자가 어떻게 권리를 행사할 수 있는지 안내합니다.
                        </p>
                        <p className="text-[13px] text-tm-muted">시행일: {EFFECTIVE_DATE}</p>
                    </div>

                    <nav aria-label="목차" className="rounded-2xl bg-white p-4">
                        <p className="mb-2 text-[13px] font-bold text-tm-muted">목차</p>
                        <ol className="flex flex-col gap-1">
                            {SECTIONS.map((s) => (
                                <li key={s.id}><a href={`#${s.id}`} className="text-[14px] text-tm-navy underline-offset-2 hover:underline">{s.title}</a></li>
                            ))}
                        </ol>
                    </nav>

                    <Section id="items" title={SECTIONS[0].title}>
                        <p>회사는 아래 목적을 위해 필요한 만큼만 개인정보를 처리하며, 목적이 바뀌면 미리 알리고 필요한 경우 동의를 받습니다. 선택 항목은 입력하지 않거나 해당 기능을 쓰지 않아도 나머지 서비스를 이용할 수 있습니다.</p>
                        <ul className="flex flex-col gap-2.5">
                            {ITEMS.map((row) => (
                                <li key={row.feature} className="rounded-2xl bg-white p-4">
                                    <div className="mb-1 flex items-start justify-between gap-3">
                                        <span className="font-bold">{row.feature}</span>
                                        <span className="shrink-0 rounded-full bg-tm-sky-tint px-2.5 py-0.5 text-[12px] font-semibold text-tm-navy">{row.basis}</span>
                                    </div>
                                    <p className="text-[14px]"><span className="text-tm-muted">항목 </span>{row.items}</p>
                                    <p className="text-[14px]"><span className="text-tm-muted">목적 </span>{row.purpose}</p>
                                </li>
                            ))}
                        </ul>
                        <p className="text-[14px] text-tm-muted">
                            AI 대화와 일정 생성에 입력한 내용은 답변을 만들기 위해 AI 서비스 제공자(5항)에게 전송됩니다. 건강·종교 등 민감한 정보나 여권번호 같은 고유식별정보는 대화에 입력하지 마세요. 회사는 이런 정보를 요구하지 않습니다.
                        </p>
                    </Section>

                    <Section id="location" title={SECTIONS[1].title}>
                        <p>회사는 이용자가 기기에서 위치 권한을 허용한 경우에만 현재 위치를 이용합니다. 권한은 기기 설정에서 언제든 끌 수 있으며, 꺼도 위치가 필요 없는 기능은 그대로 쓸 수 있습니다.</p>
                        <ul className="list-disc space-y-1.5 pl-5">
                            <li><b>내 주변·지도</b>: 주변 정보를 찾는 데 즉시 쓰고 저장하지 않습니다. 장소 검색을 위해 위치 좌표가 지도 서비스(5항)로 전송됩니다.</li>
                            <li><b>AI 대화</b>: 위치를 함께 보내는 경우 그 대화의 답변을 만드는 데만 씁니다.</li>
                            <li><b>안전모드</b>: 보호를 켜 둔 동안 위치를 저장해 이용자가 지정한 보호자가 볼 수 있게 하고, 보호를 끝내면 즉시 삭제합니다. “보호자에게 위치 보내기”를 누르면 위치 링크가 이용자의 휴대폰 문자·메신저 등을 통해 보호자에게 전달됩니다.</li>
                        </ul>
                        <p className="text-[14px] text-tm-muted">위치정보 이용·제공 사실 확인 자료는 관련 법령에 따라 보관하며, 위치정보 관리책임자는 11항의 개인정보 보호책임자가 겸합니다.</p>
                    </Section>

                    <Section id="retention" title={SECTIONS[2].title}>
                        <p>개인정보는 목적을 달성하면 지체 없이 파기합니다. 다만 아래 기간 동안 보관하거나, 다른 법령이 보관을 요구하는 경우 그 기간 동안 따로 보관합니다.</p>
                        <div className="overflow-x-auto rounded-2xl bg-white">
                            <table className="w-full text-left text-[14px]">
                                <thead><tr className="border-b border-tm-line text-tm-muted"><th className="p-3 font-semibold">항목</th><th className="p-3 font-semibold">보유 기간</th></tr></thead>
                                <tbody>
                                    {RETENTION.map(([item, period]) => (
                                        <tr key={item} className="border-b border-tm-line last:border-0 align-top"><td className="p-3">{item}</td><td className="p-3">{period}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Section>

                    <Section id="share" title={SECTIONS[3].title}>
                        <p>회사는 이용자의 동의나 법령의 근거 없이 개인정보를 제3자에게 제공하지 않습니다. 다만 이용자가 직접 선택한 아래 기능에서는 정보가 다른 사람에게 보이거나 전달됩니다.</p>
                        <ul className="list-disc space-y-1.5 pl-5">
                            <li><b>보호자</b>: 안전모드에서 이용자가 지정한 보호자에게 이름, 보호 상태, 위치가 전달됩니다.</li>
                            <li><b>일정 참여자</b>: 이용자가 초대한 동행자에게 여행 일정과 참여자 이름·프로필 사진이 보입니다.</li>
                            <li><b>공유 링크</b>: 일정 공유 링크를 받은 사람은 로그인 없이 그 일정을 볼 수 있습니다.</li>
                            <li><b>여행자 피드·동행 찾기</b>: 올린 글·사진과 닉네임·프로필 사진·여행 취향 태그가 다른 회원에게 보입니다.</li>
                        </ul>
                        <p className="text-[14px] text-tm-muted">보호자 연락처처럼 이용자가 다른 사람의 정보를 입력하는 경우, 그 사람에게 미리 알리고 동의를 받아 주세요.</p>
                    </Section>

                    <Section id="outsourcing" title={SECTIONS[4].title}>
                        <p>회사는 서비스 운영을 위해 아래 업체에 개인정보 처리를 맡깁니다. 이 중 해외 업체에는 서비스 이용 시점에 네트워크를 통해 개인정보가 국외로 전송·보관됩니다(「개인정보 보호법」 제28조의8).</p>
                        <div className="overflow-x-auto rounded-2xl bg-white">
                            <table className="w-full min-w-[480px] text-left text-[14px]">
                                <thead><tr className="border-b border-tm-line text-tm-muted"><th className="p-3 font-semibold">받는 자</th><th className="p-3 font-semibold">맡기는 업무</th><th className="p-3 font-semibold">국가</th></tr></thead>
                                <tbody>
                                    {OUTSOURCING.map((row) => (
                                        <tr key={row.company} className="border-b border-tm-line last:border-0 align-top"><td className="p-3 font-semibold">{row.company}</td><td className="p-3">{row.task}</td><td className="p-3">{row.country}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <ul className="list-disc space-y-1.5 pl-5 text-[14px]">
                            <li>이전되는 항목: 1항의 항목 중 해당 업무에 필요한 정보</li>
                            <li>이전 시기와 방법: 서비스 이용 시 암호화된 네트워크(HTTPS)로 전송</li>
                            <li>보유 기간: 3항의 기간 또는 위탁 계약 종료 시까지</li>
                            <li>거부 방법: 국외 이전을 원하지 않으면 해당 기능(AI 대화 등)을 쓰지 않거나 회원 탈퇴를 할 수 있습니다. 다만 데이터 저장·로그인은 국외 업체를 통해 이루어지므로, 거부하면 회원 서비스를 이용할 수 없습니다.</li>
                        </ul>
                    </Section>

                    <Section id="destroy" title={SECTIONS[5].title}>
                        <p>보유 기간이 끝나거나 목적을 달성한 개인정보는 지체 없이 파기합니다. 전자 파일은 복구할 수 없는 방법으로 삭제하고, 종이 문서는 분쇄하거나 소각합니다.</p>
                    </Section>

                    <Section id="rights" title={SECTIONS[6].title}>
                        <p>이용자는 언제든 자신의 개인정보를 열람·정정·삭제하거나 처리 정지를 요구할 수 있고, 동의를 철회할 수 있습니다.</p>
                        <ul className="list-disc space-y-1.5 pl-5">
                            <li>앱에서 직접: 마이페이지(프로필 수정), 티미 대화의 기억·과거 대화 삭제, 일정·피드·일기 삭제</li>
                            <li>회원 탈퇴와 그 밖의 요청: {CONTACT_EMAIL}로 보내 주시면 본인 확인 후 10일 이내에 처리하고 결과를 알려 드립니다.</li>
                            <li>법정대리인이나 위임받은 사람을 통해서도 요청할 수 있습니다(위임장 필요).</li>
                        </ul>
                    </Section>

                    <Section id="auto" title={SECTIONS[7].title}>
                        <p>서비스는 로그인 유지와 설정 저장(언어, 체크리스트 등)을 위해 브라우저 저장소와 쿠키를 쓰며, 이용 통계를 위해 Google 애널리틱스와 Vercel Analytics를 씁니다.</p>
                        <p className="text-[14px] text-tm-muted">브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있습니다. 거부하면 로그인 유지 등 일부 기능이 동작하지 않을 수 있습니다. Google 애널리틱스는 Google의 차단 부가기능으로도 거부할 수 있습니다.</p>
                    </Section>

                    <Section id="security" title={SECTIONS[8].title}>
                        <ul className="list-disc space-y-1.5 pl-5">
                            <li>전송 구간 암호화(HTTPS)와 저장소 접근 권한 제한</li>
                            <li>개인정보 처리 인원 최소화와 관리자 계정 접근 통제</li>
                            <li>접속 기록 보관과 보안 업데이트 적용</li>
                        </ul>
                    </Section>

                    <Section id="children" title={SECTIONS[9].title}>
                        <p>서비스는 만 14세 이상을 대상으로 합니다. 만 14세 미만 아동의 개인정보는 수집하지 않으며, 수집된 사실을 알게 되면 즉시 삭제합니다.</p>
                    </Section>

                    <Section id="officer" title={SECTIONS[10].title}>
                        <div className="rounded-2xl bg-white p-4">
                            <p>개인정보 보호책임자(위치정보 관리책임자 겸임): {PRIVACY_OFFICER}</p>
                            <p>이메일: <a href={`mailto:${CONTACT_EMAIL}`} className="text-tm-navy underline">{CONTACT_EMAIL}</a></p>
                        </div>
                        <p className="text-[14px] text-tm-muted">
                            개인정보 침해 신고·상담은 개인정보침해신고센터(국번 없이 118, privacy.kisa.or.kr), 개인정보분쟁조정위원회(1833-6972, kopico.go.kr), 대검찰청(국번 없이 1301), 경찰청(국번 없이 182)에도 문의할 수 있습니다.
                        </p>
                    </Section>

                    <Section id="changes" title={SECTIONS[11].title}>
                        <p>이 방침이 바뀌면 시행 7일 전(이용자에게 불리한 변경은 30일 전)부터 서비스 공지로 알립니다.</p>
                        <p className="text-[13px] text-tm-muted">시행일: {EFFECTIVE_DATE}</p>
                    </Section>
                </div>
            </div>
        </div>
    );
}
