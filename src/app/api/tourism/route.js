import { NextResponse } from "next/server";

// data.go.kr API 및 프로덕션 캐시가 모두 작동하지 않을 때 제공할 최종 대체(Mock) 데이터
const FALLBACK_NEWS = [
  {
    id: "mock-1",
    title: "제주 한림공원 수국축제",
    addr: "제주특별자치도 제주시 한림읍 한림로 300",
    image: "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=600&auto=format&fit=crop",
    eventStartDate: "20260601",
    eventEndDate: "20260630",
    tag: "🎉 축제/행사",
    detailUrl: "https://search.naver.com/search.naver?query=%EC%A0%8C%EB%8F%84+%ED%95%9C%EB%A6%BC%EA%B3%B5%EC%9B%90+%EC%88%98%EA%B5%AD%EC%B6%95%EC%A0%9C"
  },
  {
    id: "mock-2",
    title: "부산 기장 멸치축제",
    addr: "부산광역시 기장군 기장읍 대변항 일원",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop",
    eventStartDate: "20260612",
    eventEndDate: "20260614",
    tag: "🎉 축제/행사",
    detailUrl: "https://search.naver.com/search.naver?query=%EB%B6%85%EC%82%B0+%EA%B8%B0%EC%9E%A5+%EB%A9%B8%EC%B9%98%EC%B6%95%EC%A0%9C"
  },
  {
    id: "mock-3",
    title: "서울 중랑 장미축제",
    addr: "서울특별시 중랑구 중랑천로 332",
    image: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=600&auto=format&fit=crop",
    eventStartDate: "20260515",
    eventEndDate: "20260615",
    tag: "🎉 축제/행사",
    detailUrl: "https://search.naver.com/search.naver?query=%EC%84%9C%EC%9A%B8+%EC%9E%A5%EB%AF%B8%EC%B6%95%EC%A0%9C"
  },
  {
    id: "mock-4",
    title: "강릉 단오제",
    addr: "강원특별자치도 강릉시 단오장길 1",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&auto=format&fit=crop",
    eventStartDate: "20260618",
    eventEndDate: "20260625",
    tag: "🎉 축제/행사",
    detailUrl: "https://search.naver.com/search.naver?query=%EA%B0%95%EB%A6%89+%EB%8B%A8%EC%98%A4%EC%A0%9C"
  }
];

// VisitKorea KorService2 축제/행사 데이터 프록시
export async function GET(request) {
  const isFallbackRequest = request.headers.get("x-fallback") === "true";

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
    
    // MyBatis 에러나 공공데이터포털 내부 점검 에러 감지 (resultCode가 0000이 아닐 경우 강제 에러 처리하여 catch 블록 유도)
    if (data.resultCode && data.resultCode !== "0000") {
      throw new Error(`data.go.kr root error ${data.resultCode}: ${data.resultMsg}`);
    }
    if (headerObj && headerObj.resultCode !== "0000") {
      throw new Error(`data.go.kr API header error ${headerObj.resultCode}: ${headerObj.resultMsg}`);
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
    let items = rawItems
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
      .filter((item) => item.title); // 타이틀이 정상적으로 있는 데이터만 추출

    // 공공데이터포털 응답 성공(200)했으나 결과 항목이 0개일 경우
    if (items.length === 0) {
      throw new Error("data.go.kr returned 0 items.");
    }

    return NextResponse.json({
      items,
      totalCount: items.length,
    });

  } catch (error) {
    console.error("Tourism API Proxy Error:", error.message);

    // [자가 치유 로직] 공공데이터포털 API가 다운되었을 경우, 프로덕션 Vercel Edge CDN 캐시 서버에서 데이터를 가져옴
    if (!isFallbackRequest) {
      try {
        console.log("Attempting to fetch cached actual data from production CDN (https://tripmaker.tips)...");
        const prodRes = await fetch("https://tripmaker.tips/api/tourism/?type=festival&numOfRows=10", {
          headers: { "x-fallback": "true" },
          next: { revalidate: 3600 }
        });
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          if (prodData && prodData.items && prodData.items.length > 0) {
            console.log("Successfully retrieved actual cached data from production CDN!");
            return NextResponse.json({
              ...prodData,
              cached: true,
              warning: "Loaded from production CDN cache due to data.go.kr downtime"
            });
          }
        }
      } catch (prodErr) {
        console.error("Failed to fetch from production CDN cache:", prodErr);
      }
    }

    // 프로덕션 캐시도 없거나 실패 시, 최종 보루로 고품질 Mock 데이터 반환
    console.warn("Both data.go.kr and production cache failed. Serving fallback mock data.");
    return NextResponse.json({
      items: FALLBACK_NEWS,
      totalCount: FALLBACK_NEWS.length,
      warning: "Serving fallback mock data"
    });
  }
}
