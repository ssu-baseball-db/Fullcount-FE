// ------------------------------------------------------------
// 경기 목업 데이터 생성기 (3.1 ~ 3.3)
//
// 날짜를 받으면 그날 경기를 "그 자리에서" 만든다. 날짜·경기 ID를 씨앗(seed)으로 쓰기 때문에
// 같은 날짜는 언제 불러도 같은 경기가 나온다. 선수는 mockData.js 의 그 시즌·그 구단 선수를 쓴다.
//
// 응답 형식은 백엔드(Fullcount-BE) openapi.yaml 의 Game / GameDetail / GameSummary / GameEvent 와 같다.
//   GET  /api/games?date=&teamId=      → Game[]
//   GET  /api/games/{gameId}           → GameDetail (inningScores, battingStats, pitchingStats)
//   GET  /api/games/{gameId}/summary   → GameSummary (저장된 요약이 없으면 404)
//   POST /api/games/{gameId}/summary   → 저장된 요약이 있으면 그대로, 없으면 만들어 저장 (상세 기록이 없으면 409)
//   GET  /api/games/{gameId}/events    → GameEvent[]
//
// 만드는 순서: 이닝별 득점 → 득점 장면(누가 어떻게 점수를 냈나) → 타자·투수 기록 → 승패 투수 → AI 요약
// 득점 장면에서 타자 기록(타점·홈런)과 결승타·승리투수를 계산하므로 서로 어긋나지 않는다.
//
// 업무 규칙(단위 업무 기술서 3.2)
//   · 이닝별 득점 합계 = 최종 점수 = 득점 장면 득점 합계
//   · 타자 안타 합계 = 팀 안타(H), 투수 실점 합계 = 상대 팀 득점
// ------------------------------------------------------------
import { TEAM_IDS, teamNameFor } from '../constants/teams.js';
import { FIRST_SEASON, LAST_SEASON } from '../constants/seasons.js';
import { TODAY } from '../constants/games.js';
import { ApiError } from '../api/client.js';
import { weekdayOf } from '../utils/date.js';
import { formatInnings } from '../utils/format.js';
import { battingRows, pitchingRows } from './mockData.js';

// ---------- 씨앗이 있는 난수 ----------
function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRandom(seedText) {
  let value = hashString(seedText) % 233280;
  const random = () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
  const int = (min, max) => min + Math.floor(random() * (max - min + 1));
  const pick = (list) => list[Math.floor(random() * list.length)];
  // [[값, 확률], ...] 중 하나 고르기
  const weighted = (pairs) => {
    let r = random();
    for (const [value, p] of pairs) {
      if (r < p) return value;
      r -= p;
    }
    return pairs[pairs.length - 1][0];
  };
  return { random, int, pick, weighted };
}

const sum = (list) => list.reduce((total, v) => total + (v ?? 0), 0);

// ---------- 기본 정보 ----------
const SEASON_START = '03-28'; // 목업 정규시즌 기간
const SEASON_END = '09-30';
const MAX_INNINGS = 12;

const STADIUMS = {
  KIA: '광주', SAMSUNG: '대구', LG: '잠실', DOOSAN: '잠실', KT: '수원',
  SSG: '문학', LOTTE: '사직', HANWHA: '대전', NC: '창원', KIWOOM: '고척',
};
export function isGameDay(dateStr) {
  const year = Number(dateStr.slice(0, 4));
  const monthDay = dateStr.slice(5);
  if (year < FIRST_SEASON || year > LAST_SEASON) return false;
  if (monthDay < SEASON_START || monthDay > SEASON_END) return false;
  return weekdayOf(dateStr) !== 1; // 월요일은 경기 없음
}

// ---------- 출전 선수 ----------
const rosterCache = new Map();

// 목업 데이터는 구단·시즌별 선수 수가 들쭉날쭉해서 모자랄 때가 있다.
// 그럴 때는 같은 구단의 가까운 시즌 선수로 채운다 (목업에서만 쓰는 보정)
function fillFromNearSeasons(list, rows, teamId, year, minCount) {
  for (let gap = 1; list.length < minCount && gap <= LAST_SEASON - FIRST_SEASON; gap += 1) {
    rows
      .filter((r) => r.teamId === teamId && Math.abs(r.season - year) === gap)
      .forEach((r) => {
        if (list.length < minCount && !list.some((x) => x.playerId === r.playerId)) list.push(r);
      });
  }
  return list;
}

