'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserPreferences, updateUserPreferences, clearUserSession, UserPreferences, UserSession, UserRole } from '@/lib/user-identity';

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
        console.log('사용자 초기화 시작...');
        
        // 먼저 localStorage에서 기존 사용자 정보 확인
        const existingUser = UserSession.getUser();
        if (existingUser && existingUser.id) {
          console.log('기존 사용자 세션 발견:', existingUser.id);
          setUserId(existingUser.id);
          setIsNewUser(false);
          
          // 기존 설정 로드
          const userPreferences = getUserPreferences();
          if (userPreferences) {
            setPreferences((prev: UserPreferences) => ({ ...prev, ...userPreferences }));
          }
          
          setIsLoading(false);
          return;
        }
        
        // 기존 세션이 없으면 API를 통한 사용자 식별
        const response = await fetch('/api/user/identify', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-cache'
        });

        if (!response.ok) {
          throw new Error(`사용자 식별 실패: ${response.status}`);
        }

        const identityResponse = await response.json();
        console.log('사용자 식별 성공:', identityResponse);
        
        // 유효한 응답인지 확인
        const userId = identityResponse.id || identityResponse.user_id;
        if (!userId) {
          throw new Error('유효하지 않은 사용자 ID');
        }
        
        setUserId(userId);
        setIsNewUser(identityResponse.is_new || false);

        // User 객체 생성하여 localStorage에 저장
        const userObject = {
          id: userId,
          email: identityResponse.email || '',
          name: identityResponse.name || 'Guest User',
          role: (identityResponse.role || 'guest') as UserRole,
          createdAt: new Date(identityResponse.createdAt || new Date().toISOString()),
          updatedAt: new Date(identityResponse.updatedAt || new Date().toISOString())
        };
        
        // 안전하게 사용자 세션 저장
        UserSession.setUser(userObject);

        // 사용자 설정 로드
        const userPreferences = getUserPreferences();
        if (userPreferences) {
          setPreferences((prev: UserPreferences) => ({ ...prev, ...userPreferences }));
        }
        
        console.log('사용자 초기화 완료:', { 
          userId, 
          isNew: identityResponse.is_new 
        });
      } catch (error) {
        console.error('사용자 초기화 오류:', error);
        // 오류 시 localStorage 정리
        UserSession.clearUser();
      } finally {
        setIsLoading(false);
      }
    };

    initUser();
  }, []);

  // 설정 업데이트 함수
  const updatePreferences = async (newPreferences: UserPreferences) => {
    try {
      updateUserPreferences(newPreferences);
      setPreferences((prev: UserPreferences) => ({ ...prev, ...newPreferences }));
    } catch (error) {
      console.error('설정 업데이트 오류:', error);
    }
  };

  // 세션 초기화 함수
  const resetSession = async () => {
    try {
      clearUserSession();
      
      // 새 사용자 식별
      const response = await fetch('/api/user/identify', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache'
      });

      if (response.ok) {
        const identityResponse = await response.json();
        const userId = identityResponse.id || identityResponse.user_id;
        
        if (userId) {
          setUserId(userId);
          setIsNewUser(true);
          
          // 새로운 User 객체 생성하여 저장
          const userObject = {
            id: userId,
            email: '',
            name: 'Guest User',
            role: 'guest' as UserRole,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          UserSession.setUser(userObject);
        }
      }
      
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