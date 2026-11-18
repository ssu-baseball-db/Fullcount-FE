import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { runSqlPreview } from '../../api/adminApi.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import '../../components/common/StatTable.css';
import './AdminPages.css';

const MAX_SQL_BYTES = 8192; // 백엔드 제한: UTF-8 기준 8KB

// 시연 서비스가 읽고 쓸 수 있는 테이블 (백엔드 db/sql_preview.py 의 TABLES 와 같다)
const TABLES = [
  'player',
  'batter_season',
  'pitcher_season',
  'team',
  'team_season_name',
  'season',
  'data_source',
  'team_standing_snapshot',
  'game',
  'inning_score',
  'batter_game',
  'pitcher_game',
  'game_summary',
  'game_event',
];

const TOP_HOME_RUNS = `SELECT p.player_name, b.team_id, b.home_runs
FROM batter_season b
JOIN player p ON p.player_id = b.player_id
WHERE b.season_year = 2025
ORDER BY b.home_runs DESC
LIMIT 5;`;

// 예시 쿼리 (백엔드 docs/admin-demo.md 의 시연 순서와 같다)
const EXAMPLES = [
  {
    label: '선수 조회',
    sql: `SELECT player_id, player_name, birth_date
FROM player
WHERE player_id = '75847';`,
  },
  { label: '2025 홈런 TOP 5 (JOIN)', sql: TOP_HOME_RUNS },
  { label: '실행계획 (인덱스 사용)', sql: `EXPLAIN QUERY PLAN\n${TOP_HOME_RUNS}` },
  {
    // 인덱스가 없는 열(home_runs)로만 거르면 테이블 전체를 훑는다(SCAN) — 위 계획과 비교용
    label: '실행계획 (전체 탐색)',
    sql: `EXPLAIN QUERY PLAN
SELECT player_id, season_year, home_runs
FROM batter_season
WHERE home_runs >= 40;`,
  },
  {
    label: 'UPDATE 시연',
    sql: `UPDATE player
SET player_name = '최정 (시연)'
WHERE player_id = '75847'
RETURNING player_id, player_name;`,
  },
  {
    label: '제약조건 위반',
    sql: `UPDATE batter_season
SET home_runs = -1
WHERE player_id = '75847' AND season_year = 2024;`,
  },
];

const PLAN_COLUMNS = ['id', 'parent', 'notused', 'detail'];

function byteLength(text) {
  return new TextEncoder().encode(text).length;
}

/**
 * SQL 실행 화면  /admin/sql   (관리자만, RequireAdmin 으로 보호)
 * API: POST /api/admin/sql-preview  { sql } → { columns, rows, affectedRows, truncated }
 * 시연용 DB 복제본에서 한 문장만 실행하고, 변경은 요청이 끝나면 버려진다.
 */
