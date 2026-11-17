import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import './Footer.css';

export default function Footer() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <footer className="site-footer">
      <div className="container">
        <p>
          선수 기록은 2015~2026년 KBO 시즌 기록 데이터셋을, 팀 순위는 KBO 공식 일자별 팀 순위(각 시즌 마지막
          기준일)를 정규시즌 승률 순으로 정리해 보여 줍니다.
        </p>
        <p className="site-footer__bottom">
          <span>데이터베이스 응용 팀 프로젝트</span>
          {/* 관리자만 쓰는 입구라 눈에 띄지 않게 둔다 */}
          {!user && pathname !== '/login' && (
            <Link to={`/login?next=${encodeURIComponent(pathname)}`} className="site-footer__admin">
              관리자 로그인
            </Link>
          )}
        </p>
      </div>
    </footer>
  );
}
