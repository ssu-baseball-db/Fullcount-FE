// ------------------------------------------------------------
// 목업 서버: 백엔드 openapi.yaml 의 조회 API를 흉내 낸다.
// 주소·파라미터·응답 형식·에러(400/404) 규칙을 명세와 똑같이 맞춰서,
// 백엔드가 완성되면 USE_MOCK 만 끄면 같은 화면이 실제 데이터로 동작하게 하는 것이 목표다.
// ------------------------------------------------------------
import { ApiError } from '../api/client.js';
import { TEAM_IDS, teamNameFor } from '../constants/teams.js';
import { FIRST_SEASON, LAST_SEASON } from '../constants/seasons.js';
import {
  players,
  battingRows,
  pitchingRows,
  battingRates,
  pitchingRates,
  sumCounts,
  BATTING_COUNT_KEYS,
  PITCHING_COUNT_KEYS,
} from './mockData.js';

// ---------- 공통 검증 ----------
function parseSeason(value, { required = true } = {}) {
  if (value === undefined || value === '') {
    if (required) throw new ApiError(400, '시즌을 입력해 주세요.');
    return null;
  }
  const year = Number(value);
  if (!Number.isInteger(year) || year < FIRST_SEASON || year > LAST_SEASON) {
    throw new ApiError(400, `시즌은 ${FIRST_SEASON}~${LAST_SEASON} 사이여야 합니다.`);
  }
  return year;
}

function parseType(value) {
  if (value !== 'batter' && value !== 'pitcher') throw new ApiError(400, 'type 은 batter 또는 pitcher 여야 합니다.');
  return value;
}

function parseQualified(value) {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ApiError(400, 'qualified 는 true 또는 false 여야 합니다.');
}

const BATTING_SORTS = ['avg', 'obp', 'slg', 'ops', 'homeRuns', 'runsBattedIn', 'stolenBases'];
const PITCHING_SORTS = ['wins', 'era', 'strikeouts', 'saves', 'whip'];
const RATE_SORTS = ['avg', 'obp', 'slg', 'ops'];
const LOWER_IS_BETTER = ['era', 'whip', 'losses', 'runsAllowed'];

// dropNull: 지표를 계산할 수 없는(null) 선수를 뺄지, 맨 뒤로 보낼지
function sortRows(rows, sort, { dropNull = true } = {}) {
  const byName = (a, b) => a.playerName.localeCompare(b.playerName, 'ko');
  if (!sort) return [...rows].sort(byName);
  const direction = LOWER_IS_BETTER.includes(sort) ? 1 : -1;
  const withValue = rows.filter((row) => row[sort] != null).sort((a, b) => (a[sort] - b[sort]) * direction || byName(a, b));
  const withoutValue = rows.filter((row) => row[sort] == null).sort(byName);
  return dropNull ? withValue : [...withValue, ...withoutValue];
}

const copy = (value) => JSON.parse(JSON.stringify(value));

// ---------- 1.2 / 1.3 시즌 기록 ----------
function seasonStats(kind, year, params) {
  const sorts = kind === 'batting' ? BATTING_SORTS : PITCHING_SORTS;
  const { sort, teamId } = params;
  if (sort && !sorts.includes(sort)) throw new ApiError(400, `지원하지 않는 정렬 기준입니다: ${sort}`);
  const qualified = parseQualified(params.qualified);
  if (kind === 'batting' && RATE_SORTS.includes(sort) && qualified === false) {
    throw new ApiError(400, '비율 지표 정렬은 규정타석 충족 선수만 조회할 수 있습니다.');
  }

  let rows = (kind === 'batting' ? battingRows : pitchingRows).filter((row) => row.season === year);
  if (teamId) rows = rows.filter((row) => row.teamId === teamId);
  if (qualified !== undefined) rows = rows.filter((row) => row.qualified === qualified);
  if (kind === 'batting' && RATE_SORTS.includes(sort)) rows = rows.filter((row) => row.qualified);
  return sortRows(rows, sort);
}

