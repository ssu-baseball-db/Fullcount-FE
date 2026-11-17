// ------------------------------------------------------------
// 목업용 가짜 데이터 생성기.
// 구단 ID·시즌별 구단명만 실제와 같고, 선수 이름과 기록은 모두 임의로 만든 값이다.
// 같은 씨앗(seed)을 쓰므로 새로고침해도 항상 같은 데이터가 나온다.
// ------------------------------------------------------------
import { TEAM_IDS, teamNameFor } from '../constants/teams.js';
import { FIRST_SEASON, LAST_SEASON } from '../constants/seasons.js';

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const random = seededRandom(20261111);
const between = (min, max) => min + random() * (max - min);
const intBetween = (min, max) => Math.round(between(min, max));
const pick = (list) => list[Math.floor(random() * list.length)];

const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍', '고', '문', '양', '배'];
const GIVEN = [
  '도현', '준서', '시우', '하준', '우진', '민재', '현우', '서진', '도윤', '건우', '지호', '승민',
  '태윤', '유찬', '재원', '선우', '지후', '은찬', '민호', '태민', '준혁', '우성', '시현', '정민',
  '주원', '예준', '지환', '승현', '동하', '규민', '태오', '한결', '성빈', '재희', '로운', '이안',
];
const POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'DH'];

function makePerson(id, isPitcher) {
  return {
    playerId: id,
    playerName: pick(SURNAMES) + pick(GIVEN),
    birthDate: `${intBetween(1984, 2004)}-${String(intBetween(1, 12)).padStart(2, '0')}-${String(intBetween(1, 28)).padStart(2, '0')}`,
    heightCm: intBetween(172, 193),
    weightKg: intBetween(72, 108),
    throwHand: random() < 0.78 ? 'R' : 'L',
    batHand: isPitcher ? (random() < 0.8 ? 'R' : 'L') : pick(['R', 'R', 'L', 'L', 'S']),
  };
}

// 선수 한 명의 활동 시즌과 시즌별 소속 팀 (한 번 이적할 수도 있다)
// 2015년 이전부터 뛰던 선수도 있도록 시작 연도를 넓게 잡고, 2015~2026 범위만 남긴다
function makeCareer() {
  const start = intBetween(FIRST_SEASON - 8, LAST_SEASON - 1);
  const end = Math.min(LAST_SEASON, start + intBetween(3, 13));
  let team = pick(TEAM_IDS);
  const transferYear = random() < 0.35 ? intBetween(start + 1, end) : null;
  const seasons = [];
  for (let year = start; year <= end; year += 1) {
    if (year === transferYear) team = pick(TEAM_IDS.filter((t) => t !== team));
    if (year >= FIRST_SEASON) seasons.push({ year, teamId: team });
  }
  return seasons;
}

const round = (value, digits = 4) => (value == null ? null : Number(value.toFixed(digits)));
const ratio = (numerator, denominator) => (denominator > 0 ? numerator / denominator : null);

// ---------- 비율 계산 (openapi.yaml 에 적힌 계산식 그대로) ----------
export function battingRates(c) {
  const totalBases = c.hits + c.doubles + 2 * c.triples + 3 * c.homeRuns;
  const avg = ratio(c.hits, c.atBats);
  const obp = ratio(c.hits + c.walks + c.hitByPitch, c.atBats + c.walks + c.hitByPitch + c.sacrificeFlies);
  const slg = ratio(totalBases, c.atBats);
  return {
    avg: round(avg),
    obp: round(obp),
    slg: round(slg),
    ops: obp == null || slg == null ? null : round(obp + slg),
  };
}

export function pitchingRates(c) {
  return {
    era: round(ratio(c.earnedRuns * 27, c.outsPitched)),
    whip: round(ratio((c.hitsAllowed + c.walksAllowed) * 3, c.outsPitched)),
    winningPct: round(ratio(c.wins, c.wins + c.losses), 3),
  };
}

export const BATTING_COUNT_KEYS = [
  'games', 'plateAppearances', 'atBats', 'runs', 'hits', 'doubles', 'triples', 'homeRuns', 'runsBattedIn',
  'stolenBases', 'caughtStealing', 'walks', 'hitByPitch', 'strikeouts', 'sacrificeHits', 'sacrificeFlies',
  'groundedIntoDoublePlays',
];
export const PITCHING_COUNT_KEYS = [
  'games', 'wins', 'losses', 'saves', 'holds', 'outsPitched', 'hitsAllowed', 'homeRunsAllowed', 'walksAllowed',
  'hitBatters', 'strikeouts', 'runsAllowed', 'earnedRuns', 'battersFaced',
];

export function sumCounts(rows, keys) {
  const total = {};
  keys.forEach((key) => {
    total[key] = rows.reduce((sum, row) => sum + (row[key] ?? 0), 0);
  });
  return total;
}