function rosterOf(teamId, year) {
  const key = `${teamId}-${year}`;
  if (!rosterCache.has(key)) {
    const batters = battingRows
      .filter((r) => r.teamId === teamId && r.season === year)
      .sort((a, b) => b.plateAppearances - a.plateAppearances);
    fillFromNearSeasons(batters, battingRows, teamId, year, 9);
    const pitchers = pitchingRows.filter((r) => r.teamId === teamId && r.season === year);
    fillFromNearSeasons(pitchers, pitchingRows, teamId, year, 5);
    // 경기당 평균 4이닝(12아웃) 이상 던진 투수를 선발로 본다
    const starters = pitchers.filter((p) => p.outsPitched / p.games >= 12);
    const relievers = pitchers.filter((p) => !starters.includes(p));
    rosterCache.set(key, {
      lineup: batters.slice(0, 9),
      starters: starters.length ? starters : pitchers.slice(0, 1),
      relievers: relievers.length ? relievers : pitchers.slice(1),
    });
  }
  return rosterCache.get(key);
}

const person = (row) => ({ playerId: row.playerId, playerName: row.playerName });

// 경기 ID: 날짜 + 원정 코드 + 홈 코드 + 더블헤더 번호 (백엔드 시드와 같은 형식. 예: 20150328LGHT0)
const GAME_CODES = {
  KIA: 'HT', SAMSUNG: 'SS', LG: 'LG', DOOSAN: 'OB', KT: 'KT',
  SSG: 'SK', LOTTE: 'LT', HANWHA: 'HH', NC: 'NC', KIWOOM: 'WO',
};
// 득점 장면에서 타자를 고를 때 중심 타선(3~5번)이 더 자주 나오게 하는 가중치
const ORDER_WEIGHTS = [1, 1.1, 1.5, 1.7, 1.5, 1.2, 1, 0.9, 0.8];

// ---------- 1) 이닝별 득점 ----------
const HALF_INNING_RUNS = [[0, 0.7], [1, 0.15], [2, 0.08], [3, 0.04], [4, 0.02], [5, 0.01]];

function playInnings(rng) {
  const away = [];
  const home = [];
  let walkOff = false;

  for (let inning = 1; inning <= MAX_INNINGS; inning += 1) {
    away.push(rng.weighted(HALF_INNING_RUNS));

    // 9회 이후, 초 공격이 끝났는데 홈팀이 이기고 있으면 말 공격은 하지 않는다
    if (inning >= 9 && sum(home) > sum(away)) {
      home.push(null);
      break;
    }

    let runs = rng.weighted(HALF_INNING_RUNS);
    // 9회 이후 말 공격에서 앞서는 순간 경기가 끝난다 (끝내기) → 1~2점 차로 끝나게 맞춘다
    if (inning >= 9 && sum(home) + runs > sum(away)) {
      runs = Math.min(runs, sum(away) - sum(home) + rng.int(1, 2));
      walkOff = true;
    }
    home.push(runs);

    if (inning >= 9 && sum(home) !== sum(away)) break;
  }
  return { away, home, walkOff };
}

// ---------- 2) 득점 장면 ----------
const PLAY_TYPES = [
  ['HOME_RUN', 0.22], ['SINGLE', 0.34], ['DOUBLE', 0.17], ['TRIPLE', 0.03],
  ['SAC_FLY', 0.1], ['WALK', 0.05], ['ERROR', 0.06], ['WILD_PITCH', 0.03],
];
const RUNS_ON_PLAY = {
  HOME_RUN: [[1, 0.55], [2, 0.3], [3, 0.12], [4, 0.03]],
  SINGLE: [[1, 0.72], [2, 0.28]],
  DOUBLE: [[1, 0.5], [2, 0.42], [3, 0.08]],
  TRIPLE: [[1, 0.45], [2, 0.4], [3, 0.15]],
};
export const HIT_TYPES = ['HOME_RUN', 'SINGLE', 'DOUBLE', 'TRIPLE'];

function pickBatter(rng) {
  const total = sum(ORDER_WEIGHTS);
  let r = rng.random() * total;
  for (let i = 0; i < ORDER_WEIGHTS.length; i += 1) {
    if (r < ORDER_WEIGHTS[i]) return i;
    r -= ORDER_WEIGHTS[i];
  }
  return 8;
}

