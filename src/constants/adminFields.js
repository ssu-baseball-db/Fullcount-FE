// 관리자 화면의 입력 항목 정의 (키는 백엔드 요청 필드 이름과 같음)
import { STAT_LABELS, PITCHING_LABELS } from './stats.js';

// 선수 기본 정보 (openapi.yaml PlayerFields)
export const PLAYER_FIELDS = [
  { key: 'playerName', label: '이름', type: 'text', required: true },
  { key: 'birthDate', label: '생년월일', type: 'date' },
  { key: 'heightCm', label: '키 (cm)', type: 'number', min: 1 },
  { key: 'weightKg', label: '몸무게 (kg)', type: 'number', min: 1 },
  {
    key: 'throwHand',
    label: '투구 손',
    type: 'select',
    options: [
      { value: 'R', label: '우투' },
      { value: 'L', label: '좌투' },
    ],
  },
  {
    key: 'batHand',
    label: '타격 방향',
    type: 'select',
    options: [
      { value: 'R', label: '우타' },
      { value: 'L', label: '좌타' },
      { value: 'S', label: '양타' },
    ],
  },
];

// 수정할 수 있는 누적 기록 (openapi.yaml BattingCounts / PitchingCounts)
// 타율·ERA 같은 비율은 입력하지 않는다 — 저장 후 서버가 누적 기록으로 다시 계산한다.
const BATTING_KEYS = [
  'games', 'plateAppearances', 'atBats', 'runs', 'hits', 'doubles', 'triples', 'homeRuns', 'runsBattedIn',
  'stolenBases', 'caughtStealing', 'walks', 'hitByPitch', 'strikeouts', 'sacrificeHits', 'sacrificeFlies',
  'groundedIntoDoublePlays',
];
const PITCHING_KEYS = [
  'games', 'wins', 'losses', 'saves', 'holds', 'outsPitched', 'hitsAllowed', 'homeRunsAllowed', 'walksAllowed',
  'hitBatters', 'strikeouts', 'runsAllowed', 'earnedRuns', 'battersFaced',
];

// 이닝은 DB에 아웃 수로 저장한다: 144이닝 1/3 → 433
const inningsHint = (value) => {
  if (!/^\d+$/.test(String(value).trim())) return '이닝 × 3';
  const outs = Number(value);
  const rest = outs % 3;
  return `= ${Math.floor(outs / 3)}${rest ? ` ${rest}/3` : ''}이닝`;
};

export const RECORD_FIELDS = {
  batter: BATTING_KEYS.map((key) => ({ key, label: STAT_LABELS[key], type: 'count' })),
  pitcher: PITCHING_KEYS.map((key) =>
    key === 'outsPitched'
      ? { key, label: '투구 아웃 수', type: 'count', hint: inningsHint }
      : { key, label: PITCHING_LABELS[key], type: 'count' }
  ),
};

// 서버가 검사하는 규칙 (화면 안내용). 실제 검사는 서버가 저장 전에 한다.
export const RECORD_RULES = {
  batter: ['타수는 타석 이하', '안타는 타수 이하', '안타는 2루타·3루타·홈런 합계 이상', '모든 기록은 0 이상의 정수'],
  pitcher: ['자책점은 실점 이하', '피홈런은 피안타 이하', '모든 기록은 0 이상의 정수'],
};