// ---------- 시즌 공식 순위 (포스트시즌 반영 최종 순위를 흉내) ----------
function standings(year) {
  let value = year;
  const random = () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
  const rows = TEAM_IDS.map((teamId) => {
    const wins = Math.round(58 + random() * 30);
    const draws = Math.floor(random() * 4);
    const losses = 144 - wins - draws;
    return { teamId, teamName: teamNameFor(teamId, year), wins, losses, draws, winningPct: wins / (wins + losses) };
  });
  rows.sort((a, b) => b.winningPct - a.winningPct);
  const champion = rows.splice(Math.floor(random() * 4), 1)[0]; // 정규시즌 상위 4팀 중 우승 팀
  rows.unshift(champion);
  return rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    winningPct: Number(row.winningPct.toFixed(3)),
    asOfDate: `${year}-10-01`,
  }));
}

// ---------- 2.1 팀 시즌 성적 ----------
const TEAM_SORTS = ['wins', 'losses', 'runs', 'homeRuns', 'stolenBases', 'avg', 'ops', 'runsAllowed', 'era', 'whip'];

function teamStats(year, sort) {
  if (sort && !TEAM_SORTS.includes(sort)) throw new ApiError(400, `지원하지 않는 정렬 기준입니다: ${sort}`);
  const record = Object.fromEntries(standings(year).map((row) => [row.teamId, row]));

  const rows = TEAM_IDS.map((teamId) => {
    const bat = sumCounts(battingRows.filter((r) => r.season === year && r.teamId === teamId), BATTING_COUNT_KEYS);
    const pit = sumCounts(pitchingRows.filter((r) => r.season === year && r.teamId === teamId), PITCHING_COUNT_KEYS);
    const batRates = battingRates(bat);
    const pitRates = pitchingRates(pit);
    return {
      teamId,
      teamName: teamNameFor(teamId, year),
      wins: record[teamId].wins,
      losses: record[teamId].losses,
      runs: bat.runs,
      homeRuns: bat.homeRuns,
      stolenBases: bat.stolenBases,
      avg: batRates.avg,
      ops: batRates.ops,
      runsAllowed: pit.runsAllowed,
      era: pitRates.era,
      whip: pitRates.whip,
    };
  });

  if (!sort) return rows;
  const direction = LOWER_IS_BETTER.includes(sort) ? 1 : -1;
  return rows.sort((a, b) => ((a[sort] ?? Infinity * direction) - (b[sort] ?? Infinity * direction)) * direction);
}

// ---------- 2.2 / 2.3 팀 타격·투구 ----------
function teamPlayers(kind, year, teamId, sort) {
  if (!TEAM_IDS.includes(teamId)) throw new ApiError(404, '요청한 구단이 없습니다.');
  const sorts = kind === 'batting' ? BATTING_SORTS : PITCHING_SORTS;
  if (sort && !sorts.includes(sort)) throw new ApiError(400, `지원하지 않는 정렬 기준입니다: ${sort}`);
  // 팀 화면은 규정 충족 여부와 상관없이 소속 선수 전원을 보여준다
  const all = (kind === 'batting' ? battingRows : pitchingRows).filter((r) => r.season === year && r.teamId === teamId);
  const rows = sortRows(all, sort, { dropNull: false });
  if (rows.length === 0) return { players: [], totals: null };
  const keys = kind === 'batting' ? BATTING_COUNT_KEYS : PITCHING_COUNT_KEYS;
  const counts = sumCounts(all, keys);
  const totals = { ...counts, ...(kind === 'batting' ? battingRates(counts) : pitchingRates(counts)) };
  return { players: rows, totals };
}

// ---------- 1.1 선수 검색 ----------
function searchPlayers(params) {
  const name = (params.name ?? '').trim();
  if (!name) throw new ApiError(400, '검색할 이름을 입력해 주세요.');
  const season = parseSeason(params.season, { required: false });

  return [...battingRows, ...pitchingRows]
    .filter((row) => row.playerName.includes(name))
    .filter((row) => (season ? row.season === season : true))
    .filter((row) => (params.teamId ? row.teamId === params.teamId : true))
    .filter((row) => (params.position ? row.position === params.position : true))
    .map((row) => ({
      playerId: row.playerId,
      playerName: row.playerName,
      birthDate: row.birthDate,
      heightCm: row.heightCm,
      weightKg: row.weightKg,
      throwHand: row.throwHand,
      batHand: row.batHand,
      season: row.season,
      teamId: row.teamId,
      teamName: row.teamName,
      position: row.position,
    }))
    .sort((a, b) => a.playerName.localeCompare(b.playerName, 'ko') || b.season - a.season);
}

