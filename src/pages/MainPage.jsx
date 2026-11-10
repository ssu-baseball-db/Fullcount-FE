import { useEffect, useState } from 'react';
import useApi from '../hooks/useApi.js';
import { fetchSeasons, fetchStandings } from '../api/mainApi.js';
import { USE_MOCK } from '../api/client.js';
import { FIRST_SEASON, LAST_SEASON } from '../constants/seasons.js';
import SearchBox from '../components/SearchBox.jsx';
import SeasonPlates from '../components/SeasonPlates.jsx';
import StandingsBoard from '../components/StandingsBoard.jsx';
import LeaderBoard from '../components/LeaderBoard.jsx';
import './MainPage.css';

export default function MainPage() {
  // 1) 시즌 목록을 불러온다
  const { data: seasons } = useApi(fetchSeasons, []);

  // 2) 선택된 시즌. 시즌 목록이 오면 가장 최신 시즌으로 정한다
  const [year, setYear] = useState(null);
  useEffect(() => {
    if (seasons && seasons.length > 0 && year === null) {
      setYear(seasons[0]);
    }
  }, [seasons, year]);

  // 3) 선택된 시즌의 팀 순위 (year 가 정해진 뒤에만 요청)
  const standings = useApi(() => (year ? fetchStandings(year) : Promise.resolve(null)), [year]);
  const asOfDate = standings.data?.[0]?.asOfDate; // 공식 순위 기준일
  const hasChampion = standings.data?.some((team) => team.isChampion);

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__intro">
            <h1>선수와 팀의 시즌 기록을 한곳에서</h1>
            <p>
              {FIRST_SEASON}년부터 {LAST_SEASON}년까지 KBO 타자·투수 기록과 팀 순위를 시즌별로 찾아볼 수
              있습니다.
            </p>

            <SearchBox size="large" />

            {seasons && year && (
              <div className="hero__season">
                <p className="hero__season-label">시즌</p>
                <SeasonPlates seasons={seasons} year={year} onChange={setYear} />
              </div>
            )}
          </div>

          <div className="hero__board">
            <div className="hero__board-head">
              <h2>{year ? `${year} 정규시즌 순위` : '정규시즌 순위'}</h2>
              <div className="hero__board-meta">
                {hasChampion && <span>🏆 한국시리즈 우승</span>}
                {asOfDate && <span>{asOfDate} 기준</span>}
                {USE_MOCK && <span className="hero__mock">샘플 데이터</span>}
              </div>
            </div>
            <StandingsBoard
              year={year}
              standings={standings.data}
              loading={standings.loading || !year}
              error={standings.error}
            />
          </div>
        </div>
      </section>

      <div className="container">{year && <LeaderBoard year={year} />}</div>
    </>
  );
}
