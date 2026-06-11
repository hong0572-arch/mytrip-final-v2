const serviceKey = "a4b7729944fec19e456ea3c89d4009106447e1fbd2dbdbb4db0cff882b6bf98c";
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const eventStartDate = `${year}${month}${day}`;

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
console.log("Fetching API URL:", apiUrl);

fetch(apiUrl, {
  method: "GET",
  headers: {
    "Accept": "application/json",
  }
})
.then(res => {
  console.log("HTTP status:", res.status);
  return res.text();
})
.then(text => {
  console.log("Raw Response (first 500 chars):", text.slice(0, 500));
})
.catch(err => {
  console.error("Fetch Error:", err);
});
