import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi.js';
import { fetchPlayerSeasonStats } from '../../api/playerApi.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatTable from '../../components/common/StatTable.jsx';
import StatusMessage from '../../components/common/StatusMessage.jsx';
import LineChart from '../../components/common/LineChart.jsx';
import { SegmentedTabs } from '../../components/common/Controls.jsx';
import { BATTING_COLUMNS, PITCHING_COLUMNS } from '../../constants/columns.js';
import { CATEGORY_LABELS, PLAYER_TYPES } from '../../constants/stats.js';
import { formatStat, formatHands, formatPosition } from '../../utils/format.js';
import { withParams } from '../../utils/params.js';
import './PlayerPages.css';

// 추이 그래프로 볼 수 있는 기록
const TREND_METRICS = {
  batter: ['avg', 'ops', 'homeRuns', 'runsBattedIn'],
  pitcher: ['era', 'whip', 'strikeouts', 'wins'],
};

/**
 * 선수 상세 페이지  /players/{playerId}?type=batter|pitcher
 * 사용 API: GET /api/players/{playerId}/season-stats?type= (1.4 선수 연도별 추이)
 */
export default function PlayerDetailPage() {
  const { playerId } = useParams();
  const [params, setParams] = useSearchParams();
  const type = params.get('type') === 'pitcher' ? 'pitcher' : 'batter';

  const { data, loading, error } = useApi(() => fetchPlayerSeasonStats(playerId, type), [playerId, type]);
  const [metricChoice, setMetricChoice] = useState(null);
  const metric = TREND_METRICS[type].includes(metricChoice) ? metricChoice : TREND_METRICS[type][0];

  if (error?.status === 404) {
    return (
      <>
        <PageHeader title="선수를 찾을 수 없습니다" description="주소가 맞는지 확인하거나 선수 이름으로 다시 찾아 주세요." />
        <div className="container page-body">
          <Link to="/players" className="text-link">
            선수 찾기로 가기
          </Link>
        </div>
      </>
    );
  }

  const player = data?.player;
  const seasons = data?.seasons ?? [];
  const latest = seasons[seasons.length - 1];
  const typeLabel = type === 'pitcher' ? '투수' : '타자';

  const columns = [
    { key: 'season', label: '연도', sticky: true, render: (row) => row.season },
    {
      key: 'teamName',
      label: '팀',
      align: 'left',
      render: (row) => <Link to={`/teams/${row.teamId}?year=${row.season}`}>{row.teamName}</Link>,
    },
    ...(type === 'batter'
      ? [{ key: 'position', label: '포지션', align: 'left', render: (row) => formatPosition(row.position) }]
      : []),
    ...(type === 'pitcher' ? PITCHING_COLUMNS : BATTING_COLUMNS),
  ];

  return (
    <>
      <PageHeader
        title={player?.playerName ?? (loading ? '불러오는 중…' : '선수')}
        aside={
          player && (
            <Link to={`/compare?a=${playerId}&type=${type}`} className="button-on-board is-primary">
              다른 선수와 비교하기
            </Link>
          )
        }
      >
        {player && (
          <dl className="player-profile">
            <div>
              <dt>소속</dt>
              <dd>{latest ? `${latest.teamName} (${latest.season})` : '-'}</dd>
            </div>
            <div>
              <dt>포지션</dt>
              <dd>{latest ? formatPosition(latest.position) : '-'}</dd>
            </div>
            <div>
              <dt>생년월일</dt>
              <dd>{player.birthDate ?? '-'}</dd>
            </div>
            <div>
              <dt>체격</dt>
              <dd>{player.heightCm && player.weightKg ? `${player.heightCm}cm, ${player.weightKg}kg` : '-'}</dd>
            </div>
            <div>
              <dt>투타</dt>
              <dd>{formatHands(player.throwHand, player.batHand)}</dd>
            </div>
          </dl>
        )}
      </PageHeader>

      <div className="container page-body">
        <div className="toolbar">
          <SegmentedTabs
            label="기록 구분"
            options={PLAYER_TYPES.map((t) => ({ ...t, label: `${t.label} 기록` }))}
            value={type}
            onChange={(value) => setParams(withParams(params, { type: value }))}
          />
        </div>

        <StatusMessage
          loading={loading && !data}
          error={error}
          empty={data && seasons.length === 0}
          emptyText={`${typeLabel}로 뛴 2015~2026 시즌 기록이 없습니다.`}
        />

        {seasons.length > 0 && (
          <>
            <section className="section">
              <div className="section__head">
                <h2>연도별 추이</h2>
                <SegmentedTabs
                  label="그래프 기록"
                  options={TREND_METRICS[type].map((key) => ({ value: key, label: CATEGORY_LABELS[key] }))}
                  value={metric}
                  onChange={setMetricChoice}
                />
              </div>
              <div className="card">
                <LineChart
                  label={`${player.playerName} 연도별 ${CATEGORY_LABELS[metric]}`}
                  points={seasons.map((s) => ({ x: s.season, y: s[metric] }))}
                  format={(value) => formatStat(metric, value)}
                />
              </div>
            </section>

            <section className="section">
              <div className="section__head">
                <h2>연도별 기록</h2>
              </div>
              <StatTable
                caption={`${player.playerName} 연도별 ${typeLabel} 기록`}
                columns={columns}
                rows={seasons}
                getRowKey={(row) => `${row.season}-${row.teamId}`}
                footer={data.career}
                footerLabel="통산"
              />
              <p className="section__note">통산 기록은 2015년 이후 수록된 기록을 모두 더해 다시 계산한 값입니다.</p>
            </section>
          </>
        )}
      </div>
    </>
  );
}
