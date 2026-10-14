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
- 일정 없을 때 홈(2026-10 개편 B+A안): `HomeHero`(남색 하늘 — 시간대 인사·낮/밤 장식, '티미의 오늘 한마디' = 날짜로 고른 오늘의 도시 + 실시간 날씨) → `NoTripSection`(혼자 가기 좋은 도시 사진 카드 → 요즘 묻는 것 → 안심·항공권). 도시 목록 `content/homeCities.js`(사진 `public/home/*.webp`), 날씨 `hooks/useCityWeather.js` → `/api/weather`(Google Maps Platform Weather API, 서버가 조회·30분 캐시, 키 `GOOGLE_WEATHER_API_KEY` 또는 지도 키. Open-Meteo 무료판은 비상업 전용이라 쓰지 않는다). Google은 한국·일본을 지원하지 않으므로 `country: 'KR'` 도시는 기상청 초단기실황·예보(`lib/kmaWeather.js`, 격자 변환 포함, 키 `KMA_SERVICE_KEY` — 기상청 API허브 authKey 또는 공공데이터포털 serviceKey, API허브는 단기예보 활용신청 필요), 일본은 날씨 없이 보여 준다. 시간·날짜는 마운트 후에만 계산(하이드레이션). 티미 얼굴 원본은 `public/timmy-face.png`, 화면은 `timmy-face-192.webp`.
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

## 내 일정 목록 (2026-10)
- `/trips` = `components/trips/MyTrips.js`. 아래 메뉴 '내 일정'은 여기로 간다(예전 `/mypage?tab=schedule`은 남아 있지만 진입점 없음).
- 맨 위 카드가 여행 단계에 따라 바뀐다: 여행 중 `OnTripHero`(며칠째·다음 장소·안전모드) → 가장 가까운 출발 `NextTripHero`(D-day·안심 준비 진행률, 홈과 같은 `tm_readiness_<id>`). 분류는 `trips/tripsUtils.groupTrips`.
- 지난 여행: 끝난 지 14일 안이면 '어떠셨어요?' 카드(일기·피드 공유). **피드 공유는 끝난 여행에만 권한다**(여행 중 위치 노출 방지). '다시 가기'는 출발일을 고르면 `duplicateTrip`이 일수만큼 날짜를 다시 매긴 새 여행을 만든다(동행·기록 미복사).
- ⋯ 메뉴(`TripSheets.TripMenuSheet`): 열기·이름 바꾸기·동행 초대(`/join/<id>` 링크)·공유 링크·복사·삭제. 삭제는 빨강을 쓰지 않고 한 번 더 확인한다. 만든 사람(또는 혼자인 일정)은 삭제, 동행은 '나가기'(`removeTrip`).
- 받은 초대: `match_requests`(`type: 'workspace_invite'`, `targetMateId`, `status: 'pending'`) → 배너 '보기' → `/join/<tripId>`.
- 피드·공유 링크·사본에는 `tripStore.tripPlanOnly`로 일정 내용만 싣는다(동행 목록·연락처·지갑 제외).
- 티미 그림: 작은 곳(대화·로딩·홈 첫 화면)은 `components/TimmyAvatar.js`(얼굴 `public/timmy-face.png` + 하늘색 원). 전신 `timmy.png`는 크게 보여 줄 때만. 썸네일은 사진 대신 `TripThumb`(일정 id로 정해지는 지도 무늬).
- 문구는 `content/tripsCopy.js`(한/영).

## 도시 사진 (2026-10)
- 홈 추천 도시 카드·오늘의 한마디 사진은 `public/home/<id>.webp`(640×480, 30~90KB), 출처는 `homeCities.js`의 `credit`(카드 왼쪽 아래 작게 표시).
- 출처 원칙: 한국 도시는 한국관광공사(포토코리아·공공누리 제1유형, 출처 표시) 우선, 해외는 Unsplash(무료·상업 가능). 없으면 일러스트풍 AI 생성(사실적 랜드마크 금지). 검색해서 아무 사진이나 쓰지 않는다.
- 한국 도시(제주·서울·부산·경주·강릉·전주)는 한국관광공사 관광사진 API(공공데이터포털 PhotoGalleryService1) 사진이다. 새 도시: `TOUR_API_KEY=<인코딩 키> node scripts/fetch-kto-photo.mjs <id> "<검색어>"`로 후보를 보고 번호를 주면 WebP와 credit 문구를 만든다. 카드는 영어 화면에서 'Korea Tourism Organization'으로 표시.
- 해외 카드 순서는 `NoTripSection.GLOBAL_CARD_IDS`.

