// 관리자 입력 폼에서 쓰는 도우미 함수
// 입력칸의 값은 항상 문자열이라, 보내기 전에 숫자·null 로 바꾸고 바뀐 항목만 골라낸다.

// API 응답(숫자·null) → 입력칸 값(문자열)
export function toFormValues(source, fields) {
  const values = {};
  fields.forEach(({ key }) => {
    values[key] = source?.[key] == null ? '' : String(source[key]);
  });
  return values;
}

// 입력칸 값(문자열) → 보낼 값. 빈칸은 null(값 없음)
export function parseValue(field, text) {
  const trimmed = String(text).trim();
  if (trimmed === '') return null;
  if (field.type === 'number' || field.type === 'count') return Number(trimmed);
  return trimmed;
}

// 원래 값과 달라진 항목만 { key: 새 값 } 으로 모은다 (PATCH 는 바꿀 항목만 보낸다)
export function changedValues(fields, form, original) {
  const changes = {};
  const numeric = (field) => field.type === 'number' || field.type === 'count';
  fields.forEach((field) => {
    const next = parseValue(field, form[field.key]);
    const before = original?.[field.key] ?? null;
    // 숫자는 183 과 183.0 을 같은 값으로 본다
    const same = numeric(field) && next !== null && before !== null ? Number(next) === Number(before) : next === before;
    if (!same) changes[field.key] = next;
  });
  return changes;
}

// 빈칸이 아닌 항목만 모은다 (선수 등록용)
export function filledValues(fields, form) {
  const values = {};
  fields.forEach((field) => {
    const value = parseValue(field, form[field.key]);
    if (value !== null) values[field.key] = value;
  });
  return values;
}

/**
 * 형식만 먼저 확인한다 (숫자 칸에 글자, 음수, 소수 등).
 * 타수 ≤ 타석 같은 기록 사이의 규칙은 일부러 확인하지 않는다 → 서버(DB 저장 전 검증)가 판단하고 이유를 돌려준다.
 */
export function formatError(fields, form) {
  for (const field of fields) {
    const text = String(form[field.key] ?? '').trim();
    if (field.required && text === '') return `${field.label}을(를) 입력해 주세요.`;
    if (text === '') continue;
    if (field.type === 'count' && !/^\d+$/.test(text)) return `${field.label}은(는) 0 이상의 정수여야 합니다.`;
    if (field.type === 'number' && !(Number(text) > 0)) return `${field.label}은(는) 0보다 큰 숫자여야 합니다.`;
  }
  return '';
}
