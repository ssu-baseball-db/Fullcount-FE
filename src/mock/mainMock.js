// ------------------------------------------------------------
// 목업(가짜) 데이터. 백엔드 API가 나오기 전까지 화면을 만들기 위한 용도다.
// 응답 형식은 백엔드 openapi.yaml 과 똑같이 맞췄고,
// 구단 ID·시즌별 구단명만 실제(db/03_기준정보.sql)이며 성적과 선수 이름은 모두 임의 값이다.
// 시즌을 바꿨을 때 숫자가 달라지도록 연도를 씨앗(seed)으로 써서 값을 만든다.
// ------------------------------------------------------------

const TEAM_IDS = ['KIA', 'SAMSUNG', 'LG', 'DOOSAN', 'KT', 'SSG', 'LOTTE', 'HANWHA', 'NC', 'KIWOOM'];

// 기록이 속한 시즌 당시의 구단명 (넥센→키움 2019년, SK→SSG 2021년)
function teamNameFor(teamId, year) {
  const names = {
    KIA: 'KIA', SAMSUNG: '삼성', LG: 'LG', DOOSAN: '두산', KT: 'KT',
    SSG: year >= 2021 ? 'SSG' : 'SK',
    LOTTE: '롯데', HANWHA: '한화', NC: 'NC',
    KIWOOM: year >= 2019 ? '키움' : '넥센',
  };
  return names[teamId];
}

const PLAYER_NAMES = [
  '김도현', '이준서', '박시우', '최하준', '정우진', '강민재', '조현우', '윤서진',
  '장도윤', '임건우', '한지호', '오승민', '서태윤', '신유찬', '권재원', '황선우',
  '안지후', '송은찬', '류민호', '전태민', '홍준혁', '고우성', '문시현', '배정민',
];

// 같은 씨앗이면 항상 같은 순서의 난수를 돌려주는 간단한 난수 생성기
function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

/** GET /api/seasons/{year}/standings 흉내 */
export function mockStandings(year) {
  const random = seededRandom(year);
  const GAMES = 144;

  const rows = TEAM_IDS.map((teamId) => {
    const wins = Math.round(58 + random() * 30);
    const draws = Math.floor(random() * 4);
    const losses = GAMES - wins - draws;
    return { teamId, teamName: teamNameFor(teamId, year), wins, losses, draws, winningPct: wins / (wins + losses) };
  });

  rows.sort((a, b) => b.winningPct - a.winningPct);

  // 실제 API처럼 '포스트시즌 반영 최종 순위'를 흉내 낸다:
  // 정규시즌 상위 4팀 중 한 팀을 우승 팀으로 골라 공식 순위 1위에 둔다.
  const champion = rows.splice(Math.floor(random() * 4), 1)[0];
  rows.unshift(champion);

  return rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    winningPct: Number(row.winningPct.toFixed(3)),
    asOfDate: `${year}-10-01`,
  }));
}

// 부문별로 그럴듯한 값의 범위 [최솟값, 최댓값, 소수 자릿수, 낮을수록 좋은지]
const STAT_RANGES = {
  avg: [0.255, 0.36, 3, false],
  homeRuns: [8, 46, 0, false],
  runsBattedIn: [45, 130, 0, false],
  stolenBases: [5, 55, 0, false],
  era: [2.1, 5.2, 2, true],
  wins: [5, 19, 0, false],
  strikeouts: [70, 210, 0, false],
  saves: [3, 42, 0, false],
};

/**
 * GET /api/seasons/{year}/batting-stats?sort=... 또는 pitching-stats?sort=... 흉내
 * 정렬 기준(sortKey) 값만 채운 BatterRow / PitcherRow 배열을 정렬해서 돌려준다.
 */
export function mockSeasonStats(year, type, sortKey) {
  const random = seededRandom(year * 10 + Object.keys(STAT_RANGES).indexOf(sortKey));
  const [min, max, digits, lowerIsBetter] = STAT_RANGES[sortKey];

  // 이름을 섞어서 앞의 12명만 사용 (같은 선수가 두 번 나오지 않게)
  const names = [...PLAYER_NAMES].sort(() => random() - 0.5).slice(0, 12);

  const rows = names.map((playerName) => {
    const teamId = TEAM_IDS[Math.floor(random() * TEAM_IDS.length)];
    return {
      playerId: `mock-${PLAYER_NAMES.indexOf(playerName) + 1}`,
      playerName,
      birthDate: null,
      season: year,
      teamId,
      teamName: teamNameFor(teamId, year),
      position: type === 'batting' ? 'OF' : 'P',
      [sortKey]: Number((min + random() * (max - min)).toFixed(digits)),
      qualified: true,
    };
  });

  rows.sort((a, b) => (lowerIsBetter ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]));
  return rows;
}
