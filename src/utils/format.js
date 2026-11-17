// 야구 기록 표기 규칙에 맞게 숫자를 문자열로 바꾸는 함수들

// 0.347 → ".347" (타율·승률은 앞의 0을 빼고 소수점 셋째 자리까지)
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

// 부문에 맞춰 표기 (값이 null 이면 명세대로 대시)
export function formatStat(category, value) {
  if (value == null) return '-';
  if (['avg', 'obp', 'slg', 'ops'].includes(category)) return formatRate(value);
  if (['era', 'whip'].includes(category)) return Number(value).toFixed(2);
  return String(value);
}
