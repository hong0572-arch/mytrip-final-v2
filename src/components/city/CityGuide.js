import Link from 'next/link';
import { BedDouble, MapPinned, Route, ShieldCheck, Sparkles, TrainFront } from 'lucide-react';
import { HOME_CITIES } from '../../content/homeCities';
import { CITY_GUIDES, CITY_GUIDE_IDS, GUIDE_UI } from '../../content/cityGuides';
import CityCta from './CityCta';

// 도시 가이드(서버 렌더링 — 검색엔진·생성형 AI 검색이 그대로 읽는다). lang: 'ko' | 'en'
const SITE = 'https://tripmaker.tips';
export const cityPath = (id, lang) => (lang === 'en' ? `/en/city/${id}/` : `/city/${id}/`);
export const cityOf = (id) => HOME_CITIES.find((c) => c.id === id);

export function cityMetadata(id, lang) {
  const city = cityOf(id);
  const guide = CITY_GUIDES[id]?.[lang];
  if (!city || !guide) return {};
  const ui = GUIDE_UI[lang];
  const name = city[lang].name;
  const url = `${SITE}${cityPath(id, lang)}`;
  return {
    title: { absolute: `${ui.metaTitle(name)} | Trip Maker` },
    description: ui.metaDesc(name, guide.lead),
    alternates: {
      canonical: url,
      languages: { ko: `${SITE}${cityPath(id, 'ko')}`, en: `${SITE}${cityPath(id, 'en')}`, 'x-default': `${SITE}${cityPath(id, 'ko')}` },
    },
    openGraph: {
      title: ui.metaTitle(name),
      description: guide.lead,
      url,
      type: 'article',
      locale: lang === 'en' ? 'en_US' : 'ko_KR',
      images: [{ url: `${SITE}${city.image}`, alt: name }],
    },
    twitter: { card: 'summary_large_image', title: ui.metaTitle(name), description: guide.lead, images: [`${SITE}${city.image}`] },
  };
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="flex flex-col gap-3 rounded-[20px] bg-white p-5">
      <h2 className="flex items-center gap-2 text-[18px] font-bold text-tm-ink">
        <Icon size={20} className="text-tm-navy" aria-hidden="true" />{title}
      </h2>
      {children}
    </section>
  );
}

