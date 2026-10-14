'use client';

// 홈 → 티미 대화로 넘길 첫 메시지. 대화 내용이 주소(쿼리)·분석 도구에 남지 않도록 sessionStorage로 넘긴다.
export const PENDING_MESSAGE_KEY = 'tm_pending_message';

// plan: true면 대화 화면이 바로 '일정 3개 만들기'로 시작한다.
export const PENDING_PLAN_KEY = 'tm_pending_plan';

export function startChat(router, text, { plan = false } = {}) {
  const message = (text || '').trim();
  try {
    if (message) sessionStorage.setItem(PENDING_MESSAGE_KEY, message);
    if (plan) sessionStorage.setItem(PENDING_PLAN_KEY, '1');
  } catch {}
  router.push('/chat');
}

export function takePendingMessage() {
  try {
    const message = sessionStorage.getItem(PENDING_MESSAGE_KEY) || '';
    const plan = sessionStorage.getItem(PENDING_PLAN_KEY) === '1';
    sessionStorage.removeItem(PENDING_MESSAGE_KEY);
    sessionStorage.removeItem(PENDING_PLAN_KEY);
    return { message, plan };
  } catch {
    return { message: '', plan: false };
  }
}

// 전역 TimmyButton이 띄우는 패널(안전모드·여행 일기·티미 채팅)을 연다. 로그인 사용자만 패널이 있다.
export function openTimmyPanel(panel) {
  window.dispatchEvent(new CustomEvent('timmy:open', { detail: { panel } }));
}

// 로그인 창은 예전 홈(/plan)에 있다.
// returnTo: 로그인(신규 가입은 닉네임까지)을 마치면 돌아갈 같은 사이트 경로(예: 초대 화면 /j/?k=…)
export const RETURN_KEY = 'tm_return_to';
export function goToLogin(router, returnTo) {
  try {
    if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) sessionStorage.setItem(RETURN_KEY, returnTo);
  } catch {}
  router.push('/plan?login=1');
}

// 로그인 뒤 돌아갈 곳이 있으면 한 번만 꺼낸다
export function takeReturnPath() {
  try {
    const path = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return path && path.startsWith('/') && !path.startsWith('//') ? path : null;
  } catch {
    return null;
  }
}
