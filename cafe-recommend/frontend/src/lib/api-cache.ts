/**
 * API 요청 캐싱 관리를 위한 유틸리티 모듈
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  /** 캐시 유효 시간 (밀리초) */
  ttl?: number;
  /** 강제로 새로운 데이터를 가져올지 여부 */
  forceRefresh?: boolean;
}

class APICache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 기본값: 5분

  /**
   * API 요청을 캐싱하고 결과를 반환
   */
  async fetch<T>(url: string, options: RequestInit = {}, cacheOptions: CacheOptions = {}): Promise<T> {
    const cacheKey = this.generateCacheKey(url, options);
    const { ttl = this.defaultTTL, forceRefresh = false } = cacheOptions;
    
    // 캐시가 유효하면 캐시된 데이터 반환
    if (!forceRefresh && this.isValidCacheItem(cacheKey)) {
      const cachedItem = this.cache.get(cacheKey)!;
      return cachedItem.data as T;
    }
    
    // 새로운 데이터 가져오기
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 캐시에 데이터 저장
    const now = Date.now();
    this.cache.set(cacheKey, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
    
    return data as T;
  }

  /**
   * 특정 URL에 대한 캐시 항목 무효화
   */
  invalidate(url: string, options: RequestInit = {}): void {
    const cacheKey = this.generateCacheKey(url, options);
    this.cache.delete(cacheKey);
  }

  /**
   * 모든 캐시 항목 초기화
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 만료된 캐시 항목 정리
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 캐시 키 생성
   */
  private generateCacheKey(url: string, options: RequestInit): string {
    // GET 요청 이외의 메서드는 body 포함하여 캐시 키 생성
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * 캐시 항목이 유효한지 확인
   */
  private isValidCacheItem(cacheKey: string): boolean {
    const item = this.cache.get(cacheKey);
    if (!item) return false;
    
    return item.expiresAt > Date.now();
  }
}

// 싱글톤 인스턴스 생성
const apiCache = new APICache();

export default apiCache; 