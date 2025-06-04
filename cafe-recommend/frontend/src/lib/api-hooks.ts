/**
 * API 요청을 위한 React 훅 모듈
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient, { ApiError } from './api-client';

// 데이터 가져오기 상태
interface FetchState<T> {
  /** 로딩 상태 */
  loading: boolean;
  /** 응답 데이터 */
  data: T | null;
  /** 에러 */
  error: Error | null;
  /** 데이터 다시 가져오기 함수 */
  refetch: () => Promise<void>;
}

// API 요청 훅 옵션
interface UseApiOptions<T> {
  /** 초기 데이터 */
  initialData?: T | null;
  /** 컴포넌트 마운트 시 자동으로 데이터 가져올지 여부 */
  autoFetch?: boolean;
  /** 캐시 사용 여부 */
  useCache?: boolean;
  /** 캐시 유효 시간 (밀리초) */
  cacheTTL?: number;
  /** 의존성 배열 */
  deps?: any[];
}

/**
 * GET 요청을 위한 훅
 */
export function useApiGet<T>(
  endpoint: string, 
  options: UseApiOptions<T> = {}
): FetchState<T> {
  const { 
    initialData = null,
    autoFetch = true,
    useCache = true,
    cacheTTL,
    deps = []
  } = options;
  
  const [state, setState] = useState<FetchState<T>>({
    loading: autoFetch,
    data: initialData,
    error: null,
    refetch: async () => {}
  });
  
  const fetchData = useCallback(async (forceRefresh = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await apiClient.get<T>(endpoint, { 
        useCache, 
        cacheTTL,
        forceRefresh
      });
      setState(prev => ({ ...prev, loading: false, data, error: null }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error : new Error('알 수 없는 오류가 발생했습니다.')
      }));
    }
  }, [endpoint, useCache, cacheTTL]);
  
  // refetch 함수 설정
  useEffect(() => {
    setState(prev => ({ 
      ...prev, 
      refetch: async () => fetchData(true)
    }));
  }, [fetchData]);
  
  // 컴포넌트 마운트 시 또는 의존성이 변경될 때 데이터 가져오기
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData, ...deps]);
  
  return state;
}

/**
 * POST 요청을 위한 훅
 */
export function useApiPost<ResponseType, RequestType = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<ResponseType | null>(null);
  
  const execute = useCallback(async (
    endpoint: string, 
    requestData?: RequestType
  ): Promise<ResponseType | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const responseData = await apiClient.post<ResponseType, RequestType>(
        endpoint, 
        { data: requestData }
      );
      setData(responseData);
      setLoading(false);
      return responseData;
    } catch (error) {
      const apiError = error instanceof Error ? error : new Error('알 수 없는 오류가 발생했습니다.');
      setError(apiError);
      setLoading(false);
      return null;
    }
  }, []);
  
  return { execute, loading, error, data };
}

/**
 * PUT 요청을 위한 훅
 */
export function useApiPut<ResponseType, RequestType = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<ResponseType | null>(null);
  
  const execute = useCallback(async (
    endpoint: string, 
    requestData?: RequestType
  ): Promise<ResponseType | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const responseData = await apiClient.put<ResponseType, RequestType>(
        endpoint, 
        { data: requestData }
      );
      setData(responseData);
      setLoading(false);
      return responseData;
    } catch (error) {
      const apiError = error instanceof Error ? error : new Error('알 수 없는 오류가 발생했습니다.');
      setError(apiError);
      setLoading(false);
      return null;
    }
  }, []);
  
  return { execute, loading, error, data };
}

/**
 * PATCH 요청을 위한 훅
 */
export function useApiPatch<ResponseType, RequestType = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<ResponseType | null>(null);
  
  const execute = useCallback(async (
    endpoint: string, 
    requestData?: RequestType
  ): Promise<ResponseType | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const responseData = await apiClient.patch<ResponseType, RequestType>(
        endpoint, 
        { data: requestData }
      );
      setData(responseData);
      setLoading(false);
      return responseData;
    } catch (error) {
      const apiError = error instanceof Error ? error : new Error('알 수 없는 오류가 발생했습니다.');
      setError(apiError);
      setLoading(false);
      return null;
    }
  }, []);
  
  return { execute, loading, error, data };
}

/**
 * DELETE 요청을 위한 훅
 */
export function useApiDelete<ResponseType>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<ResponseType | null>(null);
  
  const execute = useCallback(async (
    endpoint: string
  ): Promise<ResponseType | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const responseData = await apiClient.delete<ResponseType>(endpoint);
      setData(responseData);
      setLoading(false);
      return responseData;
    } catch (error) {
      const apiError = error instanceof Error ? error : new Error('알 수 없는 오류가 발생했습니다.');
      setError(apiError);
      setLoading(false);
      return null;
    }
  }, []);
  
  return { execute, loading, error, data };
}

// 주문 상태 인터페이스
interface OrderStatus {
  order_id: number;
  status: string;
  description: string;
  updated_at: string;
}

/**
 * 주문 상태를 실시간으로 업데이트하는 훅
 * @param orderId 주문 ID
 * @param pollingInterval 갱신 주기 (밀리초, 기본값 3000ms)
 */
export function useOrderStatus(orderId: number | null, pollingInterval = 3000) {
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!orderId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<OrderStatus>(`/orders/${orderId}/status`, {
        useCache: false // 실시간 데이터를 위해 캐시 사용 안 함
      });
      setStatus(response);
    } catch (error) {
      setError(error instanceof Error ? error : new Error('주문 상태를 불러올 수 없습니다.'));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // 컴포넌트 마운트 시 첫 번째 요청 및 폴링 설정
  useEffect(() => {
    if (!orderId) return;

    // 초기 요청
    fetchStatus();

    // 폴링 설정
    intervalRef.current = setInterval(fetchStatus, pollingInterval);

    // 컴포넌트 언마운트 시 폴링 중지
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [orderId, pollingInterval, fetchStatus]);

  // 주문 상태 수동 갱신 함수
  const refetch = useCallback(() => {
    return fetchStatus();
  }, [fetchStatus]);

  return { status, loading, error, refetch };
} 