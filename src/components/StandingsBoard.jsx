import { Link } from 'react-router-dom';
import { formatRate, formatGamesBehind } from '../utils/format.js';
import './StandingsBoard.css';

/**
 * 전광판 스타일의 팀 순위표.
 * standings: API 응답 배열, loading / error: 불러오기 상태
 */
export default function StandingsBoard({ year, standings, loading, error }) {
  if (error) {
    return (
      <p className="standings__message">
        팀 순위를 불러오지 못했습니다. 백엔드 서버(8080)가 켜져 있는지 확인해 주세요.
      </p>
    );
  }

  if (loading && !standings) {
    return <p className="standings__message">팀 순위를 불러오는 중…</p>;
  }

  if (!standings || standings.length === 0) {
    return <p className="standings__message">{year} 시즌 순위 기록이 아직 없습니다.</p>;
  }

  return (
    // 새 시즌을 불러오는 동안에는 이전 표를 흐리게 보여준다
    <table className={`standings ${loading ? 'is-loading' : ''}`}>
      <caption className="visually-hidden">{year} 정규시즌 팀 순위</caption>
      <thead>
        <tr>
          <th scope="col" className="standings__rank">순위</th>
          <th scope="col" className="standings__team">팀</th>
          <th scope="col" className="standings__optional">경기</th>
          <th scope="col">승</th>
          <th scope="col">패</th>
          <th scope="col" className="standings__optional">무</th>
          <th scope="col">승률</th>
          <th scope="col">게임차</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((team) => (
          <tr key={team.teamId} className={team.rank === 1 ? 'is-first' : undefined}>
            <td className="standings__rank num">{team.rank}</td>
            <th scope="row" className="standings__team">
              <Link to={`/teams/${team.teamId}?year=${year}`}>{team.teamName}</Link>
              {team.isChampion && (
                <span className="standings__champion" role="img" aria-label="한국시리즈 우승" title="한국시리즈 우승">
                  🏆
                </span>
              )}
            </th>
            <td className="standings__optional num">{team.games}</td>
            <td className="num">{team.wins}</td>
            <td className="num">{team.losses}</td>
            <td className="standings__optional num">{team.draws}</td>
            <td className="num">{formatRate(team.winningPct)}</td>
            <td className="num">{formatGamesBehind(team.gamesBehind)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
