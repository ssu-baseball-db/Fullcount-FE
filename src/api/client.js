// ------------------------------------------------------------
// 백엔드 API 호출을 한곳에 모아 둔 파일.
//
// USE_MOCK = true  → 목업 데이터(src/mock)를 사용 (백엔드 없이 화면 작업 가능)
// USE_MOCK = false → 실제 스프링부트 API(/api/...) 호출
//
// 백엔드 API가 준비되면 .env 파일에 VITE_USE_MOCK=false 를 넣거나
// 아래 기본값을 false 로 바꾸면 된다.
// ------------------------------------------------------------
export const USE_MOCK = (import.meta.env?.VITE_USE_MOCK ?? 'true') !== 'false';

// GET 요청을 보내고 JSON 을 돌려준다. 실패하면 에러를 던진다.
export async function getJson(path, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${path}?${query}` : path;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`서버 응답 오류 (${response.status})`);
  }
  return response.json();
}

// 목업 모드에서 실제 네트워크처럼 약간 늦게 응답하게 만드는 함수
export function fakeDelay(data, ms = 250) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}