// 이닝별 득점을 플레이 단위로 쪼갠다. 반환: [{ inning, batterIndex, playType, runs, rbi }]
function makePlays(rng, runsByInning, lineupSize) {
  const plays = [];
  runsByInning.forEach((runs, index) => {
    let remaining = runs ?? 0;
    while (remaining > 0) {
      const playType = rng.weighted(PLAY_TYPES);
      const scored = RUNS_ON_PLAY[playType] ? Math.min(remaining, rng.weighted(RUNS_ON_PLAY[playType])) : 1;
      const batterIndex = Math.min(pickBatter(rng), lineupSize - 1);
      const rbi = playType === 'ERROR' || playType === 'WILD_PITCH' ? 0 : scored;
      plays.push({ inning: index + 1, batterIndex, playType, runs: scored, rbi });
      remaining -= scored;
    }
  });
  return plays;
}


// 플레이 종류 → 문장 ('2타점 2루타', '솔로 홈런' 등). 이벤트 설명과 요약 문장에 쓴다
function describePlay(play) {
  const { playType, runs, rbi } = play;
  switch (playType) {
    case 'HOME_RUN':
      if (runs === 1) return '솔로 홈런';
      if (runs === 4) return '만루 홈런';
      return `${runs}점 홈런`;
    case 'SINGLE':
      return `${rbi}타점 적시타`;
    case 'DOUBLE':
      return `${rbi}타점 2루타`;
    case 'TRIPLE':
      return `${rbi}타점 3루타`;
    case 'SAC_FLY':
      return '희생플라이';
    case 'WALK':
      return '밀어내기 볼넷';
    case 'ERROR':
      return `타석 때 상대 실책으로 ${runs}득점`;
    default:
      return `타석 때 폭투로 ${runs}득점`;
  }
}

// ---------- 3) 타자 기록 (openapi BattingCounts 필드) ----------
// total 을 한 개씩 나눠 준다. canTake(i, got) 가 false 면 건너뛰고, 줄 사람이 없으면 onFull(got) 이 고른 사람에게 준다
function spread(rng, total, count, canTake, onFull) {
  const result = new Array(count).fill(0);
  for (let k = 0; k < total; k += 1) {
    const candidates = [...Array(count).keys()].filter((i) => canTake(i, result));
    result[candidates.length ? rng.pick(candidates) : onFull(result)] += 1;
  }
  return result;
}

function battingLines(rng, lineup, plays, runs, teamSide) {
  const n = lineup.length;
  const count = (fn) => lineup.map((_, i) => plays.filter((p) => p.batterIndex === i && fn(p)).length);
  const homeRuns = count((p) => p.playType === 'HOME_RUN');
  const doublesMin = count((p) => p.playType === 'DOUBLE');
  const triplesMin = count((p) => p.playType === 'TRIPLE');
  const hitMin = count((p) => HIT_TYPES.includes(p.playType));
  const sacrificeFlies = count((p) => p.playType === 'SAC_FLY');
  const rbi = lineup.map((_, i) => sum(plays.filter((p) => p.batterIndex === i).map((p) => p.rbi)));
  const walksMin = count((p) => p.playType === 'WALK');
  const walks = walksMin.map((w) => w + (rng.random() < 0.3 ? 1 : 0));
  const hitByPitch = lineup.map(() => (rng.random() < 0.06 ? 1 : 0));
  const sacrificeHits = lineup.map((_, i) => (i >= 7 && rng.random() < 0.15 ? 1 : 0));

  const atBats = lineup.map((_, i) => Math.max(hitMin[i], 3 + (rng.random() < 0.6 ? 1 : 0) + (i < 4 && rng.random() < 0.4 ? 1 : 0)));

  // 팀 안타 = 득점 장면의 안타 + 나머지 안타(득점과 무관한 안타)
  const teamHits = Math.max(sum(hitMin), runs + rng.int(2, 6));
  const extraHits = spread(
    rng, teamHits - sum(hitMin), n,
    (i, got) => hitMin[i] + got[i] < atBats[i],
    () => {
      const i = rng.int(0, n - 1);
      atBats[i] += 1;
      return i;
    },
  );
  const hits = hitMin.map((h, i) => h + extraHits[i]);
  // 득점과 무관한 안타 중 일부는 2루타
  const doubles = doublesMin.map((d, i) => d + (extraHits[i] > 0 && rng.random() < 0.2 ? 1 : 0));

  // 득점: 홈런 친 타자는 홈런 수만큼, 나머지는 출루(안타+볼넷+사구)한 만큼까지
  const runList = [...homeRuns];
  spread(
    rng, runs - sum(homeRuns), n,
    (i, got) => runList[i] + got[i] < hits[i] + walks[i] + hitByPitch[i],
    () => {
      const i = rng.int(0, n - 1);
      walks[i] += 1;
      return i;
    },
  ).forEach((v, i) => {
    runList[i] += v;
  });

  const outs = sum(atBats.map((ab, i) => ab - hits[i]));
  const strikeouts = spread(rng, Math.min(rng.int(4, 10), outs), n, (i, got) => got[i] < atBats[i] - hits[i], () => 0);
  const stolenBases = lineup.map((_, i) => (hits[i] + walks[i] > 0 && rng.random() < 0.08 ? 1 : 0));

  return lineup.map((row, i) => ({
    ...person(row),
    teamSide,
    games: 1,
    plateAppearances: atBats[i] + walks[i] + hitByPitch[i] + sacrificeFlies[i] + sacrificeHits[i],
    atBats: atBats[i],
    runs: runList[i],
    hits: hits[i],
    doubles: doubles[i],
    triples: triplesMin[i],
    homeRuns: homeRuns[i],
    runsBattedIn: rbi[i],
    stolenBases: stolenBases[i],
    caughtStealing: 0,
    walks: walks[i],
    hitByPitch: hitByPitch[i],
    strikeouts: strikeouts[i],
    sacrificeHits: sacrificeHits[i],
    sacrificeFlies: sacrificeFlies[i],
    groundedIntoDoublePlays: rng.random() < 0.08 ? 1 : 0,
  }));
}

