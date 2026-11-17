import { Link, NavLink, useLocation } from 'react-router-dom';
import SearchBox from './SearchBox.jsx';
import BaseballIcon from './BaseballIcon.jsx';
import './Header.css';

const MENU = [
  { to: '/players', label: '선수' },
  { to: '/teams', label: '팀' },
  { to: '/leaders', label: '기록 순위' },
  { to: '/games', label: '경기' },
];

export default function Header() {
  const { pathname } = useLocation();
  const isMain = pathname === '/';

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="site-header__logo" aria-label="풀카운트 홈">
          <BaseballIcon size={28} />
          <span>풀카운트</span>
        </Link>

        <nav className="site-header__nav" aria-label="주 메뉴">
          {MENU.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 메인 화면에는 큰 검색창이 따로 있으니 헤더 검색창은 숨긴다 */}
        {!isMain && (
          <div className="site-header__search">
            <SearchBox size="small" />
          </div>
        )}
      </div>
    </header>
  );
}