## 한국 여행 모드 (2026-10)
- 영어 화면 + 한국에 있음(`hooks/useInKorea.js`: 기기 시간대 Asia/Seoul 또는 `/api/geo`의 Vercel 국가 헤더 KR, 위치 권한·저장 없음)이면 외국인 한국 여행자로 본다.
- 홈: 'Exploring Korea?' 인사, 오늘의 한마디·날씨 카드는 한국 도시(`homeCities.KOREA_CITY_IDS`, 기상청 날씨), 'Korea essentials'(티머니·지도 앱·택시·출발 전 준비·1330/112)와 한국 질문(`content/koreaCopy.js`). 해외 모드 오늘의 한마디에서는 `korea: true` 도시를 뺀다.
- 안심: 영어 화면에서는 한국인용 영사콜센터를 숨기고, 한국이면 112·119·1330(관광안내)을 보여 준다. 내 일정 빈 화면 예시도 한국 도시.
- 길찾기: 좌표가 한국이면 언어와 상관없이 카카오맵(`tripPhase.kakaoDirectionsUrl`) — 한국에서는 구글 지도 도보·차 길찾기가 안 된다.

## 안심 (2026-10)
- `/safety` = `components/safety/SafetyScreen.js`(아래 메뉴 '안심', 로그인 없이도 긴급번호). `openTimmyPanel('safe')`는 이제 `/safety`로 이동한다. 예전 `GlobalSafeMode` 패널은 없앴다.
- 상태는 `lib/safety/store.js`(기기 localStorage `tm_safety_v2`, 예전 `safeMode_*` 키도 맞춰 둠) + `useSafety()`. 동작은 `lib/safety/actions.js`. phase: idle → active → **grace(약속 시간 뒤 1분 '도착했나요?')** → alert(사이렌·보호자 알림). SOS는 **3초 누르기**(`SafetyParts.SosButton`).
- `components/safety/SafetyRuntime.js`는 레이아웃에 하나: 타이머·유예·경보 화면, 15초 위치 갱신, 보호자 기기 경보(`safemode_sessions` where `guardianUserIds` array-contains / 예전 `guardianUserId`).
- 보호자는 최대 3명: 앱 회원은 **초대 링크**(`guardian_invites/{128비트 id}` → `/safety/join?t=`) 수락으로만 연결, 전화번호 보호자는 기기에만 저장하고 경보 때 `sms:` 문자 화면을 연다. 이름·이메일 검색 없음 → `users`는 본인·관리자만 읽는다.
- 서버 감시: Cloud Functions `checkExpiredSafeSessions`(functions/src/index.ts, 1분마다)가 약속 시간 + 유예 1분 + 여유 1분이 지난 `active` 세션을 트랜잭션으로 `expired`(alertedBy: 'server')로 바꾸고, 앱 보호자에게 match_requests + FCM 푸시(users.fcmToken), 이용자에게 '도착했나요?' 푸시를 보낸다. 앱은 자기 세션이 서버로 만료되면 다시 알리지 않고 경보 화면만 띄운다. 전화번호 보호자는 서버가 문자를 보낼 수 없다(문자 발송 업체 연동 전). 함수 배포: `firebase deploy --only functions:checkExpiredSafeSessions`.
- 문구는 `content/safetyCopy.js`(한/영).

## 마이 (2026-10)
- `/mypage` = `components/my/MyHome.js`(프로필·포인트·안심·여행 도구·커뮤니티·설정 목록). `/mypage/expenses` 경비 기록(`my/Expenses.js`, `trips/{id}/expenses`, 예산 `budgetKRW`, 원화 환산 `/api/fx` = ECB 환율). `/mypage/account` 개인정보·계정(로그아웃·내 데이터 JSON 내려받기·회원 탈퇴).
- 예전 마이페이지는 `/mypage/more`(`?tab=social|coach|vault|price_alert`, `?open=inbox|points|quiz|profile`)로 옮겨 피드·요청함·보관함·가격 알림·코치만 쓴다. 일정 탭(→ `/trips`)·트립머니(가짜 입금·환전)·이름/이메일 사람 검색·전체 회원 추천은 없앴다.
- 회원 탈퇴 `/api/account/delete`(GET 미리 보기, POST 삭제): 혼자 쓰는 일정 삭제, 공유 일정은 본인만 빠짐(만든 사람이면 다음 멤버에게), users/{uid} 하위 전체·안심 세션·요청·가격 알림·(선택) 피드 삭제 후 인증 계정 삭제. 기기의 보관함(IndexedDB)·저장소도 지운다. 공유 링크는 소유자 기록이 없어 남는다.
- **포인트는 서버만 준다**(`/api/points`: checkin·quiz·feed, 하루 한도·KST). 규칙이 users의 points·lastCheckInDate·lastFeedRewardDate·quizStats·currentAsset 수정을 막고, 가입 시 1000P만 허용한다. users 하위 규칙은 `/{sub}/{document=**}`(회원 문서 자체에 걸리지 않게).
- 문구는 `content/myCopy.js`(한/영).

