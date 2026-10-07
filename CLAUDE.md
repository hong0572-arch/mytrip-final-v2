# Trip Maker AI — 자유여행 계획 앱

자유여행 일정을 만들고, 여행 중 필요한 정보를 사용하는 모바일 앱.

## 비즈니스 컨텍스트
- 앱 이름: Trip Maker AI / 도메인: tripmaker.tips
- 배포: 웹(Vercel) + Android TWA(`twa-build/`, packageId `pro.mytrip2.twa`) + Capacitor(`android/`, `ios/`)
- 주요 기능: AI 일정 생성(`api/generate`), 채팅(`api/chat`, `app/chat`), 주변 정보(`api/around`), 항공편(`api/flights`), 관광정보(`api/tourism`), 여행 일기(`api/diary`), 공유·실시간 안전모드(`app/share`), 상품(`app/product`), 마이페이지, 푸시 알림

## 기술 스택
- Next.js 16 (App Router, `src/app`) + React 19 + Tailwind v4 + framer-motion + Leaflet
- Firebase(Firestore, Functions `functions/`, Data Connect `dataconnect/`), next-pwa
- AI: Gemini(`@google/generative-ai`, `api/chat`·`api/generate`). openai SDK도 의존성에 있음
- 명령어: `npm run dev`, `npm run build`(`scripts/build-static.js`), `npm run lint`
- `CAPACITOR_BUILD=true`일 때 정적 export(`output: 'export'`) → API 라우트를 쓸 수 없으므로, 서버 로직은 웹 배포에서만 동작하도록 서버/클라이언트 컴포넌트를 분리해서 작성할 것

## AI 홈 구조 (2026-10 개편, 브랜치 `feat/ai-home`)
- 컨셉: "혼자 떠나도 든든하게" — 자유여행자, 특히 혼자 떠나는 여성 여행자. 안전은 겁주는 경고가 아니라 티미가 챙겨 주는 기능으로 보여준다.
- 색(확정안 "로고 블루"): 남색 `tm-navy` #1B3D6B(글자·버튼), 하늘색 `tm-sky` #1AA7E0(장식·경로 전용, 글자 금지), 햇살 `tm-sun` #F2B53A, 바탕 `tm-ground` #F8F7F4. 빨강 `tm-sos`는 SOS 전용, 청록 `tm-safe`는 안심 상태 전용. 토큰·모션 클래스(`.tm-rise` 등)는 `globals.css` 하단. 시안: https://claude.ai/artifact/XSX859JHQmRWQht6Z2Dk1P
- `/` = `components/home/AIHome.js`: 여행 단계에 따라 카드가 바뀐다(일정 없음 `NoTripSection` · 출발 전 `PreTripSection` · 여행 중 `OnTripSection`). 날짜 계산은 `utils/tripPhase.js`(YYYY-MM-DD를 현지 날짜로 해석).
- `/chat` = `components/home/ChatScreen.js`(`useTimmy` 사용). 홈 입력은 sessionStorage(`tm_pending_message`)로 넘긴다 — 대화 내용을 URL에 싣지 않는다.
- 예전 홈은 `/plan`(`app/plan/page.js`)으로 옮겼다: 항공권(`?tab=flights_search`), 내 주변(`?tab=around_me`), 일정 만들기 폼(`?tab=create`), 로그인 창(`?login=1`), 카카오 로그인 콜백. `/?tab=`·`/?mode=` 주소는 `/plan`으로 넘긴다.
- 안전모드·일기·티미 패널은 전역 `TimmyButton`이 띄운다. 홈에서는 `window.dispatchEvent(new CustomEvent('timmy:open', { detail: { panel: 'safe'|'diary'|'chat' } }))`. `/`·`/chat`에서는 떠 있는 버튼을 숨긴다.
- 문구는 `content/aiHomeCopy.js`(한/영). 언어는 `hooks/useAppLanguage.js`(localStorage `language` + `languageChanged` 이벤트).
- 기기 저장값은 `hooks/useLocalStore.js`(useSyncExternalStore)로 읽는다 — effect 안에서 setState 하면 React 19 린트 오류.
- 앱 전체 색 통일: `globals.css`에서 예전 토큰(`spotify-*`, `brand-*`, `sand-light`)의 값과 Tailwind 기본 팔레트(slate·gray → 남색 기운 중성색, indigo·blue·purple·cyan·fuchsia → 로고 남색·하늘색 계열)를 재정의했다. 예전 화면 코드의 색 클래스는 그대로 두고 값만 바뀐다. 새 코드는 `tm-*` 토큰을 쓴다.
- 주의: `spotify-green`은 이제 남색이다. 그 위 글자는 흰색(`bg-spotify-green text-white`)이어야 하고, 어두운 패널 위 강조 글자는 `text-tm-sky-soft`를 쓴다(남색 위 남색 금지).
- 공통 아래 메뉴는 `components/home/BottomNav.js`(`active`, `onSelect`로 화면 안 탭 처리). `/plan`·`/mypage`도 이것을 쓴다. 배경 사진·켄 번 효과·시작 화면(SplashScreen)은 쓰지 않는다.

