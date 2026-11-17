import { useState } from 'react';
import useApi from '../../hooks/useApi.js';
import { fetchSeasonStats, withRanks } from '../../api/statsApi.js';
import { SeasonSelect } from '../../components/common/Controls.jsx';
import StatusMessage from '../../components/common/StatusMessage.jsx';
import { CATEGORY_LABELS } from '../../constants/stats.js';
import { LAST_SEASON } from '../../constants/seasons.js';
import { formatStat } from '../../utils/format.js';

const LIMIT = 5;

// 기록 순위 페이지의 기본 부문과 같게: 타자는 타율, 투수는 평균자책점 (둘 다 규정타석·규정이닝 충족 선수만)
const GROUPS = [
  { kind: 'batting', playerType: 'batter', title: '타자', sort: 'avg' },
  { kind: 'pitching', playerType: 'pitcher', title: '투수', sort: 'era' },
];

/**
 * 선수 비교 화면의 '추천 선수' — 고른 시즌의 기록 순위 타자 5명, 투수 5명
 * 사용 API: GET /api/seasons/{year}/batting-stats?sort=avg&qualified=true
 *           GET /api/seasons/{year}/pitching-stats?sort=era&qualified=true
 *
 * type       : 지금 비교 중인 유형 ('batter' | 'pitcher')
 * selectedId : 이미 고른 선수 ID (같은 유형일 때 '선택됨'으로 표시)
 * onPick     : 선수를 누르면 (player, playerType, year) 로 호출
 */
export default function CompareSuggestions({ type, selectedId, onPick }) {
  const [year, setYear] = useState(LAST_SEASON);

  return (
    <section className="card suggest" aria-labelledby="suggest-title">
      <div className="suggest__head">
        <div>
          <h2 id="suggest-title">추천 선수</h2>
          <p className="suggest__note">
            {year} 시즌 기록 순위 상위 선수입니다. 누르면 바로 비교할 선수로 들어가고, 시즌도 {year} 시즌으로 맞춰집니다.
          </p>
        </div>
        <SeasonSelect value={year} onChange={(value) => setYear(value ?? LAST_SEASON)} />
      </div>

      <div className="suggest__grid">
        {GROUPS.map((group) => (
          <SuggestList
            key={group.kind}
            group={group}
            year={year}
            current={type === group.playerType}
            selectedId={type === group.playerType ? selectedId : null}
            onPick={onPick}
          />
        ))}
      </div>
    </section>
  );
}

function SuggestList({ group, year, current, selectedId, onPick }) {
  const { kind, playerType, title, sort } = group;
  const { data, loading, error } = useApi(
    () => fetchSeasonStats(year, kind, { sort, qualified: true }),
    [year, kind, sort]
  );
  const players = data ? withRanks(data.filter((row) => row[sort] != null).slice(0, LIMIT), sort) : [];

  return (
    <div className="suggest__group">
      <h3 className="suggest__title">
        {title} <span>{CATEGORY_LABELS[sort]} TOP {LIMIT}</span>
        {/* 다른 유형을 누르면 비교 유형이 바뀌고 고른 선수가 비워진다는 것을 미리 알린다 */}
        {!current && <small>누르면 {title} 비교로 바뀝니다</small>}
      </h3>

      <StatusMessage loading={loading && !data} error={error} />
      {data && players.length === 0 && <p className="suggest__empty">{year} 시즌 규정 충족 선수가 없습니다.</p>}

      {players.length > 0 && (
        <ol className={`suggest__list ${loading ? 'is-loading' : ''}`}>
          {players.map((player) => {
            const picked = player.playerId === selectedId;
            return (
              <li key={player.playerId}>
                <button
                  type="button"
                  className="suggest__item"
                  disabled={picked}
                  onClick={() => onPick(player, playerType, year)}
                >
                  <span className="suggest__rank num">{player.rank}</span>
                  <span className="suggest__name">
                    {player.playerName}
                    <small>{player.teamName}</small>
                  </span>
                  <span className="suggest__value num">{picked ? '선택됨' : formatStat(sort, player[sort])}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
