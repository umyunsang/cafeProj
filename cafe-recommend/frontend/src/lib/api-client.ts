// API 기본 설정
const getApiBaseUrl = () => {
  // Next.js에서 NEXT_PUBLIC_* 환경변수는 빌드 시점에 번들에 포함됨
  const apiUrl = typeof window !== 'undefined' 
    ? window.location.origin // 클라이언트 사이드에서는 현재 도메인 사용
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  return apiUrl;
};

export const API_BASE_URL = getApiBaseUrl();

// API 요청을 위한 기본 함수
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

// GET 요청
export async function apiGet<T = any>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

// POST 요청
export async function apiPost<T = any>(
  endpoint: string, 
  data?: any
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

// PUT 요청
export async function apiPut<T = any>(
  endpoint: string, 
  data?: any
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

// DELETE 요청
export async function apiDelete<T = any>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

// 특정 API 엔드포인트들
export const api = {
  // 재료 관련 API
  ingredients: {
    getAll: () => apiGet('/api/ingredients'),
    getById: (id: string) => apiGet(`/api/ingredients/${id}`),
    create: (data: any) => apiPost('/api/ingredients', data),
    update: (id: string, data: any) => apiPut(`/api/ingredients/${id}`, data),
    delete: (id: string) => apiDelete(`/api/ingredients/${id}`),
    restock: (id: string, data: any) => apiPost(`/api/ingredients/${id}/restock`, data),
  },
  
  // 메뉴 관련 API
  menu: {
    getAll: () => apiGet('/api/menu'),
    getById: (id: string) => apiGet(`/api/menu/${id}`),
    create: (data: any) => apiPost('/api/menu', data),
    update: (id: string, data: any) => apiPut(`/api/menu/${id}`, data),
    delete: (id: string) => apiDelete(`/api/menu/${id}`),
  },
  
  // 주문 관련 API
  orders: {
    getAll: () => apiGet('/api/orders'),
    getById: (id: string) => apiGet(`/api/orders/${id}`),
    create: (data: any) => apiPost('/api/orders', data),
    update: (id: string, data: any) => apiPut(`/api/orders/${id}`, data),
  },
  
  // AI 추천 API
  recommendations: {
    get: (preferences?: any) => apiPost('/api/recommendations', preferences),
  },
};

export const apiClient = api;

export default api; 