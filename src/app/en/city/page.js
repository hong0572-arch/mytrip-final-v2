import { CityIndex } from '../../../components/city/CityGuide';
import { GUIDE_UI } from '../../../content/cityGuides';

const SITE = 'https://tripmaker.tips';
export const metadata = {
  title: { absolute: `${GUIDE_UI.en.eyebrow} | Trip Maker` },
  description: 'From Seoul and Jeju to Tokyo and Paris — where to stay, how to get around, safety tips and routes for solo travelers.',
  alternates: { canonical: `${SITE}/en/city/`, languages: { ko: `${SITE}/city/`, en: `${SITE}/en/city/`, 'x-default': `${SITE}/city/` } },
};

export default function Page() {
  return <CityIndex lang="en" />;
}
