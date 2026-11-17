import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import PageHeader from './common/PageHeader.jsx';

/**
 * 관리자만 볼 수 있는 화면을 감싸는 컴포넌트.
 *   - 로그인하지 않았으면 로그인 화면으로 보낸다 (로그인 후 원래 화면으로 돌아옴)
 *   - 일반 회원이면 '권한 없음' 안내를 보여준다
 *
 * 주의: 이것은 화면을 숨기는 것일 뿐이다. 주소창에 API를 직접 호출해도 막히도록
 * 백엔드가 요청마다 DB에서 권한을 확인해 403 을 돌려준다. (진짜 권한 검사는 백엔드)
 */
export default function RequireAdmin({ children }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  if (!user) {
    const next = encodeURIComponent(location.pathname + (location.search ?? ''));
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="관리자 전용 화면입니다" description={`${user.loginId} 계정은 일반 회원이라 이 화면을 쓸 수 없습니다.`} />
        <div className="container page-body">
          <Link to="/" className="text-link">
            메인으로 가기
          </Link>
        </div>
      </>
    );
  }

  return children;
}
