// API 기본 URL (Next.js rewrites를 사용하므로 빈 문자열로 설정)
const API_BASE_URL = '';

interface ApiClientOptions extends RequestInit {
  includeSessionId?: boolean;
  sessionId?: string | null; // 직접 세션 ID를 전달할 경우
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch (e) {
      console.error('API response error (not JSON):', errorText);
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }

    console.error('API response error:', errorData);
    // 백엔드에서 detail 필드에 상세 에러 메시지를 담아 보내는 경우가 많음
    const message = errorData?.detail || errorData?.message || `HTTP error! status: ${response.status}`;
    
    // 백엔드에서 detail이 배열로 오는 경우 처리 (FastAPI)
    if (Array.isArray(errorData?.detail)) {
        const formattedDetail = errorData.detail
            .map((err: any) => `${err.loc?.join('.') || 'field'} : ${err.msg}`)
            .join('; ');
        throw new Error(formattedDetail);
    }
    
    throw new Error(message);
  }
  // 응답 본문이 없는 경우 (예: 204 No Content)
  if (response.status === 204) {
    return {} as T; // 빈 객체 반환 또는 상황에 맞게 조정
  }
  return response.json() as Promise<T>;
}

async function request<T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
  const { includeSessionId = false, sessionId: directSessionId, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(fetchOptions.headers || {});
  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (includeSessionId) {
    // 직접 전달된 세션 ID 또는 localStorage에서 가져온 세션 ID 사용
    // 이 부분은 프로젝트의 세션 관리 방식에 따라 수정 필요
    const currentSessionId = directSessionId || localStorage.getItem('cafe_session_id'); 
    if (currentSessionId) {
      headers.set('X-Session-ID', currentSessionId);
    }
  }
  
  const config: RequestInit = {
    ...fetchOptions,
    headers,
    credentials: 'include', // 쿠키 기반 세션 사용 시 필요
  };

  if (fetchOptions.body && typeof fetchOptions.body !== 'string' && !(fetchOptions.body instanceof FormData)) {
    config.body = JSON.stringify(fetchOptions.body);
  }

  return fetch(url, config).then(response => handleResponse<T>(response));
}

export const apiClient = {
  get: <T>(endpoint: string, options: ApiClientOptions = {}) => 
    request<T>(endpoint, { ...options, method: 'GET' }),
  
  post: <T, U>(endpoint: string, body: U, options: ApiClientOptions = {}) => 
    request<T>(endpoint, { ...options, method: 'POST', body: body as any }),
  
  put: <T, U>(endpoint: string, body: U, options: ApiClientOptions = {}) => 
    request<T>(endpoint, { ...options, method: 'PUT', body: body as any }),

  delete: <T>(endpoint: string, options: ApiClientOptions = {}) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
  
  // 필요한 경우 PATCH, HEAD 등의 메소드 추가
};

// 사용 예시:
// apiClient.get<User[]>('/api/users');
// apiClient.post<AuthResponse, LoginPayload>('/api/auth/login', { username, password });
// apiClient.get<Cart>('/api/cart', { includeSessionId: true }); 