import { Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import MainPage from './pages/MainPage.jsx';
import ComingSoon from './pages/ComingSoon.jsx';

// 페이지 주소(URL)와 화면을 연결하는 곳.
// 다른 화면을 만들면 ComingSoon 자리를 실제 페이지 컴포넌트로 바꾸면 된다.
export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/players" element={<ComingSoon title="선수" />} />
          <Route path="/players/:playerId" element={<ComingSoon title="선수 상세" />} />
          <Route path="/teams" element={<ComingSoon title="팀" />} />
          <Route path="/teams/:teamId" element={<ComingSoon title="팀 상세" />} />
          <Route path="/leaders" element={<ComingSoon title="기록 순위" />} />
          <Route path="/games" element={<ComingSoon title="경기" />} />
          <Route path="/search" element={<ComingSoon title="검색 결과" />} />
          <Route path="*" element={<ComingSoon title="페이지를 찾을 수 없어요" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