// ---------- 4) 투수 기록 (openapi PitchingCounts 필드) ----------
// oppRuns: 상대 팀 이닝별 득점, oppPlays: 상대 득점 장면, opp: 상대 타자 기록 합계
function pitchingLines(rng, roster, starterRow, oppRuns, oppPlays, opp, { teamSide, walkOffAgainst }) {
  const innings = oppRuns.filter((r) => r !== null).length;
  const bullpen = roster.relievers.filter((r) => r.playerId !== starterRow.playerId);

  // 선발 5~7이닝(1~5회에 4점 이상 주면 그 이닝에 강판), 그 뒤로 불펜이 1이닝 안팎씩
  let starterInnings = Math.min(innings, rng.int(5, 7));
  const early = oppRuns.findIndex((r, i) => i < 5 && r >= 4);
  if (early >= 0) starterInnings = Math.min(starterInnings, early + 1);

  const used = [{ row: starterRow, innings: [] }];
  for (let inning = 1; inning <= innings; inning += 1) {
    const current = used[used.length - 1];
    const next = bullpen[used.length - 1];
    if (inning > starterInnings && current.innings.length > 0 && next && (used.length === 1 || rng.random() < 0.75)) {
      used.push({ row: next, innings: [] });
    }
    used[used.length - 1].innings.push(inning);
  }

  const lines = used.map(({ row, innings: list }) => {
    let outs = list.length * 3;
    if (walkOffAgainst && list[list.length - 1] === innings) outs -= 3 - rng.int(0, 2); // 끝내기를 맞은 이닝은 아웃을 다 못 잡음
    const myPlays = oppPlays.filter((p) => list.includes(p.inning));
    return {
      ...person(row),
      innings: list,
      outsPitched: outs,
      runsAllowed: sum(list.map((i) => oppRuns[i - 1])),
      homeRunsAllowed: myPlays.filter((p) => p.playType === 'HOME_RUN').length,
      baseHits: myPlays.filter((p) => HIT_TYPES.includes(p.playType)).length, // 이 투수가 맞은 득점 안타
    };
  });

  // 남은 피안타·볼넷·삼진·사구는 상대 타자 합계에서 나눠 준다 (실점이 많았던 투수에게 피안타가 더 가게)
  const share = (total, weightOf) => {
    const weights = lines.map(weightOf);
    const all = sum(weights) || 1;
    const out = new Array(lines.length).fill(0);
    for (let k = 0; k < total; k += 1) {
      let r = rng.random() * all;
      let i = 0;
      while (r >= weights[i] && i < weights.length - 1) {
        r -= weights[i];
        i += 1;
      }
      out[i] += 1;
    }
    return out;
  };
  const extraHits = share(opp.hits - sum(lines.map((p) => p.baseHits)), (p) => p.innings.length + p.runsAllowed);
  const walksAllowed = share(opp.walks, (p) => p.innings.length);
  const strikeouts = share(opp.strikeouts, (p) => Math.max(1, p.outsPitched));
  const hitBatters = share(opp.hitByPitch, (p) => p.innings.length);

  // 실책·폭투로 난 점수는 비자책점
  const unearned = lines.map((p) => sum(oppPlays.filter((q) => p.innings.includes(q.inning) && q.playType === 'ERROR').map((q) => q.runs)));

  return lines.map((p, i) => {
    const hitsAllowed = p.baseHits + extraHits[i];
    return {
      playerId: p.playerId,
      playerName: p.playerName,
      teamSide,
      innings: p.innings, // 승패 계산용 (응답에서는 뺀다)
      games: 1,
      wins: 0,
      losses: 0,
      saves: 0,
      holds: 0,
      outsPitched: p.outsPitched,
      hitsAllowed,
      homeRunsAllowed: p.homeRunsAllowed,
      walksAllowed: walksAllowed[i],
      hitBatters: hitBatters[i],
      strikeouts: strikeouts[i],
      runsAllowed: p.runsAllowed,
      earnedRuns: Math.max(0, p.runsAllowed - unearned[i]),
      battersFaced: p.outsPitched + hitsAllowed + walksAllowed[i] + hitBatters[i],
    };
  });
}