const Bullets = ({ items }) => (
  <ul className="flex flex-col gap-2 text-[15px] leading-relaxed text-tm-ink/90">
    {items.map((t) => <li key={t} className="flex gap-2"><span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-tm-sky" />{t}</li>)}
  </ul>
);

export default function CityGuide({ id, lang }) {
  const city = cityOf(id);
  const guide = CITY_GUIDES[id][lang];
  const ui = GUIDE_UI[lang];
  const name = city[lang].name;
  const credit = city.credit ? (city.credit.nameEn && lang === 'en' ? `${city.credit.nameEn}${city.credit.by ? ` · ${city.credit.by}` : ''}` : `${city.credit.name}${city.credit.by ? ` · ${city.credit.by}` : ''}`) : '';
  const others = CITY_GUIDE_IDS.filter((x) => x !== id && cityOf(x));

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: ui.title(name),
      description: guide.lead,
      inLanguage: lang,
      image: `${SITE}${city.image}`,
      about: { '@type': 'City', name, ...(city.lat ? { geo: { '@type': 'GeoCoordinates', latitude: city.lat, longitude: city.lng } } : {}) },
      publisher: { '@type': 'Organization', name: 'Trip Maker', url: SITE, logo: `${SITE}/icon-512.png` },
      mainEntityOfPage: `${SITE}${cityPath(id, lang)}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: guide.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: ui.home, item: lang === 'en' ? `${SITE}/?lang=en` : SITE },
        { '@type': 'ListItem', position: 2, name: ui.all, item: `${SITE}${lang === 'en' ? '/en/city/' : '/city/'}` },
        { '@type': 'ListItem', position: 3, name, item: `${SITE}${cityPath(id, lang)}` },
      ],
    },
  ];

  return (
    <div lang={lang} className="min-h-dvh bg-tm-ground font-sans text-tm-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-[calc(32px+env(safe-area-inset-bottom))]">
        <header className="relative h-[300px] overflow-hidden sm:rounded-b-[28px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={city.image} alt={name} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,31,54,.85)] via-[rgba(13,31,54,.25)] to-transparent" />
          <nav className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[calc(12px+env(safe-area-inset-top))] text-[13px] font-semibold text-white">
            <Link href={lang === 'en' ? '/en/city/' : '/city/'} className="flex min-h-11 items-center rounded-full bg-black/25 px-3.5 backdrop-blur">{ui.all}</Link>
            <Link href={cityPath(id, lang === 'en' ? 'ko' : 'en')} hrefLang={lang === 'en' ? 'ko' : 'en'} className="flex min-h-11 items-center rounded-full bg-black/25 px-3.5 backdrop-blur">{ui.langSwitch}</Link>
          </nav>
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-5 pb-5 text-white">
            <span className="text-[13px] font-semibold text-tm-sky-soft">{ui.eyebrow}</span>
            <h1 className="text-[28px] font-bold leading-tight">{ui.title(name)}</h1>
            <p className="text-[15px] leading-relaxed text-white/90">{guide.lead}</p>
          </div>
          {credit && <span className="absolute right-3 top-[calc(64px+env(safe-area-inset-top))] rounded bg-black/35 px-1.5 py-0.5 text-[10px] text-white/80">{ui.photo}: {credit}</span>}
        </header>

        <div className="flex flex-col gap-4 px-4">
          <CityCta lang={lang} prompt={city[lang].prompt} label={ui.cta} sub={ui.ctaSub} />

          <Section icon={Sparkles} title={ui.solo}><Bullets items={guide.solo} /></Section>

          <Section icon={BedDouble} title={ui.stay}>
            <ul className="flex flex-col gap-2.5">
              {guide.stay.map(([area, why]) => (
                <li key={area} className="rounded-2xl bg-tm-ground px-4 py-3">
                  <span className="block text-[15px] font-bold">{area}</span>
                  <span className="block text-[14px] leading-relaxed text-tm-muted">{why}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section icon={TrainFront} title={ui.move}><Bullets items={guide.move} /></Section>

          <Section icon={ShieldCheck} title={ui.safety}><Bullets items={guide.safety} /></Section>

          <Section icon={Route} title={ui.route}>
            <ol className="flex flex-col gap-3">
              {guide.route.map((places, i) => (
                <li key={i} className="flex flex-col gap-2">
                  <span className="text-[13px] font-bold text-tm-navy">{ui.day(i + 1)}</span>
                  <span className="flex flex-wrap items-center gap-1.5 text-[14px]">
                    {places.map((p, j) => (
                      <span key={p} className="flex items-center gap-1.5">
                        <span className="rounded-full bg-tm-sky-tint px-3 py-1.5 font-medium text-tm-ink">{p}</span>
                        {j < places.length - 1 && <span aria-hidden="true" className="text-tm-muted">→</span>}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ol>
          </Section>

          <Section icon={MapPinned} title={ui.faq}>
            <dl className="flex flex-col gap-3">
              {guide.faq.map(([q, a]) => (
                <div key={q} className="flex flex-col gap-1">
                  <dt className="text-[15px] font-bold">{q}</dt>
                  <dd className="text-[14px] leading-relaxed text-tm-muted">{a}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <p className="px-1 text-[12px] leading-relaxed text-tm-muted">{ui.note}</p>

          <nav aria-label={ui.others} className="flex flex-col gap-2.5">
            <h2 className="px-1 text-[15px] font-bold">{ui.others}</h2>
            <ul className="flex flex-wrap gap-2">
              {others.map((x) => (
                <li key={x}><Link href={cityPath(x, lang)} className="flex min-h-11 items-center rounded-full border border-tm-line bg-white px-4 text-[14px] font-semibold text-tm-ink">{cityOf(x)[lang].name}</Link></li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}

// 도시 가이드 목록
export function CityIndex({ lang }) {
  const ui = GUIDE_UI[lang];
  return (
    <div lang={lang} className="min-h-dvh bg-tm-ground font-sans text-tm-ink">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-10 pt-[calc(24px+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <Link href={lang === 'en' ? '/?lang=en' : '/'} className="flex min-h-11 items-center text-[14px] font-semibold text-tm-navy">← {ui.home}</Link>
          <Link href={lang === 'en' ? '/city/' : '/en/city/'} hrefLang={lang === 'en' ? 'ko' : 'en'} className="flex min-h-11 items-center text-[14px] font-semibold text-tm-navy">{ui.langSwitch}</Link>
        </div>
        <h1 className="text-[26px] font-bold">{ui.eyebrow}</h1>
        <ul className="grid grid-cols-2 gap-3">
          {CITY_GUIDE_IDS.map((id) => {
            const city = cityOf(id);
            if (!city) return null;
            return (
              <li key={id}>
                <Link href={cityPath(id, lang)} className="relative block aspect-[4/5] overflow-hidden rounded-[18px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={city.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  <span className="absolute inset-0 bg-gradient-to-t from-[rgba(13,31,54,.8)] to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3 text-white">
                    <span className="text-[17px] font-bold">{city[lang].name}</span>
                    <span className="text-[12px] leading-snug text-white/85">{city[lang].note}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
