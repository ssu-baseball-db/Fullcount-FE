import { Link, useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi.js';
import { compareSeasons, betterOf, fetchPlayerSeasonStats, fetchSeasonBests } from '../../api/playerApi.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusMessage from '../../components/common/StatusMessage.jsx';
import PlayerPicker from '../../components/common/PlayerPicker.jsx';
import RadarChart from '../../components/common/RadarChart.jsx';
import CompareSuggestions from './CompareSuggestions.jsx';
import { SegmentedTabs } from '../../components/common/Controls.jsx';
import { CATEGORY_LABELS, PLAYER_TYPES } from '../../constants/stats.js';
import { formatStat, formatYears } from '../../utils/format.js';
import { toScore } from '../../utils/score.js';
import { readOptionalYear, withParams } from '../../utils/params.js';
import './PlayerPages.css';

const LOWER_IS_BETTER = ['era', 'whip'];
const CAREER = 'career'; // 주소에서 '통산'을 나타내는 값 (?sa=career)

// 시즌 표기: 2025 → '2025 시즌', null → '통산'
const periodText = (season) => (season == null ? '통산' : `${season} 시즌`);

// 고른 선수의 이름·뛴 시즌 목록을 보여주기 위해 연도별 기록(1.4)을 불러온다
function useSelectedPlayer(playerId, type) {
  const { data } = useApi(() => fetchPlayerSeasonStats(playerId, type), [playerId, type], { enabled: !!playerId });
  if (!playerId) return null;
  if (!data) return { playerId, playerName: '불러오는 중…', seasons: [], loaded: false };
  const seasons = data.seasons;
  const detail =
    seasons.length > 0
      ? `${seasons[seasons.length - 1].teamName}, ${formatYears(seasons[0].season, seasons[seasons.length - 1].season)} 시즌`
      : `${type === 'pitcher' ? '투수' : '타자'} 기록 없음`;
  return { playerId, playerName: data.player.playerName, detail, seasons: seasons.map((s) => s.season), loaded: true };
}

/**
 * 주소 값 → 비교할 시즌. null 이면 통산.
 *   ?sa=2025 → 2025 / ?sa=career → 통산 / 없으면 그 선수가 마지막으로 뛴 시즌
 *   (예전 주소 ?season=2024 는 두 선수 모두 2024 로 본다)
 */
function readSeasonChoice(value, legacySeason, seasons) {
  if (value === CAREER) return null;
  const year = readOptionalYear(value ?? legacySeason ?? null);
  if (year != null) return year;
  return seasons.length > 0 ? seasons[seasons.length - 1] : null;
}

/**
 * 선수 2명 비교 페이지  /compare?a=선수ID&b=선수ID&type=batter&sa=2025&sb=2015
 * 선수마다 비교할 시즌을 따로 고른다. (예: 2025 김도영 vs 2015 이승엽, 같은 선수의 2024 vs 2026 도 가능)
 * - 두 선수 모두 시즌을 고르면: 레이더(오각형) 차트. 각 선수의 기록을 '그 선수가 고른 시즌의 1위 기록 = 100점'으로 환산
 * - 한 명이라도 통산이면: 항목별 막대 비교 (통산은 '누구 대비 몇 점'인지 기준을 정하기 어려워 원래 값으로 비교)
 * 사용 API: 시즌이 같으면 GET /api/players/compare (4.1), 다르면 GET /api/players/{id}/season-stats (1.4) 두 번,
 *          선수 고르기 GET /api/players, 시즌 1위 기록 GET /api/seasons/{year}/batting-stats·pitching-stats
 * 선수를 아직 두 명 고르지 않았으면 검색창 아래에 '추천 선수'(시즌 기록 순위 타자·투수 각 5명)를 보여 준다.
 */
export default function ComparePage() {
  const [params, setParams] = useSearchParams();
  const type = params.get('type') === 'pitcher' ? 'pitcher' : 'batter';
  const a = params.get('a');
  const b = params.get('b');
  const update = (changes) => setParams(withParams(params, { ...changes, season: null }));

  const playerA = useSelectedPlayer(a, type);
  const playerB = useSelectedPlayer(b, type);
  const seasonA = readSeasonChoice(params.get('sa'), params.get('season'), playerA?.seasons ?? []);
  const seasonB = readSeasonChoice(params.get('sb'), params.get('season'), playerB?.seasons ?? []);

  // 같은 선수라도 시즌이 다르면 비교할 수 있다 (예: 김도영 2024 vs 2026)
  const samePick = a && b && a === b && seasonA === seasonB;
  // 두 선수의 뛴 시즌을 알아야 기본 시즌(마지막 시즌)을 정할 수 있으므로, 둘 다 불러온 뒤 비교한다
  const ready = !!playerA?.loaded && !!playerB?.loaded;

  const { data, loading, error } = useApi(
    () => compareSeasons({ playerA: a, playerB: b, type, seasonA, seasonB }),
    [a, b, type, seasonA, seasonB],
    { enabled: ready && !samePick }
  );

  // 레이더용: 각자 고른 시즌의 항목별 1위 기록 (100점 기준). 두 시즌이 같으면 한 번만 불러온다.
  const radarMode = data && data.seasonA != null && data.seasonB != null;
  const bestsA = useApi(() => fetchSeasonBests(data.seasonA, type), [data?.seasonA, type], { enabled: !!radarMode });
  const bestsBOwn = useApi(() => fetchSeasonBests(data.seasonB, type), [data?.seasonB, type], {
    enabled: !!radarMode && data.seasonB !== data.seasonA,
  });
  const bestsB = radarMode && data.seasonB === data.seasonA ? bestsA : bestsBOwn;

  // 우위 판단: 레이더(두 시즌 다 고름)면 각자 시즌 1위 대비 점수로, 아니면 원래 기록 값으로
  const view = data && buildView(data, radarMode ? bestsA.data : null, radarMode ? bestsB.data : null);
  const winsA = view?.metrics.filter((m) => m.better === 'A').length ?? 0;
  const winsB = view?.metrics.filter((m) => m.better === 'B').length ?? 0;

  // 추천 선수를 누르면: 빈 칸(A → B)에 넣고 시즌을 추천 시즌으로 맞춘다.
  // 지금과 다른 유형(예: 타자 비교 중에 투수)을 누르면 유형을 바꾸고 그 선수를 A 에 넣는다.
  const pickSuggested = (player, playerType, year) => {
    if (playerType !== type) {
      update({ type: playerType, a: player.playerId, sa: year, b: null, sb: null });
    } else if (!a) {
      update({ a: player.playerId, sa: year });
    } else {
      update({ b: player.playerId, sb: year });
    }
  };

  // 선수 카드 안의 시즌 선택 상자
  const seasonPicker = (player, season, key) =>
    player &&
    player.seasons.length > 0 && (
      <label className="control picker__season">
        <span className="control__label">비교할 시즌</span>
        <select value={season ?? CAREER} onChange={(event) => update({ [key]: event.target.value })}>
          {[...player.seasons].reverse().map((year) => (
            <option key={year} value={year}>
              {year} 시즌
            </option>
          ))}
          <option value={CAREER}>통산 (2015~)</option>
        </select>
      </label>
    );

  return (
    <>
      <PageHeader
        title="선수 비교"
        description="같은 유형(타자끼리, 투수끼리)의 선수 두 명을 고르고, 선수마다 비교할 시즌(또는 통산)을 정합니다. 예: 2025 김도영 vs 2015 이승엽"
      />

      <div className="container page-body">
        <div className="toolbar">
          <SegmentedTabs
            label="비교 유형"
            options={PLAYER_TYPES}
            value={type}
            // 유형을 바꾸면 이미 고른 선수와 맞지 않으므로 선택을 비운다
            onChange={(value) => update({ type: value, a: null, b: null, sa: null, sb: null })}
          />
          {a && b && (
            <button
              type="button"
              className="button"
              onClick={() =>
                update({
                  a: b,
                  b: a,
                  sa: seasonB == null ? CAREER : seasonB,
                  sb: seasonA == null ? CAREER : seasonA,
                })
              }
            >
              좌우 바꾸기
            </button>
          )}
        </div>

        <div className="compare-pickers">
          <PlayerPicker
            label="선수 A"
            type={type}
            selected={playerA}
            onSelect={(p) => update({ a: p.playerId, sa: null })}
            onClear={() => update({ a: null, sa: null })}
          >
            {seasonPicker(playerA, seasonA, 'sa')}
          </PlayerPicker>
          <span className="compare-pickers__vs" aria-hidden="true">
            VS
          </span>
          <PlayerPicker
            label="선수 B"
            type={type}
            selected={playerB}
            onSelect={(p) => update({ b: p.playerId, sb: null })}
            onClear={() => update({ b: null, sb: null })}
          >
            {seasonPicker(playerB, seasonB, 'sb')}
          </PlayerPicker>
        </div>

        {(!a || !b) && <CompareSuggestions type={type} selectedId={a ?? b} onPick={pickSuggested} />}

        <section className="section">
          {samePick && (
            <StatusMessage empty emptyText="같은 선수의 같은 시즌끼리는 비교할 수 없습니다. 선수나 시즌을 바꿔 주세요." />
          )}
          <StatusMessage loading={loading && !data} error={error} />

          {view && (
            <div className={`card compare-result ${loading ? 'is-loading' : ''}`}>
              <div className="compare-result__head">
                <ComparedName player={view.playerA} season={view.seasonA} type={view.type} side="A" />
                <p className="compare-result__score num" aria-label={`우위 항목 ${winsA} 대 ${winsB}`}>
                  {winsA}
                  <span>:</span>
                  {winsB}
                </p>
                <ComparedName player={view.playerB} season={view.seasonB} type={view.type} side="B" />
              </div>

              {radarMode ? (
                <SeasonRadar view={view} bestsA={bestsA} bestsB={bestsB} />
              ) : (
                <>
                  <p className="compare-result__period">
                    {periodText(view.seasonA)} vs {periodText(view.seasonB)} 원래 기록으로 비교합니다. 통산은 2015년 이후 기록의
                    합계입니다. 평균자책점·WHIP 는 낮을수록 우위입니다.
                  </p>
                  <ul className="compare-rows">
                    {view.metrics.map((metric) => (
                      <MetricRow key={metric.key} metric={metric} />
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/**
 * 화면에 그릴 비교 결과를 만든다.
 * 레이더 모드(bests 있음)면 항목마다 점수를 붙이고, 우위를 점수로 다시 판단한다.
 *   → 시즌이 다르면 '그 시즌 안에서 얼마나 뛰어났나'로 비교하는 것이 공정하기 때문
 *   (같은 시즌이면 점수 비교와 원래 값 비교의 결과가 같다)
 */
function buildView(data, bestsA, bestsB) {
  if (!bestsA || !bestsB) return { ...data, metrics: data.metrics.map((m) => ({ ...m })) };
  return {
    ...data,
    metrics: data.metrics.map((m) => {
      const scoreA = toScore(m.key, m.playerA, bestsA[m.key]);
      const scoreB = toScore(m.key, m.playerB, bestsB[m.key]);
      const better = data.seasonA === data.seasonB ? m.better : betterOf('score', scoreA, scoreB);
      return { ...m, scoreA, scoreB, better };
    }),
  };
}

function ComparedName({ player, season, type, side }) {
  return (
    <div className={`compare-name compare-name--${side}`}>
      {/* 레이더 차트 색과 맞춘 표시 (A: 녹색, B: 빨강) */}
      <span className={`compare-name__swatch is-${side.toLowerCase()}`} aria-hidden="true" />
      <Link to={`/players/${player.playerId}?type=${type}`} className="compare-name__link">
        {player.playerName}
      </Link>
      <p className="compare-name__period">{periodText(season)}</p>
      {!player.hasRecord && <p className="compare-name__empty">{periodText(season)} 기록 없음</p>}
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

// 시즌 비교: 레이더 차트 + 항목별 기록·점수 표
function SeasonRadar({ view, bestsA, bestsB }) {
  const error = bestsA.error ?? bestsB.error;
  if (error) return <StatusMessage error={error} />;
  if (!bestsA.data || !bestsB.data) {
    return <p className="compare-result__period">시즌 1위 기록을 불러오는 중…</p>;
  }

  const sameSeason = view.seasonA === view.seasonB;
  const axes = view.metrics.map((m) => ({ key: m.key, label: CATEGORY_LABELS[m.key] ?? m.key }));
  const scores = (side) => Object.fromEntries(view.metrics.map((m) => [m.key, side === 'A' ? m.scoreA : m.scoreB]));

  // 기록이 없는 선수는 그리지 않는다
  const series = [
    view.playerA.hasRecord && { name: `${view.playerA.playerName} ${view.seasonA}`, scores: scores('A'), tone: 'a' },
    view.playerB.hasRecord && { name: `${view.playerB.playerName} ${view.seasonB}`, scores: scores('B'), tone: 'b' },
  ].filter(Boolean);

  const scoreText = (score) => (score == null ? '' : `${Math.round(score)}점`);

  return (
    <div className="season-radar">
      <div className="season-radar__chart">
        <RadarChart
          axes={axes}
          series={series}
          label={`${view.seasonA} ${view.playerA.playerName}, ${view.seasonB} ${view.playerB.playerName} 비교 레이더 차트`}
        />
      </div>

      <div className="season-radar__detail">
        <p className="compare-result__period">
          {sameSeason
            ? `${view.seasonA} 시즌 각 항목 1위 기록을 100점으로 환산했습니다.`
            : `시즌이 달라서 각 선수의 기록을 그 선수가 뛴 시즌의 1위 기록(100점) 대비 점수로 바꿔 비교합니다. 우위도 점수로 판단합니다.`}{' '}
          타율·OPS·평균자책점·WHIP 는 규정타석·규정이닝을 채운 선수 중 1위가 기준이며, 평균자책점·WHIP 는 낮을수록 점수가
          높습니다.
        </p>

        <table className="radar-table">
          <caption className="visually-hidden">항목별 기록과 점수</caption>
          <thead>
            <tr>
              <th scope="col">항목</th>
              <th scope="col" className="is-a">
                {view.playerA.playerName}
                <small>{view.seasonA}</small>
              </th>
              <th scope="col" className="is-b">
                {view.playerB.playerName}
                <small>{view.seasonB}</small>
              </th>
              <th scope="col">{sameSeason ? `${view.seasonA} 1위` : `${view.seasonA} 1위`}</th>
              {!sameSeason && <th scope="col">{view.seasonB} 1위</th>}
            </tr>
          </thead>
          <tbody>
            {view.metrics.map((m) => (
              <tr key={m.key}>
                <th scope="row">{CATEGORY_LABELS[m.key] ?? m.key}</th>
                <td className={m.better === 'A' ? 'is-better is-a' : 'is-a'}>
                  <span className="num">{formatStat(m.key, m.playerA)}</span>
                  <small>{scoreText(m.scoreA)}</small>
                </td>
                <td className={m.better === 'B' ? 'is-better is-b' : 'is-b'}>
                  <span className="num">{formatStat(m.key, m.playerB)}</span>
                  <small>{scoreText(m.scoreB)}</small>
                </td>
                <td className="num">{formatStat(m.key, bestsA.data[m.key])}</td>
                {!sameSeason && <td className="num">{formatStat(m.key, bestsB.data[m.key])}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