export default function SqlPreviewPage() {
  const [sql, setSql] = useState(EXAMPLES[0].sql);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null); // { sql, data, ms } 또는 { sql, error }
  const editorRef = useRef(null);

  const bytes = byteLength(sql);
  const tooLong = bytes > MAX_SQL_BYTES;
  const canRun = sql.trim() !== '' && !tooLong && !running;

  const run = async () => {
    if (!canRun) return;
    setRunning(true);
    const started = performance.now();
    try {
      const data = await runSqlPreview(sql);
      setResult({ sql, data, ms: Math.round(performance.now() - started) });
    } catch (error) {
      setResult({ sql, error });
    } finally {
      setRunning(false);
    }
  };

  const loadSql = (text) => {
    setSql(text);
    editorRef.current?.focus();
  };

  return (
    <>
      <PageHeader
        title="SQL 실행"
        description="SQL 한 문장을 직접 실행하고 결과와 실행계획을 봅니다. 시연용 DB 복제본에서 실행되므로 실제 서비스 데이터는 바뀌지 않습니다."
      />
      <div className="container page-body admin-body">
        <p className="admin-back">
          <Link to="/admin" className="text-link">
            ← 관리 화면으로
          </Link>
        </p>

        <form
          className="card sql-editor"
          onSubmit={(event) => {
            event.preventDefault();
            run();
          }}
        >
          <div className="sql-chips" role="group" aria-label="예시 쿼리">
            <span className="sql-chips__label">예시</span>
            {EXAMPLES.map((example) => (
              <button key={example.label} type="button" className="sql-chip" onClick={() => loadSql(example.sql)}>
                {example.label}
              </button>
            ))}
          </div>

          <label className="sql-editor__label" htmlFor="sql-input">
            SQL
          </label>
          <textarea
            id="sql-input"
            ref={editorRef}
            className="sql-editor__input"
            value={sql}
            onChange={(event) => setSql(event.target.value)}
            onKeyDown={(event) => {
              // Ctrl+Enter (맥은 Cmd+Enter) 로 바로 실행
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                run();
              }
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            rows={8}
          />

          <div className="sql-editor__bar">
            <button type="submit" className="button button--primary" disabled={!canRun}>
              {running ? '실행 중…' : '실행'}
            </button>
            <span className="sql-editor__shortcut">Ctrl + Enter</span>
            <span className={`sql-editor__bytes ${tooLong ? 'is-over' : ''}`}>
              {bytes.toLocaleString()} / {MAX_SQL_BYTES.toLocaleString()} bytes
            </span>
          </div>

          <div className="sql-tables">
            <span className="sql-chips__label">테이블</span>
            {TABLES.map((table) => (
              <button
                key={table}
                type="button"
                className="sql-chip sql-chip--table"
                title={`${table} 앞 20행 보기`}
                onClick={() => loadSql(`SELECT *\nFROM ${table}\nLIMIT 20;`)}
              >
                {table}
              </button>
            ))}
          </div>

          <p className="form-hint">
            한 번에 한 문장만 실행할 수 있고, 결과는 최대 100행(64KB)까지 보입니다. 실행 시간은 2초로 제한됩니다.
            <code>UPDATE</code>·<code>INSERT</code>·<code>DELETE</code>도 실행되지만 요청이 끝나면 되돌아갑니다. 실제 데이터를
            고칠 때는 <Link to="/admin/players/edit" className="text-link">선수 정보·시즌 기록 수정</Link>을 쓰세요.
          </p>
        </form>

        {result && <SqlResult result={result} />}
      </div>
    </>
  );
}

