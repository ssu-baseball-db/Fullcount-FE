import { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/authApi.js';
import { loadAdminName, saveAdminName, clearAdminName } from './session.js';

const AuthContext = createContext(null);

const DEFAULT_NAME = '관리자';

/**
 * 로그인 상태를 앱 전체에 나눠 주는 컴포넌트. main.jsx 에서 <App /> 을 감싼다.
 * 어느 화면에서든 const { user, isAdmin, ready, login, logout } = useAuth(); 로 꺼내 쓴다.
 *
 * 로그인 계정은 백엔드 관리자 계정 하나뿐이다. 로그인 상태는 백엔드 세션 쿠키로 판단한다.
 */
export function AuthProvider({ children }) {
  // user: { loginId } 또는 null(로그인 안 함)
  const [user, setUser] = useState(null);
  // ready: 처음 세션 확인이 끝났는지. 끝나기 전에는 관리자 화면에서 로그인 화면으로 보내지 않는다
  const [ready, setReady] = useState(false);

  // 화면을 열거나 새로고침하면 백엔드 세션이 아직 살아 있는지 확인한다
  useEffect(() => {
    authApi
      .fetchSession()
      .then((session) => {
        if (session?.authenticated) setUser({ loginId: loadAdminName() || DEFAULT_NAME });
        else clearAdminName();
      })
      .catch(() => {
        // 서버가 꺼져 있으면 로그인 안 한 상태로 둔다
      })
      .finally(() => setReady(true));
  }, []);

  async function login(username, password) {
    const result = await authApi.login(username, password);
    saveAdminName(username);
    setUser({ loginId: username });
    return result;
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // 로그아웃 API가 실패해도 화면에서는 로그아웃시킨다
    }
    clearAdminName();
    setUser(null);
  }

  const value = { user, isAdmin: Boolean(user), ready, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
