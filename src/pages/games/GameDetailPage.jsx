import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi.js';
import { createGameSummary, fetchGameDetail, fetchGameEvents, fetchGameSummary, parseSummary } from '../../api/gameApi.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatTable from '../../components/common/StatTable.jsx';
import StatusMessage from '../../components/common/StatusMessage.jsx';
import { SegmentedTabs } from '../../components/common/Controls.jsx';
import { DECISION_LABELS, GAME_STATUS_LABELS, gameMetaText } from '../../constants/games.js';
import { teamColor, teamColorVars } from '../../constants/teamColors.js';
import { formatDateLong } from '../../utils/date.js';
import { withParams } from '../../utils/params.js';
import TeamBadge from './TeamBadge.jsx';
import './GamePages.css';

const sumOf = (rows, key) => rows.reduce((total, row) => total + (row[key] ?? 0), 0);
const halfText = (half) => (half === 'T' ? '초' : '말');

/**
 * 경기 상세 페이지  /games/{gameId}?side=away|home
 * 사용 API: GET /api/games/{gameId} (3.2), GET·POST /api/games/{gameId}/summary (3.3), GET /api/games/{gameId}/events (3.4)
 */
export default function GameDetailPage() {
  const { gameId } = useParams();
  const [params, setParams] = useSearchParams();
  const side = params.get('side') === 'home' ? 'home' : 'away';

  const [detailVersion, setDetailVersion] = useState(0);
  const { data: game, loading, error } = useApi(() => fetchGameDetail(gameId), [gameId, detailVersion]);
  const completed = game?.status === 'COMPLETED';
  // 요약·이벤트는 종료 경기일 때만 부른다. 실패해도 경기 상세는 그대로 보여준다
  const summary = useApi(() => fetchGameSummary(gameId), [gameId], { enabled: completed });
  const events = useApi(() => fetchGameEvents(gameId), [gameId, detailVersion], { enabled: completed });

  if (!game) {
    return (
      <>
        <PageHeader title="경기 상세" />
        <div className="container page-body">
          <StatusMessage loading={loading} error={error} notFound="경기를 찾을 수 없습니다. 주소를 확인해 주세요." />
          {error && (
            <Link to="/games" className="text-link">
              경기 목록으로
            </Link>
          )}
        </div>
      </>
    );
  }

  const hasDetail = Boolean(game.lineScore);
  const hasBox = game.batting.away.length + game.batting.home.length + game.pitching.away.length + game.pitching.home.length > 0;
  const teamId = side === 'away' ? game.awayTeamId : game.homeTeamId;
  const teamName = side === 'away' ? game.awayTeamName : game.homeTeamName;

  return (
    <div className="game-detail" style={teamColorVars(game)}>
      <GameHero game={game} />

      <div className="container page-body">
        {!completed && (
          <p className="status">
            {game.status === 'SCHEDULED'
              ? '아직 열리지 않은 경기입니다. 경기가 끝나면 점수와 선수 기록이 표시됩니다.'
              : `${GAME_STATUS_LABELS[game.status] ?? '진행되지 않은'} 경기라 기록이 없습니다.`}
          </p>
        )}

        {completed && !hasDetail && !hasBox && (
          <p className="status">최종 점수만 등록된 경기입니다. 이닝별 점수와 선수 기록은 아직 등록되지 않았습니다.</p>
        )}

        {completed && hasDetail && (
          <section className="section" aria-labelledby="scoreboard-title">
            <div className="section__head">
              <h2 id="scoreboard-title">스코어보드</h2>
            </div>
            <Scoreboard game={game} />
          </section>
        )}

        {completed && (
          <section className="section" aria-labelledby="summary-title">
            <div className="section__head">
              <h2 id="summary-title">경기 요약</h2>
            </div>
            <SummaryCard key={gameId} gameId={game.gameId} loaded={summary}
              onCreated={() => setDetailVersion((version) => version + 1)} />
          </section>
        )}

        {completed && events.data?.length > 0 && (
          <section className="section" aria-labelledby="events-title">
            <div className="section__head">
              <h2 id="events-title">주요 장면</h2>
              <p className="section__note">이닝 순서대로 모았습니다. 결승점이 난 이닝은 강조해서 보여 줍니다.</p>
            </div>
            <EventList game={game} events={events.data} />
          </section>
        )}

        {completed && hasBox && (
          <section className="section" aria-labelledby="box-title">
            <div className="section__head">
              <h2 id="box-title">선수 기록</h2>
              <div className="team-tabs" style={{ '--team': teamColor(teamId) }}>
                <SegmentedTabs
                  label="팀 선택"
                  value={side}
                  onChange={(value) =>
                    setParams(withParams(params, { side: value === 'away' ? null : value }), { replace: true })
                  }
                  options={[
                    { value: 'away', label: `${game.awayTeamName} (원정)` },
                    { value: 'home', label: `${game.homeTeamName} (홈)` },
                  ]}
                />
              </div>
            </div>
            <div style={{ '--team': teamColor(teamId) }}>
              <BattingTable rows={game.batting[side]} teamName={teamName} />
              <PitchingTable rows={game.pitching[side]} teamName={teamName} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// 맨 위: 원정 팀 색 | 점수 | 홈 팀 색
function GameHero({ game }) {
  const completed = game.status === 'COMPLETED';
  const awayWon = completed && game.awayScore > game.homeScore;
  const homeWon = completed && game.homeScore > game.awayScore;
  const draw = completed && !awayWon && !homeWon;

  // 팀 칸 아래 투수 (한 줄에 한 명): 승리 팀은 승·세, 진 팀은 패. 투수 기록이 없으면 비운다
  const pitcherNotes = (side) => {
    const lines = game.pitching[side];
    const named = (code) => lines.find((p) => p.decision === code)?.playerName;
    return [named('W') && `승 ${named('W')}`, named('S') && `세 ${named('S')}`, named('L') && `패 ${named('L')}`].filter(Boolean);
  };

  const panel = (side) => (
    <div className={`game-hero__team game-hero__team--${side}`}>
      <span className="game-hero__side">{side === 'away' ? '원정' : '홈'}</span>
      <strong className="game-hero__name">{side === 'away' ? game.awayTeamName : game.homeTeamName}</strong>
      <span className="game-hero__pitcher">
        {pitcherNotes(side).map((note) => (
          <span key={note}>{note}</span>
        ))}
      </span>
    </div>
  );

  return (
    <section className="game-hero" aria-label="경기 결과">
      <div className="container">
        <Link to={`/games?date=${game.date}`} className="game-hero__back">
          ← {formatDateLong(game.date)} 경기 목록
        </Link>
        <h1 className="visually-hidden">
          {game.awayTeamName} 대 {game.homeTeamName} 경기
        </h1>
        <div className="game-hero__grid">
          {panel('away')}
          <div className="game-hero__center">
            {completed ? (
              <p className="game-hero__score num" aria-label={`${game.awayTeamName} ${game.awayScore}, ${game.homeTeamName} ${game.homeScore}`}>
                <span className={awayWon ? 'is-winner' : undefined}>{game.awayScore}</span>
                <span className="game-hero__colon">:</span>
                <span className={homeWon ? 'is-winner' : undefined}>{game.homeScore}</span>
              </p>
            ) : (
              <p className="game-hero__vs">VS</p>
            )}
            <p className={`game-hero__status is-${game.status.toLowerCase()}`}>
              {draw ? '무승부' : GAME_STATUS_LABELS[game.status] ?? game.status}
            </p>
            <p className="game-hero__meta">{[formatDateLong(game.date), gameMetaText(game)].filter(Boolean).join(' · ')}</p>
          </div>
          {panel('home')}
        </div>
      </div>
    </section>
  );
}

// 이닝별 점수판 (전광판 모양). R = 최종 점수, H = 타자 안타 합계 (타자 기록이 없으면 -)
function Scoreboard({ game }) {
  const { lineScore } = game;
  const innings = Array.from({ length: Math.max(9, lineScore.innings) }, (_, i) => i + 1);
  const cell = (runs, inning) => {
    if (inning > lineScore.innings) return '';
    return runs === null ? 'X' : runs; // 그 이닝 공격을 하지 않았으면 X
  };

  const row = (teamId, name, runs, total, hits, won) => (
    <tr className={won ? 'is-winner' : undefined}>
      <th scope="row" className="scoreboard__team">
        <TeamBadge teamId={teamId} name={name} />
      </th>
      {innings.map((inning) => (
        <td key={inning} className={`num${runs[inning - 1] > 0 ? ' is-scored' : ''}`}>
          {cell(runs[inning - 1], inning)}
        </td>
      ))}
      <td className="scoreboard__total num">{total}</td>
      <td className="scoreboard__extra num">{hits ?? '-'}</td>
    </tr>
  );

  return (
    <div className="scoreboard" tabIndex={0} role="region" aria-label="이닝별 점수">
      <table>
        <caption className="visually-hidden">이닝별 점수 (R 득점, H 안타)</caption>
        <thead>
          <tr>
            <th scope="col" className="scoreboard__team">
              팀
            </th>
            {innings.map((inning) => (
              <th key={inning} scope="col">
                {inning}
              </th>
            ))}
            <th scope="col" className="scoreboard__total">
              R
            </th>
            <th scope="col" className="scoreboard__extra">
              H
            </th>
          </tr>
        </thead>
        <tbody>
          {row(game.awayTeamId, game.awayTeamName, lineScore.away, game.awayScore, lineScore.awayHits, game.awayScore > game.homeScore)}
          {row(game.homeTeamId, game.homeTeamName, lineScore.home, game.homeScore, lineScore.homeHits, game.homeScore > game.awayScore)}
        </tbody>
      </table>
    </div>
  );
}

// AI 요약 카드 (3.3): 저장된 요약이 있으면 보여주고, 없으면 '요약 만들기' 버튼으로 생성을 요청한다
function SummaryCard({ gameId, loaded, onCreated }) {
  const [created, setCreated] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const saved = created ?? loaded.data;

  const create = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      setCreated(await createGameSummary(gameId));
      onCreated();
    } catch (error) {
      setCreateError(error);
    } finally {
      setCreating(false);
    }
  };

  if (loaded.loading) return <p className="status">요약을 불러오는 중…</p>;

  if (!saved) {
    const reason = createError?.message;
    return (
      <div className="card summary-card">
        <p className="summary-card__badge">AI 요약</p>
        <p className="summary-card__empty">
          저장된 요약이 없습니다. 필요한 상세 기록을 불러와 요약을 만들 수 있습니다.
        </p>
        <button type="button" className="button button--primary summary-card__button" onClick={create} disabled={creating}>
          {creating ? '요약 만드는 중…' : 'AI 요약 만들기'}
        </button>
        {reason && (
          <p className="summary-card__error" role="alert">
            {reason}
          </p>
        )}
      </div>
    );
  }

  const { headline, points } = parseSummary(saved.summary);
  return (
    <article className="card summary-card">
      <p className="summary-card__badge">AI 요약</p>
      {headline && <h3 className="summary-card__headline">{headline}</h3>}
      <dl className="summary-card__points">
        {points.map((point, index) => (
          <div key={index} className={`summary-card__point${point.label ? '' : ' is-plain'}`}>
            {point.label && <dt>{point.label}</dt>}
            <dd>{point.text}</dd>
          </div>
        ))}
      </dl>
      <p className="summary-card__note">
        경기 기록을 바탕으로 만든 요약입니다. 저장 시각 {saved.generatedAt?.replace('T', ' ').replace('Z', '')}
      </p>
    </article>
  );
}

// 이긴 팀이 마지막으로 앞서기 시작한 이닝(결승점 이닝)을 이닝별 점수로 찾는다
function decisiveHalf(game) {
  const { lineScore, awayScore, homeScore } = game;
  if (!lineScore || awayScore === homeScore) return null;
  const winner = awayScore > homeScore ? 'away' : 'home';
  const score = { away: 0, home: 0 };
  let found = null;
  for (let i = 0; i < lineScore.innings; i += 1) {
    for (const s of ['away', 'home']) {
      const runs = lineScore[s][i] ?? 0;
      const other = s === 'away' ? 'home' : 'away';
      const before = score[s] <= score[other];
      score[s] += runs;
      if (s === winner && runs > 0 && before && score[s] > score[other]) found = { inning: i + 1, half: s === 'away' ? 'T' : 'B' };
    }
  }
  return found;
}

// 이벤트 목록 (3.4 이벤트를 이닝 순서로). 초 공격은 원정, 말 공격은 홈 팀 색
function EventList({ game, events }) {
  const decisive = decisiveHalf(game);
  return (
    <ol className="plays">
      {events.map((event) => {
        const away = event.half === 'T';
        const teamId = away ? game.awayTeamId : game.homeTeamId;
        const isDecisive = decisive && decisive.inning === event.inning && decisive.half === event.half;
        return (
          <li key={event.sequence} className={`plays__item${isDecisive ? ' is-important' : ''}`} style={{ '--team': teamColor(teamId) }}>
            <span className="plays__inning num">
              {event.inning}회{halfText(event.half)}
            </span>
            <p className="plays__text">
              <TeamBadge teamId={teamId} name={away ? game.awayTeamName : game.homeTeamName} size="small" />
              <span>{event.description}</span>
              {isDecisive && <span className="play-tag play-tag--game_winning">결승점 이닝</span>}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

const playerLink = (row, type) => <Link to={`/players/${row.playerId}?type=${type}`}>{row.playerName}</Link>;

function BattingTable({ rows, teamName }) {
  if (!rows.length) return <p className="status">{teamName} 타자 기록이 없습니다.</p>;
  const keys = ['plateAppearances', 'atBats', 'runs', 'hits', 'doubles', 'triples', 'homeRuns', 'runsBattedIn', 'walks', 'strikeouts'];
  const labels = ['타석', '타수', '득점', '안타', '2루타', '3루타', '홈런', '타점', '볼넷', '삼진'];
  const columns = [
    { key: 'playerName', label: '선수', align: 'left', sticky: true, render: (row) => playerLink(row, 'batter') },
    ...keys.map((key, i) => ({ key, label: labels[i] })),
  ];
  const footer = Object.fromEntries(keys.map((key) => [key, sumOf(rows, key)]));
  return (
    <div className="box-table">
      <h3>{teamName} 타자</h3>
      <StatTable caption={`${teamName} 타자 기록`} columns={columns} rows={rows} getRowKey={(row) => row.playerId} footer={footer} />
    </div>
  );
}

function PitchingTable({ rows, teamName }) {
  if (!rows.length) return <p className="status">{teamName} 투수 기록이 없습니다.</p>;
  const keys = ['outsPitched', 'battersFaced', 'hitsAllowed', 'homeRunsAllowed', 'walksAllowed', 'strikeouts', 'runsAllowed', 'earnedRuns'];
  const labels = ['이닝', '타자', '피안타', '피홈런', '볼넷', '삼진', '실점', '자책'];
  const columns = [
    { key: 'playerName', label: '선수', align: 'left', sticky: true, render: (row) => playerLink(row, 'pitcher') },
    {
      key: 'decision',
      label: '결과',
      render: (row) =>
        row.decision ? <span className={`decision decision--${row.decision}`}>{DECISION_LABELS[row.decision]}</span> : '',
    },
    ...keys.map((key, i) => ({ key, label: labels[i] })),
  ];
  const footer = Object.fromEntries(keys.map((key) => [key, sumOf(rows, key)]));
  return (
    <div className="box-table">
      <h3>{teamName} 투수</h3>
      <StatTable caption={`${teamName} 투수 기록`} columns={columns} rows={rows} getRowKey={(row) => row.playerId} footer={footer} />
    </div>
  );
}
