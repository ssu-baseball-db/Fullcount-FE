import { Link, useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi.js';
import { searchPlayers, groupBySeasonPlayer } from '../../api/playerApi.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusMessage from '../../components/common/StatusMessage.jsx';
import SearchBox from '../../components/SearchBox.jsx';
import { TEAM_IDS, TEAM_SEARCH_WORDS, teamNameFor } from '../../constants/teams.js';
import { LAST_SEASON } from '../../constants/seasons.js';
import { formatPosition, formatYears } from '../../utils/format.js';
import './PlayerPages.css';

// 검색어가 구단 이름(별칭 포함)과 맞으면 그 구단을 돌려준다
function matchTeams(keyword) {
  const word = keyword.trim().toLowerCase();
  if (!word) return [];
  return TEAM_IDS.filter((teamId) =>
    TEAM_SEARCH_WORDS[teamId].some((name) => name.toLowerCase().includes(word) || word.includes(name.toLowerCase()))
  );
}

/**
 * 선수 찾기 페이지  /players?name=김
 * 사용 API: GET /api/players?name= (1.1 선수 검색)
 * 메인·헤더의 검색창도 이 페이지로 연결된다. 팀 이름을 입력하면 팀 바로가기도 보여준다.
 */
export default function PlayerSearchPage() {
  const [params] = useSearchParams();
  const name = (params.get('name') ?? '').trim();

  const { data, loading, error } = useApi(() => searchPlayers(name), [name], { enabled: name !== '' });
  const players = data ? groupBySeasonPlayer(data) : [];
  const teams = matchTeams(name);

  return (
    <>
      <PageHeader title="선수 찾기" description="이름의 일부만 입력해도 찾을 수 있습니다. 동명이인은 생년월일과 소속 팀으로 구분하세요.">
        <div className="player-search__box">
          {/* key 를 주면 주소의 검색어가 바뀔 때 입력창도 새 검색어로 바뀐다 */}
          <SearchBox key={name} size="large" initialValue={name} placeholder="선수 이름" />
        </div>
      </PageHeader>

      <div className="container page-body">
        {!name && <StatusMessage empty emptyText="찾고 싶은 선수의 이름을 입력해 주세요. 예: 김" />}

        {teams.length > 0 && (
          <section className="section">
            <div className="section__head">
              <h2>구단</h2>
            </div>
            <ul className="result-chips">
              {teams.map((teamId) => (
                <li key={teamId}>
                  <Link to={`/teams/${teamId}`} className="button">
                    {teamNameFor(teamId, LAST_SEASON)} 팀 기록 보기
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {name && (
          <section className="section">
            <div className="section__head">
              <h2>선수 {players.length > 0 && <span className="num">{players.length}명</span>}</h2>
            </div>

            <StatusMessage
              loading={loading}
              error={error}
              empty={!loading && data && players.length === 0}
              emptyText={`‘${name}’ 이름이 들어간 선수가 없습니다. 2015~2026 시즌 기록이 있는 선수만 찾을 수 있습니다.`}
            />

            {players.length > 0 && (
              <ul className="player-results">
                {players.map((player) => (
                  <li key={player.playerId}>
                    <Link to={`/players/${player.playerId}?type=${player.type}`} className="player-result">
                      <span className="player-result__name">{player.playerName}</span>
                      <span className="player-result__badge">{player.type === 'pitcher' ? '투수' : '타자'}</span>
                      <span className="player-result__meta">
                        {player.birthDate ? `${player.birthDate} 출생` : '생년월일 정보 없음'},{' '}
                        {player.positions.map(formatPosition).join('/')}
                      </span>
                      <span className="player-result__teams">
                        {player.teams.map((t) => `${t.teamName} ${formatYears(t.from, t.to)}`).join(' → ')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}
