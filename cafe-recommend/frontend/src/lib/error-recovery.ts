/**
 * 에러 복구 메커니즘 유틸리티 모듈
 */

import { toast } from 'sonner';
import networkManager from './network';

/**
 * 저장되지 않은 변경사항 타입
 */
interface PendingChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data?: any;
  timestamp: number;
  retryCount: number;
}

/**
 * 에러 복구 관리자 클래스
 */
class ErrorRecoveryManager {
  private pendingChanges: PendingChange[] = [];
  private isProcessing: boolean = false;
  private storageKey: string = 'cafe_pending_changes';
  private maxRetries: number = 3;
  private isNetworkConnected: boolean = true;
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // 브라우저 환경에서만 실행
    if (typeof window !== 'undefined') {
      // 저장된 변경사항 로드
      this.loadPendingChanges();
      
      // 네트워크 상태 변경 이벤트 리스너 등록
      networkManager.subscribe(this.handleNetworkChange);
      
      // 페이지 로드 시 자동 재시도
      window.addEventListener('load', this.processPendingChanges);
      
      // 페이지 언로드 시 저장
      window.addEventListener('beforeunload', this.savePendingChanges);
    }
  }

  /**
   * 네트워크 상태 변경 핸들러
   */
  private handleNetworkChange = (isOnline: boolean) => {
    this.isNetworkConnected = isOnline;
    
    if (isOnline && this.pendingChanges.length > 0) {
      // 네트워크 연결 복구 시 재시도
      this.processPendingChanges();
    }
  };

  /**
   * 로컬 스토리지에서 변경사항 로드
   */
  private loadPendingChanges = () => {
    try {
      const storedChanges = localStorage.getItem(this.storageKey);
      if (storedChanges) {
        this.pendingChanges = JSON.parse(storedChanges);
      }
    } catch (error) {
      console.error('저장된 변경사항 로드 오류:', error);
    }
  };

  /**
   * 로컬 스토리지에 변경사항 저장
   */
  private savePendingChanges = () => {
    try {
      if (this.pendingChanges.length > 0) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.pendingChanges));
      } else {
        localStorage.removeItem(this.storageKey);
      }
    } catch (error) {
      console.error('변경사항 저장 오류:', error);
    }
  };

  /**
   * 변경사항 추가
   */
  public addPendingChange(
    type: 'create' | 'update' | 'delete',
    endpoint: string,
    data?: any
  ): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const change: PendingChange = {
      id,
      type,
      endpoint,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    this.pendingChanges.push(change);
    this.savePendingChanges();
    
    // 네트워크 연결 상태이면 즉시 처리 시도
    if (this.isNetworkConnected && !this.isProcessing) {
      this.processPendingChanges();
    }
    
    return id;
  }

  /**
   * 변경사항 처리
   */
  private processPendingChanges = async () => {
    if (this.isProcessing || this.pendingChanges.length === 0 || !this.isNetworkConnected) {
      return;
    }
    
    this.isProcessing = true;
    let hasErrors = false;
    
    // 가장 오래된 변경사항부터 처리
    const sortedChanges = [...this.pendingChanges].sort((a, b) => a.timestamp - b.timestamp);
    
    for (const change of sortedChanges) {
      if (change.retryCount >= this.maxRetries) {
        // 최대 재시도 횟수 초과 시 다음으로 넘어감
        console.warn(`변경사항 ${change.id} 재시도 횟수 초과 (${this.maxRetries}회)`);
        continue;
      }
      
      try {
        await this.processChange(change);
        
        // 성공 시 목록에서 제거
        this.pendingChanges = this.pendingChanges.filter(c => c.id !== change.id);
        this.savePendingChanges();
      } catch (error) {
        console.error(`변경사항 ${change.id} 처리 오류:`, error);
        
        // 재시도 횟수 증가
        const updatedChange = this.pendingChanges.find(c => c.id === change.id);
        if (updatedChange) {
          updatedChange.retryCount++;
          this.savePendingChanges();
        }
        
        hasErrors = true;
        
        // 네트워크 오류인 경우 중단
        if (!this.isNetworkConnected) {
          break;
        }
      }
    }
    
    this.isProcessing = false;
    
    // 오류가 있거나 처리되지 않은 항목이 있으면 일정 시간 후 재시도
    if (hasErrors && this.pendingChanges.length > 0) {
      if (this.retryTimeoutId) {
        clearTimeout(this.retryTimeoutId);
      }
      
      this.retryTimeoutId = setTimeout(() => {
        this.processPendingChanges();
      }, 5000); // 5초 후 재시도
    }
  };

  /**
   * 개별 변경사항 처리
   */
  private async processChange(change: PendingChange): Promise<void> {
    const { type, endpoint, data } = change;
    
    const baseUrl = '/api';
    const url = `${baseUrl}${endpoint}`;
    
    let method: string;
    let body: string | undefined;
    
    switch (type) {
      case 'create':
        method = 'POST';
        body = data ? JSON.stringify(data) : undefined;
        break;
      case 'update':
        method = 'PUT';
        body = data ? JSON.stringify(data) : undefined;
        break;
      case 'delete':
        method = 'DELETE';
        break;
      default:
        throw new Error(`지원하지 않는 변경 유형: ${type}`);
    }
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 요청 실패 (${response.status}): ${errorText}`);
    }
  }

  /**
   * 모든 보류 중인 변경사항 삭제
   */
  public clearPendingChanges(): void {
    this.pendingChanges = [];
    this.savePendingChanges();
  }

  /**
   * 보류 중인 변경사항 상태 가져오기
   */
  public getPendingChangesStatus(): {
    hasPendingChanges: boolean;
    count: number;
    oldestTimestamp: number | null;
  } {
    return {
      hasPendingChanges: this.pendingChanges.length > 0,
      count: this.pendingChanges.length,
      oldestTimestamp: this.pendingChanges.length > 0
        ? Math.min(...this.pendingChanges.map(c => c.timestamp))
        : null,
    };
  }

  /**
   * 수동으로 보류 중인 변경사항 재시도
   */
  public retryPendingChanges(): void {
    this.processPendingChanges();
  }

  /**
   * 인스턴스 정리 (메모리 누수 방지)
   */
  public cleanup(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('load', this.processPendingChanges);
      window.removeEventListener('beforeunload', this.savePendingChanges);
    }
    
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }
}

// 싱글톤 인스턴스 생성
const errorRecovery = new ErrorRecoveryManager();

export default errorRecovery;

/**
 * API 요청을 안전하게 수행하고 실패 시 자동 복구를 시도하는 함수
 */
export async function safeApiCall<T>(
  type: 'create' | 'update' | 'delete',
  endpoint: string,
  data?: any,
  options?: {
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
    successMessage?: string;
    errorMessage?: string;
  }
): Promise<T | null> {
  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = '요청이 성공적으로 처리되었습니다',
    errorMessage = '요청 처리 중 오류가 발생했습니다'
  } = options || {};

  try {
    const baseUrl = '/api';
    const url = `${baseUrl}${endpoint}`;
    
    let method: string;
    
    switch (type) {
      case 'create':
        method = 'POST';
        break;
      case 'update':
        method = 'PUT';
        break;
      case 'delete':
        method = 'DELETE';
        break;
      default:
        throw new Error(`지원하지 않는 요청 유형: ${type}`);
    }
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: '알 수 없는 오류' }));
      throw new Error(errorData.message || errorData.detail || '요청 처리 실패');
    }
    
    if (showSuccessToast) {
      toast.success(successMessage);
    }
    
    // 성공 시 응답 데이터 반환
    return await response.json().catch(() => null) as T;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error(`API 호출 오류 (${endpoint}):`, error);
    
    if (showErrorToast) {
      toast.error(`${errorMessage}: ${errorMsg}`);
    }
    
    // 실패 시 복구 큐에 추가
    errorRecovery.addPendingChange(type, endpoint, data);
    
    return null;
  }
} 