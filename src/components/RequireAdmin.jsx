import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

/**
 * 관리자만 볼 수 있는 화면을 감싸는 컴포넌트.
 *   - 세션 확인이 끝나기 전에는 아무것도 그리지 않는다 (새로고침 직후 로그인 화면으로 튕기지 않도록)
 *   - 로그인하지 않았으면 로그인 화면으로 보낸다 (로그인 후 원래 화면으로 돌아옴)
 *
 * 주의: 이것은 화면을 숨기는 것일 뿐이다. 진짜 권한 검사는 백엔드가 세션과 CSRF 토큰으로 한다.
 */
export default function RequireAdmin({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return null;

  if (!user) {
    const next = encodeURIComponent(location.pathname + (location.search ?? ''));
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
}
