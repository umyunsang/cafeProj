'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { identifyUser, getUserPreferences, updateUserPreferences, clearUserSession, UserPreferences } from '@/lib/user-identity';

// 사용자 컨텍스트 타입
interface UserContextType {
  userId: string | null;
  isNewUser: boolean;
  isLoading: boolean;
  preferences: UserPreferences;
  updatePreferences: (newPreferences: UserPreferences) => Promise<void>;
  resetSession: () => Promise<void>;
}

// 기본 컨텍스트 값
const defaultContextValue: UserContextType = {
  userId: null,
  isNewUser: false,
  isLoading: true,
  preferences: {
    theme: 'light',
    language: 'ko',
    notification_enabled: true,
  },
  updatePreferences: async () => {},
  resetSession: async () => {},
};

// 컨텍스트 생성
const UserContext = createContext<UserContextType>(defaultContextValue);

// 컨텍스트 제공자 Props
interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultContextValue.preferences);

  // 초기 로딩 시 사용자 식별 및 설정 로드
  useEffect(() => {
    const initUser = async () => {
      try {
        // 사용자 식별
        const identityResponse = await identifyUser();
        setUserId(identityResponse.user_id);
        setIsNewUser(identityResponse.is_new);

        // 사용자 설정 로드
        const userPreferences = await getUserPreferences();
        setPreferences(prev => ({ ...prev, ...userPreferences }));
      } catch (error) {
        console.error('사용자 초기화 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initUser();
  }, []);

  // 설정 업데이트 함수
  const updatePreferences = async (newPreferences: UserPreferences) => {
    try {
      const updatedPreferences = await updateUserPreferences(newPreferences);
      setPreferences(prev => ({ ...prev, ...updatedPreferences }));
    } catch (error) {
      console.error('설정 업데이트 오류:', error);
    }
  };

  // 세션 초기화 함수
  const resetSession = async () => {
    try {
      await clearUserSession();
      // 새 사용자 식별
      const identityResponse = await identifyUser();
      setUserId(identityResponse.user_id);
      setIsNewUser(true);
      // 기본 설정으로 초기화
      setPreferences(defaultContextValue.preferences);
    } catch (error) {
      console.error('세션 초기화 오류:', error);
    }
  };

  const value = {
    userId,
    isNewUser,
    isLoading,
    preferences,
    updatePreferences,
    resetSession,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// 사용자 컨텍스트 훅
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 