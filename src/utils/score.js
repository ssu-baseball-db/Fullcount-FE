import { LOWER_IS_BETTER } from '../constants/stats.js';

/**
 * 기록을 0~100점으로 바꾼다. 그 시즌 1위 기록(best)이 100점.
 *   높을수록 좋은 기록(홈런 등): 내 기록 ÷ 1위 기록 × 100   예) 1위 40개, 내 기록 30개 → 75점
 *   낮을수록 좋은 기록(ERA 등) : 1위 기록 ÷ 내 기록 × 100   예) 1위 2.00, 내 기록 4.00 → 50점
 * 규정 미달 선수가 1위보다 좋은 비율 기록을 가질 수 있어서 100점을 넘지 않게 자른다.
 * 기록이 없으면(null) null 을 돌려준다.
 */
export function toScore(key, value, best) {
  if (value == null || best == null) return null;
  let score;
  if (LOWER_IS_BETTER.includes(key)) {
    score = value === 0 ? 100 : (best / value) * 100;
  } else {
    score = best === 0 ? 0 : (value / best) * 100;
  }
  return Math.max(0, Math.min(100, score));
}
