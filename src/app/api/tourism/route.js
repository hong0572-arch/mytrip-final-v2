import { NextResponse } from "next/server";

// VisitKorea 축제/행사 데이터 프록시
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const numOfRows = searchParams.get("numOfRows") || "10";

    // VisitKorea 축제/행사 API (API 키 불필요)
    const res = await fetch(
      "https://korean.visitkorea.or.kr/kfes/list/selectWntyFstvlList.do",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: `searchType=fstvl&pageUnit=${numOfRows}&pageIndex=1`,
        next: { revalidate: 3600 }, // 1시간 캐시
      }
    );

    if (!res.ok) {
      return NextResponse.json({ items: [], error: "VisitKorea API 호출 실패" }, { status: 500 });
    }

    const data = await res.json();
    const rawItems = data.resultList || [];

    // 데이터 정제
    const items = rawItems
      .map((item) => {
        // 이미지 URL: dispFstvlCntntsImgRout 필드에 CDN 전체 URL이 있음
        const image = item.dispFstvlCntntsImgRout || "";

        // 홈페이지 URL 추출 (HTML 태그에서 href 파싱)
        let homepageUrl = "";
        const hmpg = item.fstvlHmpgUrl || "";
        const hrefMatch = hmpg.match(/href=["']?(https?:\/\/[^\s"'>]+)/i);
        if (hrefMatch) {
          homepageUrl = hrefMatch[1];
        }

        // 상세 URL: 홈페이지 > 네이버 검색 폴백
        const detailUrl = homepageUrl || 
          `https://search.naver.com/search.naver?query=${encodeURIComponent(item.cntntsNm || "")}+축제`;

        return {
          id: item.rmsCntntsId || item.progrsStatNm || String(Math.random()),
          title: item.cntntsNm || "",
          addr: item.rdnmadr || item.lnmadr || "",
          image: image,
          eventStartDate: item.fstvlBgngDe || "",
          eventEndDate: item.fstvlEndDe || "",
          tag: "🎉 축제/행사",
          status: item.fstvlDayDiff > 0 ? "진행중" : "예정",
          price: item.fstvlUtztFareInfo || "",
          detailUrl: detailUrl,
        };
      })
      .filter((item) => item.title); // 제목 있는 것만

    return NextResponse.json({
      items,
      totalCount: data.totalCnt || items.length,
    });
  } catch (error) {
    console.error("Tourism API Error:", error);
    return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  }
}
