// Firestore 실시간 구독(onSnapshot)의 오류 처리.
// 오류 콜백이 없으면 Firestore가 "Uncaught Error in snapshot listener"로 콘솔에 던진다.
// 권한 거부는 대부분 로그아웃 직후(구독 해제 전) 한 번 생기므로 경고로만 남기고, 어느 구독인지 이름을 붙인다.
export function onSnapshotError(label, onError) {
  return (error) => {
    if (error?.code === 'permission-denied') {
      console.warn(`[Firestore] ${label}: 읽기 권한이 없습니다(로그아웃 중이거나 보안 규칙과 쿼리가 맞지 않음).`, error.message);
    } else {
      console.error(`[Firestore] ${label}:`, error);
    }
    onError?.(error);
  };
}
