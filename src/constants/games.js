// 경기 화면에서 쓰는 상수
import { FIRST_SEASON, LAST_SEASON } from './seasons.js';
import { addDays, weekdayOf } from '../utils/date.js';

// 날짜 선택 상자에서 고를 수 있는 범위
export const GAME_DATE_MIN = `${FIRST_SEASON}-03-01`;
export const GAME_DATE_MAX = `${LAST_SEASON}-11-30`;

/**
 * 경기 화면에 처음 들어왔을 때 보여줄 날짜 (목업에서는 이 날짜 뒤의 경기가 '예정' 경기다).
 * 백엔드를 연결한 뒤 바꾸고 싶으면 여기만 고치면 된다.
 */
export const TODAY = (() => {
  let date = `${LAST_SEASON}-09-27`;
  while (weekdayOf(date) === 1) date = addDays(date, -1); // 월요일이면 하루 앞으로
  return date;
})();
export const DEFAULT_GAME_DATE = TODAY;

// 경기 상태 (openapi Game.status) → 화면 표시. 무승부는 COMPLETED 이면서 점수가 같은 경우라 따로 처리
export const GAME_STATUS_LABELS = {
  SCHEDULED: '경기 예정',
  COMPLETED: '경기 종료',
  CANCELLED: '경기 취소',
  POSTPONED: '경기 연기',
};

// 구장은 데이터가 있을 때만 붙인다: '2026년 9월 26일 (토) · 잠실' / '2026년 9월 26일 (토)'
export function gameMetaText(game) {
  return [game.time, game.stadium].filter(Boolean).join(' · ');
}

// 투수 결과 → 한글 (pitchingStats 의 wins·losses·saves·holds 로 정한다)
export const DECISION_LABELS = { W: '승', L: '패', S: '세', H: '홀드' };
