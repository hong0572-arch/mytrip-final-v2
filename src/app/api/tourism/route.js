import { NextResponse } from "next/server";

// VisitKorea KorService2 축제/행사 데이터 프록시
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const numOfRows = searchParams.get("numOfRows") || "10";

    // 1. 공공데이터포털 발급 서비스키 (일반 인증키 - Decoding/Encoding 동일한 hex 값)
    const serviceKey = "a4b7729944fec19e456ea3c89d4009106447e1fbd2dbdbb4db0cff882b6bf98c";

    // 2. 오늘 날짜 계산 (YYYYMMDD 형식)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const eventStartDate = `${year}${month}${day}`;

    // 3. TourAPI 4.0 규격에 맞는 필수 파라미터만 안전하게 매핑 (불필요한 파라미터는 에러 유발)
    const params = new URLSearchParams({
      serviceKey: serviceKey,
      numOfRows: numOfRows,
      pageNo: "1",
      MobileOS: "ETC",
      MobileApp: "TripMaker",
      _type: "json",        // JSON 응답 요청
      arrange: "C",         // 행사 시작일 순 정렬
      eventStartDate: eventStartDate,
    });

    const apiUrl = `https://apis.data.go.kr/B551011/KorService2/searchFestival2?${params.toString()}`;

    // 4. API 요청 전송
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 3600 }, // 1시간 캐시 적용
    });

    if (!res.ok) {
      throw new Error(`data.go.kr API HTTP error: ${res.status}`);
    }

    // 5. 응답 본문 텍스트 획득 및 XML 오류 체크
    const responseText = await res.text();
    
    // 만약 데이터포털 에러로 XML 형식이 반환된 경우 처리
    if (responseText.includes("<?xml") || responseText.includes("<OpenAPI_ServiceResponse>")) {
      console.error("data.go.kr returned XML error response instead of JSON:", responseText);
      // XML 에러 메시지 파싱 시도
      const errorMsgMatch = responseText.match(/<errMsg>(.*?)<\/errMsg>/);
      const returnAuthMsgMatch = responseText.match(/<returnAuthMsg>(.*?)<\/returnAuthMsg>/);
      const errorDetail = errorMsgMatch ? errorMsgMatch[1] : (returnAuthMsgMatch ? returnAuthMsgMatch[1] : "인증 오류 또는 시스템 에러");
      throw new Error(`data.go.kr API error (XML): ${errorDetail}`);
    }

    // JSON 파싱
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error("Failed to parse API response as JSON: " + parseError.message);
    }

    // 6. 데이터 구조 안전하게 해체 분해
    const responseObj = data?.response;
    const headerObj = responseObj?.header;
    const bodyObj = responseObj?.body;
    
    // API 내부 에러 코드 검증 (예: resultCode가 0000이 아닌 경우)
    if (headerObj && headerObj.resultCode !== "0000") {
      throw new Error(`data.go.kr API Error code ${headerObj.resultCode}: ${headerObj.resultMsg}`);
    }

    const itemsContainer = bodyObj?.items;
    let rawItems = [];
    
    if (itemsContainer && itemsContainer.item) {
      if (Array.isArray(itemsContainer.item)) {
        rawItems = itemsContainer.item;
      } else if (typeof itemsContainer.item === 'object') {
        rawItems = [itemsContainer.item];
      }
    }

    // 7. 프론트엔드가 요구하는 데이터 스키마로 가공 및 매핑
    const items = rawItems
      .map((item) => {
        // 상세정보 조회를 위한 네이버 검색 폴백 링크 구성
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
      .filter((item) => item.title); // 타이틀이 정상적으로 있는 데이터만 추출

    return NextResponse.json({
      items,
      totalCount: bodyObj?.totalCount || items.length,
    });

  } catch (error) {
    console.error("Tourism API Proxy Fatal Error:", error);
    return NextResponse.json(
      { 
        items: [], 
        error: error.message || "알 수 없는 오류가 발생했습니다." 
      }, 
      { status: 500 }
    );
  }
}
