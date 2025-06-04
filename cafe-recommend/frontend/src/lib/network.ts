/**
 * 네트워크 관련 유틸리티 모듈
 */

type NetworkStateListener = (online: boolean) => void;

/**
 * 네트워크 상태 관리자 클래스
 */
class NetworkManager {
  private listeners: NetworkStateListener[] = [];
  private isOnline: boolean = true;

  constructor() {
    // 브라우저 환경에서만 실행
    if (typeof window !== 'undefined') {
      // 초기 네트워크 상태 설정
      this.isOnline = navigator.onLine;

      // 네트워크 상태 변경 이벤트 리스너 등록
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  /**
   * 네트워크 연결 시 호출되는 핸들러
   */
  private handleOnline = () => {
    this.isOnline = true;
    this.notifyListeners();
  };

  /**
   * 네트워크 연결 끊김 시 호출되는 핸들러
   */
  private handleOffline = () => {
    this.isOnline = false;
    this.notifyListeners();
  };

  /**
   * 모든 리스너에게 상태 변경 알림
   */
  private notifyListeners() {
    this.listeners.forEach(listener => {
      listener(this.isOnline);
    });
  }

  /**
   * 네트워크 상태 리스너 등록
   */
  subscribe(listener: NetworkStateListener): () => void {
    this.listeners.push(listener);
    
    // 즉시 현재 상태 알림
    listener(this.isOnline);
    
    // 구독 취소 함수 반환
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 현재 온라인 상태 반환
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * 인스턴스 정리 (메모리 누수 방지)
   */
  cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.listeners = [];
  }
}

// 싱글톤 인스턴스 생성
const networkManager = new NetworkManager();

export default networkManager;

/**
 * 네트워크 요청 재시도 함수
 * @param fetchFn 실행할 fetch 함수
 * @param maxRetries 최대 재시도 횟수
 * @param delay 재시도 간 지연 시간 (밀리초)
 */
export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 오프라인 상태인 경우 에러 발생
      if (!networkManager.getIsOnline()) {
        throw new Error('네트워크 연결이 오프라인 상태입니다.');
      }
      
      return await fetchFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 마지막 시도가 아니라면 지연 후 재시도
      if (attempt < maxRetries - 1) {
        console.log(`네트워크 요청 실패, 재시도 ${attempt + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // 지수 백오프 - 재시도마다 대기 시간 증가
        delay *= 2;
      }
    }
  }
  
  // 모든 재시도 실패 시 마지막 에러 던지기
  throw lastError!;
}

/**
 * 네트워크 상태에 따라 자동으로 요청을 재시도하는 함수
 * 네트워크가 오프라인인 경우 온라인 상태가 될 때까지 대기한 후 요청
 */
export function fetchWhenOnline<T>(
  fetchFn: () => Promise<T>,
  options?: { timeout?: number; onOffline?: () => void }
): Promise<T> {
  const { timeout, onOffline } = options || {};
  
  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;
    
    // 타임아웃 설정
    if (timeout) {
      timeoutId = setTimeout(() => {
        if (unsubscribe) unsubscribe();
        reject(new Error('네트워크 요청 타임아웃'));
      }, timeout);
    }
    
    const attemptFetch = async () => {
      try {
        const result = await fetchFn();
        if (timeoutId) clearTimeout(timeoutId);
        if (unsubscribe) unsubscribe();
        resolve(result);
      } catch (error) {
        // 네트워크 오류가 지속되면 다시 대기
        if (!networkManager.getIsOnline()) {
          if (onOffline) onOffline();
        } else {
          // 온라인 상태이지만 다른 오류가 발생한 경우
          if (timeoutId) clearTimeout(timeoutId);
          if (unsubscribe) unsubscribe();
          reject(error);
        }
      }
    };
    
    // 네트워크 상태 변경 구독
    unsubscribe = networkManager.subscribe(online => {
      if (online) {
        attemptFetch();
      }
    });
    
    // 즉시 시도 (현재 온라인 상태인 경우)
    if (networkManager.getIsOnline()) {
      attemptFetch();
    } else if (onOffline) {
      onOffline();
    }
  });
} 