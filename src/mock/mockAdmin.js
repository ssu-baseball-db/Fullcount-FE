// ------------------------------------------------------------
// 목업: 관리자 로그인 API(/api/admin/session·login·logout)와 관리자 API(openapi.yaml 5.3, 5.4)
// 검증 규칙과 오류 문구는 백엔드 AdminService 를 그대로 따른다.
// 수정한 값은 목업 데이터에 바로 반영되어 선수 상세·기록 순위 화면에도 보인다. (새로고침하면 처음으로 돌아감)
// ------------------------------------------------------------
import { ApiError } from '../api/client.js';
import {
  players,
  battingRows,
  pitchingRows,
  battingRates,
  pitchingRates,
  BATTING_COUNT_KEYS,
  PITCHING_COUNT_KEYS,
} from './mockData.js';

// ---------- 로그인 (백엔드 AdminSessionController·AdminAccess 흉내) ----------
// 관리자 계정은 하나뿐이다. 세션 쿠키 대신 이 모듈의 변수에 로그인 상태와 CSRF 토큰을 둔다.
const ACCOUNT = { username: 'admin', password: 'admin1234' };
const mockSession = { loggedIn: false, csrfToken: null };

function newCsrf() {
  return `mock-csrf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function session() {
  if (!mockSession.csrfToken) mockSession.csrfToken = newCsrf();
  return { authenticated: mockSession.loggedIn, csrfToken: mockSession.csrfToken };
}

function requireCsrf(ctx) {
  if (!mockSession.csrfToken || ctx.csrfToken !== mockSession.csrfToken) {
    throw new ApiError(403, '요청 검증에 실패했습니다. 페이지를 다시 열어 주세요.');
  }
}

export function login(ctx) {
  requireCsrf(ctx);
  const body = ctx.body ?? {};
  if (body.username !== ACCOUNT.username || body.password !== ACCOUNT.password) {
    throw new ApiError(401, '관리자 계정 정보를 확인해 주세요.');
  }
  mockSession.loggedIn = true;
  mockSession.csrfToken = newCsrf();
  return session();
}

export function logout(ctx) {
  if (!mockSession.loggedIn) throw new ApiError(401, '관리자 로그인이 필요합니다.');
  requireCsrf(ctx);
  mockSession.loggedIn = false;
  mockSession.csrfToken = null;
  return null;
}

// 관리자 API 공통 (백엔드 AdminAccess.requireWrite 와 같은 순서로 확인)
function requireAdmin(ctx) {
  if (!mockSession.loggedIn) throw new ApiError(403, '관리자 접근 권한이 필요합니다.');
  requireCsrf(ctx);
}

// ---------- 선수 등록·수정 (AdminService.playerValues 와 같은 검증) ----------
const PLAYER_FIELDS = ['playerName', 'birthDate', 'heightCm', 'weightKg', 'throwHand', 'batHand'];

function requiredText(value, field) {
  if (typeof value === 'string' && value.trim() !== '') return value;
  throw new ApiError(400, `${field} 값이 필요합니다.`);
}

function playerValues(body) {
  if (!body || Object.keys(body).length === 0) throw new ApiError(400, '선수 정보를 입력해 주세요.');
  const result = {};
  Object.entries(body).forEach(([key, value]) => {
    if (!PLAYER_FIELDS.includes(key)) throw new ApiError(400, `수정할 수 없는 선수 정보입니다. ${key}`);
    if (key === 'playerName') result[key] = requiredText(value, key);
    else if (key === 'birthDate') {
      if (value !== null && !(/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)))) {
        throw new ApiError(400, '생년월일은 YYYY-MM-DD 형식이어야 합니다.');
      }
      result[key] = value;
    } else if (key === 'heightCm' || key === 'weightKg') {
      if (value !== null && !(typeof value === 'number' && value > 0)) throw new ApiError(400, `${key} 값은 양수여야 합니다.`);
      result[key] = value;
    } else {
      const options = key === 'throwHand' ? ['R', 'L'] : ['R', 'L', 'S'];
      if (value !== null && !options.includes(value)) throw new ApiError(400, '투구손 또는 타격 방향 값이 올바르지 않습니다.');
      result[key] = value;
    }
  });
  return result;
}

const EMPTY_PLAYER = { birthDate: null, heightCm: null, weightKg: null, throwHand: null, batHand: null };

export function createPlayer(ctx) {
  requireAdmin(ctx);
  const body = { ...(ctx.body ?? {}) };
  const playerId = requiredText(body.playerId, 'playerId');
  delete body.playerId;
  const values = playerValues(body);
  requiredText(body.playerName, 'playerName');
  if (players.has(playerId)) throw new ApiError(409, '이미 등록된 선수 ID입니다.');
  const player = { playerId, ...EMPTY_PLAYER, ...values };
  players.set(playerId, player);
  return player;
}

export function updatePlayer(playerId, ctx) {
  requireAdmin(ctx);
  const values = playerValues(ctx.body);
  if (!players.has(playerId)) throw new ApiError(404, '선수를 찾을 수 없습니다.');
  const player = { ...players.get(playerId), ...values };
  players.set(playerId, player);
  // 시즌 기록 행에도 선수 정보가 들어 있으므로 함께 바꾼다
  [...battingRows, ...pitchingRows].filter((r) => r.playerId === playerId).forEach((r) => Object.assign(r, values));
  return player;
}

// ---------- 시즌 기록 수정 (AdminService.updateRecord / validateCounts 와 같은 규칙) ----------
function validateCounts(type, row) {
  const greater = (a, b) => row[a] != null && row[b] != null && row[a] > row[b];
  if (type === 'batter') {
    if (greater('atBats', 'plateAppearances')) throw new ApiError(400, '타수는 타석 이하여야 합니다.');
    if (greater('hits', 'atBats')) throw new ApiError(400, '안타는 타수 이하여야 합니다.');
    if (row.hits != null) {
      let remaining = row.hits;
      for (const key of ['doubles', 'triples', 'homeRuns']) {
        if (row[key] != null) {
          if (row[key] > remaining) throw new ApiError(400, '안타는 2루타·3루타·홈런 합계 이상이어야 합니다.');
          remaining -= row[key];
        }
      }
    }
  } else {
    if (greater('earnedRuns', 'runsAllowed')) throw new ApiError(400, '자책점은 실점 이하여야 합니다.');
    if (greater('homeRunsAllowed', 'hitsAllowed')) throw new ApiError(400, '피홈런은 피안타 이하여야 합니다.');
  }
}

export function updateRecord(type, playerId, year, ctx) {
  requireAdmin(ctx);
  const body = ctx.body ?? {};
  if (Object.keys(body).length === 0) throw new ApiError(400, '수정할 기록을 입력해 주세요.');
  const keys = type === 'batter' ? BATTING_COUNT_KEYS : PITCHING_COUNT_KEYS;
  Object.entries(body).forEach(([key, value]) => {
    if (!keys.includes(key)) throw new ApiError(400, `수정할 수 없는 기록 항목입니다. ${key}`);
    if (value !== null && !(Number.isInteger(value) && value >= 0)) {
      throw new ApiError(400, `${key} 값은 0 이상의 정수여야 합니다.`);
    }
  });

  const rows = type === 'batter' ? battingRows : pitchingRows;
  const row = rows.find((r) => r.playerId === playerId && r.season === year);
  if (!row) throw new ApiError(404, '선수의 시즌 기록을 찾을 수 없습니다.');

  // 기존 기록에 바꾼 값을 합쳐서 검사하고, 통과해야만 저장한다
  validateCounts(type, { ...row, ...body });
  Object.assign(row, body);
  Object.assign(row, type === 'batter' ? battingRates(row) : pitchingRates(row));
  row.qualified = type === 'batter' ? row.plateAppearances >= 447 : row.outsPitched >= 432;
  return row;
}

// ---------- SQL 시연 (백엔드 db/sql_preview.py 흉내) ----------
// 목업에는 SQL 엔진이 없어서 화면 확인용으로 몇 가지 모양만 흉내 낸다.
//   - SELECT … FROM player …        → 목업 선수 목록(최대 100행, 넘으면 truncated)
//   - EXPLAIN QUERY PLAN …           → 실행계획 예시
//   - UPDATE/INSERT/DELETE           → 변경 행 수 1 (값에 -1 이 있으면 제약조건 위반)
//   - PRAGMA·ATTACH·DROP·sqlite_master 등 → 허용되지 않음(422)
// 실제 결과는 백엔드에 연결해서(VITE_USE_MOCK=false) 확인한다.
const MAX_SQL_BYTES = 8192;
const MAX_ROWS = 100;

export function sqlPreview(ctx) {
  requireAdmin(ctx);
  const sql = String(ctx.body?.sql ?? '');
  if (!sql.trim() || new TextEncoder().encode(sql).length > MAX_SQL_BYTES) {
    throw new ApiError(400, 'SQL을 8KB 이내로 입력해 주세요.');
  }
  const text = sql.trim().replace(/;\s*$/, '');
  if (text.includes(';')) throw new ApiError(422, 'You can only execute one statement at a time.');
  if (/\b(pragma|attach|detach|drop|create|alter|vacuum)\b|sqlite_master|load_extension/i.test(text)) {
    throw new ApiError(422, 'not authorized');
  }

  if (/^explain\s+query\s+plan\b/i.test(text)) {
    if (!/season_year/i.test(text)) {
      return { columns: ['id', 'parent', 'notused', 'detail'], rows: [[2, 0, 216, 'SCAN batter_season']], affectedRows: null, truncated: false };
    }
    return {
      columns: ['id', 'parent', 'notused', 'detail'],
      rows: [
        [4, 0, 62, 'SEARCH batter_season USING INDEX idx_batter_season_team (season_year=?)'],
        [34, 0, 0, 'USE TEMP B-TREE FOR ORDER BY'],
      ],
      affectedRows: null,
      truncated: false,
    };
  }

  if (/^(update|insert|delete)\b/i.test(text)) {
    if (/=\s*-\s*1\b/.test(text)) throw new ApiError(422, 'CHECK constraint failed: home_runs >= 0');
    const returning = /\breturning\b/i.test(text);
    return {
      columns: returning ? ['player_id', 'player_name'] : [],
      rows: returning ? [['75847', '최정 (시연)']] : [],
      affectedRows: 1,
      truncated: false,
    };
  }

  // 예시 'JOIN' 쿼리: 그 시즌 홈런 상위 5명
  if (/^select\b/i.test(text) && /\bbatter_season\b/i.test(text) && /home_runs/i.test(text)) {
    const year = Number(text.match(/season_year\s*=\s*(\d{4})/i)?.[1] ?? 2025);
    const top = battingRows
      .filter((row) => row.season === year)
      .sort((x, y) => y.homeRuns - x.homeRuns)
      .slice(0, 5)
      .map((row) => [row.playerName, row.teamId, row.homeRuns]);
    return { columns: ['player_name', 'team_id', 'home_runs'], rows: top, affectedRows: null, truncated: false };
  }

  if (/^(select|with)\b/i.test(text) && /\bfrom\s+player\b/i.test(text)) {
    // WHERE player_id = '…' 가 있으면 그 선수만 (예시의 75847 은 목업에 없어서 백엔드 시연 DB 값을 흉내 낸다)
    const id = text.match(/player_id\s*=\s*'([^']*)'/i)?.[1];
    const source = id ? [...players.values()].filter((p) => p.playerId === id) : [...players.values()];
    const all = source.map((p) => [p.playerId, p.playerName, p.birthDate ?? null]);
    if (id === '75847' && all.length === 0) all.push(['75847', '최정', '1987-02-28']);
    return {
      columns: ['player_id', 'player_name', 'birth_date'],
      rows: all.slice(0, MAX_ROWS),
      affectedRows: null,
      truncated: all.length > MAX_ROWS,
    };
  }

  throw new ApiError(422, '목업에서는 player 조회, EXPLAIN QUERY PLAN, UPDATE 예시만 흉내 냅니다. 실제 결과는 백엔드에 연결해서 확인해 주세요.');
}
