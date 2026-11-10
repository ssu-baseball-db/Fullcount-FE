import './SeasonPlates.css';

/**
 * 수동식 전광판처럼 연도를 숫자판 한 장씩 보여주고, 이전/다음 시즌으로 넘기는 컴포넌트.
 * seasons: 최신순 연도 배열, year: 현재 연도, onChange: 연도가 바뀔 때 호출
 */
export default function SeasonPlates({ seasons, year, onChange }) {
  const index = seasons.indexOf(year);
  const newer = index > 0 ? seasons[index - 1] : null;
  const older = index < seasons.length - 1 ? seasons[index + 1] : null;

  return (
    <div className="season-plates">
      <button
        type="button"
        className="season-plates__arrow"
        onClick={() => onChange(older)}
        disabled={!older}
        aria-label={older ? `${older} 시즌 보기` : '이전 시즌 없음'}
      >
        ◀
      </button>

      <div className="season-plates__digits" aria-hidden="true">
        {String(year)
          .split('')
          .map((digit, i) => (
            // key 에 year 를 넣어서 연도가 바뀌면 숫자판이 다시 그려지며 넘어가는 효과가 난다
            <span key={`${year}-${i}`} className="season-plates__plate" style={{ animationDelay: `${i * 60}ms` }}>
              {digit}
            </span>
          ))}
      </div>

      <button
        type="button"
        className="season-plates__arrow"
        onClick={() => onChange(newer)}
        disabled={!newer}
        aria-label={newer ? `${newer} 시즌 보기` : '다음 시즌 없음'}
      >
        ▶
      </button>

      {/* 멀리 있는 시즌으로 바로 이동할 때 쓰는 선택 상자 */}
      <label className="season-plates__select">
        <span className="visually-hidden">시즌 선택</span>
        <select value={year} onChange={(event) => onChange(Number(event.target.value))}>
          {seasons.map((season) => (
            <option key={season} value={season}>
              {season} 시즌
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
