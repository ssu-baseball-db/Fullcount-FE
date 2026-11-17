import { useState } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../hooks/useApi.js';
import { fetchLeaders } from '../api/mainApi.js';
import { CATEGORY_LABELS, STAT_UNITS, LEADER_TYPES } from '../constants/stats.js';
import { formatStat } from '../utils/format.js';
import './LeaderBoard.css';

/**
 * 부문별 상위 5명 (타자 / 투수 탭)
 */
export default function LeaderBoard({ year }) {
  const [type, setType] = useState('batting');
  const { data: groups, loading, error } = useApi(() => fetchLeaders(year, type, 5), [year, type]);

  return (
    <section className="leaders" aria-labelledby="leaders-title">
      <div className="leaders__head">
        <h2 id="leaders-title">{year} 시즌 부문별 순위</h2>

        <div className="leaders__tabs" role="tablist" aria-label="선수 구분">
          {LEADER_TYPES.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={type === tab.value}
              className={type === tab.value ? 'is-active' : undefined}
              onClick={() => setType(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="leaders__message">부문별 순위를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>}
      {!error && loading && !groups && <p className="leaders__message">불러오는 중…</p>}

      {!error && groups && (
        <div className={`leaders__grid ${loading ? 'is-loading' : ''}`} role="tabpanel">
          {groups.map((group) => (
            <LeaderList key={group.category} year={year} type={type} {...group} />
          ))}
        </div>
      )}
    </section>
  );
}

// 한 부문(예: 홈런)의 1~5위 목록
function LeaderList({ year, type, category, players }) {
  const playerType = type === 'pitching' ? 'pitcher' : 'batter';
  const [first, ...rest] = players;
  const unit = STAT_UNITS[category] ?? '';

  if (!first) return null;

  return (
    <article className="leader-list">
      <header className="leader-list__head">
        <h3>{CATEGORY_LABELS[category] ?? category}</h3>
        <Link to={`/leaders?year=${year}&type=${type}&category=${category}`} className="leader-list__more">
          전체 순위
        </Link>
      </header>

      {/* 1위는 크게 */}
      <Link to={`/players/${first.playerId}?type=${playerType}`} className="leader-list__first">
        <span className="leader-list__first-name">{first.playerName}</span>
        <span className="leader-list__team">{first.teamName}</span>
        <span className="leader-list__first-value num">
          {formatStat(category, first.value)}
          {unit && <small>{unit}</small>}
        </span>
      </Link>

      {/* 2~5위 */}
      <ol className="leader-list__rest" start={2}>
        {rest.map((player) => (
          <li key={player.playerId}>
            <span className="leader-list__rank num">{player.rank}</span>
            <Link to={`/players/${player.playerId}?type=${playerType}`} className="leader-list__name">
              {player.playerName}
            </Link>
            <span className="leader-list__team">{player.teamName}</span>
            <span className="leader-list__value num">{formatStat(category, player.value)}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}