const pitcherAt = (lines, inning) => lines.find((p) => p.innings.includes(inning)) ?? lines[0];

// ---------- 5) 득점 장면을 이닝 순서로 정리 + 결승점 장면 찾기 ----------
function orderedPlays(game, playsBySide, lineups) {
  const ordered = [];
  for (let inning = 1; inning <= game.innings; inning += 1) {
    ['away', 'home'].forEach((side) => {
      playsBySide[side].filter((p) => p.inning === inning).forEach((p) => ordered.push({ ...p, side }));
    });
  }
  const score = { away: 0, home: 0 };
  const winner = game.awayScore > game.homeScore ? 'away' : game.homeScore > game.awayScore ? 'home' : null;
  let goAhead = null; // 이긴 팀이 마지막으로 앞서기 시작한 장면 (결승타)
  const list = ordered.map((p) => {
    const other = p.side === 'away' ? 'home' : 'away';
    const before = { ...score };
    score[p.side] += p.runs;
    const item = { ...p, batter: lineups[p.side][p.batterIndex], before, after: { ...score } };
    item.comeback = before[p.side] < before[other] && score[p.side] > score[other];
    item.tie = score[p.side] === score[other];
    if (p.side === winner && before[p.side] <= before[other] && score[p.side] > score[other]) goAhead = item;
    return item;
  });
  return { list, goAhead };
}

// ---------- 6) 승·패·세이브·홀드 ----------
// 승리투수: 이긴 팀이 결승점을 낸 시점의 투수 (선발이 5이닝을 못 채웠으면 다음 투수)
// 패전투수: 결승점을 내준 투수 · 세이브: 3점 차 이내 승리에서 마지막 투수(승리투수가 아니면)
function assignDecisions(rng, lines, goAhead, winnerSide, margin) {
  const winLines = lines[winnerSide];
  const loseLines = lines[winnerSide === 'away' ? 'home' : 'away'];
  const L = goAhead.inning;
  // 원정팀이 L회초에 앞섰다면 그 직전 수비(L-1회말)를 맡은 원정 투수가 승리투수 후보
  let winner = winnerSide === 'away' ? pitcherAt(winLines, Math.max(1, L - 1)) : pitcherAt(winLines, L);
  if (winner === winLines[0] && winner.outsPitched < 15 && winLines.length > 1) winner = winLines[1];
  winner.wins = 1;
  pitcherAt(loseLines, L).losses = 1;

  const closer = winLines[winLines.length - 1];
  if (closer !== winner && margin <= 3) closer.saves = 1;
  winLines.forEach((p, i) => {
    if (!p.wins && !p.saves && i > winLines.indexOf(winner) && closer.saves && rng.random() < 0.6) p.holds = 1;
  });
}

// ---------- 7) AI 요약 (실제 AI 대신 경기 기록에 있는 사실만으로 만든 문장) ----------
// 백엔드 GameSummary.summary 는 문자열이라, 첫 줄은 제목, 다음 줄부터 '항목: 내용' 형식으로 만든다
const halfText = (side) => (side === 'away' ? '초' : '말');

