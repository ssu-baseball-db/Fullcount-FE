import { Link, useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi.js';
import { fetchStandings, withRanks } from '../../api/statsApi.js';
import { fetchTeamStats } from '../../api/teamApi.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatTable from '../../components/common/StatTable.jsx';
import StatusMessage from '../../components/common/StatusMessage.jsx';
import { SeasonSelect } from '../../components/common/Controls.jsx';
import { TEAM_COLUMNS } from '../../constants/columns.js';
import { STAT_LABELS } from '../../constants/stats.js';
import { formatRate, formatGamesBehind } from '../../utils/format.js';
import { readYear, withParams } from '../../utils/params.js';
import './TeamPages.css';

const TEAM_SORTS = ['wins', 'losses', 'runs', 'homeRuns', 'stolenBases', 'avg', 'ops', 'runsAllowed', 'era', 'whip'];

/**
 * 팀 목록 페이지  /teams?year=2024&sort=ops
 * 사용 API: GET /api/seasons/{year}/standings (팀 카드), GET /api/seasons/{year}/team-stats?sort= (기록 비교 표)
 */
export default function TeamListPage() {
  const [params, setParams] = useSearchParams();
  const year = readYear(params.get('year'));
  const sort = TEAM_SORTS.includes(params.get('sort')) ? params.get('sort') : 'wins';
  const update = (changes) => setParams(withParams(params, changes));

  const standings = useApi(() => fetchStandings(year), [year]);
  const stats = useApi(() => fetchTeamStats(year, sort), [year, sort]);
  const statRows = stats.data ? withRanks(stats.data, sort) : [];

  const columns = [
    { key: 'rank', label: '순위' },
    {
      key: 'teamName',
      label: '팀',
      align: 'left',
      sticky: true,
      render: (row) => <Link to={`/teams/${row.teamId}?year=${year}`}>{row.teamName}</Link>,
    },
    ...TEAM_COLUMNS,
  ];

  return (
    <>
      <PageHeader title="팀" description="시즌별로 10개 구단의 성적을 보고, 팀을 눌러 소속 선수 기록을 확인할 수 있습니다." />

      <div className="container page-body">
        <div className="toolbar">
          <SeasonSelect value={year} onChange={(value) => update({ year: value })} />
        </div>

        {/* 정규시즌 순위 카드 */}
        <section className="section" aria-labelledby="team-cards-title">
          <div className="section__head">
            <h2 id="team-cards-title">{year} 정규시즌 순위</h2>
            {standings.data?.some((t) => t.isChampion) && <p className="section__note">🏆 한국시리즈 우승</p>}
          </div>

          <StatusMessage
            loading={standings.loading && !standings.data}
            error={standings.error}
            empty={standings.data?.length === 0}
            emptyText={`${year} 시즌 순위 기록이 없습니다.`}
          />

          {standings.data?.length > 0 && (
            <ol className="team-cards">
              {standings.data.map((team) => (
                <li key={team.teamId}>
                  <Link to={`/teams/${team.teamId}?year=${year}`} className="team-card">
                    <span className="team-card__rank num">{team.rank}</span>
                    <span className="team-card__name">
                      {team.teamName}
                      {team.isChampion && (
                        <span role="img" aria-label="한국시리즈 우승" title="한국시리즈 우승">
                          {' '}
                          🏆
                        </span>
                      )}
                    </span>
                    <span className="team-card__record num">
                      {team.wins}승 {team.losses}패 {team.draws}무
                    </span>
                    <span className="team-card__meta num">
                      승률 {formatRate(team.winningPct)}, 게임차 {formatGamesBehind(team.gamesBehind)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* 팀 기록 비교 표 */}
        <section className="section" aria-labelledby="team-stats-title">
          <div className="section__head">
            <div>
              <h2 id="team-stats-title">팀 기록 비교</h2>
              <p className="section__note">
                머리글을 누르면 그 기록 순으로 정렬합니다. 현재 기준: {STAT_LABELS[sort] ?? sort}
              </p>
            </div>
          </div>

          <StatusMessage loading={stats.loading && !stats.data} error={stats.error} empty={stats.data?.length === 0} emptyText="팀 기록이 없습니다." />

          {statRows.length > 0 && (
            <StatTable
              caption={`${year} 시즌 팀 기록`}
              columns={columns}
              rows={statRows}
              getRowKey={(row) => row.teamId}
              sortKey={sort}
              sortableKeys={TEAM_SORTS}
              onSort={(key) => update({ sort: key })}
            />
          )}
        </section>
      </div>
    </>
  );
}
