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
