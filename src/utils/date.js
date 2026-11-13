// 경기 날짜('2026-09-15' 형식)를 다루는 함수들.
// 시간대 때문에 하루가 밀리지 않도록 Date 를 만들 때는 항상 UTC 기준으로 계산한다.

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function toUtcDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

// 'YYYY-MM-DD' 형식이고 실제로 있는 날짜인지 (2026-02-30 같은 값은 false)
export function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toDateString(toUtcDate(value)) === value;
}

// 날짜 더하기: addDays('2026-09-30', 1) → '2026-10-01'
export function addDays(dateStr, days) {
  const date = toUtcDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
}

// 요일 번호 (0 = 일요일, 1 = 월요일, …)
export function weekdayOf(dateStr) {
  return toUtcDate(dateStr).getUTCDay();
}

// '2026-09-15' → '9월 15일 (화)'
export function formatDateShort(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${m}월 ${d}일 (${WEEKDAYS[weekdayOf(dateStr)]})`;
}

// '2026-09-15' → '2026년 9월 15일 (화)'
export function formatDateLong(dateStr) {
  return `${dateStr.slice(0, 4)}년 ${formatDateShort(dateStr)}`;
}

// 날짜 띠에 쓰는 짧은 표기: { day: '15', weekday: '화' }
export function dayParts(dateStr) {
  return { day: String(Number(dateStr.slice(8, 10))), weekday: WEEKDAYS[weekdayOf(dateStr)] };
}
