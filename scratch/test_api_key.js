const serviceKey = "a4b7729944fec19e456ea3c89d4009106447e1fbd2dbdbb4db0cff882b6bf98c";
const eventStartDate = "20260611";

const params = new URLSearchParams({
  serviceKey: serviceKey,
  numOfRows: "10",
  pageNo: "1",
  MobileOS: "ETC",
  MobileApp: "TripMaker",
  _type: "json",
  arrange: "C",
  eventStartDate: eventStartDate,
});

const apiUrl = `https://apis.data.go.kr/B551011/KorService2/searchFestival2?${params.toString()}`;

console.log("Fetching: " + apiUrl.replace(serviceKey, "HIDDEN"));

fetch(apiUrl)
  .then(res => {
    console.log("Status: " + res.status);
    return res.text();
  })
  .then(text => {
    console.log("Response text (first 500 chars):");
    console.log(text.substring(0, 500));
  })
  .catch(err => {
    console.error("Error: ", err);
  });
