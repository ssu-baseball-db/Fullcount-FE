import { formatStat } from '../../utils/format.js';
import './StatTable.css';

// 낮을수록 좋은 기록 (정렬 방향 표시에 사용)
const LOWER_IS_BETTER = ['era', 'whip', 'losses', 'runsAllowed'];

/**
 * 기록 표. 선수 상세·팀 상세·기록 순위·팀 목록에서 같이 쓴다.
 *
 * columns   : [{ key, label, title?, render?(row), align?: 'left', sticky?: true }]
 *             render 가 없으면 row[key] 를 formatStat 으로 표기한다.
 * rows      : 표에 그릴 데이터 배열
 * getRowKey : 각 행의 고유 키를 돌려주는 함수
 * sortKey   : 현재 정렬 기준 (그 열을 강조)
 * sortableKeys + onSort : 머리글을 눌러 정렬을 바꿀 수 있는 열과 처리 함수
 * footer    : 합계·통산처럼 표 맨 아래에 붙일 행 (선택), footerLabel: 그 행의 이름
 */
export default function StatTable({
  caption,
  columns,
  rows,
  getRowKey,
  sortKey,
  sortableKeys = [],
  onSort,
  footer,
  footerLabel = '합계',
}) {
  const cellClass = (column) =>
    [
      column.align === 'left' ? 'is-left' : '',
      column.sticky ? 'is-sticky' : '',
      column.key === sortKey ? 'is-sorted' : '',
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="stat-table__scroll" tabIndex={0} role="region" aria-label={caption}>
      <table className="stat-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const sortable = onSort && sortableKeys.includes(column.key);
              const isSorted = column.key === sortKey;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cellClass(column)}
                  title={column.title}
                  aria-sort={isSorted ? (LOWER_IS_BETTER.includes(column.key) ? 'ascending' : 'descending') : undefined}
                >
                  {sortable ? (
                    <button type="button" onClick={() => onSort(column.key)} aria-label={`${column.label} 순으로 정렬`}>
                      {column.label}
                      <span className="stat-table__arrow" aria-hidden="true">
                        {isSorted ? (LOWER_IS_BETTER.includes(column.key) ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={getRowKey ? getRowKey(row, index) : index}>
              {columns.map((column) => (
                <td key={column.key} className={cellClass(column)}>
                  {column.render ? column.render(row) : formatStat(column.key, row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

        {footer && (
          <tfoot>
            <tr>
              {columns.map((column, index) => (
                <td key={column.key} className={cellClass(column)}>
                  {/* 이름 같은 열(render 가 있는 열)은 비우고 첫 칸에만 '합계' 같은 이름을 쓴다 */}
                  {index === 0 ? footerLabel : column.render ? '' : formatStat(column.key, footer[column.key])}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
