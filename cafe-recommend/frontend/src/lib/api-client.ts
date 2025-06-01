// API 기본 설정
const getApiBaseUrl = () => {
  // 클라이언트 사이드에서는 현재 도메인 사용
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // 서버 사이드에서는 환경변수 사용 (안전한 접근)
  return 'http://localhost:8000'; // 기본값 사용
};

export const API_BASE_URL = getApiBaseUrl();

// API 클라이언트 클래스
interface ApiClientOptions {
  headers?: Record<string, string>;
  useCache?: boolean;
  sessionId?: string;
  includeSessionId?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit & ApiClientOptions = {}
  ): Promise<T> {
    const { 
      headers = {}, 
      useCache = false, 
      sessionId, 
      includeSessionId = false, 
      ...fetchOptions 
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(sessionId || includeSessionId ? { 'X-Session-ID': sessionId || '' } : {}),
      },
      ...fetchOptions,
    };

    // Cache control
    if (useCache === false) {
      config.cache = 'no-cache';
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get<T = any>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any, D = any>(
    endpoint: string, 
    data?: D, 
    options: ApiClientOptions = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any, D = any>(
    endpoint: string, 
    data?: D, 
    options: ApiClientOptions = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, options: ApiClientOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// 기본 인스턴스 생성
const apiClient = new ApiClient();

// 호환성을 위한 기존 함수들
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

export async function apiGet<T = any>(endpoint: string): Promise<T> {
  return apiClient.get<T>(endpoint);
}

export async function apiPost<T = any>(
  endpoint: string, 
  data?: any
): Promise<T> {
  return apiClient.post<T>(endpoint, data);
}

export async function apiPut<T = any>(
  endpoint: string, 
  data?: any
): Promise<T> {
  return apiClient.put<T>(endpoint, data);
}

export async function apiDelete<T = any>(endpoint: string): Promise<T> {
  return apiClient.delete<T>(endpoint);
}

// 특정 API 엔드포인트들
export const api = {
  // 재료 관련 API
  ingredients: {
    getAll: () => apiGet('/api/admin/ingredients'),
    getById: (id: string) => apiGet(`/api/admin/ingredients/${id}`),
    create: (data: any) => apiPost('/api/admin/ingredients', data),
    update: (id: string, data: any) => apiPut(`/api/admin/ingredients/${id}`, data),
    delete: (id: string) => apiDelete(`/api/admin/ingredients/${id}`),
    restock: (id: string, data: any) => apiPost(`/api/admin/ingredients/${id}/restock`, data),
  },
  
  // 메뉴 관련 API
  menu: {
    getAll: () => apiGet('/api/menus'),
    getById: (id: string) => apiGet(`/api/menu/${id}`),
    create: (data: any) => apiPost('/api/admin/menus', data),
    update: (id: string, data: any) => apiPut(`/api/admin/menus/${id}`, data),
    delete: (id: string) => apiDelete(`/api/admin/menus/${id}`),
  },
  
  // 주문 관련 API
  orders: {
    getAll: () => apiGet('/api/admin/orders'),
    getById: (id: string) => apiGet(`/api/admin/orders/${id}`),
    create: (data: any) => apiPost('/api/order', data),
    update: (id: string, data: any) => apiPut(`/api/admin/orders/${id}`, data),
  },
  
  // AI 추천 API
  recommendations: {
    get: (preferences?: any) => apiPost('/api/chat/recommend', preferences),
  },
};

// 다양한 export 방식으로 호환성 제공
export { apiClient };
export { ApiClient };
export default apiClient; 