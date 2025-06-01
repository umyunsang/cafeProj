// 쿠키 관리 유틸리티 함수들

/**
 * 쿠키 옵션 인터페이스
 */
export interface CookieOptions {
  expires?: Date | string | number
  maxAge?: number
  domain?: string
  path?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}

/**
 * 브라우저에서 쿠키 설정
 */
export function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  if (typeof window === 'undefined') return

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`

  if (options.expires) {
    const expires = new Date(options.expires)
    cookieString += `; expires=${expires.toUTCString()}`
  }

  if (options.maxAge) {
    cookieString += `; max-age=${options.maxAge}`
  }

  if (options.domain) {
    cookieString += `; domain=${options.domain}`
  }

  if (options.path) {
    cookieString += `; path=${options.path}`
  }

  if (options.secure) {
    cookieString += `; secure`
  }

  if (options.sameSite) {
    cookieString += `; samesite=${options.sameSite}`
  }

  document.cookie = cookieString
}

/**
 * 브라우저에서 쿠키 가져오기
 */
export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${encodeURIComponent(name)}=`)
  
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift()
    return cookieValue ? decodeURIComponent(cookieValue) : null
  }
  
  return null
}

/**
 * 브라우저에서 쿠키 삭제
 */
export function deleteCookie(name: string, options: Omit<CookieOptions, 'expires' | 'maxAge'> = {}): void {
  setCookie(name, '', {
    ...options,
    expires: new Date(0)
  })
}

/**
 * 모든 쿠키 가져오기
 */
export function getAllCookies(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const cookies: Record<string, string> = {}
  
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=')
    if (name && value) {
      cookies[decodeURIComponent(name)] = decodeURIComponent(value)
    }
  })
  
  return cookies
}

/**
 * 쿠키 존재 여부 확인
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null
}

/**
 * JSON 객체를 쿠키에 저장
 */
export function setJsonCookie(
  name: string,
  value: any,
  options: CookieOptions = {}
): void {
  try {
    const jsonString = JSON.stringify(value)
    setCookie(name, jsonString, options)
  } catch (error) {
    console.error('Failed to set JSON cookie:', error)
  }
}

/**
 * 쿠키에서 JSON 객체 가져오기
 */
export function getJsonCookie<T = any>(name: string): T | null {
  try {
    const cookieValue = getCookie(name)
    if (!cookieValue) return null
    
    return JSON.parse(cookieValue) as T
  } catch (error) {
    console.error('Failed to parse JSON cookie:', error)
    return null
  }
}

/**
 * 서버사이드에서 요청 헤더로부터 쿠키 파싱
 */
export function parseCookiesFromHeader(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  
  if (!cookieHeader) return cookies
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=')
    if (name && value) {
      cookies[decodeURIComponent(name)] = decodeURIComponent(value)
    }
  })
  
  return cookies
}

/**
 * Next.js 서버사이드에서 쿠키 가져오기 (Request 객체 사용)
 */
export function getServerCookie(name: string, request?: Request): string | null {
  if (!request) return null
  
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null
  
  const cookies = parseCookiesFromHeader(cookieHeader)
  return cookies[name] || null
}

/**
 * 쿠키 유틸리티 클래스
 */
export class CookieManager {
  private defaultOptions: CookieOptions

  constructor(defaultOptions: CookieOptions = {}) {
    this.defaultOptions = {
      path: '/',
      sameSite: 'lax',
      ...defaultOptions
    }
  }

  set(name: string, value: string, options?: CookieOptions): void {
    setCookie(name, value, { ...this.defaultOptions, ...options })
  }

  get(name: string): string | null {
    return getCookie(name)
  }

  delete(name: string, options?: Omit<CookieOptions, 'expires' | 'maxAge'>): void {
    deleteCookie(name, { ...this.defaultOptions, ...options })
  }

  has(name: string): boolean {
    return hasCookie(name)
  }

  setJson(name: string, value: any, options?: CookieOptions): void {
    setJsonCookie(name, value, { ...this.defaultOptions, ...options })
  }

  getJson<T = any>(name: string): T | null {
    return getJsonCookie<T>(name)
  }

  clear(): void {
    const cookies = getAllCookies()
    Object.keys(cookies).forEach(name => {
      this.delete(name)
    })
  }
}

// 기본 쿠키 매니저 인스턴스 생성
const cookieManager = new CookieManager()

export default cookieManager

/**
 * 특별한 목적의 쿠키 헬퍼들
 */

// 사용자 선호도 관련
export const userPreferences = {
  set: (preferences: any) => setJsonCookie('user_preferences', preferences, { maxAge: 30 * 24 * 60 * 60 }), // 30일
  get: () => getJsonCookie('user_preferences'),
  clear: () => deleteCookie('user_preferences')
}

// 장바구니 관련
export const cartCookies = {
  set: (cart: any) => setJsonCookie('cart', cart, { maxAge: 7 * 24 * 60 * 60 }), // 7일
  get: () => getJsonCookie('cart'),
  clear: () => deleteCookie('cart')
}

// 세션 관련
export const sessionCookies = {
  set: (sessionId: string) => setCookie('session_id', sessionId, { secure: true, httpOnly: false, sameSite: 'strict' }),
  get: () => getCookie('session_id'),
  clear: () => deleteCookie('session_id')
}

// 인증 토큰 관련
export const authCookies = {
  set: (token: string, refreshToken?: string) => {
    setCookie('auth_token', token, { 
      maxAge: 24 * 60 * 60, // 1일
      secure: true, 
      sameSite: 'strict' 
    })
    if (refreshToken) {
      setCookie('refresh_token', refreshToken, { 
        maxAge: 30 * 24 * 60 * 60, // 30일
        secure: true, 
        sameSite: 'strict' 
      })
    }
  },
  get: () => ({
    authToken: getCookie('auth_token'),
    refreshToken: getCookie('refresh_token')
  }),
  clear: () => {
    deleteCookie('auth_token')
    deleteCookie('refresh_token')
  }
}

// 테마/다크모드 관련
export const themeCookies = {
  set: (theme: 'light' | 'dark' | 'system') => setCookie('theme', theme, { maxAge: 365 * 24 * 60 * 60 }), // 1년
  get: () => getCookie('theme') as 'light' | 'dark' | 'system' | null,
  clear: () => deleteCookie('theme')
}

// 언어 설정 관련
export const languageCookies = {
  set: (language: string) => setCookie('language', language, { maxAge: 365 * 24 * 60 * 60 }), // 1년
  get: () => getCookie('language'),
  clear: () => deleteCookie('language')
} 