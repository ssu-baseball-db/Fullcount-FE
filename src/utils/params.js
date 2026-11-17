// 주소창의 ?year=2024&type=... 값을 안전하게 읽는 함수들
// (잘못된 값이 들어오면 기본값을 쓴다)
import { FIRST_SEASON, LAST_SEASON } from '../constants/seasons.js';

export function readYear(value, fallback = LAST_SEASON) {
  const year = Number(value);
  return Number.isInteger(year) && year >= FIRST_SEASON && year <= LAST_SEASON ? year : fallback;
}

// 연도인데 비어 있으면 null (선수 비교의 '통산')
export function readOptionalYear(value) {
  if (value === null || value === '') return null;
  return readYear(value, null);
}

/**
 * 현재 주소의 검색 파라미터에 changes 를 반영한 새 객체를 만든다.
 * 값이 null/undefined/'' 이면 그 파라미터를 지운다.
 *   setParams(withParams(params, { year: 2024, team: null }))
 */
export function withParams(params, changes) {
  const next = new URLSearchParams(params);
  Object.entries(changes).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') next.delete(key);
    else next.set(key, String(value));
  });
  return next;
}
