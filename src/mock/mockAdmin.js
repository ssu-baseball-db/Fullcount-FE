// ------------------------------------------------------------
// 목업: 로그인 API(백엔드에 제안한 형식)와 관리자 API(openapi.yaml 5.3, 5.4)
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

// ---------- 로그인 ----------
// app_user 테이블을 흉내 낸 시험 계정
const ACCOUNTS = [
  { loginId: 'admin', password: 'admin1234', role: 'ADMIN' },
  { loginId: 'fan', password: 'fan1234', role: 'USER' },
];
// login_session 테이블을 흉내 낸 토큰 → 계정
const sessions = new Map();

export function login(body = {}) {
  const account = ACCOUNTS.find((a) => a.loginId === body.loginId && a.password === body.password);
  if (!account) throw new ApiError(401, '아이디 또는 비밀번호가 맞지 않습니다.');
  const token = `mock-${account.loginId}-${Date.now()}`;
  sessions.set(token, account);
  return { token, loginId: account.loginId, role: account.role };
}

function accountOf(token) {
  return token ? sessions.get(token) : undefined;
}

export function me(ctx) {
  const account = accountOf(ctx.token);
  if (!account) throw new ApiError(401, '로그인이 필요합니다.');
  return { loginId: account.loginId, role: account.role };
}

export function logout(ctx) {
  sessions.delete(ctx.token);
  return null;
}

// 관리자 API 공통: 토큰으로 계정을 찾고 role 이 ADMIN 인지 확인 (백엔드는 DB 조회로 같은 일을 한다)
function requireAdmin(ctx) {
  const account = accountOf(ctx.token);
  if (!account) throw new ApiError(401, '로그인이 필요합니다.');
  if (account.role !== 'ADMIN') throw new ApiError(403, '관리자 접근 권한이 필요합니다.');
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
