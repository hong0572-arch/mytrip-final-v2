import { NextResponse } from "next/server";

// VisitKorea KorService2 축제/행사 데이터 프록시
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const numOfRows = searchParams.get("numOfRows") || "10";

    // 공공데이터포털 한국관광공사 국문 관광정보 서비스 인증키
    const serviceKey = "8ed14b467e021a7ef5801d0a9628602170d0414f8ade42814a9cde30ec04f2fb";
    
    // 오늘 날짜 구하기 (YYYYMMDD 형식)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const eventStartDate = `${year}${month}${day}`;

    // 요청 파라미터 구성
    const params = new URLSearchParams({
      serviceKey: serviceKey,
      numOfRows: numOfRows,
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "TripMaker",
      _type: "json",
      dataType: "JSON",
      listYN: "Y",
      arrange: "C", // 시작일 순 정렬
      eventStartDate: eventStartDate,
    });

    const apiUrl = `https://apis.data.go.kr/B551011/KorService2/searchFestival2?${params.toString()}`;

    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 3600 }, // 1시간 캐시
    });

    if (!res.ok) {
      return NextResponse.json({ items: [], error: `data.go.kr API HTTP error: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    
    const responseObj = data?.response;
    const bodyObj = responseObj?.body;
    const itemsContainer = bodyObj?.items;
    
    let rawItems = [];
    if (itemsContainer && itemsContainer.item) {
      if (Array.isArray(itemsContainer.item)) {
        rawItems = itemsContainer.item;
      } else if (typeof itemsContainer.item === 'object') {
        rawItems = [itemsContainer.item];
      }
    }

    // 국문 필드 명세를 프론트엔드 규격에 맞게 매핑
    const items = rawItems
      .map((item) => {
        const detailUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(item.title || "")}+축제`;

        return {
          id: item.contentid || String(Math.random()),
          title: item.title || "",
          addr: item.addr1 || item.addr2 || "",
          image: item.firstimage || item.firstimage2 || "",
          eventStartDate: item.eventstartdate || "",
          eventEndDate: item.eventenddate || "",
          tag: "🎉 축제/행사",
          detailUrl: detailUrl,
        };
      })
      .filter((item) => item.title); // 제목이 있는 데이터만 필터링

    return NextResponse.json({
      items,
      totalCount: bodyObj?.totalCount || items.length,
    });
  } catch (error) {
    console.error("Tourism API Proxy Error:", error);
    return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  }
}
