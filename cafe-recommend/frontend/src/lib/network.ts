// 네트워크 상태 및 유틸리티 함수들

/**
 * 네트워크 연결 상태 확인
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true
  return navigator.onLine
}

/**
 * 네트워크 상태 변경 감지
 */
export function onNetworkChange(callback: (isOnline: boolean) => void) {
  if (typeof window === 'undefined') return () => {}

  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // 초기 상태 확인
  callback(navigator.onLine)

  // cleanup 함수 반환
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

/**
 * 재시도 로직이 포함된 fetch 함수
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      // 성공하면 바로 반환
      if (response.ok) {
        return response
      }
      
      // 4xx 에러는 재시도하지 않음
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status} ${response.statusText}`)
      }
      
      // 5xx 에러는 재시도
      lastError = new Error(`Server error: ${response.status} ${response.statusText}`)
      
    } catch (error) {
      lastError = error as Error
      
      // 네트워크 오류가 아닌 경우 재시도하지 않음
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // 네트워크 오류이므로 재시도
      } else {
        throw error
      }
    }

    // 마지막 시도가 아니면 지연 후 재시도
    if (attempt < maxRetries) {
      await delay(delayMs * attempt) // 지수 백오프
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

/**
 * 지연 함수
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 타임아웃이 포함된 fetch 함수
 */
export function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      reject(new Error(`Request timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    fetch(url, {
      ...options,
      signal: controller.signal
    })
      .then(response => {
        clearTimeout(timeoutId)
        resolve(response)
      })
      .catch(error => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

/**
 * JSON 응답을 안전하게 파싱
 */
export async function safeJsonParse<T>(response: Response): Promise<T> {
  const text = await response.text()
  
  if (!text) {
    throw new Error('Empty response body')
  }

  try {
    return JSON.parse(text) as T
  } catch (error) {
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`)
  }
}

/**
 * API 에러 클래스
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string,
    public response?: Response
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    let message = `HTTP ${response.status}: ${response.statusText}`
    
    try {
      const errorBody = await response.json()
      if (errorBody.message) {
        message = errorBody.message
      } else if (errorBody.detail) {
        message = errorBody.detail
      }
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }

    return new ApiError(message, response.status, response.statusText, response)
  }
}

/**
 * 네트워크 요청 상태 타입
 */
export interface NetworkState {
  loading: boolean
  error: Error | null
  retryCount: number
}

/**
 * 네트워크 요청 상태를 관리하는 클래스
 */
export class NetworkManager {
  private retryDelays = [1000, 2000, 4000, 8000] // 지수 백오프

  async request<T>(
    url: string,
    options: RequestInit = {},
    onStateChange?: (state: NetworkState) => void
  ): Promise<T> {
    let retryCount = 0
    let lastError: Error | null = null

    const setState = (state: Partial<NetworkState>) => {
      onStateChange?.({
        loading: false,
        error: null,
        retryCount,
        ...state
      })
    }

    setState({ loading: true })

    while (retryCount <= this.retryDelays.length) {
      try {
        const response = await fetchWithTimeout(url, options)
        
        if (!response.ok) {
          throw await ApiError.fromResponse(response)
        }

        const data = await safeJsonParse<T>(response)
        setState({ loading: false })
        return data

      } catch (error) {
        lastError = error as Error
        retryCount++

        setState({ 
          loading: retryCount <= this.retryDelays.length,
          error: lastError,
          retryCount: retryCount - 1
        })

        // 4xx 에러나 마지막 재시도인 경우 중단
        if (
          (error as ApiError).status && 
          (error as ApiError).status! >= 400 && 
          (error as ApiError).status! < 500
        ) {
          break
        }

        if (retryCount <= this.retryDelays.length) {
          await delay(this.retryDelays[retryCount - 1])
        }
      }
    }

    setState({ loading: false, error: lastError })
    throw lastError
  }
}

/**
 * 기본 네트워크 매니저 인스턴스
 */
export const networkManager = new NetworkManager()

/**
 * 간단한 GET 요청
 */
export async function get<T>(url: string): Promise<T> {
  const response = await fetchWithRetry(url)
  
  if (!response.ok) {
    throw await ApiError.fromResponse(response)
  }
  
  return safeJsonParse<T>(response)
}

/**
 * 간단한 POST 요청
 */
export async function post<T>(url: string, data?: any): Promise<T> {
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined
  })
  
  if (!response.ok) {
    throw await ApiError.fromResponse(response)
  }
  
  return safeJsonParse<T>(response)
}

/**
 * 간단한 PUT 요청
 */
export async function put<T>(url: string, data?: any): Promise<T> {
  const response = await fetchWithRetry(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined
  })
  
  if (!response.ok) {
    throw await ApiError.fromResponse(response)
  }
  
  return safeJsonParse<T>(response)
}

/**
 * 간단한 DELETE 요청
 */
export async function del<T>(url: string): Promise<T> {
  const response = await fetchWithRetry(url, {
    method: 'DELETE'
  })
  
  if (!response.ok) {
    throw await ApiError.fromResponse(response)
  }
  
  return safeJsonParse<T>(response)
} 