// ---------- 1.4 선수 연도별 추이 ----------
function careerOf(rows, type) {
  if (rows.length === 0) return null;
  const keys = type === 'batter' ? BATTING_COUNT_KEYS : PITCHING_COUNT_KEYS;
  const counts = sumCounts(rows, keys);
  return { ...counts, ...(type === 'batter' ? battingRates(counts) : pitchingRates(counts)) };
}

function playerSeasonStats(playerId, params) {
  const player = players.get(playerId);
  if (!player) throw new ApiError(404, '요청한 선수가 없습니다.');
  const type = parseType(params.type);
  const rows = (type === 'batter' ? battingRows : pitchingRows)
    .filter((row) => row.playerId === playerId)
    .sort((a, b) => a.season - b.season);
  return { player, type, seasons: rows, career: careerOf(rows, type) };
}

// ---------- 4.1 선수 2인 비교 ----------
const COMPARE_METRICS = {
  batter: ['avg', 'homeRuns', 'runsBattedIn', 'stolenBases', 'ops'],
  pitcher: ['wins', 'era', 'strikeouts', 'saves', 'whip'],
};

function comparePlayers(params) {
  const { playerA: idA, playerB: idB } = params;
  if (!idA || !idB) throw new ApiError(400, '비교할 선수 두 명을 선택해 주세요.');
  if (idA === idB) throw new ApiError(400, '같은 선수끼리는 비교할 수 없습니다.');
  const type = parseType(params.type);
  const season = parseSeason(params.season, { required: false });
  if (!players.has(idA) || !players.has(idB)) throw new ApiError(404, '요청한 선수가 없습니다.');

  const source = type === 'batter' ? battingRows : pitchingRows;
  const statsOf = (playerId) => {
    const all = source.filter((row) => row.playerId === playerId);
    if (all.length === 0) throw new ApiError(400, '두 선수의 비교 유형(타자/투수)이 일치하지 않습니다.');
    const rows = season ? all.filter((row) => row.season === season) : all;
    return rows.length === 0 ? null : careerOf(rows, type);
  };
  const a = statsOf(idA);
  const b = statsOf(idB);

  const metrics = COMPARE_METRICS[type].map((key) => {
    const valueA = a?.[key] ?? null;
    const valueB = b?.[key] ?? null;
    let better = null;
    if (valueA != null && valueB != null) {
      if (valueA === valueB) better = 'tie';
      else if (LOWER_IS_BETTER.includes(key)) better = valueA < valueB ? 'A' : 'B';
      else better = valueA > valueB ? 'A' : 'B';
    }
    return { key, playerA: valueA, playerB: valueB, better };
  });

  const compared = (playerId, stats) => ({
    playerId,
    playerName: players.get(playerId).playerName,
    hasRecord: stats != null,
  });

  return { type, season, playerA: compared(idA, a), playerB: compared(idB, b), metrics };
}

// ---------- 주소 → 처리 함수 연결 ----------
const ROUTES = [
  [/^\/api\/players$/, (_, params) => searchPlayers(params)],
  [/^\/api\/players\/compare$/, (_, params) => comparePlayers(params)],
  [/^\/api\/players\/([^/]+)\/season-stats$/, ([id], params) => playerSeasonStats(decodeURIComponent(id), params)],
  [/^\/api\/seasons\/([^/]+)\/standings$/, ([year]) => standings(parseSeason(year))],
  [/^\/api\/seasons\/([^/]+)\/batting-stats$/, ([year], params) => seasonStats('batting', parseSeason(year), params)],
  [/^\/api\/seasons\/([^/]+)\/pitching-stats$/, ([year], params) => seasonStats('pitching', parseSeason(year), params)],
  [/^\/api\/seasons\/([^/]+)\/team-stats$/, ([year], params) => teamStats(parseSeason(year), params.sort)],
  [
    /^\/api\/seasons\/([^/]+)\/teams\/([^/]+)\/batting-stats$/,
    ([year, teamId], params) => teamPlayers('batting', parseSeason(year), teamId, params.sort),
  ],
  [
    /^\/api\/seasons\/([^/]+)\/teams\/([^/]+)\/pitching-stats$/,
    ([year, teamId], params) => teamPlayers('pitching', parseSeason(year), teamId, params.sort),
  ],
];

export function handleMockRequest(path, params) {
  for (const [pattern, handler] of ROUTES) {
    const match = path.match(pattern);
    if (match) return copy(handler(match.slice(1), params));
  }
  throw new ApiError(404, `목업에 없는 API입니다: ${path}`);
}
