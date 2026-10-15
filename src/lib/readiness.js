// 떠나기 전 준비 체크리스트 — 여행지(나라)와 남은 날짜에 맞춰 항목을 만든다. 체크 상태는 기기(localStorage tm_readiness_<tripId>).
// 나라별로 바뀌는 것: 입국 준비(공식 링크), 전압·플러그, 현지 긴급번호. 입국 서류는 바뀌기 쉬워 공식 사이트로만 안내한다.
import { findCountry } from './emergency';
import { daysUntil } from '../utils/tripPhase';

// 입국 준비(공식 사이트). kr: 한국 여권 기준 안내, all: 국적과 상관없이 모든 외국인이 하는 것(영어 화면에서도 보여 줌)
const ENTRY = {
  JP: { name: 'Visit Japan Web', url: 'https://www.vjw.digital.go.jp/', all: true },
  US: { name: 'ESTA', url: 'https://esta.cbp.dhs.gov/', kr: true },
  GU: { name: 'ESTA (괌·사이판은 무비자 프로그램도 가능)', url: 'https://esta.cbp.dhs.gov/', kr: true },
  MP: { name: 'ESTA (괌·사이판은 무비자 프로그램도 가능)', url: 'https://esta.cbp.dhs.gov/', kr: true },
  CA: { name: 'eTA', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html', kr: true },
  GB: { name: 'ETA', url: 'https://www.gov.uk/guidance/apply-for-an-electronic-travel-authorisation-eta', kr: true },
  AU: { name: 'ETA (Australian ETA 앱)', url: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601', kr: true },
  NZ: { name: 'NZeTA', url: 'https://www.immigration.govt.nz/new-zealand-visas/visas/visa/nzeta', kr: true },
  TH: { name: 'TDAC (태국 디지털 입국카드)', url: 'https://tdac.immigration.go.th/', all: true },
  SG: { name: 'SG Arrival Card', url: 'https://eservices.ica.gov.sg/sgarrivalcard/', all: true },
  MY: { name: 'MDAC (말레이시아 디지털 입국카드)', url: 'https://imigresen-online.imi.gov.my/mdac/main', all: true },
  PH: { name: 'eTravel', url: 'https://etravel.gov.ph/', all: true },
  ID: { name: 'e-CD 세관 신고(발리 등)', url: 'https://ecd.beacukai.go.id/', all: true },
  TW: { name: '온라인 입국카드', url: 'https://niaspeedy.immigration.gov.tw/webacard/', all: true },
};
const EU = ['FR', 'IT', 'ES', 'PT', 'DE', 'AT', 'CH', 'CZ', 'NL', 'BE', 'GR', 'HU', 'HR', 'PL', 'DK', 'SE', 'NO', 'FI', 'IS'];
for (const iso of EU) ENTRY[iso] = { name: 'ETIAS(유럽 여행 허가) 시행 여부', url: 'https://travel-europe.europa.eu/etias_en', kr: true, check: true };

// 전압·플러그. 한국은 220V · C/F형
const POWER = {
  KR: [220, 'C·F'], JP: [100, 'A·B'], US: [120, 'A·B'], GU: [110, 'A·B'], MP: [120, 'A·B'], CA: [120, 'A·B'], MX: [127, 'A·B'],
  TW: [110, 'A·B'], CN: [220, 'A·C·I'], HK: [220, 'G'], MO: [220, 'G·D'], SG: [230, 'G'], MY: [240, 'G'], GB: [230, 'G'], IE: [230, 'G'], AE: [220, 'G'], QA: [240, 'G'], MV: [230, 'G·D'],
  TH: [220, 'A·B·C·O'], VN: [220, 'A·C'], PH: [220, 'A·B·C'], ID: [230, 'C·F'], KH: [230, 'A·C·G'], LA: [230, 'A·B·C'], MN: [220, 'C·E'], IN: [230, 'C·D·M'], NP: [230, 'C·D·M'], LK: [230, 'D·G'],
  AU: [230, 'I'], NZ: [230, 'I'], IT: [230, 'C·F·L'], CH: [230, 'C·J'], FR: [230, 'C·E'], BE: [230, 'C·E'], CZ: [230, 'C·E'], PL: [230, 'C·E'], DK: [230, 'C·F·K'],
  DE: [230, 'C·F'], ES: [230, 'C·F'], PT: [230, 'C·F'], AT: [230, 'C·F'], NL: [230, 'C·F'], GR: [230, 'C·F'], HU: [230, 'C·F'], HR: [230, 'C·F'], SE: [230, 'C·F'], NO: [230, 'C·F'], FI: [230, 'C·F'], IS: [230, 'C·F'], TR: [230, 'C·F'], EG: [220, 'C·F'], RU: [220, 'C·F'],
  BR: [127, 'C·N'], PE: [220, 'A·C'], CL: [220, 'C·L'], AR: [220, 'C·I'], ZA: [230, 'M·N'], MA: [220, 'C·E'],
};
// 한국 플러그(C·F형)는 C·E·F형 콘센트에 맞는다
const NO_ADAPTER = (plug) => /C|E|F/.test(plug);

const localName = (iso, lang) => {
  const map = { JP: ['일본어', 'Japanese'], CN: ['중국어', 'Chinese'], TW: ['중국어(번체)', 'Chinese'], HK: ['중국어(번체)', 'Chinese'], TH: ['태국어', 'Thai'], VN: ['베트남어', 'Vietnamese'], FR: ['프랑스어', 'French'], IT: ['이탈리아어', 'Italian'], ES: ['스페인어', 'Spanish'], DE: ['독일어', 'German'], CZ: ['체코어', 'Czech'], PT: ['포르투갈어', 'Portuguese'], KR: ['한국어', 'Korean'] };
  const v = map[iso];
  return v ? v[lang === 'en' ? 1 : 0] : null;
};

/**
 * 체크리스트 만들기. 반환: { country, daysLeft, groups: [{ id, items: [{ id, title, sub, action? }] }] }
 * action: { type: 'safe' | 'trip' | 'chat' | 'link', label, href?, prompt? }
 */
export function buildReadiness(trip, copy, lang = 'ko') {
  const destination = trip?.destination || trip?.tripTitle || '';
  const c = findCountry(destination);
  const iso = c?.iso;
  const daysLeft = daysUntil(trip?.startDate);
  const city = String(destination).split(/[,#]/)[0].trim();
  const t = copy;
  const ko = lang !== 'en';

  const entry = iso && ENTRY[iso] && (ko ? true : ENTRY[iso].all) ? ENTRY[iso] : null;
  const power = iso ? POWER[iso] : null;
  const isAbroad = iso && iso !== 'KR';

  const now = [
    isAbroad && { id: 'passport', title: t.passport, sub: t.passportSub },
    isAbroad && entry && { id: 'entry', title: t.entry(ko ? entry.name : entry.name.replace(/\s*\(.*\)/, '').replace(/ 시행 여부$/, '')), sub: entry.check ? t.entryCheckSub : t.entrySub, action: { type: 'link', label: t.officialSite, href: entry.url } },
    isAbroad && !entry && ko && { id: 'entry', title: t.entryGeneric, sub: t.entryGenericSub, action: { type: 'link', label: t.officialSite, href: 'https://www.0404.go.kr/' } },
    isAbroad && { id: 'insurance', title: t.insurance, sub: t.insuranceSub },
    isAbroad && { id: 'money', title: t.money, sub: t.moneySub },
    isAbroad && { id: 'esim', title: t.esim, sub: t.esimSub },
    !isAbroad && { id: 'stay', title: t.stayBooked, sub: t.stayBookedSub },
  ].filter(Boolean);

  const lang2 = iso ? localName(iso, lang) : null;
  const d3 = [
    { id: 'guardian', title: t.guardian, sub: t.guardianSub, action: { type: 'safe', label: t.connect } },
    { id: 'address', title: lang2 && isAbroad ? t.addressLocal(lang2) : t.address, sub: t.addressSub, action: { type: 'trip', label: t.openTrip } },
    { id: 'arrival', title: t.arrival, sub: t.arrivalSub, action: { type: 'chat', label: t.askTimmy, prompt: t.arrivalPrompt(city || destination) } },
    { id: 'offline', title: t.offline, sub: t.offlineSub, action: { type: 'trip', label: t.openTrip } },
    isAbroad && ko && { id: 'mofa', title: t.mofa, sub: t.mofaSub, action: { type: 'link', label: t.register, href: 'https://www.0404.go.kr/' } },
  ].filter(Boolean);

  const bagSub = power
    ? (iso === 'KR' || NO_ADAPTER(power[1]) ? t.powerSame(power[0], power[1]) : t.powerAdapter(c ? (ko ? c.ko : c.en) : '', power[0], power[1]))
    : t.powerUnknown;
  const d1 = [
    { id: 'bag', title: isAbroad ? t.bag : t.bagDomestic, sub: `${t.bagSub} ${bagSub}` },
    { id: 'meds', title: t.meds, sub: t.medsSub },
    { id: 'emergency', title: t.emergency, sub: c ? t.emergencySub(c.police, c.ambulance === c.fire ? c.ambulance : `${c.ambulance}·${c.fire}`) : t.emergencyUnknown, action: { type: 'safe', label: t.safetyTab } },
    isAbroad && { id: 'checkin', title: t.checkin, sub: t.checkinSub },
  ].filter(Boolean);

  return {
    country: c,
    daysLeft,
    groups: [
      { id: 'now', title: t.groupNow, when: t.whenNow, items: now },
      { id: 'd3', title: t.groupD3, when: t.whenD3, badge: t.soloMust, items: d3 },
      { id: 'd1', title: t.groupD1, when: t.whenD1, items: d1 },
    ],
  };
}

// 지금 할 일: 시기가 된 묶음(남은 날짜 기준)부터 안 한 항목 순서대로
export function dueItems(groups, daysLeft, checked) {
  const active = (g) => g.id === 'now' || (g.id === 'd3' && daysLeft != null && daysLeft <= 3) || (g.id === 'd1' && daysLeft != null && daysLeft <= 1);
  const ordered = [...groups.filter(active), ...groups.filter((g) => !active(g))];
  return ordered.flatMap((g) => g.items.filter((i) => !checked[i.id]).map((i) => ({ ...i, group: g })));
}
