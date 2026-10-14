import { CityIndex } from '../../components/city/CityGuide';
import { GUIDE_UI } from '../../content/cityGuides';

const SITE = 'https://tripmaker.tips';
export const metadata = {
  title: { absolute: `${GUIDE_UI.ko.eyebrow} | Trip Maker` },
  description: '서울·부산·제주부터 도쿄·파리까지, 혼자 떠나기 좋은 도시의 숙소 동네·이동·안전 팁과 추천 코스.',
  alternates: { canonical: `${SITE}/city/`, languages: { ko: `${SITE}/city/`, en: `${SITE}/en/city/`, 'x-default': `${SITE}/city/` } },
};

export default function Page() {
  return <CityIndex lang="ko" />;
}
