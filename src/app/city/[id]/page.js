import { notFound } from 'next/navigation';
import CityGuide, { cityMetadata, cityOf } from '../../../components/city/CityGuide';
import { CITY_GUIDE_IDS } from '../../../content/cityGuides';

// 도시 가이드(ko). 빌드 때 미리 만든다.
export const dynamicParams = false;
export function generateStaticParams() {
  return CITY_GUIDE_IDS.filter((id) => cityOf(id)).map((id) => ({ id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  return cityMetadata(id, 'ko');
}

export default async function Page({ params }) {
  const { id } = await params;
  if (!cityOf(id)) notFound();
  return <CityGuide id={id} lang="ko" />;
}
