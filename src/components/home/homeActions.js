'use client';

// 홈 → 티미 대화로 넘길 첫 메시지. 대화 내용이 주소(쿼리)·분석 도구에 남지 않도록 sessionStorage로 넘긴다.
export const PENDING_MESSAGE_KEY = 'tm_pending_message';

export function startChat(router, text) {
  const message = (text || '').trim();
  try {
    if (message) sessionStorage.setItem(PENDING_MESSAGE_KEY, message);
  } catch {}
  router.push('/chat');
}

export function takePendingMessage() {
  try {
    const message = sessionStorage.getItem(PENDING_MESSAGE_KEY);
    sessionStorage.removeItem(PENDING_MESSAGE_KEY);
    return message || '';
  } catch {
    return '';
  }
}

// 전역 TimmyButton이 띄우는 패널(안전모드·여행 일기·티미 채팅)을 연다. 로그인 사용자만 패널이 있다.
export function openTimmyPanel(panel) {
  window.dispatchEvent(new CustomEvent('timmy:open', { detail: { panel } }));
}

// 로그인 창은 예전 홈(/plan)에 있다.
export function goToLogin(router) {
  router.push('/plan?login=1');
}
