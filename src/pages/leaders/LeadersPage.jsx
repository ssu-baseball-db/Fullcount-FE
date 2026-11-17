import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi.js';
import { fetchSeasonStats, withRanks } from '../../api/statsApi.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatTable from '../../components/common/StatTable.jsx';
import StatusMessage from '../../components/common/StatusMessage.jsx';
import { SeasonSelect, TeamSelect, OptionSelect, SegmentedTabs, Toggle } from '../../components/common/Controls.jsx';
import { BATTING_COLUMNS, PITCHING_COLUMNS } from '../../constants/columns.js';
import {
  BATTING_SORTS,
  PITCHING_SORTS,
  QUALIFIED_ONLY_SORTS,
  CATEGORY_LABELS,
  LEADER_TYPES,
} from '../../constants/stats.js';
import { formatPosition } from '../../utils/format.js';
import { readYear, withParams } from '../../utils/params.js';

const PAGE_SIZE = 30;
const DEFAULT_SORT = { batting: 'avg', pitching: 'era' };

/**
 * 기록 순위 페이지  /leaders?year=2024&type=batting&category=avg&team=KIA&qualified=true
 * 사용 API: GET /api/seasons/{year}/batting-stats, pitching-stats (sort, teamId, qualified)
 * 메인 화면의 '전체 순위' 링크(/leaders?year=&category=)로도 들어온다.
 */
export default function LeadersPage() {
  const [params, setParams] = useSearchParams();

  // ---- 주소에서 조건 읽기 ----
  const year = readYear(params.get('year'));
  const category = params.get('category');
  const type = params.get('type') ?? (PITCHING_SORTS.includes(category) ? 'pitching' : 'batting');
  const sorts = type === 'pitching' ? PITCHING_SORTS : BATTING_SORTS;
  const sort = sorts.includes(category) ? category : DEFAULT_SORT[type];
  const teamId = params.get('team');
  const qualifiedForced = QUALIFIED_ONLY_SORTS.includes(sort); // 비율 지표는 규정 충족 선수만
  const onlyQualified = qualifiedForced || params.get('qualified') === 'true';

  const update = (changes) => setParams(withParams(params, changes));

  // ---- 데이터 ----
  const { data, loading, error } = useApi(
    () => fetchSeasonStats(year, type, { sort, teamId, qualified: onlyQualified ? true : undefined }),
    [year, type, sort, teamId, onlyQualified]
  );
  const rows = data ? withRanks(data, sort) : [];

  // 조건이 바뀌면 다시 30명부터 보여준다
  const conditionKey = `${year}-${type}-${sort}-${teamId}-${onlyQualified}`;
  const [shown, setShown] = useState({ key: conditionKey, count: PAGE_SIZE });
  const visibleCount = shown.key === conditionKey ? shown.count : PAGE_SIZE;

  // ---- 표 열 ----
  const playerType = type === 'pitching' ? 'pitcher' : 'batter';
  const columns = [
    { key: 'rank', label: '순위' },
    {
      key: 'playerName',
      label: '선수',
      align: 'left',
      sticky: true,
      render: (row) => <Link to={`/players/${row.playerId}?type=${playerType}`}>{row.playerName}</Link>,
    },
    {
      key: 'teamName',
      label: '팀',
      align: 'left',
      render: (row) => <Link to={`/teams/${row.teamId}?year=${year}`}>{row.teamName}</Link>,
    },
    ...(type === 'batting'
      ? [{ key: 'position', label: '포지션', align: 'left', render: (row) => formatPosition(row.position) }]
      : []),
    ...(type === 'pitching' ? PITCHING_COLUMNS : BATTING_COLUMNS),
  ];

  const typeLabel = type === 'pitching' ? '투수' : '타자';

  return (
    <>
      <PageHeader
        title="기록 순위"
        description={`${year} 시즌 ${typeLabel} 기록을 원하는 기준으로 줄 세워 볼 수 있습니다.`}
      />

      <div className="container page-body">
        <div className="toolbar">
          <SeasonSelect value={year} onChange={(value) => update({ year: value })} />
          <SegmentedTabs
            label="선수 구분"
            options={LEADER_TYPES}
            value={type}
            onChange={(value) => update({ type: value, category: DEFAULT_SORT[value], qualified: null })}
          />
          <OptionSelect
            label="순위 기준"
            value={sort}
            options={sorts.map((key) => ({ value: key, label: CATEGORY_LABELS[key] }))}
            onChange={(value) => update({ category: value })}
          />
          <TeamSelect value={teamId} year={year} onChange={(value) => update({ team: value })} />
          <Toggle
            label={type === 'pitching' ? '규정이닝 충족 투수만' : '규정타석 충족 타자만'}
            checked={onlyQualified}
            disabled={qualifiedForced}
            onChange={(checked) => update({ qualified: checked ? 'true' : null })}
          />
        </div>

        {qualifiedForced && (
          <p className="toolbar__note" style={{ marginBottom: 16 }}>
            {type === 'pitching'
              ? '평균자책점·WHIP 순위는 규정이닝(144이닝) 이상 던진 투수만 매깁니다.'
              : '타율·출루율·장타율·OPS 순위는 규정타석(447타석) 이상인 타자만 매깁니다.'}
          </p>
        )}

        <StatusMessage
          loading={loading && !data}
          error={error}
          empty={!loading && rows.length === 0}
          emptyText="조건에 맞는 기록이 없습니다. 구단이나 규정 충족 조건을 바꿔 보세요."
        />

        {rows.length > 0 && (
          <>
            <StatTable
              caption={`${year} 시즌 ${typeLabel} ${CATEGORY_LABELS[sort]} 순위`}
              columns={columns}
              rows={rows.slice(0, visibleCount)}
              getRowKey={(row) => row.playerId}
              sortKey={sort}
              sortableKeys={sorts}
              onSort={(key) => update({ category: key })}
            />

            <div className="toolbar" style={{ justifyContent: 'center', marginTop: 16 }}>
              <p className="toolbar__note">
                {rows.length}명 중 {Math.min(visibleCount, rows.length)}명
              </p>
              {visibleCount < rows.length && (
                <button
                  type="button"
                  className="button"
                  onClick={() => setShown({ key: conditionKey, count: visibleCount + PAGE_SIZE })}
                >
                  {PAGE_SIZE}명 더 보기
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