## 일정 만들기·일정 상세 (2026-10)
- 일정은 대화에서 만든다: `/api/plan-options`(부족한 정보 질문 또는 후보 3개) → 고른 안을 `/api/generate`로 상세 일정 생성. 예전 4단계 폼(`/plan?tab=create`)은 남아 있지만 진입점은 없앴다.
- 일정 상세는 `components/trip/TripDetail.js` 하나로 통일: 대화 결과(`mode="draft"`), 저장된 일정 `/trip?id=`(`saved`, 편집 즉시 Firestore 반영·동행 초대·채팅), 공유 `/share/[id]`(`shared`, 보기 전용·사본 저장). 예전 `AIResult`는 관리자 화면만 쓴다.
- 구성: 지도(`TripMap`, 선택한 날의 번호 핀·이동수단별 경로·구간 시간·주변 장소) + 시트(반쯤/전체/장소) + 탭(일정·숙소·안심·팁·경비) + 편집(`TripEdit`: 끌어서 순서, 사이에 추가, AI 동선 정리, 말로 고치기 `/api/plan-edit`).
- 저장·공유는 `lib/tripStore.js`(구글 로그인, 모바일은 리디렉트 후 `pendingTripSave`로 이어서 저장). 피드 공유는 기본 꺼짐(혼자 여행자 위치 노출 방지).
- AI가 준 좌표는 믿지 않고 구글 장소 검색으로 채운다. 긴급번호는 `tripUtils.emergencyNumbers`(확실한 나라만, 모르면 영사콜센터만).
- 문구는 `content/tripCopy.js`(한/영).

## 보안·개인정보 (2026-10)
- 사용자별 API(`api/chat/session`, `api/memory`, `api/diary`, `api/flights/tracker`)는 `lib/verifyUser.js`로 Firebase ID 토큰을 확인하고 토큰의 uid만 쓴다. 클라이언트는 `utils/authHeaders.js`로 토큰을 붙인다.
- 안심 귀가 보호자 링크: 안전모드를 켤 때 128비트 일회용 키(`shareToken`)를 만들어 `safemode_sessions/{uid}`에 저장하고, 링크는 `/share/live_safemode?u=<uid>&t=<key>`. 보호자 화면은 `api/safemode/live`가 키를 확인해 이름·상태·위치만 돌려준다(15초 갱신). 보호를 끝내면 문서가 지워져 링크도 만료된다. GPS 실패 시 가짜 좌표를 쓰지 않고 `locationError`만 기록한다.
- Firestore 규칙(`firestore.rules`)은 콘솔/CLI로 따로 게시해야 반영된다. `safemode_sessions`는 본인과 `guardianUserId` 보호자만 읽는다.
- 실시간 구독(onSnapshot)에는 항상 `lib/snapshotError.js`의 `onSnapshotError('이름')`을 붙인다.
- 개인정보처리방침(`app/privacy/page.js`)은 실제 데이터 흐름을 근거로 작성했다. 수집 항목·외부 서비스·보관 방식을 바꾸면 방침도 함께 고친다.

## 작업 원칙
- 여행 중 한 손·이동 중 사용을 전제로 한 모바일 우선 UX(큰 터치 영역, 핵심 정보 빠른 접근).
- 해외 현지 환경을 고려한다: 느린/끊기는 네트워크, 오프라인 캐시(PWA), 배터리 소모.
- 일정 생성 → 저장 → 여행 중 사용까지 이어지는 리텐션 흐름을 핵심 지표로 본다.
- AI 응답은 비용·속도·정확도(영업시간, 이동 시간 등 사실 정보)를 함께 고려한다.
- 위치·여행 일정 등 개인정보 관련 제안에는 보안과 법적 고려사항(위치정보법, 개인정보보호법, 스토어 정책)을 함께 짚는다.
- 웹 배포분의 SEO/GEO와 스토어(Play) 노출·평점도 개선 제안에 포함한다.
- 답변은 한국어로 한다.

## 주의
- `android.keystore`, `google-services.json`, API 키 등 비밀값은 외부에 노출하거나 새로 커밋하지 않는다.
- TWA는 Digital Asset Links(`/.well-known/assetlinks.json`)가 깨지면 주소창이 노출되므로 도메인·라우팅 변경 시 확인한다.
