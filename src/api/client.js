// ------------------------------------------------------------
// 백엔드 API 호출을 한곳에 모아 둔 파일.
//
// USE_MOCK = true  → 목업 서버(src/mock/mockServer.js)가 대신 응답 (백엔드 없이 화면 작업 가능)
// USE_MOCK = false → 실제 스프링부트 API(/api/...) 호출
//
// 백엔드 API가 준비되면 프로젝트 맨 위 폴더의 .env 파일에 VITE_USE_MOCK=false 를 넣으면 된다.
// (.env 를 바꾼 뒤에는 npm run dev 를 다시 실행해야 적용된다)
// ------------------------------------------------------------
export const USE_MOCK = (import.meta.env?.VITE_USE_MOCK ?? 'true') !== 'false';

// API 호출이 실패했을 때 던지는 에러. status 로 400/404 등을 구분할 수 있다.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// 값이 없는(undefined, null, '') 파라미터는 주소에 넣지 않는다
function toQueryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.append(key, value);
  });
  return search.toString();
}

function defaultMessage(status) {
  if (status === 400) return '요청 값이 올바르지 않습니다.';
  if (status === 404) return '요청한 기록을 찾을 수 없습니다.';
  if (status >= 500) return '서버에서 오류가 났습니다. 백엔드(8080)가 켜져 있는지 확인해 주세요.';
  return `서버 응답 오류 (${status})`;
}

/**
 * GET 요청을 보내고 JSON 을 돌려준다.
 * 예) getJson('/api/seasons/2024/batting-stats', { sort: 'avg', qualified: true })
 */
export async function getJson(path, params = {}) {
  const query = toQueryString(params);

  if (USE_MOCK) {
    // 목업 코드는 목업 모드일 때만 불러온다 (실제 배포 파일에는 들어가지 않음)
    const { handleMockRequest } = await import('../mock/mockServer.js');
    await new Promise((resolve) => setTimeout(resolve, 200)); // 실제 네트워크처럼 약간 지연
    return handleMockRequest(path, Object.fromEntries(new URLSearchParams(query)));
  }

  const url = query ? `${path}?${query}` : path;
  let response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없습니다. 백엔드(8080)가 켜져 있는지 확인해 주세요.');
  }

  if (!response.ok) {
    // 백엔드가 { message: "..." } 형태로 이유를 보내 주면 그 문구를 그대로 쓴다
    let message = '';
    try {
      message = (await response.json()).message ?? '';
    } catch {
      // 본문이 JSON 이 아니면 무시
    }
    throw new ApiError(response.status, message || defaultMessage(response.status));
  }

  return response.json();
}
