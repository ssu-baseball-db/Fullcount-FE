// ------------------------------------------------------------
// 기록 표(StatTable)에 들어갈 열 정의.
// key 는 API 응답 필드 이름, label 은 표 머리글, title 은 머리글에 마우스를 올렸을 때 보이는 설명.
// 페이지에서는 [순위, 이름, 팀] 같은 열을 앞에 붙이고 아래 기록 열을 이어서 쓴다.
// ------------------------------------------------------------
import { STAT_LABELS, PITCHING_LABELS } from './stats.js';

const col = (labels) => (key, extra = {}) => ({ key, label: labels[key], ...extra });
const bat = col(STAT_LABELS);
const pit = col(PITCHING_LABELS);

// 타자 기록 열
export const BATTING_COLUMNS = [
  bat('games'),
  bat('plateAppearances'),
  bat('atBats'),
  bat('runs'),
  bat('hits'),
  bat('doubles'),
  bat('triples'),
  bat('homeRuns'),
  bat('runsBattedIn'),
  bat('stolenBases'),
  bat('walks'),
  bat('strikeouts'),
  bat('avg', { title: '안타 ÷ 타수' }),
  bat('obp', { title: '(안타 + 볼넷 + 사구) ÷ (타수 + 볼넷 + 사구 + 희생플라이)' }),
  bat('slg', { title: '루타 ÷ 타수' }),
  bat('ops', { title: '출루율 + 장타율' }),
];

// 투수 기록 열
export const PITCHING_COLUMNS = [
  pit('games'),
  pit('wins'),
  pit('losses'),
  pit('saves'),
  pit('holds'),
  pit('outsPitched', { title: '투구 아웃 수 ÷ 3' }),
  pit('hitsAllowed'),
  pit('homeRunsAllowed'),
  pit('walksAllowed'),
  pit('strikeouts'),
  pit('runsAllowed'),
  pit('earnedRuns'),
  pit('era', { label: 'ERA', title: '평균자책점: 자책점 × 27 ÷ 아웃 수' }),
  pit('whip', { title: '(피안타 + 볼넷) × 3 ÷ 아웃 수' }),
  pit('winningPct'),
];

// 팀 시즌 성적 열 (2.1 TeamStats)
export const TEAM_COLUMNS = [
  bat('wins', { label: '승' }),
  bat('losses', { label: '패' }),
  bat('runs'),
  bat('homeRuns'),
  bat('stolenBases'),
  bat('avg'),
  bat('ops'),
  bat('runsAllowed', { label: '실점' }),
  pit('era', { label: 'ERA', title: '팀 평균자책점' }),
  pit('whip'),
];
