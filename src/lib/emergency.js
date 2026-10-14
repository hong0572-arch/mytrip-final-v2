// 여행지별 현지 긴급번호(경찰·구급·소방). 일정의 목적지 글(도시·나라 이름)로 나라를 찾는다.
// 대사관·총영사관 긴급연락처는 외교부 공공데이터(/api/emergency)에서 받는다.
// 번호는 바뀔 수 있다 — 화면에 '출발 전 외교부 해외안전여행(0404.go.kr)에서 확인' 안내를 함께 둔다.
// 형식: [ISO2, 한국어 나라 이름, 영어 이름, 찾는 말(정규식), 경찰, 구급, 소방, 관광경찰(선택)]
const RAW = [
  ['KR', '대한민국', 'South Korea', /대한민국|한국|korea|서울|seoul|부산|busan|제주|jeju|강릉|gangneung|경주|gyeongju|전주|jeonju|인천|incheon|여수|속초|대구|대전|광주|울산|수원|춘천|통영/i, '112', '119', '119'],
  ['JP', '일본', 'Japan', /일본|japan|도쿄|tokyo|오사카|osaka|교토|kyoto|후쿠오카|fukuoka|삿포로|sapporo|오키나와|okinawa|나고야|nagoya|나라|nara|고베|kobe|요코하마|yokohama|하코네|가나자와|히로시마|hiroshima|벳푸|유후인|나가사키/i, '110', '119', '119'],
  ['CN', '중국', 'China', /중국|china|베이징|beijing|상하이|shanghai|칭다오|qingdao|청두|chengdu|시안|xi'?an|광저우|guangzhou|선전|shenzhen|하얼빈|harbin|장가계|zhangjiajie|항저우|hangzhou|쿤밍|다롄|dalian/i, '110', '120', '119'],
  ['TW', '대만', 'Taiwan', /대만|taiwan|타이베이|taipei|가오슝|kaohsiung|타이중|taichung|타이난|tainan|지우펀|화롄/i, '110', '119', '119'],
  ['HK', '홍콩', 'Hong Kong', /홍콩|hong ?kong/i, '999', '999', '999'],
  ['MO', '마카오', 'Macau', /마카오|macau|macao/i, '999', '999', '999'],
  ['TH', '태국', 'Thailand', /태국|thailand|방콕|bangkok|푸켓|phuket|치앙마이|chiang ?mai|파타야|pattaya|끄라비|krabi|코사무이|samui|후아힌/i, '191', '1669', '199', '1155'],
  ['VN', '베트남', 'Vietnam', /베트남|vietnam|다낭|da ?nang|하노이|hanoi|호치민|ho ?chi ?minh|나트랑|nha ?trang|푸꾸옥|phu ?quoc|호이안|hoi ?an|달랏|da ?lat|하롱/i, '113', '115', '114'],
  ['PH', '필리핀', 'Philippines', /필리핀|philippines|세부|cebu|마닐라|manila|보라카이|boracay|보홀|bohol|팔라완|palawan|클라크/i, '911', '911', '911'],
  ['SG', '싱가포르', 'Singapore', /싱가포르|singapore/i, '999', '995', '995'],
  ['MY', '말레이시아', 'Malaysia', /말레이시아|malaysia|쿠알라룸푸르|kuala ?lumpur|코타키나발루|kota ?kinabalu|페낭|penang|랑카위|langkawi/i, '999', '999', '994'],
  ['ID', '인도네시아', 'Indonesia', /인도네시아|indonesia|발리|bali|자카르타|jakarta|롬복|lombok|족자카르타|yogyakarta/i, '110', '118', '113'],
  ['KH', '캄보디아', 'Cambodia', /캄보디아|cambodia|씨엠립|siem ?reap|프놈펜|phnom ?penh/i, '117', '119', '118'],
  ['LA', '라오스', 'Laos', /라오스|laos|비엔티안|vientiane|루앙프라방|luang ?prabang|방비엥|vang ?vieng/i, '1191', '1195', '1190'],
  ['MN', '몽골', 'Mongolia', /몽골|mongolia|울란바토르|ulaanbaatar/i, '102', '103', '101'],
  ['IN', '인도', 'India', /인도(?!네시아)|india|델리|delhi|뭄바이|mumbai|아그라|agra|자이푸르|jaipur|바라나시|varanasi|고아/i, '112', '108', '101'],
  ['NP', '네팔', 'Nepal', /네팔|nepal|카트만두|kathmandu|포카라|pokhara/i, '100', '102', '101'],
  ['LK', '스리랑카', 'Sri Lanka', /스리랑카|sri ?lanka|콜롬보|colombo/i, '119', '1990', '110'],
  ['MV', '몰디브', 'Maldives', /몰디브|maldives|말레/i, '119', '102', '118'],
  ['AE', '아랍에미리트', 'United Arab Emirates', /아랍에미리트|uae|united arab emirates|두바이|dubai|아부다비|abu ?dhabi/i, '999', '998', '997'],
  ['QA', '카타르', 'Qatar', /카타르|qatar|도하|doha/i, '999', '999', '999'],
  ['TR', '튀르키예', 'Türkiye', /튀르키예|터키|turkey|türkiye|이스탄불|istanbul|카파도키아|cappadocia|안탈리아|antalya|이즈미르/i, '112', '112', '112'],
  ['EG', '이집트', 'Egypt', /이집트|egypt|카이로|cairo|룩소르|luxor|후르가다/i, '122', '123', '180'],
  ['CZ', '체코', 'Czechia', /체코|czech|프라하|prague|praha|체스키|cesky|브르노|brno/i, '158', '155', '150'],
  ['FR', '프랑스', 'France', /프랑스|france|파리|paris|니스|nice|리옹|lyon|마르세유|marseille|몽생미셸|보르도|bordeaux|스트라스부르/i, '17', '15', '18'],
  ['IT', '이탈리아', 'Italy', /이탈리아|italy|로마|rome|밀라노|milan|피렌체|florence|베네치아|venice|나폴리|naples|아말피|amalfi|시칠리아|sicily|친퀘테레/i, '112', '118', '115'],
  ['ES', '스페인', 'Spain', /스페인|spain|바르셀로나|barcelona|마드리드|madrid|세비야|seville|그라나다|granada|말라가|malaga|론다|ronda|발렌시아|valencia|빌바오|산세바스티안/i, '091', '112', '112'],
  ['PT', '포르투갈', 'Portugal', /포르투갈|portugal|리스본|lisbon|포르투|porto(?!f)|신트라/i, '112', '112', '112'],
  ['DE', '독일', 'Germany', /독일|germany|베를린|berlin|뮌헨|munich|프랑크푸르트|frankfurt|함부르크|hamburg|하이델베르크|퓌센|쾰른/i, '110', '112', '112'],
  ['AT', '오스트리아', 'Austria', /오스트리아|austria|비엔나|빈(?![가-힣])|vienna|잘츠부르크|salzburg|할슈타트|hallstatt|인스브루크/i, '133', '144', '122'],
  ['CH', '스위스', 'Switzerland', /스위스|switzerland|취리히|zurich|인터라켄|interlaken|루체른|lucerne|제네바|geneva|체르마트|zermatt|그린델발트|융프라우/i, '117', '144', '118'],
  ['GB', '영국', 'United Kingdom', /영국|united kingdom|\buk\b|런던|london|에든버러|edinburgh|맨체스터|리버풀|옥스퍼드|코츠월드/i, '999', '999', '999'],
  ['IE', '아일랜드', 'Ireland', /아일랜드|ireland|더블린|dublin/i, '112', '112', '112'],
  ['NL', '네덜란드', 'Netherlands', /네덜란드|netherlands|암스테르담|amsterdam|로테르담/i, '112', '112', '112'],
  ['BE', '벨기에', 'Belgium', /벨기에|belgium|브뤼셀|brussels|브뤼헤|bruges/i, '101', '112', '112'],
  ['GR', '그리스', 'Greece', /그리스|greece|아테네|athens|산토리니|santorini|미코노스|mykonos|크레타/i, '100', '166', '199', '1571'],
  ['HU', '헝가리', 'Hungary', /헝가리|hungary|부다페스트|budapest/i, '107', '104', '105'],
  ['HR', '크로아티아', 'Croatia', /크로아티아|croatia|두브로브니크|dubrovnik|자그레브|zagreb|스플리트|split|플리트비체/i, '192', '194', '193'],
  ['PL', '폴란드', 'Poland', /폴란드|poland|바르샤바|warsaw|크라쿠프|krakow/i, '997', '999', '998'],
  ['DK', '덴마크', 'Denmark', /덴마크|denmark|코펜하겐|copenhagen/i, '112', '112', '112'],
  ['SE', '스웨덴', 'Sweden', /스웨덴|sweden|스톡홀름|stockholm/i, '112', '112', '112'],
  ['NO', '노르웨이', 'Norway', /노르웨이|norway|오슬로|oslo|베르겐|bergen|트롬쇠/i, '112', '113', '110'],
  ['FI', '핀란드', 'Finland', /핀란드|finland|헬싱키|helsinki|로바니에미/i, '112', '112', '112'],
  ['IS', '아이슬란드', 'Iceland', /아이슬란드|iceland|레이캬비크|reykjavik/i, '112', '112', '112'],
  ['US', '미국', 'United States', /미국|usa|united states|뉴욕|new ?york|로스앤젤레스|los ?angeles|\bla\b|샌프란시스코|san ?francisco|하와이|hawaii|호놀룰루|라스베이거스|las ?vegas|시카고|chicago|시애틀|seattle|보스턴|boston|올랜도|마이애미|워싱턴|그랜드캐니언/i, '911', '911', '911'],
  ['GU', '괌', 'Guam', /괌|guam/i, '911', '911', '911'],
  ['MP', '사이판', 'Northern Mariana Islands', /사이판|saipan|티니안/i, '911', '911', '911'],
  ['CA', '캐나다', 'Canada', /캐나다|canada|밴쿠버|vancouver|토론토|toronto|밴프|banff|몬트리올|montreal|퀘벡|quebec|캘거리|calgary|옐로나이프/i, '911', '911', '911'],
  ['MX', '멕시코', 'Mexico', /멕시코|mexico|칸쿤|cancun|멕시코시티/i, '911', '911', '911'],
  ['BR', '브라질', 'Brazil', /브라질|brazil|리우|rio de janeiro|상파울루|sao paulo/i, '190', '192', '193'],
  ['PE', '페루', 'Peru', /페루|peru|리마|lima|쿠스코|cusco|마추픽추|machu ?picchu/i, '105', '106', '116'],
  ['CL', '칠레', 'Chile', /칠레|chile|산티아고|santiago|파타고니아/i, '133', '131', '132'],
  ['AR', '아르헨티나', 'Argentina', /아르헨티나|argentina|부에노스아이레스|buenos ?aires/i, '911', '107', '100'],
  ['AU', '호주', 'Australia', /호주|australia|시드니|sydney|멜버른|melbourne|브리즈번|brisbane|골드코스트|gold ?coast|케언즈|cairns|퍼스|perth/i, '000', '000', '000'],
  ['NZ', '뉴질랜드', 'New Zealand', /뉴질랜드|new ?zealand|오클랜드|auckland|퀸스타운|queenstown|크라이스트처치/i, '111', '111', '111'],
  ['ZA', '남아프리카공화국', 'South Africa', /남아공|남아프리카|south africa|케이프타운|cape ?town|요하네스버그/i, '10111', '10177', '10177'],
  ['MA', '모로코', 'Morocco', /모로코|morocco|마라케시|marrakech|페스|fes|카사블랑카/i, '19', '15', '15'],
];

export const COUNTRIES = RAW.map(([iso, ko, en, match, police, ambulance, fire, touristPolice]) => ({ iso, ko, en, match, police, ambulance, fire, touristPolice: touristPolice || null }));

/** 목적지 글 → 나라. 못 찾으면 null */
export function findCountry(destination = '') {
  const text = String(destination || '');
  return COUNTRIES.find((c) => c.match.test(text)) || null;
}

export const CONSULAR_CALL = '+82-2-3210-0404';
