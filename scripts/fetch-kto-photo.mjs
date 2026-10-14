// 한국관광공사 관광사진(공공누리 제1유형)으로 홈 도시 사진을 만든다.
// 사용: TOUR_API_KEY=<공공데이터포털 인증키(인코딩)> node scripts/fetch-kto-photo.mjs <cityId> "<검색어>" [후보 번호]
//  - 후보 번호 없이 실행하면 가로 사진 후보 목록(번호·촬영월·제목·촬영자·주소)을 보여 준다.
//  - 번호를 주면 public/home/<cityId>.webp(640×480)로 저장하고 homeCities.js에 넣을 credit을 출력한다.
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const [cityId, keyword, pick] = process.argv.slice(2);
const key = process.env.TOUR_API_KEY;

async function main() {
  if (!cityId || !keyword || !key) {
    console.error('사용법: TOUR_API_KEY=... node scripts/fetch-kto-photo.mjs <cityId> "<검색어>" [후보 번호]');
    process.exitCode = 1;
    return;
  }

  const serviceKey = key.includes('%') ? key : encodeURIComponent(key);
  const url = `https://apis.data.go.kr/B551011/PhotoGalleryService1/gallerySearchList1?serviceKey=${serviceKey}`
    + `&numOfRows=40&pageNo=1&MobileOS=ETC&MobileApp=TripMaker&_type=json&arrange=C&keyword=${encodeURIComponent(keyword)}`;
  const json = await (await fetch(url)).json();
  const items = [].concat(json?.response?.body?.items?.item || [])
    .sort((a, b) => String(b.galPhotographyMonth).localeCompare(String(a.galPhotographyMonth)));
  if (!items.length) {
    console.error('사진을 찾지 못했어요:', JSON.stringify(json).slice(0, 200));
    process.exitCode = 1;
    return;
  }

  if (pick === undefined) {
    items.slice(0, 15).forEach((it, i) => console.log(`${i}\t${it.galPhotographyMonth}\t${it.galTitle}\t${it.galPhotographer}\t${it.galWebImageUrl}`));
    return;
  }

  const it = items[Number(pick)];
  const buf = Buffer.from(await (await fetch(it.galWebImageUrl)).arrayBuffer());
  const out = await sharp(buf).resize(640, 480, { fit: 'cover' }).webp({ quality: 78 }).toBuffer();
  await writeFile(`public/home/${cityId}.webp`, out);
  const by = String(it.galPhotographer || '').replace(/^한국관광공사\s*/, '');
  console.log(`저장: public/home/${cityId}.webp (${Math.round(out.length / 1024)}KB)`);
  console.log(`credit: { name: '한국관광공사', nameEn: 'Korea Tourism Organization', by: '${by}', license: '공공누리 제1유형', source: 'https://api.visitkorea.or.kr (관광사진 ${it.galContentId})' },`);
}

await main();
