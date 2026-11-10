// 기록 키는 백엔드 응답 필드 이름(openapi.yaml)과 같게 맞춘다.

// 화면에 보여줄 이름
export const STAT_LABELS = {
  // 타격
  games: '경기',
  plateAppearances: '타석',
  atBats: '타수',
  runs: '득점',
  hits: '안타',
  doubles: '2루타',
  triples: '3루타',
  homeRuns: '홈런',
  runsBattedIn: '타점',
  stolenBases: '도루',
  caughtStealing: '도루자',
  walks: '볼넷',
  hitByPitch: '사구',
  strikeouts: '삼진',
  sacrificeHits: '희생번트',
  sacrificeFlies: '희생플라이',
  groundedIntoDoublePlays: '병살',
  avg: '타율',
  obp: '출루율',
  slg: '장타율',
  ops: 'OPS',
  // 투구
  wins: '승',
  losses: '패',
  saves: '세이브',
  holds: '홀드',
  outsPitched: '이닝',
  hitsAllowed: '피안타',
  homeRunsAllowed: '피홈런',
  walksAllowed: '볼넷',
  hitBatters: '사구',
  runsAllowed: '실점',
  earnedRuns: '자책점',
  battersFaced: '타자 수',
  era: '평균자책점',
  whip: 'WHIP',
  winningPct: '승률',
};

// 투수 기록에서 '삼진'은 '탈삼진', '승'은 '승리'처럼 다르게 부르는 경우
export const PITCHING_LABELS = { ...STAT_LABELS, strikeouts: '탈삼진' };

// 순위·비교 화면처럼 이름만 따로 보여줄 때 쓰는 이름
export const CATEGORY_LABELS = {
  avg: '타율',
  obp: '출루율',
  slg: '장타율',
  ops: 'OPS',
  homeRuns: '홈런',
  runsBattedIn: '타점',
  stolenBases: '도루',
  era: '평균자책점',
  whip: 'WHIP',
  wins: '승리',
  strikeouts: '탈삼진',
  saves: '세이브',
};
export const STAT_UNITS = {
  homeRuns: '개',
  runsBattedIn: '점',
  stolenBases: '개',
  wins: '승',
  strikeouts: '개',
  saves: '개',
};

// 정렬 기준 (명세의 BattingSort / PitchingSort 와 같은 값)
export const BATTING_SORTS = ['avg', 'obp', 'slg', 'ops', 'homeRuns', 'runsBattedIn', 'stolenBases'];
export const PITCHING_SORTS = ['era', 'whip', 'wins', 'strikeouts', 'saves'];

// 규정타석·규정이닝을 채운 선수만 순위를 매기는 비율 지표
// (명세상 타율·출루율·장타율·OPS 는 필수, ERA·WHIP 는 화면에서 같은 규칙을 적용)
export const QUALIFIED_ONLY_SORTS = ['avg', 'obp', 'slg', 'ops', 'era', 'whip'];

// 메인 화면 부문별 순위에 보여줄 항목
export const LEADER_CATEGORIES = {
  batting: [
    { key: 'avg', qualified: true },
    { key: 'homeRuns' },
    { key: 'runsBattedIn' },
    { key: 'stolenBases' },
  ],
  pitching: [
    { key: 'era', qualified: true },
    { key: 'wins' },
    { key: 'strikeouts' },
    { key: 'saves' },
  ],
};

export const LEADER_TYPES = [
  { value: 'batting', label: '타자' },
  { value: 'pitching', label: '투수' },
];

// 선수 상세·비교 API 의 type 값
export const PLAYER_TYPES = [
  { value: 'batter', label: '타자' },
  { value: 'pitcher', label: '투수' },
];