// 받침에 맞춰 '로/으로' 붙이기: '솔로 홈런' → '솔로 홈런으로', '2타점 2루타' → '2타점 2루타로'
function withRo(word) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${word}로`;
  const jong = code % 28;
  return jong === 0 || jong === 8 ? `${word}로` : `${word}으로`;
}

const pitchLine = (p) => `${formatInnings(p.outsPitched)}이닝 ${p.runsAllowed}실점(${p.earnedRuns}자책) ${p.strikeouts}탈삼진`;

function standouts(lines, max) {
  const score = (b) => b.hits * 2 + b.runsBattedIn * 2 + b.homeRuns * 3 + b.runs;
  return [...lines]
    .filter((b) => b.hits >= 2 || b.homeRuns >= 1 || b.runsBattedIn >= 2)
    .sort((a, b) => score(b) - score(a))
    .slice(0, max)
    .map((b) => `${b.playerName} ${b.atBats}타수 ${b.hits}안타 ${b.runsBattedIn}타점${b.homeRuns ? `(홈런 ${b.homeRuns})` : ''}`);
}

function makeSummaryText(game, plays, goAhead) {
  const away = game.awayTeam.teamName;
  const home = game.homeTeam.teamName;
  const as = game.awayScore;
  const hs = game.homeScore;
  const bat = { away: game.battingStats.filter((b) => b.teamSide === 'A'), home: game.battingStats.filter((b) => b.teamSide === 'H') };
  const pit = { away: game.pitchingStats.filter((p) => p.teamSide === 'A'), home: game.pitchingStats.filter((p) => p.teamSide === 'H') };
  const record = `기록: 안타 ${away} ${sum(bat.away.map((b) => b.hits))} : ${home} ${sum(bat.home.map((b) => b.hits))}, 홈런 ${sum(bat.away.map((b) => b.homeRuns))} : ${sum(bat.home.map((b) => b.homeRuns))}.`;

  if (as === hs) {
    const lastTie = [...plays].reverse().find((p) => p.tie);
    const lines = [`${away}·${home}, 연장 ${game.innings}회 접전 끝에 ${as}-${hs} 무승부`];
    if (lastTie) lines.push(`승부처: ${lastTie.inning}회${halfText(lastTie.side)} ${withRo(`${lastTie.batter.playerName}의 ${describePlay(lastTie)}`)} ${as}-${hs} 동점. 이후 양 팀 모두 점수를 내지 못했다.`);
    lines.push(`마운드: ${[pit.away[0], pit.home[0]].map((p) => `${p.playerName} ${pitchLine(p)}`).join(' / ')}.`);
    const bats = [...standouts(bat.away, 1), ...standouts(bat.home, 1)];
    if (bats.length) lines.push(`타선: ${bats.join(', ')}.`);
    lines.push(record);
    return lines.join('\n');
  }

  const winnerSide = as > hs ? 'away' : 'home';
  const loserSide = winnerSide === 'away' ? 'home' : 'away';
  const winner = winnerSide === 'away' ? away : home;
  const loser = winnerSide === 'away' ? home : away;
  const ws = Math.max(as, hs);
  const ls = Math.min(as, hs);
  const play = goAhead;
  const credited = play.rbi > 0; // 실책·폭투 득점은 타자 이름을 앞세우지 않는다
  const desc = describePlay(play);
  const walkOff = game.walkOff && play === plays[plays.length - 1];

  let headline;
  if (walkOff && credited) headline = `${winner}, ${play.inning}회말 ${play.batter.playerName} 끝내기 ${withRo(desc)} ${loser}에 ${ws}-${ls} 승리`;
  else if (ws - ls >= 6) headline = `${winner}, 장단 ${sum(bat[winnerSide].map((b) => b.hits))}안타 몰아치며 ${loser}에 ${ws}-${ls} 대승`;
  else if (credited && play.comeback) headline = `${winner}, ${play.inning}회 ${play.batter.playerName} ${withRo(desc)} ${loser}에 ${ws}-${ls} 역전승`;
  else if (credited) headline = `${winner}, ${play.batter.playerName} 결승 ${desc} 앞세워 ${loser}에 ${ws}-${ls} 승리`;
  else headline = `${winner}, ${loser}에 ${ws}-${ls} 승리`;

  // 실책·폭투 득점은 '○○ 타석 때 상대 실책으로' 처럼 쓴다
  const how = credited
    ? withRo(`${play.batter.playerName}의 ${desc}`)
    : `${play.batter.playerName} 타석 때 ${play.playType === 'ERROR' ? '상대 실책으로' : '폭투로'}`;
  const lines = [
    headline,
    `승부처: ${play.inning}회${halfText(play.side)} ${how} ${winner} ${play.before[winnerSide]}-${play.before[loserSide]} → ${play.after[winnerSide]}-${play.after[loserSide]}. ${walkOff ? '경기가 그대로 끝났다.' : '이후 한 번도 리드를 내주지 않았다.'}`,
  ];

  const all = [...pit.away, ...pit.home];
  const W = all.find((p) => p.wins);
  const L = all.find((p) => p.losses);
  const S = all.find((p) => p.saves);
  let mound = `마운드: 승리투수 ${W.playerName} ${pitchLine(W)}, 패전투수 ${L.playerName} ${pitchLine(L)}`;
  if (S) mound += `, ${S.playerName} ${formatInnings(S.outsPitched)}이닝 세이브`;
  const kKing = all.reduce((a, b) => (b.strikeouts > a.strikeouts ? b : a));
  if (kKing.strikeouts >= 7 && kKing !== W) mound += `. ${kKing.playerName} 탈삼진 ${kKing.strikeouts}개`;
  lines.push(`${mound}.`);

  const winBats = standouts(bat[winnerSide], 2);
  const loseBats = standouts(bat[loserSide], 1);
  const batText = [winBats.length ? `${winner} ${winBats.join(', ')}` : '', loseBats.length ? `${loser} ${loseBats[0]}` : '']
    .filter(Boolean)
    .join(' / ');
  if (batText) lines.push(`타선: ${batText}.`);
  lines.push(record);
  return lines.join('\n');
}

// ---------- 경기 한 개 만들기 ----------
function makeGame(dateStr, awayTeamId, homeTeamId) {
  const year = Number(dateStr.slice(0, 4));
  const gameId = `${dateStr.replaceAll('-', '')}${GAME_CODES[awayTeamId]}${GAME_CODES[homeTeamId]}0`;
  const rng = makeRandom(gameId);

  // openapi Game
  const game = {
    gameId,
    date: dateStr,
    homeTeam: { teamId: homeTeamId, teamName: teamNameFor(homeTeamId, year) },
    awayTeam: { teamId: awayTeamId, teamName: teamNameFor(awayTeamId, year) },
    homeScore: null,
    awayScore: null,
    stadium: STADIUMS[homeTeamId],
    status: 'SCHEDULED',
    // 아래는 상세 응답에만 들어간다 (toGame 에서 뺀다)
    inningScores: [],
    battingStats: [],
    pitchingStats: [],
    events: [],
    summaryText: null,
  };

  // 기준일(TODAY) 이후 경기는 아직 열리지 않은 예정 경기, 약 6%는 우천 취소
  if (dateStr > TODAY) return game;
  if (rng.random() < 0.06) return { ...game, status: 'CANCELLED' };

  const rosters = { away: rosterOf(awayTeamId, year), home: rosterOf(homeTeamId, year) };
  const starters = { away: rng.pick(rosters.away.starters), home: rng.pick(rosters.home.starters) };

  // 1) 이닝별 득점
  const { away, home, walkOff } = playInnings(rng);
  game.status = 'COMPLETED';
  game.awayScore = sum(away);
  game.homeScore = sum(home);
  game.innings = away.length;
  game.walkOff = walkOff;
  game.inningScores = away.flatMap((runs, i) => {
    const rows = [{ inning: i + 1, half: 'T', runs }];
    if (home[i] !== null) rows.push({ inning: i + 1, half: 'B', runs: home[i] }); // 말 공격을 안 했으면 행이 없다
    return rows;
  });

  // 2) 득점 장면 → 3) 타자 기록
  const lineups = { away: rosters.away.lineup, home: rosters.home.lineup };
  const plays = { away: makePlays(rng, away, lineups.away.length), home: makePlays(rng, home, lineups.home.length) };
  const batting = {
    away: battingLines(rng, lineups.away, plays.away, game.awayScore, 'A'),
    home: battingLines(rng, lineups.home, plays.home, game.homeScore, 'H'),
  };

  // 4) 투수 기록: 원정 투수는 홈 타자를, 홈 투수는 원정 타자를 상대한다
  const totals = (lines) => ({
    hits: sum(lines.map((l) => l.hits)),
    walks: sum(lines.map((l) => l.walks)),
    strikeouts: sum(lines.map((l) => l.strikeouts)),
    hitByPitch: sum(lines.map((l) => l.hitByPitch)),
  });
  const pitching = {
    away: pitchingLines(rng, rosters.away, starters.away, home, plays.home, totals(batting.home), { teamSide: 'A', walkOffAgainst: walkOff }),
    home: pitchingLines(rng, rosters.home, starters.home, away, plays.away, totals(batting.away), { teamSide: 'H', walkOffAgainst: false }),
  };

  // 5) 득점 장면 정리 → 6) 승패 투수
  const { list, goAhead } = orderedPlays(game, plays, lineups);
  if (goAhead) {
    const winnerSide = game.awayScore > game.homeScore ? 'away' : 'home';
    assignDecisions(rng, pitching, goAhead, winnerSide, Math.abs(game.awayScore - game.homeScore));
  }
  const strip = (lines) => lines.map(({ innings: _i, ...rest }) => rest);

  // 백엔드는 선수 기록을 teamSide(A→H), playerId 순으로 정렬해서 준다
  const bySideThenId = (a, b) => a.teamSide.localeCompare(b.teamSide) || a.playerId.localeCompare(b.playerId);
  game.battingStats = [...batting.away, ...batting.home].sort(bySideThenId);
  game.pitchingStats = [...strip(pitching.away), ...strip(pitching.home)].sort(bySideThenId);

  // openapi GameEvent: 득점 장면을 이벤트로 저장
  game.events = list.map((p, index) => ({
    sequence: index + 1,
    inning: p.inning,
    half: p.side === 'away' ? 'T' : 'B',
    description: `${p.batter.playerName} ${describePlay(p)} (${game.awayTeam.teamName} ${p.after.away} : ${p.after.home} ${game.homeTeam.teamName})`,
  }));

  // 7) 요약: 약 70%는 미리 저장된 상태, 나머지는 화면에서 '요약 만들기'를 누르면 생성
  const text = makeSummaryText(game, list, goAhead);
  if (rng.random() < 0.7) savedSummaries.set(gameId, { gameId, summary: text, generatedAt: `${dateStr}T23:00:00Z` });
  game.summaryText = text;
  delete game.walkOff;
  return game;
}

// ---------- 날짜별 경기 ----------
const dayCache = new Map();
const savedSummaries = new Map(); // game_summary 테이블 대신 (새로고침하면 처음 상태로 돌아간다)

export function gamesOn(dateStr) {
  if (!dayCache.has(dateStr)) {
    let games = [];
    if (isGameDay(dateStr)) {
      const rng = makeRandom(`day-${dateStr}`);
      // 10개 구단을 섞어서 두 팀씩 짝지어 5경기
      const teams = [...TEAM_IDS];
      for (let i = teams.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng.random() * (i + 1));
        [teams[i], teams[j]] = [teams[j], teams[i]];
      }
      for (let i = 0; i < teams.length; i += 2) games.push(makeGame(dateStr, teams[i], teams[i + 1]));
      games = games.sort((a, b) => a.gameId.localeCompare(b.gameId));
    }
    dayCache.set(dateStr, games);
  }
  return dayCache.get(dateStr);
}

function gameById(gameId) {
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(gameId);
  const game = match ? gamesOn(`${match[1]}-${match[2]}-${match[3]}`).find((g) => g.gameId === gameId) : null;
  if (!game) throw new ApiError(404, '경기를 찾을 수 없습니다.');
  return game;
}

// openapi Game (목록 응답)
export function toGame(game) {
  const { gameId, date, homeTeam, awayTeam, homeScore, awayScore, stadium, status } = game;
  return { gameId, date, homeTeam, awayTeam, homeScore, awayScore, stadium, status };
}

// GET /api/games/{gameId} → openapi GameDetail
export function gameDetail(gameId) {
  const game = gameById(gameId);
  return { ...toGame(game), inningScores: game.inningScores, battingStats: game.battingStats, pitchingStats: game.pitchingStats };
}

// GET /api/games/{gameId}/summary → 저장된 요약 (없으면 404)
export function findSummary(gameId) {
  gameById(gameId);
  const saved = savedSummaries.get(gameId);
  if (!saved) throw new ApiError(404, '저장된 경기 요약을 찾을 수 없습니다.');
  return saved;
}

// POST /api/games/{gameId}/summary → 저장된 요약이 있으면 그대로, 없으면 만들어 저장
export function generateSummary(gameId) {
  const game = gameById(gameId);
  if (savedSummaries.has(gameId)) return savedSummaries.get(gameId);
  if (!game.inningScores.length || !game.battingStats.length || !game.pitchingStats.length) {
    throw new ApiError(409, '요약에 필요한 상세 경기 기록이 없습니다.');
  }
  const saved = { gameId, summary: game.summaryText, generatedAt: new Date().toISOString().slice(0, 19) + 'Z' };
  savedSummaries.set(gameId, saved);
  return saved;
}

// GET /api/games/{gameId}/events → openapi GameEvent[]
export function gameEvents(gameId) {
  return gameById(gameId).events;
}
