// ------------------------------------------------------------
// 경기 API (업무 기능도 3.1 경기 목록, 3.2 경기 상세, 3.3 주요 이슈 요약, 3.4 이벤트)
// 백엔드 명세: Fullcount-BE 의 src/main/resources/static/openapi.yaml (태그 '경기 기록')
//
// 백엔드 응답을 화면에서 쓰기 편한 모양으로 바꿔서(normalize) 돌려준다.
// 그래서 백엔드 형식이 조금 바뀌어도 이 파일만 고치면 화면은 그대로 쓸 수 있다.
// ------------------------------------------------------------
import { ApiError, getJson, postJson } from './client.js';

/**
 * 백엔드 Game → 화면용 경기
 * Game = { gameId, date, homeTeam: { teamId, teamName }, awayTeam, homeScore, awayScore,
 *          stadium (null 가능), status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED' }
 */
function toGame(raw) {
  return {
    gameId: raw.gameId,
    date: raw.date,
    status: raw.status,
    stadium: raw.stadium ?? null,
    awayTeamId: raw.awayTeam.teamId,
    awayTeamName: raw.awayTeam.teamName,
    homeTeamId: raw.homeTeam.teamId,
    homeTeamName: raw.homeTeam.teamName,
    awayScore: raw.awayScore,
    homeScore: raw.homeScore,
  };
}

// 경기 결과: 투수 한 줄의 wins/losses/saves/holds → 'W' | 'L' | 'S' | 'H' | null
function decisionOf(line) {
  if (line.wins) return 'W';
  if (line.losses) return 'L';
  if (line.saves) return 'S';
  if (line.holds) return 'H';
  return null;
}

const sumOf = (rows, key) => rows.reduce((total, row) => total + (row[key] ?? 0), 0);

/**
 * 3.1 경기 목록
 * GET /api/games?date=2026-09-15&teamId=LG  → Game[] (그날 경기가 없으면 [])
 */
export async function fetchGames({ date, teamId } = {}) {
  const rows = await getJson('/api/games', { date, teamId });
  return rows.map(toGame);
}

/**
 * 3.2 경기 상세
 * GET /api/games/{gameId}  → GameDetail (없는 경기면 404)
 *   inningScores : [{ inning, half: 'T' | 'B', runs }]       (상세 기록이 아직 없으면 [])
 *   battingStats : [{ playerId, playerName, teamSide: 'A' | 'H', ...BattingCounts }]
 *   pitchingStats: [{ playerId, playerName, teamSide, ...PitchingCounts }]
 *
 * 화면용으로 바꾸는 것:
 *   lineScore : { innings, away: [이닝별 득점], home: [...], awayHits, homeHits } | null
 *               홈팀이 마지막 이닝 공격을 안 했으면(그 행이 없으면) 그 칸은 null → 화면에 X
 *   batting   : { away: [...], home: [...] },  pitching: { away, home } (+ decision)
 */
export async function fetchGameDetail(gameId) {
  const raw = await getJson(`/api/games/${encodeURIComponent(gameId)}`);
  const game = toGame(raw);

  const scores = raw.inningScores ?? [];
  const innings = scores.reduce((max, row) => Math.max(max, row.inning), 0);
  const runsAt = (inning, half) => scores.find((row) => row.inning === inning && row.half === half)?.runs ?? null;

  const bySide = (rows, side) => (rows ?? []).filter((row) => row.teamSide === side);
  const batting = { away: bySide(raw.battingStats, 'A'), home: bySide(raw.battingStats, 'H') };
  const pitching = {
    away: bySide(raw.pitchingStats, 'A').map((line) => ({ ...line, decision: decisionOf(line) })),
    home: bySide(raw.pitchingStats, 'H').map((line) => ({ ...line, decision: decisionOf(line) })),
  };

  const lineScore =
    innings === 0
      ? null
      : {
          innings,
          away: Array.from({ length: innings }, (_, i) => runsAt(i + 1, 'T')),
          home: Array.from({ length: innings }, (_, i) => runsAt(i + 1, 'B')),
          awayHits: batting.away.length ? sumOf(batting.away, 'hits') : null,
          homeHits: batting.home.length ? sumOf(batting.home, 'hits') : null,
        };

  return { ...game, lineScore, batting, pitching };
}

/**
 * 3.3 저장된 요약 조회
 * GET /api/games/{gameId}/summary → { gameId, summary, generatedAt } (저장된 요약이 없으면 404 → 여기서는 null)
 */
export async function fetchGameSummary(gameId) {
  try {
    return await getJson(`/api/games/${encodeURIComponent(gameId)}/summary`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * 3.3 요약 만들기
 * POST /api/games/{gameId}/summary → 저장된 요약이 있으면 그대로, 없으면 AI로 만들어 저장해서 돌려준다
 *   409: 요약에 필요한 상세 기록이 없음, 503: 요약 생성 서비스 실패 (경기 상세는 계속 볼 수 있음)
 */
export function createGameSummary(gameId) {
  return postJson(`/api/games/${encodeURIComponent(gameId)}/summary`);
}

/**
 * 3.4 경기 이벤트 (득점 장면 등)
 * GET /api/games/{gameId}/events → [{ sequence, inning, half: 'T' | 'B', description }]
 */
export function fetchGameEvents(gameId) {
  return getJson(`/api/games/${encodeURIComponent(gameId)}/events`);
}

/**
 * 요약 문자열 → { headline, points: [{ label, text }] }
 * 첫 줄은 제목, '항목: 내용' 형식의 줄은 항목으로 나눈다. 형식이 다르면 문단으로 보여준다(label 없음).
 */
export function parseSummary(text) {
  const lines = (text ?? '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { headline: null, points: [] };
  if (lines.length === 1) return { headline: null, points: [{ label: null, text: lines[0] }] };
  return {
    headline: lines[0],
    points: lines.slice(1).map((line) => {
      const match = /^([^:：]{1,8})[:：]\s*(.+)$/.exec(line);
      return match ? { label: match[1], text: match[2] } : { label: null, text: line };
    }),
  };
}
