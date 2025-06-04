/**
 * API 요청을 관리하는 클라이언트 모듈
 */

import apiCache from './api-cache';

// API 서버 기본 URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:15049/api';

// API 요청 기본 헤더
export const defaultHeaders = {
  'Content-Type': 'application/json',
};

// API 요청 타입
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// API 요청 옵션
interface ApiRequestOptions<T> {
  /** 요청 본문 데이터 */
  data?: T;
  /** 캐시 사용 여부 (기본값: true) */
  useCache?: boolean;
  /** 캐시 유효 시간 (밀리초) */
  cacheTTL?: number;
  /** 강제로 새로운 데이터를 가져올지 여부 */
  forceRefresh?: boolean;
  /** 헤더 */
  headers?: Record<string, string>;
}

// API 에러 클래스
export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * API 클라이언트
 */
class ApiClient {
  /**
   * HTTP GET 요청
   */
  async get<ResponseType, RequestType = any>(
    endpoint: string, 
    options: ApiRequestOptions<RequestType> = {}
  ): Promise<ResponseType> {
    return this.request<ResponseType, RequestType>('GET', endpoint, options);
  }
  
  /**
   * HTTP POST 요청
   */
  async post<ResponseType, RequestType = any>(
    endpoint: string, 
    options: ApiRequestOptions<RequestType> = {}
  ): Promise<ResponseType> {
    return this.request<ResponseType, RequestType>('POST', endpoint, options);
  }
  
  /**
   * HTTP PUT 요청
   */
  async put<ResponseType, RequestType = any>(
    endpoint: string, 
    options: ApiRequestOptions<RequestType> = {}
  ): Promise<ResponseType> {
    return this.request<ResponseType, RequestType>('PUT', endpoint, options);
  }
  
  /**
   * HTTP PATCH 요청
   */
  async patch<ResponseType, RequestType = any>(
    endpoint: string, 
    options: ApiRequestOptions<RequestType> = {}
  ): Promise<ResponseType> {
    return this.request<ResponseType, RequestType>('PATCH', endpoint, options);
  }
  
  /**
   * HTTP DELETE 요청
   */
  async delete<ResponseType, RequestType = any>(
    endpoint: string, 
    options: ApiRequestOptions<RequestType> = {}
  ): Promise<ResponseType> {
    return this.request<ResponseType, RequestType>('DELETE', endpoint, options);
  }
  
  /**
   * API 요청 처리
   */
  private async request<ResponseType, RequestType = any>(
    method: HttpMethod,
    endpoint: string,
    { data, useCache = true, cacheTTL, forceRefresh, headers = {} }: ApiRequestOptions<RequestType> = {}
  ): Promise<ResponseType> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const isGetRequest = method === 'GET';
    
    // 요청 옵션 구성
    const requestOptions: RequestInit = {
      method,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
      body: !isGetRequest && data ? JSON.stringify(data) : undefined,
    };
    
    try {
      // GET 요청이고 캐싱이 활성화된 경우 캐시 사용
      if (isGetRequest && useCache) {
        return await apiCache.fetch<ResponseType>(url, requestOptions, {
          ttl: cacheTTL,
          forceRefresh,
        });
      }
      
      // 캐싱을 사용하지 않는 경우 또는 GET이 아닌 요청인 경우
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new ApiError(
          `API 요청 실패: ${response.status} ${response.statusText}`,
          response.status
        );
      }
      
      // GET이 아닌 메서드에서 관련 캐시 무효화
      if (!isGetRequest && endpoint) {
        this.invalidateRelatedCache(endpoint);
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        `API 요청 처리 중 오류 발생: ${(error as Error).message}`,
        500
      );
    }
  }
  
  /**
   * 관련 캐시 무효화 (POST, PUT, PATCH, DELETE 요청 후)
   */
  private invalidateRelatedCache(endpoint: string): void {
    // 엔드포인트 경로 분석
    const parts = endpoint.split('/').filter(Boolean);
    
    // 첫 번째 부분을 리소스 타입으로 간주
    if (parts.length > 0) {
      const resourceType = parts[0];
      
      // 특정 리소스 타입과 관련된 모든 캐시 무효화
      // 예: '/menus/1'에 대한 PUT 요청은 '/menus' GET 요청의 캐시를 무효화해야 함
      apiCache.invalidate(`${API_BASE_URL}/${resourceType}`);
      
      // 리소스 컬렉션에 대한 GET 요청 캐시도 무효화
      if (parts.length > 1) {
        const resourceId = parts[1];
        apiCache.invalidate(`${API_BASE_URL}/${resourceType}/${resourceId}`);
      }
    }
  }
}

// 싱글톤 인스턴스 생성
const apiClient = new ApiClient();

export default apiClient; 