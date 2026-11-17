// 관리자 폼의 입력칸 묶음. fields 정의(constants/adminFields.js)대로 입력칸을 그린다.
export default function FormFields({ fields, values, onChange, original, idPrefix }) {
  return (
    <div className="form-grid">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const value = values[field.key] ?? '';
        // 원래 값과 달라진 칸은 표시해서 무엇을 바꾸는지 보이게 한다
        const changed = original && value !== (original[field.key] ?? '');
        const set = (event) => onChange({ ...values, [field.key]: event.target.value });

        return (
          <label key={field.key} className={`field ${changed ? 'is-changed' : ''}`} htmlFor={id}>
            <span className="field__label">
              {field.label}
              {field.required && <span className="field__required"> *</span>}
            </span>

            {field.type === 'select' ? (
              <select id={id} value={value} onChange={set}>
                <option value="">미입력</option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                type={field.type === 'date' ? 'date' : 'text'}
                inputMode={field.type === 'count' || field.type === 'number' ? 'numeric' : undefined}
                value={value}
                onChange={set}
                autoComplete="off"
              />
            )}

            {field.hint && <span className="field__hint">{field.hint(value)}</span>}
            {changed && <span className="field__was">원래 값: {original[field.key] || '없음'}</span>}
          </label>
        );
      })}
    </div>
  );
}
