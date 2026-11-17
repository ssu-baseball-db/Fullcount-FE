import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { USE_MOCK } from '../api/client.js';
import PageHeader from '../components/common/PageHeader.jsx';
import './admin/AdminPages.css';

/**
 * 관리자 로그인 화면  /login?next=/admin
 * 사용 API: GET /api/admin/session (CSRF 토큰), POST /api/admin/login
 * 로그인에 성공하면 next 주소(없으면 메인)로 이동한다.
 */
export default function LoginPage() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!loginId.trim() || !password) {
      setError('아이디와 비밀번호를 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await login(loginId.trim(), password);
      navigate(next);
    } catch (err) {
      if (err.status === 401) setError('아이디 또는 비밀번호가 맞지 않습니다.');
      else if (err.status === 403) setError('요청 검증에 실패했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
      else if (err.status === 404 || err.status === 405) {
        setError('백엔드에 관리자 로그인 API(POST /api/admin/login)가 없습니다. 백엔드 버전을 확인해 주세요.');
      } else setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (user) {
    return (
      <>
        <PageHeader title="로그인" />
        <div className="container page-body">
          <div className="card auth-card">
            <p>
              <strong>{user.loginId}</strong> 계정(관리자)으로 로그인되어 있습니다.
            </p>
            <div className="form-actions">
              <Link to="/admin" className="button button--primary">
                관리 화면으로 가기
              </Link>
              <button type="button" className="button" onClick={logout}>
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="로그인" description="기록 조회는 로그인 없이 할 수 있습니다. 선수·기록 관리는 관리자 계정으로 로그인해야 합니다." />
      <div className="container page-body">
        <form className="card auth-card" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field__label">아이디</span>
            <input value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" autoFocus />
          </label>
          <label className="field">
            <span className="field__label">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p className="form-message is-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="button button--primary auth-card__submit" disabled={submitting}>
            {submitting ? '로그인하는 중…' : '로그인'}
          </button>

          {USE_MOCK && (
            <p className="form-hint">
              샘플 데이터 모드 시험 계정: <code>admin</code> / <code>admin1234</code>
            </p>
          )}
        </form>
      </div>
    </>
  );
}
