import { CITY_GUIDE_IDS } from '../content/cityGuides';

export const dynamic = "force-static";

const SITE = 'https://tripmaker.tips';
// path: 이 항목 주소 · ko/en: 언어별 같은 페이지
const page = (path, enPath, priority, changeFrequency = 'weekly', koPath = path) => ({
    url: `${SITE}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: { languages: { ko: `${SITE}${koPath}`, en: `${SITE}${enPath}` } },
});

export default function sitemap() {
    return [
        page('/', '/?lang=en', 1.0, 'daily'),
        page('/city/', '/en/city/', 0.9),
        ...CITY_GUIDE_IDS.flatMap((id) => [page(`/city/${id}/`, `/en/city/${id}/`, 0.8), page(`/en/city/${id}/`, `/en/city/${id}/`, 0.7, 'weekly', `/city/${id}/`)]),
        page('/en/city/', '/en/city/', 0.8, 'weekly', '/city/'),
        page('/guide', '/guide?lang=en', 0.7),
        page('/rectrips', '/rectrips?lang=en', 0.6, 'daily'),
        page('/privacy', '/privacy?lang=en', 0.3, 'monthly'),
    ];
}
