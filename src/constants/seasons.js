// 백엔드 명세(openapi.yaml)의 Season 범위: 2015 ~ 2026
// 시즌 목록을 주는 API가 없어서 프론트에서 범위를 정해 둔다.
export const FIRST_SEASON = 2015;
export const LAST_SEASON = 2026;

// 최신 시즌이 앞에 오도록 [2026, 2025, ..., 2015]
export const SEASONS = Array.from(
  { length: LAST_SEASON - FIRST_SEASON + 1 },
  (_, i) => LAST_SEASON - i
);
