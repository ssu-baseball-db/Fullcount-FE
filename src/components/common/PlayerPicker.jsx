import { useEffect, useId, useState } from 'react';
import { searchPlayers, groupBySeasonPlayer } from '../../api/playerApi.js';
import { formatPosition, formatYears } from '../../utils/format.js';
import { errorText } from './StatusMessage.jsx';
import './PlayerPicker.css';

/**
 * 이름으로 검색해서 선수 한 명을 고르는 입력창 (선수 비교 화면에서 사용)
 *
 * type     : 'batter' | 'pitcher' — 이 유형의 선수만 목록에 보여준다
 * selected : 고른 선수 { playerId, playerName, detail } 또는 null
 * onSelect : 선수를 고르면 { playerId, playerName } 로 호출
 * onClear  : '다른 선수 고르기'를 누르면 호출
 */
export default function PlayerPicker({ label, type, selected, onSelect, onClear }) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [error, setError] = useState(null);

  // 입력을 멈추고 0.3초 뒤에 검색한다 (글자마다 요청하지 않도록)
  useEffect(() => {
    const name = query.trim();
    if (!name) {
      setResults([]);
      setStatus('idle');
      return undefined;
    }

    let ignore = false;
    setStatus('loading');
    const timer = setTimeout(() => {
      searchPlayers(name)
        .then((rows) => {
          if (ignore) return;
          setResults(groupBySeasonPlayer(rows).filter((p) => p.type === type).slice(0, 8));
          setStatus('done');
        })
        .catch((err) => {
          if (ignore) return;
          setError(err);
          setStatus('error');
        });
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query, type]);

  if (selected) {
    return (
      <div className="picker picker--selected">
        <p className="picker__label">{label}</p>
        <p className="picker__name">{selected.playerName}</p>
        {selected.detail && <p className="picker__detail">{selected.detail}</p>}
        <button type="button" className="picker__change" onClick={onClear}>
          다른 선수 고르기
        </button>
      </div>
    );
  }

  return (
    <div className="picker">
      <label className="picker__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="search"
        placeholder={type === 'pitcher' ? '투수 이름 검색' : '타자 이름 검색'}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
      />

      {status === 'loading' && <p className="picker__hint">찾는 중…</p>}
      {status === 'error' && <p className="picker__hint is-error">{errorText(error)}</p>}
      {status === 'done' && results.length === 0 && (
        <p className="picker__hint">
          ‘{query.trim()}’ 이름의 {type === 'pitcher' ? '투수' : '타자'}가 없습니다.
        </p>
      )}

      {results.length > 0 && (
        <ul className="picker__results">
          {results.map((player) => {
            const last = player.teams[player.teams.length - 1];
            return (
              <li key={player.playerId}>
                <button type="button" onClick={() => onSelect({ playerId: player.playerId, playerName: player.playerName })}>
                  <span className="picker__result-name">{player.playerName}</span>
                  <span className="picker__result-sub">
                    {last.teamName} {formatYears(last.from, last.to)}, {formatPosition(player.latest.position)}
                    {player.birthDate && `, ${player.birthDate.slice(0, 4)}년생`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
