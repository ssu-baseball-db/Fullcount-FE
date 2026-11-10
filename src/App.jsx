import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { USE_MOCK } from './api/client.js';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import MainPage from './pages/MainPage.jsx';
import ComingSoon from './pages/ComingSoon.jsx';
import PlayerSearchPage from './pages/players/PlayerSearchPage.jsx';
import PlayerDetailPage from './pages/players/PlayerDetailPage.jsx';
import ComparePage from './pages/players/ComparePage.jsx';
import TeamListPage from './pages/teams/TeamListPage.jsx';
import TeamDetailPage from './pages/teams/TeamDetailPage.jsx';
import LeadersPage from './pages/leaders/LeadersPage.jsx';

// 다른 페이지로 이동하면 화면 맨 위부터 보이게 한다
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// 페이지 주소(URL)와 화면을 연결하는 곳
export default function App() {
  return (
    <div className="app">
      <ScrollToTop />
      <Header />
      {/* 목업 모드일 때만 보이는 안내 (실제 백엔드에 연결하면 사라진다) */}
      {USE_MOCK && (
        <p className="mock-banner">
          지금은 샘플 데이터로 보여 주고 있습니다. 선수 이름과 기록은 실제와 다릅니다.
        </p>
      )}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<MainPage />} />

          {/* 선수 */}
          <Route path="/players" element={<PlayerSearchPage />} />
          <Route path="/players/:playerId" element={<PlayerDetailPage />} />
          <Route path="/compare" element={<ComparePage />} />

          {/* 팀 */}
          <Route path="/teams" element={<TeamListPage />} />
          <Route path="/teams/:teamId" element={<TeamDetailPage />} />

          {/* 기록 순위 */}
          <Route path="/leaders" element={<LeadersPage />} />

          {/* 경기 (담당: 박은호) — 페이지를 만들면 ComingSoon 자리를 바꾸면 된다 */}
          <Route path="/games" element={<ComingSoon title="경기" />} />
          <Route path="/games/:gameId" element={<ComingSoon title="경기 상세" />} />

          {/* 예전 검색 주소로 들어오면 선수 찾기로 보낸다 */}
          <Route path="/search" element={<Navigate to="/players" replace />} />
          <Route path="*" element={<ComingSoon title="페이지를 찾을 수 없어요" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
