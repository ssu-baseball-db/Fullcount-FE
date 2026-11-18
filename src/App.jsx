import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { USE_MOCK } from './api/client.js';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import AdminModeBar from './components/AdminModeBar.jsx';
import MainPage from './pages/MainPage.jsx';
import ComingSoon from './pages/ComingSoon.jsx';
import PlayerSearchPage from './pages/players/PlayerSearchPage.jsx';
import PlayerDetailPage from './pages/players/PlayerDetailPage.jsx';
import ComparePage from './pages/players/ComparePage.jsx';
import TeamListPage from './pages/teams/TeamListPage.jsx';
import TeamDetailPage from './pages/teams/TeamDetailPage.jsx';
import LeadersPage from './pages/leaders/LeadersPage.jsx';
import GameListPage from './pages/games/GameListPage.jsx';
import GameDetailPage from './pages/games/GameDetailPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RequireAdmin from './components/RequireAdmin.jsx';
import AdminHomePage from './pages/admin/AdminHomePage.jsx';
import PlayerCreatePage from './pages/admin/PlayerCreatePage.jsx';
import PlayerEditPage from './pages/admin/PlayerEditPage.jsx';

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
  // 관리자 화면(/admin…)에서는 '관리 모드' 띠를 보여 주고 제목 띠 색을 바꾼다
  const { pathname } = useLocation();
  const adminMode = pathname === '/admin' || pathname.startsWith('/admin/');

  return (
    <div className={`app ${adminMode ? 'is-admin-mode' : ''}`}>
      <ScrollToTop />
      <Header />
      {adminMode && <AdminModeBar />}
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

          {/* 경기 (담당: 박은호) */}
          <Route path="/games" element={<GameListPage />} />
          <Route path="/games/:gameId" element={<GameDetailPage />} />

          {/* 예전 검색 주소로 들어오면 선수 찾기로 보낸다 */}
          {/* 로그인 · 관리자 (RequireAdmin: 관리자가 아니면 화면을 막는다) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<RequireAdmin><AdminHomePage /></RequireAdmin>} />
          <Route path="/admin/players/new" element={<RequireAdmin><PlayerCreatePage /></RequireAdmin>} />
          <Route path="/admin/players/edit" element={<RequireAdmin><PlayerEditPage /></RequireAdmin>} />
          {/* SQL 실행은 관리 화면의 탭으로 들어갔다. 예전 주소로 와도 그 탭을 연다 */}
          <Route path="/admin/sql" element={<Navigate to="/admin?tab=sql" replace />} />

          <Route path="/search" element={<Navigate to="/players" replace />} />
          <Route path="*" element={<ComingSoon title="페이지를 찾을 수 없어요" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
