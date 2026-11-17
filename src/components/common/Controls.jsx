// 여러 페이지에서 같이 쓰는 작은 입력 컴포넌트 모음
import { SEASONS } from '../../constants/seasons.js';
import { TEAM_IDS, teamNameFor } from '../../constants/teams.js';
import './Controls.css';

/**
 * 시즌 선택 상자
 * allowCareer 가 true 면 맨 위에 '통산' 선택지(값 null)가 생긴다.
 */
export function SeasonSelect({ value, onChange, allowCareer = false, label = '시즌' }) {
  return (
    <label className="control">
      <span className="control__label">{label}</span>
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
      >
        {allowCareer && <option value="">통산 (2015~)</option>}
        {SEASONS.map((season) => (
          <option key={season} value={season}>
            {season}
          </option>
        ))}
      </select>
    </label>
  );
}

// 구단 선택 상자 (값이 '' 이면 전체)
export function TeamSelect({ value, onChange, year, label = '구단' }) {
  return (
    <label className="control">
      <span className="control__label">{label}</span>
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">전체</option>
        {TEAM_IDS.map((teamId) => (
          <option key={teamId} value={teamId}>
            {teamNameFor(teamId, year)}
          </option>
        ))}
      </select>
    </label>
  );
}

// 정렬 기준 등 목록에서 하나 고르는 선택 상자
export function OptionSelect({ value, onChange, options, label }) {
  return (
    <label className="control">
      <span className="control__label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * 타자/투수 같은 2~3개 중 하나를 고르는 버튼 묶음
 * options: [{ value, label }]
 */
export function SegmentedTabs({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={value === option.value ? 'is-active' : undefined}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// 체크박스 하나
export function Toggle({ checked, onChange, label, disabled = false, hint }) {
  return (
    <label className={`toggle ${disabled ? 'is-disabled' : ''}`} title={hint}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
