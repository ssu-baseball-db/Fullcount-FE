// 부문 키는 백엔드 응답 필드 이름(openapi.yaml)과 같게 맞춘다.
export const STAT_LABELS = {
  avg: '타율',
  homeRuns: '홈런',
  runsBattedIn: '타점',
  stolenBases: '도루',
  era: '평균자책점',
  wins: '승리',
  strikeouts: '탈삼진',
  saves: '세이브',
};

// 기록 뒤에 붙일 단위 (없으면 빈 문자열)
export const STAT_UNITS = {
  homeRuns: '개',
  runsBattedIn: '점',
  stolenBases: '개',
  wins: '승',
  strikeouts: '개',
  saves: '개',
};

// 메인 화면 부문별 순위에 보여줄 항목
// qualified: true → 규정타석·규정이닝을 채운 선수만 (비율 기록)
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
