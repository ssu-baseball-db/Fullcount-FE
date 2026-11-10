// 야구 기록 표기 규칙에 맞게 숫자를 문자열로 바꾸는 함수들
// 명세: 분모가 0이거나 원천 값이 없으면 API가 null 을 주고, 화면은 대시(-)로 표시한다.

// 0.347 → ".347", 1.0234 → "1.023" (타율·출루율·장타율·OPS·승률)
export function formatRate(value) {
  if (value == null) return '-';
  const text = Number(value).toFixed(3);
  return text.startsWith('0') ? text.slice(1) : text;
}

// 게임차: 0 → "-", 1.5 → "1.5", 3 → "3.0"
export function formatGamesBehind(value) {
  if (!value) return '-';
  return Number(value).toFixed(1);
}

// 투구 아웃 수 → 이닝 표기: 432 → "144", 433 → "144 1/3", 434 → "144 2/3"
export function formatInnings(outs) {
  if (outs == null) return '-';
  const whole = Math.floor(outs / 3);
  const rest = outs % 3;
  return rest === 0 ? String(whole) : `${whole} ${rest}/3`;
}

const RATE_KEYS = ['avg', 'obp', 'slg', 'ops', 'winningPct'];
const TWO_DECIMAL_KEYS = ['era', 'whip'];

// 기록 이름(키)에 맞춰 표기한다
export function formatStat(key, value) {
  if (value == null) return '-';
  if (RATE_KEYS.includes(key)) return formatRate(value);
  if (TWO_DECIMAL_KEYS.includes(key)) return Number(value).toFixed(2);
  if (key === 'outsPitched') return formatInnings(value);
  return String(value);
}

// 투타: R/L/S → "우투좌타"
export function formatHands(throwHand, batHand) {
  const throwText = { R: '우투', L: '좌투' }[throwHand] ?? '';
  const batText = { R: '우타', L: '좌타', S: '양타' }[batHand] ?? '';
  return throwText + batText || '-';
}

// 포지션 코드 → 한글
const POSITION_LABELS = {
  P: '투수', C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수', SS: '유격수', OF: '외야수', DH: '지명타자',
};
export function formatPosition(code) {
  return POSITION_LABELS[code] ?? '-';
}

// 연도 구간: (2018, 2022) → "2018~2022", (2024, 2024) → "2024"
export function formatYears(from, to) {
  return from === to ? String(from) : `${from}~${to}`;
}
