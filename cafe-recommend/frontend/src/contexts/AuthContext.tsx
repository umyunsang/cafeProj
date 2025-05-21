'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation'; // 로그인 실패 시 리디렉션을 위해 추가

// 사용자 정보 타입 (예시, 실제 프로젝트에 맞게 확장 필요)
interface User {
  id: string;
  email: string;
  name?: string;
  // role?: 'admin' | 'user'; // 역할이 있다면 추가
}

// 인증 상태 타입
interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean; // 인증 상태 로딩 중 (초기 토큰 확인 등)
  isAuthenticated: boolean; // 명시적인 인증 완료 상태
}

// AuthContext에서 제공할 값들의 타입
interface AuthContextType extends AuthState {
  login: (token: string, userData?: User) => Promise<void>; // userData는 선택적, 토큰만으로 사용자 정보 조회 가능하면 userData 불필요
  logout: () => void;
  checkAuthToken: () => string | null; // 단순 토큰 반환 (API 호출 시 사용)
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const router = useRouter(); // 리디렉션용

  useEffect(() => {
    // 컴포넌트 마운트 시 localStorage에서 토큰 확인
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) {
      // TODO: 토큰 유효성 검사 API 호출 및 사용자 정보 가져오기 (실제 구현 시)
      // 우선은 토큰이 있으면 인증된 것으로 간주 (실제 앱에서는 보안상 위험)
      // 예시: const userData = await verifyTokenAndGetUser(storedToken);
      // if (userData) {
      //   setAuthState({ token: storedToken, user: userData, isLoading: false, isAuthenticated: true });
      // } else {
      //   localStorage.removeItem('adminToken');
      //   setAuthState({ token: null, user: null, isLoading: false, isAuthenticated: false });
      // }
      console.log('[AuthContext] Token found in localStorage:', storedToken);
      // 임시로 사용자 정보 하드코딩 (실제로는 API로부터 받아야 함)
      const tempUser: User = { id: 'admin', email: 'admin@example.com', name:'관리자' };
      setAuthState({ token: storedToken, user: tempUser, isLoading: false, isAuthenticated: true });
    } else {
      console.log('[AuthContext] No token in localStorage.');
      setAuthState({ token: null, user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  const login = async (token: string, userData?: User) => {
    // 실제 로그인 API 호출 후 토큰과 사용자 정보를 받아옴
    // 이 함수는 로그인 페이지에서 호출될 것임
    localStorage.setItem('adminToken', token);
    // 사용자 정보를 함께 받았다면 사용, 아니면 토큰으로 다시 조회할 수 있음
    const userToSet = userData || (authState.user); // 임시: userData가 없으면 기존 user 유지 (실제로는 API 응답 사용)
    
    // 실제 앱에서는 로그인 성공 후 사용자 정보를 API로부터 받아오는 로직이 필요.
    // 지금은 userData가 제공되었다고 가정하거나, 임시 사용자 정보를 사용.
    const finalUser = userData || { id: 'admin', email: 'admin@example.com', name:'관리자' };

    setAuthState({ token, user: finalUser, isLoading: false, isAuthenticated: true });
    console.log('[AuthContext] Logged in. Token:', token, 'User:', finalUser);
    // 로그인 성공 후 대시보드 등으로 리디렉션은 호출하는 쪽에서 처리하는 것이 일반적
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminToken'); // 세션 스토리지도 함께 정리
    setAuthState({ token: null, user: null, isLoading: false, isAuthenticated: false });
    console.log('[AuthContext] Logged out.');
    router.push('/admin'); // 로그아웃 후 로그인 페이지로 리디렉션
  };
  
  const checkAuthToken = (): string | null => {
    return authState.token;
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, checkAuthToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 