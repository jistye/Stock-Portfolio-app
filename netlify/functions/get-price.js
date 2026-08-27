// 네이버 금융 시세 데이터를 대신 조회해주는 서버 함수 (Netlify Function)
// 브라우저가 직접 요청하면 차단되지만, 서버끼리 통신하면 문제없이 가져올 수 있어요.
exports.handler = async function (event) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  const code = event.queryStringParameters && event.queryStringParameters.code;
  if (!code || !/^[0-9]{6}$/.test(code)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "6자리 종목코드가 필요합니다 (예: 005930)" }),
    };
  }

  try {
    const res = await fetch(
      `https://polling.finance.naver.com/api/realtime/domestic/stock/${code}`
    );
    if (!res.ok) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "네이버 시세 조회 실패 (응답 오류)" }),
      };
    }
    const data = await res.json();
    const item = data && data.datas && data.datas[0];
    if (!item || item.closePrice === undefined) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "해당 종목코드의 시세를 찾을 수 없습니다", raw: item || null }),
      };
    }
    // closePrice 등은 "71,500" 처럼 콤마가 포함된 문자열로 오는 경우가 있어 숫자만 추출
    const toNumber = (v) => {
      if (v === undefined || v === null) return null;
      const n = Number(String(v).replace(/,/g, ""));
      return isNaN(n) ? null : n;
    };
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        code,
        name: item.stockName || item.itemCode || code,
        price: toNumber(item.closePrice),              // 현재가
        change: toNumber(item.compareToPreviousClosePrice), // 전일대비
        changeRate: toNumber(item.fluctuationsRatio),   // 등락률(%)
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "조회 중 오류가 발생했습니다", detail: String(e) }),
    };
  }
};
