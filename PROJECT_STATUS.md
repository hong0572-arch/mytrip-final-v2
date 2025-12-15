# 🗺️ My Trip Pro 개발 현황 (Project Context)

## 1. 프로젝트 개요
- **서비스명:** My Trip Pro (AI 맞춤 여행 가이드)
- **URL:** https://mytrip2.pro
- **Tech Stack:** Next.js (App Router), Tailwind CSS, Vercel Deployment
- **상태:** V1.0 배포 완료 및 운영 중

## 2. 핵심 파일 구조 & 역할
### 📂 src/app
- **layout.js:** - Vercel Analytics & SpeedInsights 탑재
  - Google Analytics (GA4) 코드 삽입됨
  - OG 태그(썸네일) 설정 완료 (Vercel 환경변수로 제어: `NEXT_PUBLIC_OG_TITLE` 등)
- **page.js:** - 메인 입력 폼 (여행지, 날짜, 인원, 예산, 테마)
  - **[최근 추가]** 연락처 및 추가 요청사항 입력란 (`formData.contact`, `formData.request`)
- **robots.js & sitemap.js:** SEO 검색 최적화 파일

### 📂 src/components
- **AIResult.js:** - AI 응답 결과(HTML) 렌더링
  - **[최근 기능]** 카카오톡 상담 버튼: 클릭 시 여행 일정 텍스트 자동 복사(Clipboard) 후 채팅방 연결
  - **[최근 기능]** 공유 버튼: Web Share API를 이용한 텍스트 공유

### 📂 public
- `logo.png`, `og-final.jpg`: 이미지 자산
- `naver....html`: 네이버/구글 소유권 확인용 파일

## 3. 최근 작업 로그 (Latest Changes)
- [x] **SEO 완비:** 네이버/구글 서치 콘솔에 사이트맵 제출 완료 (`sitemap.xml`)
- [x] **입력 폼 개선:** 고객 연락처 및 구체적 요청사항을 받을 수 있도록 필드 확장
- [x] **UX 개선:** 카카오톡 문의 시, 고객이 일일이 타이핑하지 않도록 견적 내용을 자동 복사해주는 기능 구현
- [x] **OG 태그:** 코드 수정 없이 Vercel 환경변수만으로 썸네일/문구 변경 가능하도록 설정

## 4. 향후 로드맵 (To-Do)
- [ ] **V2.0 (저장 기능):** Supabase/Firebase DB 연동하여 견적서 영구 저장 (고유 URL 생성)
- [ ] **V2.5 (회원 기능):** 카카오톡/구글 간편 로그인 도입
- [ ] **V3.0 (수익화):** 결과 화면에 아고다/트립닷컴 제휴 링크(Affiliate) 심기