## 지도 (2026-10)
- 지도 탭 `/map` = `components/map/MapScreen.js`(아래 메뉴 '지도'). 예전 `/plan?tab=around_me`는 `/map`으로 넘긴다. 카테고리(맛집·카페·볼거리·쇼핑·숙소·안심 장소=편의점·약국·경찰서)는 `map/mapUtils.CATEGORY_TYPES`.
- 기준점: 내 위치 → (권한 없으면) 여행 중/출발 전 일정의 장소 가운데 → 서울. 지도를 직접 끌었을 때만 '이 지역에서 다시 찾기'.
- 제휴 상품(`products`)은 같은 카테고리·3km 안의 3개까지 목록 위에 '제휴'로. 지도 말풍선(InfoWindow)에 HTML 문자열을 넣지 않는다(사용자 입력 → XSS). 정보는 React 카드로 보여 준다.
- 핀 색: 남색(기본)·햇살색(제휴)·하늘색(내 위치). 빨강은 SOS 전용이라 쓰지 않는다.
- Maps 로더는 `components/trip/useGoogleMaps.js` 하나(`loading=async`). 키·결제 오류는 `window.gm_authFailure`로 잡아 `map/MapFallback`(지도 대신 안내·새로 고침·구글 지도 링크)을 보여 준다. Google Cloud 결제가 꺼지면 모든 지도·장소 검색이 멈춘다(2026-10 장애).
- 문구는 `content/mapCopy.js`(한/영).

## 보안·개인정보 (2026-10)
- 사용자별 API(`api/chat/session`, `api/memory`, `api/diary`, `api/flights/tracker`)는 `lib/verifyUser.js`로 Firebase ID 토큰을 확인하고 토큰의 uid만 쓴다. 클라이언트는 `utils/authHeaders.js`로 토큰을 붙인다.
- 안심 귀가 보호자 링크: 안전모드를 켤 때 128비트 일회용 키(`shareToken`)를 만들어 `safemode_sessions/{uid}`에 저장하고, 링크는 `/share/live_safemode?u=<uid>&t=<key>`. 보호자 화면은 `api/safemode/live`가 키를 확인해 이름·상태·위치만 돌려준다(15초 갱신). 보호를 끝내면 문서가 지워져 링크도 만료된다. GPS 실패 시 가짜 좌표를 쓰지 않고 `locationError`만 기록한다.
- Firestore 규칙(`firestore.rules`)은 콘솔/CLI로 따로 게시해야 반영된다. `safemode_sessions`는 본인과 `guardianUserId` 보호자만 읽는다.
- `trips`: 목록 조회·수정은 멤버(`memberIds`)만, 단건 조회는 로그인 사용자(초대 링크). 초대 링크로 자기만 멤버 추가·자기만 나가기 허용, `hostId` 변경 불가, 삭제는 만든 사람 또는 혼자 남은 멤버. `expenses`·`messages`는 멤버만. **목록 쿼리는 반드시 `where('memberIds','array-contains',uid)`를 붙인다**(없으면 거부).
- `match_requests`(초대·정산·안전모드 알림): 보낸 사람·받는 사람만 읽기. 쿼리는 `where('targetMateId'|'senderId','==',uid)`로 — 컬렉션 전체 구독은 거부된다.
- `feeds`: 작성자만 수정·삭제, 다른 사람은 `likes/likedBy/forks/comments/commentCount`만. `shared_links`: 누구나 만들고 읽되 수정·삭제 불가.
- 관리자 = 구글 로그인 + `admins/{uid}` 문서(콘솔에서만 생성). `/admin` 화면과 규칙의 `isAdmin()`이 같은 기준. 비밀번호를 코드에 두지 않는다.
- 규칙을 바꾸면 에뮬레이터로 시험한다: `@firebase/rules-unit-testing` + `firebase emulators:exec --only firestore`(Java 필요, Android Studio의 `jbr/bin`).
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
