import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi.js';
import { fetchStandings } from '../../api/statsApi.js';
import { fetchTeamPlayers } from '../../api/teamApi.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatTable from '../../components/common/StatTable.jsx';
import StatusMessage from '../../components/common/StatusMessage.jsx';
import { SeasonSelect, TeamSelect, SegmentedTabs } from '../../components/common/Controls.jsx';
import { BATTING_COLUMNS, PITCHING_COLUMNS } from '../../constants/columns.js';
import { BATTING_SORTS, PITCHING_SORTS, LEADER_TYPES } from '../../constants/stats.js';
import { TEAM_IDS, teamNameFor } from '../../constants/teams.js';
import { formatRate, formatPosition } from '../../utils/format.js';
import { readYear, withParams } from '../../utils/params.js';
import './TeamPages.css';

const DEFAULT_SORT = { batting: 'runsBattedIn', pitching: 'wins' };

/**
 * 팀 상세 페이지  /teams/KIA?year=2024&type=batting&sort=homeRuns
 * 사용 API: GET /api/seasons/{year}/standings (팀 성적 요약)
 *          GET /api/seasons/{year}/teams/{teamId}/batting-stats | pitching-stats?sort=
 */
export default function TeamDetailPage() {
  const { teamId: rawTeamId } = useParams();
  const teamId = rawTeamId.toUpperCase();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const year = readYear(params.get('year'));
  const type = params.get('type') === 'pitching' ? 'pitching' : 'batting';
  const sorts = type === 'pitching' ? PITCHING_SORTS : BATTING_SORTS;
  const sort = sorts.includes(params.get('sort')) ? params.get('sort') : DEFAULT_SORT[type];
  const update = (changes) => setParams(withParams(params, changes));

  const isKnownTeam = TEAM_IDS.includes(teamId);
  const standings = useApi(() => fetchStandings(year), [year], { enabled: isKnownTeam });
  const roster = useApi(() => fetchTeamPlayers(year, teamId, type, sort), [year, teamId, type, sort], {
    enabled: isKnownTeam,
  });

  if (!isKnownTeam) {
    return (
      <>
        <PageHeader title="팀을 찾을 수 없습니다" description={`‘${rawTeamId}’에 해당하는 구단이 없습니다.`} />
        <div className="container page-body">
          <Link to="/teams" className="text-link">
            팀 목록으로 가기
          </Link>
        </div>
      </>
    );
  }

  const record = standings.data?.find((t) => t.teamId === teamId);
  const teamName = record?.teamName ?? teamNameFor(teamId, year);
  const playerType = type === 'pitching' ? 'pitcher' : 'batter';

  const columns = [
    {
      key: 'playerName',
      label: '선수',
      align: 'left',
      sticky: true,
      render: (row) => <Link to={`/players/${row.playerId}?type=${playerType}`}>{row.playerName}</Link>,
    },
    ...(type === 'batting'
      ? [{ key: 'position', label: '포지션', align: 'left', render: (row) => formatPosition(row.position) }]
      : []),
    ...(type === 'pitching' ? PITCHING_COLUMNS : BATTING_COLUMNS),
  ];

  const players = roster.data?.players ?? [];

  return (
    <>
      <PageHeader
        title={teamName}
        aside={
          <Link to={`/teams?year=${year}`} className="button-on-board">
            전체 팀 보기
          </Link>
        }
      >
        {record ? (
          <p className="team-summary">
            <span className="team-summary__rank num">{record.rank}</span>
            <span>
              {year} 정규시즌 {record.rank}위
              {record.isChampion && <strong className="team-summary__champion"> 🏆 한국시리즈 우승</strong>}
              <br />
              <span className="num">
                {record.wins}승 {record.losses}패 {record.draws}무, 승률 {formatRate(record.winningPct)}
              </span>
            </span>
          </p>
        ) : (
          <p className="page-header__desc">{standings.loading ? '팀 성적을 불러오는 중…' : `${year} 시즌`}</p>
        )}
      </PageHeader>

      <div className="container page-body">
        <div className="toolbar">
          <SeasonSelect value={year} onChange={(value) => update({ year: value })} />
          <TeamSelect
            label="다른 구단"
            value={teamId}
            year={year}
            onChange={(value) => value && navigate(`/teams/${value}?${withParams(params, {}).toString()}`)}
          />
          <SegmentedTabs
            label="선수 구분"
            options={LEADER_TYPES}
            value={type}
            onChange={(value) => update({ type: value, sort: null })}
          />
        </div>

        <StatusMessage
          loading={roster.loading && !roster.data}
          error={roster.error}
          notFound="팀 기록을 찾을 수 없습니다."
          empty={roster.data && players.length === 0}
          emptyText={`${year} 시즌 ${teamName} 소속 ${type === 'pitching' ? '투수' : '타자'} 기록이 없습니다.`}
        />

        {players.length > 0 && (
          <>
            <StatTable
              caption={`${year} ${teamName} ${type === 'pitching' ? '투수' : '타자'} 기록`}
              columns={columns}
              rows={players}
              getRowKey={(row) => row.playerId}
              sortKey={sort}
              sortableKeys={sorts}
              onSort={(key) => update({ sort: key })}
              footer={roster.data.totals}
              footerLabel="팀 합계"
            />
            <p className="section__note">
              팀 합계의 비율 기록은 선수 기록을 모두 더한 값으로 다시 계산합니다. 시즌 중 이적한 선수는 한 구단에만
              집계됩니다.
            </p>
          </>
        )}
      </div>
    </>
  );
}
