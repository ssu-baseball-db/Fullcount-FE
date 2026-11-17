import { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/authApi.js';
import { loadSession, saveSession, clearSession } from './session.js';

const AuthContext = createContext(null);

/**
 * 로그인 상태를 앱 전체에 나눠 주는 컴포넌트. main.jsx 에서 <App /> 을 감싼다.
 * 어느 화면에서든 const { user, isAdmin, login, logout } = useAuth(); 로 꺼내 쓴다.
 */
export function AuthProvider({ children }) {
  // user: { loginId, role } 또는 null(로그인 안 함)
  const [user, setUser] = useState(() => {
    const saved = loadSession();
    return saved ? { loginId: saved.loginId, role: saved.role } : null;
  });

  // 새로고침하면 저장된 토큰이 아직 유효한지 백엔드에 다시 물어본다 (권한이 바뀌었을 수도 있으므로)
  useEffect(() => {
    const saved = loadSession();
    if (!saved || saved.tokenOnly) return;
    authApi
      .fetchMe()
      .then((me) => {
        saveSession({ ...saved, loginId: me.loginId, role: me.role });
        setUser({ loginId: me.loginId, role: me.role });
      })
      .catch((error) => {
        // 401: 토큰 만료 → 로그아웃 처리. 그 밖의 오류(서버 꺼짐 등)는 저장된 상태를 유지
        if (error.status === 401) {
          clearSession();
          setUser(null);
        }
      });
  }, []);

  // 아이디·비밀번호로 로그인
  async function login(loginId, password) {
    const result = await authApi.login(loginId, password);
    saveSession({ token: result.token, loginId: result.loginId, role: result.role });
    setUser({ loginId: result.loginId, role: result.role });
    return result;
  }

  // (임시) 백엔드에 로그인 API가 아직 없을 때, 관리자 토큰을 직접 넣어 접속
  // 권한은 관리자 API를 호출할 때 백엔드가 확인하므로 틀린 토큰이면 403 이 난다.
  function loginWithToken(token) {
    saveSession({ token, loginId: '관리자(임시 토큰)', role: 'ADMIN', tokenOnly: true });
    setUser({ loginId: '관리자(임시 토큰)', role: 'ADMIN' });
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // 로그아웃 API가 실패해도 화면에서는 로그아웃시킨다
    }
    clearSession();
    setUser(null);
  }

  const value = { user, isAdmin: user?.role === 'ADMIN', login, loginWithToken, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
