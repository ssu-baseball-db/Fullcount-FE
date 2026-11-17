import { Link, NavLink, useLocation } from 'react-router-dom';
import SearchBox from './SearchBox.jsx';
import BaseballIcon from './BaseballIcon.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import './Header.css';

const MENU = [
  { to: '/players', label: '선수' },
  { to: '/compare', label: '선수 비교' },
  { to: '/teams', label: '팀' },
  { to: '/leaders', label: '기록 순위' },
  { to: '/games', label: '경기' },
];

export default function Header() {
  const { pathname } = useLocation();
  const { user, isAdmin, logout } = useAuth();
  // 관리자로 로그인했을 때만 '관리' 메뉴를 보여준다 (권한 확인 자체는 백엔드가 한다)
  const menu = isAdmin ? [...MENU, { to: '/admin', label: '관리' }] : MENU;
  // 메인과 선수 찾기 화면에는 큰 검색창이 따로 있으니 헤더 검색창은 숨긴다
  const hideSearch = pathname === '/' || pathname === '/players';

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="site-header__logo" aria-label="풀카운트 홈">
          <BaseballIcon size={28} />
          <span>풀카운트</span>
        </Link>

        <nav className="site-header__nav" aria-label="주 메뉴">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="site-header__right">
          {!hideSearch && (
            <div className="site-header__search">
              <SearchBox size="small" />
            </div>
          )}

          <div className="site-header__auth">
            {user ? (
              <>
                <span className="site-header__user" title={isAdmin ? '관리자' : '일반 회원'}>
                  {user.loginId}
                  {isAdmin && <span className="site-header__role">관리자</span>}
                </span>
                <button type="button" onClick={logout}>
                  로그아웃
                </button>
              </>
            ) : (
              <Link to={`/login?next=${encodeURIComponent(pathname)}`}>로그인</Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