// ---------- 시즌 기록 만들기 ----------
function makeBattingSeason(talent, power, speed) {
  const regular = talent > 0.4 && random() > 0.2;
  const plateAppearances = regular ? intBetween(450, 640) : intBetween(60, 430);
  const walks = Math.round(plateAppearances * between(0.06, 0.13));
  const hitByPitch = Math.round(plateAppearances * between(0.005, 0.02));
  const sacrificeFlies = Math.round(plateAppearances * between(0.004, 0.012));
  const sacrificeHits = Math.round(plateAppearances * between(0, 0.012));
  const atBats = plateAppearances - walks - hitByPitch - sacrificeFlies - sacrificeHits;
  const trueAvg = 0.215 + talent * 0.1 + between(-0.025, 0.025);
  const hits = Math.round(atBats * trueAvg);
  const homeRuns = Math.round(hits * (0.02 + power * 0.2));
  const doubles = Math.round(hits * between(0.14, 0.22));
  const triples = Math.round(hits * between(0, 0.03) * (0.5 + speed));
  const stolenBases = Math.round(plateAppearances * speed * between(0.01, 0.09));

  const counts = {
    games: Math.min(144, Math.round(plateAppearances / 4.2) + intBetween(0, 10)),
    plateAppearances,
    atBats,
    runs: Math.round(hits * 0.42 + homeRuns * 0.5 + walks * 0.3),
    hits,
    doubles,
    triples,
    homeRuns,
    runsBattedIn: Math.round(hits * 0.36 + homeRuns * 1.3),
    stolenBases,
    caughtStealing: Math.round(stolenBases * between(0.15, 0.4)),
    walks,
    hitByPitch,
    strikeouts: Math.round(plateAppearances * between(0.11, 0.26)),
    sacrificeHits,
    sacrificeFlies,
    groundedIntoDoublePlays: Math.round(plateAppearances * between(0.008, 0.025)),
  };
  return { ...counts, ...battingRates(counts), qualified: plateAppearances >= 447 };
}

function makePitchingSeason(talent, role) {
  let outsPitched;
  let wins;
  let losses;
  let saves = 0;
  let holds = 0;
  let games;

  if (role === 'starter') {
    outsPitched = random() < 0.75 ? intBetween(360, 590) : intBetween(120, 350);
    const starts = Math.round(outsPitched / 17);
    games = starts + intBetween(0, 3);
    wins = Math.round(starts * between(0.25, 0.45) * (0.7 + talent * 0.6));
    losses = Math.round(starts * between(0.2, 0.42) * (1.3 - talent * 0.6));
  } else {
    outsPitched = intBetween(90, 240);
    games = Math.round(outsPitched / 3.1) + intBetween(0, 8);
    wins = intBetween(0, 7);
    losses = intBetween(0, 6);
    if (role === 'closer') saves = intBetween(12, 42);
    else holds = intBetween(0, 28);
  }

  const innings = outsPitched / 3;
  const trueEra = 5.4 - talent * 2.8 + between(-0.6, 0.6);
  const earnedRuns = Math.max(0, Math.round((trueEra * outsPitched) / 27));
  const hitsAllowed = Math.round(innings * (1.18 - talent * 0.3 + between(-0.08, 0.08)));
  const walksAllowed = Math.round(innings * (0.48 - talent * 0.18 + between(-0.05, 0.05)));
  const hitBatters = Math.round(innings * between(0.02, 0.06));

  const counts = {
    games,
    wins,
    losses,
    saves,
    holds,
    outsPitched,
    hitsAllowed,
    homeRunsAllowed: Math.round(hitsAllowed * between(0.06, 0.12)),
    walksAllowed,
    hitBatters,
    strikeouts: Math.round(innings * (0.55 + talent * 0.55 + between(-0.08, 0.08))),
    runsAllowed: earnedRuns + Math.round(earnedRuns * between(0.04, 0.12)),
    earnedRuns,
    battersFaced: outsPitched + hitsAllowed + walksAllowed + hitBatters,
  };
  return { ...counts, ...pitchingRates(counts), qualified: outsPitched >= 432 };
}

// ---------- 전체 데이터 ----------
const players = new Map(); // playerId → 선수 기본 정보
const battingRows = []; // BatterRow 목록
const pitchingRows = []; // PitcherRow 목록

for (let i = 1; i <= 260; i += 1) {
  const person = makePerson(`mock-b${String(i).padStart(3, '0')}`, false);
  const talent = random();
  const power = random();
  const speed = random();
  const position = pick(POSITIONS);
  const career = makeCareer();
  if (career.length === 0) continue; // 2015년 전에 은퇴한 선수는 제외
  players.set(person.playerId, person);
  career.forEach(({ year, teamId }) => {
    battingRows.push({
      ...person,
      season: year,
      teamId,
      teamName: teamNameFor(teamId, year),
      position,
      ...makeBattingSeason(Math.min(1, Math.max(0, talent + between(-0.15, 0.15))), power, speed),
    });
  });
}

for (let i = 1; i <= 200; i += 1) {
  const person = makePerson(`mock-p${String(i).padStart(3, '0')}`, true);
  const talent = random();
  const role = random() < 0.5 ? 'starter' : random() < 0.3 ? 'closer' : 'reliever';
  const career = makeCareer();
  if (career.length === 0) continue;
  players.set(person.playerId, person);
  career.forEach(({ year, teamId }) => {
    pitchingRows.push({
      ...person,
      season: year,
      teamId,
      teamName: teamNameFor(teamId, year),
      position: 'P',
      ...makePitchingSeason(Math.min(1, Math.max(0, talent + between(-0.15, 0.15))), role),
    });
  });
}

export { players, battingRows, pitchingRows };
