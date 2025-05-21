'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/lib/api-client';
import { toast } from 'sonner';

interface ApiRequestOptions extends RequestInit {
  // 추가적인 공통 옵션이 있다면 여기에 정의
  params?: Record<string, string>; // URLSearchParams 용
}

interface ApiError {
  message: string;
  status?: number;
  details?: any; // 서버에서 내려주는 추가 에러 정보
}

// GET 요청을 위한 훅 (SWR이나 React Query의 useQuery와 유사한 단순화된 버전)
export function useApiQuery<T = any>(endpoint: string | null) { // endpoint가 null일 수 있도록 하여 조건부 fetching 지원
  const { token, logout } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchData = useCallback(async (currentEndpoint: string) => {
    if (!token) {
      // 토큰이 없으면 요청을 보내지 않거나, 에러 처리 (useAuth에서 이미 리디렉션 할 수 있음)
      // 여기서는 요청을 시도하지 않고, 호출하는 쪽에서 토큰 유무를 먼저 판단하도록 유도 가능
      // 또는 logout()을 호출하여 로그인 페이지로 보낼 수 있음
      // setError({ message: 'Authentication token is not available.' });
      // logout(); // logout을 여기서 호출하면 반복적인 리디렉션 발생 가능성. useAuth에서 처리하는 것을 신뢰.
      return; // 토큰 없으면 실행 중단
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}${currentEndpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (response.status === 401) {
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
        logout();
        throw new ApiErrorImpl('Unauthorized', response.status);
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiErrorImpl(errorData.detail || `Request failed with status ${response.status}`, response.status, errorData);
      }
      const result: T = await response.json();
      setData(result);
      return result;
    } catch (e: any) {
      if (e instanceof ApiErrorImpl) {
        setError(e);
      } else {
        setError(new ApiErrorImpl(e.message || 'An unexpected error occurred'));
      }
      return null; // 에러 발생 시 null 반환 또는 throw e;
    } finally {
      setIsLoading(false);
    }
  }, [token, logout]);

  // endpoint가 제공되면 자동으로 fetchData 호출 (useEffect 사용)
  // useEffect(() => {
  //   if (endpoint && token) { // endpoint와 token이 모두 유효할 때만 호출
  //     fetchData(endpoint);
  //   }
  // }, [endpoint, fetchData, token]); // token을 의존성에 추가

  // 수동으로 refetch 할 수 있는 함수도 제공
  const refetch = useCallback(() => {
    if (endpoint) {
      return fetchData(endpoint);
    }
    return Promise.resolve(null);
  }, [endpoint, fetchData]);

  return { data, isLoading, error, refetch, manualFetch: fetchData };
}

// POST, PUT, DELETE 등 데이터 변경을 위한 훅 (React Query의 useMutation과 유사한 단순화된 버전)
interface MutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: ApiError, variables: TVariables) => void;
  onSettled?: (data: TData | null, error: ApiError | null, variables: TVariables) => void;
}

class ApiErrorImpl implements ApiError {
  message: string;
  status?: number;
  details?: any;

  constructor(message: string, status?: number, details?: any) {
    this.message = message;
    this.status = status;
    this.details = details;
  }
}

export function useApiMutation<TData = any, TVariables = any>(
  method: 'POST' | 'PUT' | 'DELETE',
  endpointGenerator: (variables: TVariables) => string
) {
  const { token, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const mutate = useCallback(async (variables: TVariables, options?: MutationOptions<TData, TVariables>) => {
    if (!token) {
      const err = new ApiErrorImpl('Authentication token is not available.');
      setError(err);
      options?.onError?.(err, variables);
      options?.onSettled?.(null, err, variables);
      return null;
    }
    
    const endpoint = endpointGenerator(variables);
    setIsLoading(true);
    setError(null);
    setData(null);

    let headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };
    let body: BodyInit | undefined = undefined;

    if (variables instanceof FormData) {
      // Content-Type을 명시적으로 설정하지 않음 - 브라우저가 FormData에 맞게 자동으로 설정
      body = variables;
    } else if (method !== 'DELETE') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(variables);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body,
      });

      if (response.status === 401) {
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요.');
        logout();
        throw new ApiErrorImpl('Unauthorized', response.status);
      }
      
      let resultJson: TData | null = null;
      // DELETE 요청 등 일부 요청은 응답 본문이 없을 수 있음 (204 No Content)
      if (response.status !== 204) {
        const responseText = await response.text();
        if (responseText) {
            resultJson = JSON.parse(responseText) as TData;
        } 
      }

      if (!response.ok) {
        const errorData = resultJson || {}; // 이미 파싱된 JSON 사용하거나 빈 객체
        // @ts-ignore
        const errorMessage = errorData.detail || `Request failed with status ${response.status}`;
        throw new ApiErrorImpl(errorMessage, response.status, errorData);
      }
      
      setData(resultJson);
      options?.onSuccess?.(resultJson as TData, variables); // 204의 경우 resultJson이 null일 수 있음
      return resultJson;
    } catch (e: any) {
      const apiErr = e instanceof ApiErrorImpl ? e : new ApiErrorImpl(e.message || 'An unexpected error occurred');
      setError(apiErr);
      options?.onError?.(apiErr, variables);
      return null;
    } finally {
      setIsLoading(false);
      options?.onSettled?.(data, error, variables); // 이 시점의 data, error는 이전 상태일 수 있음. try/catch 블록 내에서 data를 사용해야 함.
    }
  }, [token, logout, method, endpointGenerator]); // data, error는 의존성에서 제외

  return { mutate, isLoading, error, data };
} 