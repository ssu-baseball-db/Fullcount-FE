import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import './AdminModeBar.css';

/**
 * 관리 모드 표시 띠 — 관리자 화면(/admin…)에서만 헤더 바로 아래에 보인다.
 * 일반 화면과 헷갈리지 않도록 '관리 모드' 표시를 붙이고, 관리 화면의 제목 띠 색도 바꾼다(App.jsx 의 is-admin-mode).
 */
export default function AdminModeBar() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null; // 로그인 확인 전이거나 관리자가 아니면 보이지 않는다

  return (
    <div className="admin-mode-bar" role="status">
      <div className="container admin-mode-bar__inner">
        <span className="admin-mode-bar__badge">관리 모드</span>
        <span className="admin-mode-bar__text">관리자 전용 화면입니다. 서비스 데이터 관리에서 저장한 내용은 실제 서비스에 바로 반영됩니다.</span>
        <Link to="/" className="admin-mode-bar__exit">
          일반 화면으로 →
        </Link>
      </div>
    </div>
  );
}
