// 공유 링크(/share/[id]) 미리보기용 요약 — 서버 전용. 꺼졌거나 기간이 지난 링크는 null(일반 미리보기).
// 일정 이름·도시·일수·앞쪽 장소 이름만 쓴다(연락처·동행 정보는 담지 않는다).
import { admin } from './firebaseAdmin';

export async function getShareSummary(id) {
  if (!/^[A-Za-z0-9]{10,40}$/.test(String(id || ''))) return null;
  try {
    const snap = await admin.firestore().doc(`shared_links/${id}`).get();
    if (!snap.exists) return null;
    const d = snap.data();
    if (d.enabled === false) return null;
    const exp = d.expiresAt?.toMillis?.();
    if (exp && exp < Date.now()) return null;
    const itinerary = Array.isArray(d.itinerary) ? d.itinerary : [];
    const places = itinerary.flatMap((day) => (Array.isArray(day?.places) ? day.places : [])).map((p) => String(p?.name || '').trim()).filter(Boolean);
    const destination = String(d.destination || '').split(/[,#]/)[0].trim();
    const cut = (t, n) => (t.length > n ? `${t.slice(0, n - 1).trim()}…` : t);
    const title = String(d.tripTitle || destination || '');
    return {
      title: cut(title, 60),
      // 일정 글이 영어면 미리보기 문구도 영어로
      en: !/[가-힣]/.test(title + destination),
      destination: destination.slice(0, 40),
      days: itinerary.length,
      placeCount: places.length,
      places: places.slice(0, 4).map((p) => cut(p, 20)),
      startDate: typeof d.startDate === 'string' ? d.startDate : null,
    };
  } catch (error) {
    console.warn('[share] summary failed:', error?.message);
    return null;
  }
}
