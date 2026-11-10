import { Link, useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi.js';
import { comparePlayers, fetchPlayerSeasonStats } from '../../api/playerApi.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusMessage from '../../components/common/StatusMessage.jsx';
import PlayerPicker from '../../components/common/PlayerPicker.jsx';
import { SeasonSelect, SegmentedTabs } from '../../components/common/Controls.jsx';
import { CATEGORY_LABELS, PLAYER_TYPES } from '../../constants/stats.js';
import { formatStat, formatYears } from '../../utils/format.js';
import { readOptionalYear, withParams } from '../../utils/params.js';
import './PlayerPages.css';

const LOWER_IS_BETTER = ['era', 'whip'];

// 고른 선수의 이름과 '소속, 기간'을 보여주기 위해 연도별 기록을 불러온다
function useSelectedPlayer(playerId, type) {
  const { data } = useApi(() => fetchPlayerSeasonStats(playerId, type), [playerId, type], { enabled: !!playerId });
  if (!playerId) return null;
  if (!data) return { playerId, playerName: '불러오는 중…' };
  const seasons = data.seasons;
  const detail =
    seasons.length > 0
      ? `${seasons[seasons.length - 1].teamName}, ${formatYears(seasons[0].season, seasons[seasons.length - 1].season)} 시즌`
      : `${type === 'pitcher' ? '투수' : '타자'} 기록 없음`;
  return { playerId, playerName: data.player.playerName, detail };
}

/**
 * 선수 2명 비교 페이지  /compare?a=선수ID&b=선수ID&type=batter&season=2024
 * 사용 API: GET /api/players/compare (4.1), GET /api/players (선수 고르기), season-stats (고른 선수 정보)
 * 타자는 타율·홈런·타점·도루·OPS, 투수는 승·ERA·탈삼진·세이브·WHIP 를 비교한다. (ERA·WHIP 는 낮을수록 우위)
 */
export default function ComparePage() {
  const [params, setParams] = useSearchParams();
  const type = params.get('type') === 'pitcher' ? 'pitcher' : 'batter';
  const season = readOptionalYear(params.get('season'));
  const a = params.get('a');
  const b = params.get('b');
  const update = (changes) => setParams(withParams(params, changes));

  const playerA = useSelectedPlayer(a, type);
  const playerB = useSelectedPlayer(b, type);
  const samePlayer = a && b && a === b;

  const { data, loading, error } = useApi(() => comparePlayers({ playerA: a, playerB: b, type, season }), [a, b, type, season], {
    enabled: !!a && !!b && !samePlayer,
  });

  const winsA = data?.metrics.filter((m) => m.better === 'A').length ?? 0;
  const winsB = data?.metrics.filter((m) => m.better === 'B').length ?? 0;

  return (
    <>
      <PageHeader
        title="선수 비교"
        description="같은 유형(타자끼리, 투수끼리)의 선수 두 명을 골라 시즌 또는 통산 기록을 나란히 비교합니다."
      />

      <div className="container page-body">
        <div className="toolbar">
          <SegmentedTabs
            label="비교 유형"
            options={PLAYER_TYPES}
            value={type}
            // 유형을 바꾸면 이미 고른 선수와 맞지 않으므로 선택을 비운다
            onChange={(value) => update({ type: value, a: null, b: null })}
          />
          <SeasonSelect allowCareer label="비교 기간" value={season} onChange={(value) => update({ season: value })} />
          {a && b && (
            <button type="button" className="button" onClick={() => update({ a: b, b: a })}>
              좌우 바꾸기
            </button>
          )}
        </div>

        <div className="compare-pickers">
          <PlayerPicker
            label="선수 A"
            type={type}
            selected={playerA}
            onSelect={(p) => update({ a: p.playerId })}
            onClear={() => update({ a: null })}
          />
          <span className="compare-pickers__vs" aria-hidden="true">
            VS
          </span>
          <PlayerPicker
            label="선수 B"
            type={type}
            selected={playerB}
            onSelect={(p) => update({ b: p.playerId })}
            onClear={() => update({ b: null })}
          />
        </div>

        <section className="section">
          {(!a || !b) && <StatusMessage empty emptyText="비교할 선수 두 명을 골라 주세요." />}
          {samePlayer && <StatusMessage empty emptyText="같은 선수끼리는 비교할 수 없습니다. 다른 선수를 골라 주세요." />}
          <StatusMessage loading={loading && !data} error={error} />

          {data && (
            <div className={`card compare-result ${loading ? 'is-loading' : ''}`}>
              <div className="compare-result__head">
                <ComparedName player={data.playerA} season={data.season} type={data.type} side="A" />
                <p className="compare-result__score num" aria-label={`우위 항목 ${winsA} 대 ${winsB}`}>
                  {winsA}
                  <span>:</span>
                  {winsB}
                </p>
                <ComparedName player={data.playerB} season={data.season} type={data.type} side="B" />
              </div>

              <p className="compare-result__period">
                {data.season ? `${data.season} 시즌` : '통산 (2015년 이후)'} 기준, 항목별로 더 나은 쪽을 표시합니다.
                평균자책점·WHIP 는 낮을수록 우위입니다.
              </p>

              <ul className="compare-rows">
                {data.metrics.map((metric) => (
                  <MetricRow key={metric.key} metric={metric} />
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function ComparedName({ player, season, type, side }) {
  return (
    <div className={`compare-name compare-name--${side}`}>
      <Link to={`/players/${player.playerId}?type=${type}`} className="compare-name__link">
        {player.playerName}
      </Link>
      {!player.hasRecord && <p className="compare-name__empty">{season ? `${season} 시즌 기록 없음` : '기록 없음'}</p>}
    </div>
  );
}

// 항목 하나: 왼쪽 값 | 막대 | 이름 | 막대 | 오른쪽 값
function MetricRow({ metric }) {
  const { key, playerA, playerB, better } = metric;
  const lowerIsBetter = LOWER_IS_BETTER.includes(key);

  // 막대 길이: 두 값 중 더 나은 쪽을 100% 로 두고 상대 비율로 그린다
  const barWidth = (mine, other) => {
    if (mine == null) return 0;
    if (other == null) return 100;
    if (lowerIsBetter) return mine === 0 ? 100 : Math.min(100, (Math.min(mine, other) / mine) * 100);
    const max = Math.max(mine, other);
    return max === 0 ? 0 : (mine / max) * 100;
  };

  const sideClass = (side) => (better === side ? 'is-better' : better === 'tie' ? 'is-tie' : '');

  return (
    <li className="compare-row">
      <span className={`compare-row__value is-a ${sideClass('A')}`}>{formatStat(key, playerA)}</span>
      <span className="compare-row__bar is-a">
        <span className={sideClass('A')} style={{ width: `${barWidth(playerA, playerB)}%` }} />
      </span>
      <span className="compare-row__label">{CATEGORY_LABELS[key] ?? key}</span>
      <span className="compare-row__bar is-b">
        <span className={sideClass('B')} style={{ width: `${barWidth(playerB, playerA)}%` }} />
      </span>
      <span className={`compare-row__value is-b ${sideClass('B')}`}>{formatStat(key, playerB)}</span>
    </li>
  );
}