function SqlResult({ result }) {
  if (result.error) return <SqlError error={result.error} />;

  const { data, ms } = result;
  const columns = data?.columns ?? [];
  const rows = data?.rows ?? [];
  const isPlan = columns.length === PLAN_COLUMNS.length && columns.every((name, index) => name === PLAN_COLUMNS[index]);
  const changed = data?.affectedRows != null;

  return (
    <section className="card sql-result" aria-live="polite">
      <div className="sql-result__meta">
        {changed && <strong>변경된 행 {data.affectedRows.toLocaleString()}개</strong>}
        {columns.length > 0 && <span>결과 {rows.length.toLocaleString()}행</span>}
        <span>응답 {ms.toLocaleString()}ms</span>
      </div>

      {changed && (
        <p className="sql-result__note">
          시연용 복제본에서만 바뀌었고, 요청이 끝나면서 되돌아갔습니다. 같은 조회를 다시 실행하면 원래 값이 보입니다.
        </p>
      )}
      {data?.truncated && (
        <p className="sql-result__note is-warning">결과가 100행(64KB)을 넘어서 앞부분만 보여 줍니다. LIMIT 이나 WHERE 로 범위를 줄여 보세요.</p>
      )}

      {isPlan && <QueryPlan rows={rows} />}

      {columns.length === 0 && !changed && <p className="sql-result__empty">돌려받은 결과가 없습니다.</p>}
      {columns.length > 0 && rows.length === 0 && <p className="sql-result__empty">조건에 맞는 행이 없습니다.</p>}

      {columns.length > 0 && rows.length > 0 && (
        <div className="stat-table__scroll sql-result__table">
          <table className="stat-table">
            <thead>
              <tr>
                <th scope="col" className="sql-result__index">
                  #
                </th>
                {columns.map((name, index) => (
                  <th key={`${name}-${index}`} scope="col">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="sql-result__index">{rowIndex + 1}</td>
                  {row.map((value, index) => (
                    <Cell key={index} value={value} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Cell({ value }) {
  if (value === null || value === undefined) {
    return <td className="sql-cell is-null">NULL</td>;
  }
  if (typeof value === 'object' && 'hex' in value) {
    return <td className="sql-cell is-blob">x&apos;{value.hex}&apos;</td>;
  }
  if (typeof value === 'number') {
    return <td className="sql-cell is-number">{value}</td>;
  }
  return <td className="sql-cell">{String(value)}</td>;
}

/**
 * EXPLAIN QUERY PLAN 결과를 들여쓰기한 목록으로 보여 준다.
 * parent 가 가리키는 id 아래로 한 칸씩 들여 쓴다.
 * SEARCH … USING INDEX = 인덱스로 찾음, SCAN = 테이블 전체를 훑음(행이 많으면 느림)
 */
function QueryPlan({ rows }) {
  const depthById = new Map([[0, -1]]);
  const items = rows.map(([id, parent, , detail]) => {
    const depth = (depthById.get(parent) ?? -1) + 1;
    depthById.set(id, depth);
    const text = String(detail ?? '');
    const kind = /^SCAN\b/.test(text) ? 'scan' : /USING (COVERING )?INDEX|USING INTEGER PRIMARY KEY/.test(text) ? 'index' : '';
    return { id, depth, text, kind };
  });

  return (
    <div className="sql-plan">
      <h2 className="sql-plan__title">실행계획</h2>
      <ol className="sql-plan__list">
        {items.map((item) => (
          <li key={item.id} className={`sql-plan__step ${item.kind ? `is-${item.kind}` : ''}`} style={{ '--depth': item.depth }}>
            {item.kind === 'index' && <span className="sql-plan__tag">인덱스</span>}
            {item.kind === 'scan' && <span className="sql-plan__tag">전체 탐색</span>}
            <code>{item.text}</code>
          </li>
        ))}
      </ol>
      <p className="form-hint">
        <code>SEARCH … USING INDEX</code>는 인덱스로 필요한 행만 찾은 것이고, <code>SCAN</code>은 테이블 전체를 훑은 것입니다.
      </p>
    </div>
  );
}

function SqlError({ error }) {
  const status = error?.status ?? 0;
  let title = '실행하지 못했습니다';
  let hint = '';
  if (status === 422) {
    title = 'SQL 오류';
    hint = '문법, 제약조건 위반(CHECK·FOREIGN KEY 등), 또는 허용되지 않은 문장(PRAGMA, 여러 문장, 시스템 테이블 등)인지 확인해 주세요.';
  } else if (status === 408) {
    title = '시간 초과';
    hint = 'WHERE 나 LIMIT 으로 범위를 줄여 다시 실행해 보세요.';
  } else if (status === 401 || status === 403) {
    title = '관리자 로그인이 필요합니다';
  } else if (status === 502 || status === 503) {
    title = 'SQL 시연 서비스에 연결할 수 없습니다';
    hint = '백엔드의 SQL 시연 서비스가 켜져 있는지 백엔드 담당자에게 확인해 주세요.';
  } else if (status === 400) {
    title = '입력 오류';
  }

  return (
    <div className="form-message is-error sql-error" role="alert">
      <strong>
        {title}
        {status ? ` (${status})` : ''}
      </strong>
      <code className="sql-error__message">{error?.message}</code>
      {hint && <span className="sql-error__hint">{hint}</span>}
      {(status === 401 || status === 403) && (
        <Link to="/login?next=%2Fadmin%2Fsql" className="text-link">
          다시 로그인하기
        </Link>
      )}
    </div>
  );
}
