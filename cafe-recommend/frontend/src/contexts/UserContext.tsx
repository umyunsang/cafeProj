'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import cookieManager from '@/lib/cookies';

// 사용자 정보 인터페이스
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  notificationsEnabled?: boolean;
  favoriteCategories?: string[];
  lastOrderType?: 'pickup' | 'delivery';
}

// 사용자 컨텍스트 인터페이스
interface UserContextType {
  /** 익명 사용자 ID */
  anonymousId: string | null;
  /** 사용자 설정 */
  preferences: UserPreferences;
  /** 사용자가 이전에 방문한 적이 있는지 여부 */
  isReturningUser: boolean;
  /** 사용자 설정 업데이트 함수 */
  updatePreferences: (newPreferences: Partial<UserPreferences>) => void;
  /** 사용자 식별자 재설정 함수 */
  resetUser: () => void;
}

// 컨텍스트 기본값
const defaultContext: UserContextType = {
  anonymousId: null,
  preferences: {},
  isReturningUser: false,
  updatePreferences: () => {},
  resetUser: () => {},
};

// 사용자 컨텍스트 생성
const UserContext = createContext<UserContextType>(defaultContext);

// 사용자 컨텍스트 제공자 컴포넌트
export function UserProvider({ children }: { children: ReactNode }) {
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [isReturningUser, setIsReturningUser] = useState(false);

  // 컴포넌트 마운트 시 쿠키에서 사용자 정보 로드
  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return;

    try {
      // 사용자 ID 가져오기 (없으면 새로 생성)
      const userId = cookieManager.getUserId();
      setAnonymousId(userId);
      
      // 쿠키에도 반드시 저장되도록 함
      if (userId) {
        cookieManager.set(USER_ID_COOKIE, userId, { expires: 365 }); // 1년
      }

      // 사용자 설정 가져오기
      const savedPreferences = cookieManager.getUserPreferences<UserPreferences>() || {};
      setPreferences(savedPreferences);

      // 방문 기록 확인
      const visitHistory = cookieManager.get<string[]>('cafe_visits', []);
      
      if (visitHistory && visitHistory.length > 0) {
        setIsReturningUser(true);
      } else {
        // 첫 방문 기록
        const currentVisit = new Date().toISOString();
        cookieManager.set('cafe_visits', [currentVisit]);
      }
    } catch (error) {
      console.error('사용자 정보 로드 오류:', error);
    }
  }, []);

  // 사용자 설정 업데이트
  const updatePreferences = (newPreferences: Partial<UserPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPreferences };
      cookieManager.setUserPreferences(updated);
      return updated;
    });
  };

  // 사용자 식별자 재설정
  const resetUser = () => {
    // 기존 쿠키 제거
    cookieManager.clearAll();
    
    // 새 ID 생성
    const newId = cookieManager.getUserId();
    setAnonymousId(newId);
    
    // 설정 초기화
    setPreferences({});
    
    // 새 방문 기록 생성
    const currentVisit = new Date().toISOString();
    cookieManager.set('cafe_visits', [currentVisit]);
    
    setIsReturningUser(false);
  };

  const value = {
    anonymousId,
    preferences,
    isReturningUser,
    updatePreferences,
    resetUser
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// 사용자 컨텍스트 훅
export function useUser() {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
} 