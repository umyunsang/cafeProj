'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import cookieManager from '@/lib/cookies';

// 쿠키 이름 상수
const USER_ID_COOKIE = 'cafe_user_id';
const SESSION_ID_COOKIE = 'cafe_session_id';

// 랜덤 ID 생성 함수
function generateRandomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

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
  /** 세션 ID */
  sessionId: string | null;
  /** 사용자 설정 */
  preferences: UserPreferences;
  /** 사용자가 이전에 방문한 적이 있는지 여부 */
  isReturningUser: boolean;
  /** 사용자 설정 업데이트 함수 */
  updatePreferences: (newPreferences: Partial<UserPreferences>) => void;
  /** 사용자 식별자 재설정 함수 */
  resetUser: () => void;
  /** 세션 ID 재생성 함수 */
  regenerateSession: () => void;
}

// 컨텍스트 기본값
const defaultContext: UserContextType = {
  anonymousId: null,
  sessionId: null,
  preferences: {},
  isReturningUser: false,
  updatePreferences: () => {},
  resetUser: () => {},
  regenerateSession: () => {},
};

// 사용자 컨텍스트 생성
const UserContext = createContext<UserContextType>(defaultContext);

// 사용자 컨텍스트 제공자 컴포넌트
export function UserProvider({ children }: { children: ReactNode }) {
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [isReturningUser, setIsReturningUser] = useState(false);

  // 사용자 ID 생성 또는 가져오기
  const ensureUserId = (): string => {
    let userId = cookieManager.get(USER_ID_COOKIE);
    
    if (!userId) {
      userId = generateRandomId();
      cookieManager.set(USER_ID_COOKIE, userId, { expires: 365 }); // 1년
      console.log('새 사용자 ID 생성:', userId);
    }
    
    return userId;
  };

  // 세션 ID 생성 또는 가져오기
  const ensureSessionId = (): string => {
    let sessionId = cookieManager.get(SESSION_ID_COOKIE);
    
    if (!sessionId) {
      sessionId = generateRandomId();
      cookieManager.set(SESSION_ID_COOKIE, sessionId, { maxAge: 24 * 60 * 60 }); // 24시간
      console.log('새 세션 ID 생성:', sessionId);
    }
    
    return sessionId;
  };

  // 세션 ID 재생성
  const regenerateSession = () => {
    const newSessionId = generateRandomId();
    cookieManager.set(SESSION_ID_COOKIE, newSessionId, { maxAge: 24 * 60 * 60 });
    setSessionId(newSessionId);
    console.log('세션 ID 재생성:', newSessionId);
  };

  // 컴포넌트 마운트 시 사용자 정보 초기화
  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return;

    try {
      // 사용자 ID 확보
      const userId = ensureUserId();
      setAnonymousId(userId);
      
      // 세션 ID 확보 (강제로 생성 보장)
      let sessionId = ensureSessionId();
      
      // 추가 검증: 세션 ID가 여전히 없다면 강제 생성
      if (!sessionId) {
        sessionId = generateRandomId();
        cookieManager.set(SESSION_ID_COOKIE, sessionId, { maxAge: 24 * 60 * 60 });
        console.log('강제 세션 ID 생성 (fallback):', sessionId);
      }
      
      setSessionId(sessionId);

      // 사용자 설정 가져오기
      const savedPreferences = cookieManager.getJson<UserPreferences>('user_preferences') || {};
      setPreferences(savedPreferences);

      // 방문 기록 확인
      const visitHistory = cookieManager.getJson<string[]>('cafe_visits') || [];
      
      if (visitHistory.length > 0) {
        setIsReturningUser(true);
      } else {
        // 첫 방문 기록
        const currentVisit = new Date().toISOString();
        cookieManager.setJson('cafe_visits', [currentVisit]);
      }

      console.log('사용자 정보 초기화 완료:', { userId, sessionId });
      console.log('UserContext 세션 ID 설정됨:', sessionId);
    } catch (error) {
      console.error('사용자 정보 로드 오류:', error);
      // 오류 발생 시 강제로 재생성
      const emergencySessionId = generateRandomId();
      setSessionId(emergencySessionId);
      cookieManager.set(SESSION_ID_COOKIE, emergencySessionId, { maxAge: 24 * 60 * 60 });
      console.log('오류 복구용 세션 ID 생성:', emergencySessionId);
    }
  }, []);

  // 사용자 설정 업데이트
  const updatePreferences = (newPreferences: Partial<UserPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPreferences };
      cookieManager.setJson('user_preferences', updated);
      return updated;
    });
  };

  // 사용자 식별자 재설정
  const resetUser = () => {
    try {
      // 기존 쿠키 제거
      cookieManager.delete(USER_ID_COOKIE);
      cookieManager.delete(SESSION_ID_COOKIE);
      cookieManager.delete('user_preferences');
      cookieManager.delete('cafe_visits');
      
      // 새 ID들 생성
      const newUserId = ensureUserId();
      const newSessionId = ensureSessionId();
      
      setAnonymousId(newUserId);
      setSessionId(newSessionId);
      
      // 설정 초기화
      setPreferences({});
      
      // 새 방문 기록 생성
      const currentVisit = new Date().toISOString();
      cookieManager.setJson('cafe_visits', [currentVisit]);
      
      setIsReturningUser(false);
      
      console.log('사용자 정보 재설정 완료:', { newUserId, newSessionId });
    } catch (error) {
      console.error('사용자 재설정 오류:', error);
    }
  };

  const value = {
    anonymousId,
    sessionId,
    preferences,
    isReturningUser,
    updatePreferences,
    resetUser,
    regenerateSession
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