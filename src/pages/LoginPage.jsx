import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { USE_MOCK } from '../api/client.js';
import PageHeader from '../components/common/PageHeader.jsx';
import './admin/AdminPages.css';

/**
 * 로그인 화면  /login?next=/admin
 * 사용 API: POST /api/auth/login
 * 로그인에 성공하면 next 주소(없으면 메인)로 이동한다.
 */
export default function LoginPage() {
  const { user, login, loginWithToken, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [noAuthApi, setNoAuthApi] = useState(false); // 백엔드에 로그인 API가 아직 없음
  const [token, setToken] = useState('');

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
      // 404·405: 백엔드에 로그인 API가 아직 없음 → 임시 토큰 입력칸을 보여준다
      if (err.status === 404 || err.status === 405) {
        setNoAuthApi(true);
        setError('백엔드에 아직 로그인 API(POST /api/auth/login)가 없어 로그인할 수 없습니다.');
      } else {
        setError(err.status === 401 ? '아이디 또는 비밀번호가 맞지 않습니다.' : err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleToken(event) {
    event.preventDefault();
    if (!token.trim()) return;
    loginWithToken(token.trim());
    navigate(next);
  }

  if (user) {
    return (
      <>
        <PageHeader title="로그인" />
        <div className="container page-body">
          <div className="card auth-card">
            <p>
              <strong>{user.loginId}</strong> 계정({user.role === 'ADMIN' ? '관리자' : '일반 회원'})으로 로그인되어 있습니다.
            </p>
            <div className="form-actions">
              {user.role === 'ADMIN' && (
                <Link to="/admin" className="button button--primary">
                  관리 화면으로 가기
                </Link>
              )}
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
              샘플 데이터 모드 시험 계정: 관리자 <code>admin</code> / <code>admin1234</code>, 일반 회원 <code>fan</code> /{' '}
              <code>fan1234</code>
            </p>
          )}
        </form>

        {/* 백엔드에 로그인 API가 생기기 전까지만 쓰는 임시 방법 */}
        {noAuthApi && (
          <form className="card auth-card auth-card--temp" onSubmit={handleToken}>
            <p className="form-hint">
              백엔드에 아직 로그인 API가 없습니다. 임시로 백엔드의 관리자 토큰(<code>FULLCOUNT_ADMIN_TOKEN</code> 값)을 입력해
              접속할 수 있습니다. 토큰이 맞는지는 관리자 기능을 쓸 때 백엔드가 확인합니다.
            </p>
            <label className="field">
              <span className="field__label">관리자 토큰</span>
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)} />
            </label>
            <button type="submit" className="button">
              토큰으로 접속
            </button>
          </form>
        )}
      </div>
    </>
  );
}
