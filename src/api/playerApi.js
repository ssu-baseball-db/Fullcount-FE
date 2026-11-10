// 선수 API (openapi.yaml: 선수 기록 1.1, 1.4 / 선수 비교 및 분석 4.1)
import { getJson } from './client.js';

/**
 * 1.1 선수 검색
 * GET /api/players?name=김&season=&teamId=&position=
 * 응답: PlayerSeason[]  (선수 × 시즌마다 한 줄. 일치하는 선수가 없으면 [])
 */
export function searchPlayers(name, { season, teamId, position } = {}) {
  return getJson('/api/players', { name, season, teamId, position });
}

/**
 * PlayerSeason[] 를 선수 단위로 묶는다. (검색 결과·선수 선택 목록에서 사용)
 * 돌려주는 형식: [{ playerId, playerName, birthDate, type, positions, latest, teams: [{ teamName, from, to }] }]
 */
export function groupBySeasonPlayer(rows) {
  const map = new Map();

  rows.forEach((row) => {
    if (!map.has(row.playerId)) {
      map.set(row.playerId, { ...row, seasons: [] });
    }
    map.get(row.playerId).seasons.push(row);
  });

  return [...map.values()].map((player) => {
    const seasons = [...player.seasons].sort((a, b) => a.season - b.season);
    const latest = seasons[seasons.length - 1];
    const positions = [...new Set(seasons.map((s) => s.position).filter(Boolean))];

    // 연속된 시즌의 같은 팀은 한 구간으로 묶는다: KIA 2018~2022, LG 2023~2025
    const teams = [];
    seasons.forEach((s) => {
      const last = teams[teams.length - 1];
      if (last && last.teamId === s.teamId && last.to === s.season - 1) last.to = s.season;
      else teams.push({ teamId: s.teamId, teamName: s.teamName, from: s.season, to: s.season });
    });

    return {
      playerId: player.playerId,
      playerName: player.playerName,
      birthDate: player.birthDate,
      // 투수 포지션(P)으로 뛴 기록만 있으면 투수, 아니면 타자로 본다
      type: positions.length > 0 && positions.every((p) => p === 'P') ? 'pitcher' : 'batter',
      positions,
      latest,
      teams,
    };
  });
}

/**
 * 1.4 선수 연도별 추이 조회
 * GET /api/players/{playerId}/season-stats?type=batter|pitcher
 * 응답: { player, type, seasons: BatterRow[] | PitcherRow[] (연도 오름차순), career }
 * 해당 유형 기록이 없으면 seasons 는 [], career 는 null. 없는 선수면 404.
 */
export function fetchPlayerSeasonStats(playerId, type) {
  return getJson(`/api/players/${encodeURIComponent(playerId)}/season-stats`, { type });
}

/**
 * 4.1 선수 2인 비교
 * GET /api/players/compare?playerA=&playerB=&type=&season=
 * season 을 비우면 2015년 이후 통산 비교.
 * 응답: { type, season, playerA: { playerId, playerName, hasRecord }, playerB, metrics: [{ key, playerA, playerB, better }] }
 * 400: 잘못된 입력, 같은 선수 선택, 비교 유형 불일치 / 404: 없는 선수
 */
export function comparePlayers({ playerA, playerB, type, season }) {
  return getJson('/api/players/compare', { playerA, playerB, type, season });
}
