import { Link, useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi.js';
import { fetchGames } from '../../api/gameApi.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusMessage from '../../components/common/StatusMessage.jsx';
import { TeamSelect } from '../../components/common/Controls.jsx';
import { DEFAULT_GAME_DATE, GAME_DATE_MIN, GAME_DATE_MAX, GAME_STATUS_LABELS, gameMetaText } from '../../constants/games.js';
import { TEAM_IDS } from '../../constants/teams.js';
import { addDays, dayParts, formatDateLong, isValidDateString } from '../../utils/date.js';
import { withParams } from '../../utils/params.js';
import { teamColor } from '../../constants/teamColors.js';
import TeamBadge from './TeamBadge.jsx';
import './GamePages.css';

// 주소의 ?date= 값이 올바르지 않으면 기본 날짜를 쓴다
function readDate(value) {
  return isValidDateString(value) && value >= GAME_DATE_MIN && value <= GAME_DATE_MAX ? value : DEFAULT_GAME_DATE;
}

/**
 * 경기 목록 페이지  /games?date=2026-09-15&team=LG
 * 사용 API: GET /api/games?date=&teamId= (3.1 경기 목록 조회)
 */
export default function GameListPage() {
  const [params, setParams] = useSearchParams();
  const date = readDate(params.get('date'));
  const team = TEAM_IDS.includes(params.get('team')) ? params.get('team') : null;
  const year = Number(date.slice(0, 4));
  const update = (changes) => setParams(withParams(params, changes));

  const { data, loading, error } = useApi(() => fetchGames({ date, teamId: team }), [date, team]);
  const games = data ?? [];

  // 선택한 날짜를 가운데 두고 앞뒤 3일씩 보여주는 날짜 띠
  const week = [-3, -2, -1, 0, 1, 2, 3].map((n) => addDays(date, n)).filter((d) => d >= GAME_DATE_MIN && d <= GAME_DATE_MAX);

  return (
    <>
      <PageHeader title="경기" description="날짜별 경기 결과를 보고, 경기를 눌러 이닝별 점수와 선수 기록을 확인할 수 있습니다." />

      <div className="container page-body">
        <div className="toolbar">
          <div className="control">
            <span className="control__label">날짜</span>
            <div className="date-stepper">
              <button
                type="button"
                className="date-stepper__arrow"
                onClick={() => update({ date: addDays(date, -1) })}
                disabled={date <= GAME_DATE_MIN}
                aria-label="이전 날"
              >
                ◀
              </button>
              <input
                type="date"
                value={date}
                min={GAME_DATE_MIN}
                max={GAME_DATE_MAX}
                onChange={(event) => event.target.value && update({ date: event.target.value })}
                aria-label="경기 날짜"
              />
              <button
                type="button"
                className="date-stepper__arrow"
                onClick={() => update({ date: addDays(date, 1) })}
                disabled={date >= GAME_DATE_MAX}
                aria-label="다음 날"
              >
                ▶
              </button>
            </div>
          </div>
          <TeamSelect value={team} year={year} onChange={(value) => update({ team: value })} />
        </div>

        {/* 날짜 띠: 누르면 그 날짜로 이동 */}
        <nav className="day-strip" aria-label="가까운 날짜">
          {week.map((d) => {
            const { day, weekday } = dayParts(d);
            return (
              <button
                key={d}
                type="button"
                className={`day-strip__item${d === date ? ' is-active' : ''}${weekday === '일' ? ' is-sunday' : ''}${weekday === '토' ? ' is-saturday' : ''}`}
                aria-current={d === date ? 'date' : undefined}
                onClick={() => update({ date: d })}
              >
                <span className="day-strip__weekday">{weekday}</span>
                <span className="day-strip__day num">{day}</span>
              </button>
            );
          })}
        </nav>

        <section className="section" aria-labelledby="game-list-title">
          <div className="section__head">
            <h2 id="game-list-title">{formatDateLong(date)}</h2>
            {!loading && !error && games.length > 0 && <p className="section__note">{games.length}경기</p>}
          </div>

          <StatusMessage
            loading={loading}
            error={error}
            empty={games.length === 0}
            emptyText={team ? '이 날은 선택한 구단의 경기가 없습니다.' : '이 날은 경기가 없습니다.'}
          />

          {!loading && !error && games.length > 0 && (
            <ul className="game-cards">
              {games.map((game) => (
                <li key={game.gameId}>
                  <GameCard game={game} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

// 경기 카드 한 장
function GameCard({ game }) {
  const finished = game.status === 'COMPLETED';
  const draw = finished && game.awayScore === game.homeScore;
  const awayWon = finished && game.awayScore > game.homeScore;
  const homeWon = finished && game.homeScore > game.awayScore;
  const meta = gameMetaText(game);

  // 종료 경기는 이긴 팀만 진한 배지, 예정·취소·무승부는 두 팀 다 진한 배지
  const teamRow = (side, won) => {
    const teamId = side === 'away' ? game.awayTeamId : game.homeTeamId;
    const name = side === 'away' ? game.awayTeamName : game.homeTeamName;
    const score = side === 'away' ? game.awayScore : game.homeScore;
    return (
      <div className={`game-card__team${won ? ' is-winner' : ''}`} style={{ '--team': teamColor(teamId) }}>
        <TeamBadge teamId={teamId} name={name} solid={!finished || draw || won} />
        <span className="game-card__side">{side === 'away' ? '원정' : '홈'}</span>
        <span className="game-card__score num">{finished ? score : '-'}</span>
      </div>
    );
  };

  return (
    <Link to={`/games/${game.gameId}`} className={`game-card is-${game.status.toLowerCase()}`}>
      <div className="game-card__meta">
        <span>{meta}</span>
        <span className={`game-card__status is-${game.status.toLowerCase()}`}>
          {draw ? '무승부' : GAME_STATUS_LABELS[game.status] ?? game.status}
        </span>
      </div>
      {teamRow('away', awayWon)}
      {teamRow('home', homeWon)}
    </Link>
  );
}
