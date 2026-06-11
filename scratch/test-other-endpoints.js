const serviceKey = "a4b7729944fec19e456ea3c89d4009106447e1fbd2dbdbb4db0cff882b6bf98c";

const testEndpoint = (name, extraParams) => {
  const params = new URLSearchParams({
    serviceKey: serviceKey,
    numOfRows: "5",
    pageNo: "1",
    MobileOS: "ETC",
    MobileApp: "TripMaker",
    _type: "json",
    ...extraParams
  });
  const apiUrl = `https://apis.data.go.kr/B551011/KorService2/${name}?${params.toString()}`;
  console.log(`Testing endpoint ${name}...`);
  return fetch(apiUrl, {
    method: "GET",
    headers: { "Accept": "application/json" }
  })
  .then(res => res.text())
  .then(text => {
    console.log(`Response for ${name} (first 250 chars):`, text.slice(0, 250));
    console.log("---------------------------------------");
  })
  .catch(err => {
    console.error(`Error for ${name}:`, err);
  });
};

async function main() {
  await testEndpoint("areaBasedList2", { contentTypeId: "15" }); // 15 is Event/Festival
  await testEndpoint("searchKeyword2", { keyword: "축제" });
}

main();
