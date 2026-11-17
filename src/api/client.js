// ------------------------------------------------------------
// 백엔드 API 호출을 한곳에 모아 둔 파일.
//
// USE_MOCK = true  → 목업 서버(src/mock/mockServer.js)가 대신 응답 (백엔드 없이 화면 작업 가능)
// USE_MOCK = false → 실제 스프링부트 API(/api/...) 호출
//
// 백엔드 API가 준비되면 프로젝트 맨 위 폴더의 .env 파일에 VITE_USE_MOCK=false 를 넣으면 된다.
// (.env 를 바꾼 뒤에는 npm run dev 를 다시 실행해야 적용된다)
// ------------------------------------------------------------
import { getToken } from '../auth/session.js';

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
  if (status === 401) return '로그인이 필요합니다.';
  if (status === 403) return '이 기능을 사용할 권한이 없습니다.';
  if (status === 404) return '요청한 기록을 찾을 수 없습니다.';
  if (status === 409) return '이미 등록된 값입니다.';
  if (status >= 500) return '서버에서 오류가 났습니다. 백엔드(8080)가 켜져 있는지 확인해 주세요.';
  return `서버 응답 오류 (${status})`;
}

/**
 * GET 요청을 보내고 JSON 을 돌려준다.
 * 예) getJson('/api/seasons/2024/batting-stats', { sort: 'avg', qualified: true })
 */
export function getJson(path, params = {}) {
  return requestJson('GET', path, params);
}

/**
 * POST 요청을 보내고 JSON 을 돌려준다. (본문 없이 주소만으로 요청하는 API용)
 * 예) postJson('/api/games/20240915LGHT0/summary')
 */
export function postJson(path, params = {}) {
  return requestJson('POST', path, params);
}

/**
 * JSON 본문을 담아 요청을 보낸다. (관리자 등록·수정, 로그인처럼 값을 보내는 API용)
 * 예) sendJson('PATCH', '/api/admin/players/76232', { birthDate: '2000-01-01' })
 */
export function sendJson(method, path, body) {
  return requestJson(method, path, {}, body);
}

async function requestJson(method, path, params, body) {
  const query = toQueryString(params);
  // 로그인했다면 모든 요청에 'Authorization: Bearer 토큰' 헤더를 붙인다. 권한 확인은 백엔드가 한다.
  const token = getToken();

  if (USE_MOCK) {
    // 목업 코드는 목업 모드일 때만 불러온다 (실제 배포 파일에는 들어가지 않음)
    const { handleMockRequest } = await import('../mock/mockServer.js');
    await new Promise((resolve) => setTimeout(resolve, 200)); // 실제 네트워크처럼 약간 지연
    return handleMockRequest(path, Object.fromEntries(new URLSearchParams(query)), method, {
      body: body === undefined ? undefined : JSON.parse(JSON.stringify(body)),
      token,
    });
  }

  const url = query ? `${path}?${query}` : path;
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
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

  // 로그아웃처럼 본문이 없는 응답(204)도 처리한다
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
