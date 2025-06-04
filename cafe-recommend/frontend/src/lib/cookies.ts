/**
 * 쿠키 관리 유틸리티
 */

import Cookies from 'js-cookie';
import { v4 as uuidv4 } from 'uuid';

// 쿠키 기본 옵션
interface CookieOptions {
  /** 쿠키 만료일 (일) */
  expires?: number;
  /** 쿠키 경로 */
  path?: string;
  /** 보안 쿠키 여부 */
  secure?: boolean;
  /** SameSite 설정 */
  sameSite?: 'strict' | 'lax' | 'none';
}

// 사용자 식별자 쿠키 이름
const USER_ID_COOKIE = 'cafe_user_id';
// 장바구니 쿠키 이름
const CART_COOKIE = 'cafe_cart';
// 주문 기록 쿠키 이름
const ORDER_HISTORY_COOKIE = 'cafe_order_history';
// 사용자 설정 쿠키 이름
const USER_PREFERENCES_COOKIE = 'cafe_user_preferences';

// 기본 쿠키 옵션
const defaultOptions: CookieOptions = {
  expires: 30, // 30일
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax'
};

/**
 * 쿠키 관리 클래스
 */
class CookieManager {
  private cookies: typeof Cookies;

  constructor() {
    this.cookies = Cookies;
  }

  /**
   * 쿠키 설정
   */
  set<T>(name: string, value: T, options?: CookieOptions): void {
    try {
      const stringValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : String(value);
        
      this.cookies.set(name, stringValue, options);
    } catch (error) {
      console.error('쿠키 설정 오류:', error);
    }
  }

  /**
   * 쿠키 가져오기
   */
  get<T>(name: string, defaultValue?: T): T | null | undefined {
    try {
      const value = this.cookies.get(name);
      
      if (!value) return defaultValue;
      
      try {
        // JSON 형태로 파싱 시도
        return JSON.parse(value) as T;
      } catch {
        // 일반 문자열인 경우
        return value as unknown as T;
      }
    } catch (error) {
      console.error('쿠키 가져오기 오류:', error);
      return defaultValue;
    }
  }

  /**
   * 쿠키 삭제
   */
  remove(name: string, options?: CookieOptions): void {
    try {
      this.cookies.remove(name, options);
    } catch (error) {
      console.error('쿠키 삭제 오류:', error);
    }
  }

  /**
   * 사용자 식별자 가져오기 (없으면 생성)
   */
  getUserId(): string {
    let userId = this.get<string>(USER_ID_COOKIE);
    
    if (!userId) {
      userId = uuidv4();
      this.set(USER_ID_COOKIE, userId, { expires: 365 }); // 1년
    }
    
    return userId;
  }

  /**
   * 장바구니 데이터 가져오기
   */
  getCart<T>(): T[] {
    return this.get<T[]>(CART_COOKIE, []) || [];
  }

  /**
   * 장바구니 데이터 저장
   */
  setCart<T>(cart: T[]): void {
    this.set(CART_COOKIE, cart);
  }

  /**
   * 주문 기록 가져오기
   */
  getOrderHistory<T>(): T[] {
    return this.get<T[]>(ORDER_HISTORY_COOKIE, []) || [];
  }

  /**
   * 주문 기록 저장
   */
  addOrderToHistory<T>(order: T): void {
    const history = this.getOrderHistory<T>();
    history.unshift(order); // 최신 주문을 앞에 추가
    
    // 최대 10개의 주문만 유지
    const limitedHistory = history.slice(0, 10);
    this.set(ORDER_HISTORY_COOKIE, limitedHistory, { expires: 90 }); // 3개월
  }

  /**
   * 사용자 설정 가져오기
   */
  getUserPreferences<T>(): T | null {
    return this.get<T>(USER_PREFERENCES_COOKIE, null);
  }

  /**
   * 사용자 설정 저장
   */
  setUserPreferences<T>(preferences: T): void {
    this.set(USER_PREFERENCES_COOKIE, preferences, { expires: 365 }); // 1년
  }

  /**
   * 특정 사용자 설정값 업데이트
   */
  updateUserPreference<T extends Record<string, any>>(key: keyof T, value: any): void {
    const preferences = this.getUserPreferences<T>() || {} as T;
    
    this.setUserPreferences({
      ...preferences,
      [key]: value
    });
  }

  /**
   * 모든 애플리케이션 쿠키 삭제
   */
  clearAll(): void {
    this.remove(USER_ID_COOKIE);
    this.remove(CART_COOKIE);
    this.remove(ORDER_HISTORY_COOKIE);
    this.remove(USER_PREFERENCES_COOKIE);
  }
}

// 싱글톤 인스턴스 생성
const cookieManager = new CookieManager();

export default cookieManager; 