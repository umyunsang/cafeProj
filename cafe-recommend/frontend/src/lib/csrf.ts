/**
 * CSRF 토큰 관리 모듈
 * 백엔드와의 통신 시 CSRF 보호를 위한 유틸리티 함수들을 제공합니다.
 */

// CSRF 토큰을 저장하는 변수
let csrfToken: string | null = null;

/**
 * 서버에서 새 CSRF 토큰을 가져옵니다.
 * @returns Promise<string> - CSRF 토큰
 */
export const fetchCsrfToken = async (): Promise<string> => {
  try {
    // 쿠키에서 CSRF 토큰을 먼저 확인
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('X-CSRF-TOKEN='));
    
    if (cookie) {
      const token = cookie.split('=')[1];
      if (token) {
        csrfToken = token;
        return token;
      }
    }
    
    // 쿠키에 토큰이 없으면 서버에 요청
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include', // 쿠키 포함
    });
    
    if (!response.ok) {
      throw new Error('CSRF 토큰을 가져오는데 실패했습니다.');
    }
    
    const data = await response.json();
    csrfToken = data.csrf_token;
    return data.csrf_token;
    
  } catch (error) {
    console.error('CSRF 토큰 요청 오류:', error);
    throw error;
  }
};

/**
 * 현재 저장된 CSRF 토큰을 반환합니다.
 * 토큰이 없으면 서버에서 새로 가져옵니다.
 * @returns Promise<string> - CSRF 토큰
 */
export const getCSRFToken = async (): Promise<string> => {
  if (csrfToken) {
    return csrfToken;
  }
  
  return await fetchCsrfToken();
};

/**
 * CSRF 토큰이 포함된 헤더를 반환합니다.
 * @returns Promise<HeadersInit> - CSRF 토큰이 포함된 헤더 객체
 */
export const getCsrfHeaders = async (): Promise<HeadersInit> => {
  const token = await getCSRFToken();
  return {
    'X-CSRF-TOKEN': token,
    'Content-Type': 'application/json',
  };
};

/**
 * CSRF 보호가 적용된 fetch 함수
 * @param url - 요청할 URL
 * @param options - fetch 옵션
 * @returns Promise<Response> - fetch 응답
 */
export const fetchWithCSRF = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  // GET 요청이 아닌 경우에만 CSRF 토큰 추가
  if (options.method && options.method !== 'GET') {
    const token = await getCSRFToken();
    
    // 헤더 설정
    options.headers = {
      ...options.headers,
      'X-CSRF-TOKEN': token,
    };
    
    // JSON 요청인 경우 본문에도 토큰 추가
    if (options.headers && 
        (options.headers as Record<string, string>)['Content-Type'] === 'application/json' && 
        options.body) {
      try {
        // JSON 문자열을 객체로 변환
        const bodyObj = JSON.parse(options.body as string);
        // CSRF 토큰 추가
        const newBodyObj = { ...bodyObj, csrf_token: token };
        // 업데이트된 객체를 다시 JSON 문자열로 변환
        options.body = JSON.stringify(newBodyObj);
      } catch (e) {
        // 이미 객체이거나 JSON이 아닌 경우 무시
      }
    }
  }
  
  return fetch(url, {
    ...options,
    credentials: 'include', // 항상 쿠키 포함
  });
};

// 애플리케이션 시작 시 미리 CSRF 토큰 로드
if (typeof window !== 'undefined') {
  // 클라이언트 사이드에서만 실행
  fetchCsrfToken().catch(console.error);
}

/**
 * API 요청을 위한 함수들
 */
export const api = {
  get: async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetchWithCSRF(url, {
      ...options,
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }
    
    return response.json();
  },
  
  post: async <T>(url: string, data: any, options: RequestInit = {}): Promise<T> => {
    const response = await fetchWithCSRF(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }
    
    return response.json();
  },
  
  put: async <T>(url: string, data: any, options: RequestInit = {}): Promise<T> => {
    const response = await fetchWithCSRF(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }
    
    return response.json();
  },
  
  delete: async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetchWithCSRF(url, {
      ...options,
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }
    
    return response.json();
  },
}; 