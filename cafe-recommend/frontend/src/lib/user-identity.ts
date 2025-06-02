// 사용자 신원 관리 유틸리티 함수들

/**
 * 사용자 타입 정의
 */
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  preferences?: UserPreferences
  createdAt: Date
  updatedAt: Date
  isEmailVerified?: boolean
  lastLoginAt?: Date
}

/**
 * 사용자 역할 타입
 */
export type UserRole = 'admin' | 'customer' | 'staff' | 'guest'

/**
 * 사용자 선호도 인터페이스
 */
export interface UserPreferences {
  language?: string
  theme?: 'light' | 'dark' | 'system'
  notifications?: {
    email: boolean
    push: boolean
    sms: boolean
  }
  dietary?: {
    allergies: string[]
    preferences: string[]
  }
  location?: {
    city: string
    country: string
  }
}

/**
 * 인증 상태 타입
 */
export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
  error: string | null
}

/**
 * 로그인 크리덴셜
 */
export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

/**
 * 회원가입 데이터
 */
export interface RegisterData {
  email: string
  password: string
  name: string
  confirmPassword: string
  agreeToTerms: boolean
}

/**
 * 사용자 프로필 업데이트 데이터
 */
export interface ProfileUpdateData {
  name?: string
  avatar?: string
  preferences?: Partial<UserPreferences>
}

/**
 * 사용자 권한 체크 함수들
 */
export const UserPermissions = {
  /**
   * 관리자 권한 확인
   */
  isAdmin: (user: User | null): boolean => {
    return user?.role === 'admin'
  },

  /**
   * 스태프 권한 확인 (관리자 포함)
   */
  isStaff: (user: User | null): boolean => {
    return user?.role === 'admin' || user?.role === 'staff'
  },

  /**
   * 고객 권한 확인
   */
  isCustomer: (user: User | null): boolean => {
    return user?.role === 'customer'
  },

  /**
   * 게스트 여부 확인
   */
  isGuest: (user: User | null): boolean => {
    return !user || user.role === 'guest'
  },

  /**
   * 특정 권한 확인
   */
  hasRole: (user: User | null, role: UserRole): boolean => {
    return user?.role === role
  },

  /**
   * 여러 권한 중 하나라도 있는지 확인
   */
  hasAnyRole: (user: User | null, roles: UserRole[]): boolean => {
    return user ? roles.includes(user.role) : false
  },

  /**
   * 사용자 본인 또는 관리자인지 확인
   */
  canEditProfile: (currentUser: User | null, targetUserId: string): boolean => {
    if (!currentUser) return false
    return currentUser.id === targetUserId || currentUser.role === 'admin'
  },

  /**
   * 주문 조회 권한 확인
   */
  canViewOrder: (user: User | null, orderUserId?: string): boolean => {
    if (!user) return false
    if (user.role === 'admin' || user.role === 'staff') return true
    return user.id === orderUserId
  }
}

/**
 * 사용자 유틸리티 함수들
 */
export const UserUtils = {
  /**
   * 사용자 표시 이름 가져오기
   */
  getDisplayName: (user: User | null): string => {
    if (!user) return 'Guest'
    return user.name || user.email.split('@')[0] || 'Unknown User'
  },

  /**
   * 사용자 이니셜 가져오기
   */
  getInitials: (user: User | null): string => {
    if (!user || !user.name) return 'G'
    return user.name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2)
  },

  /**
   * 아바타 URL 가져오기 (fallback 포함)
   */
  getAvatarUrl: (user: User | null, fallbackUrl?: string): string => {
    if (user?.avatar) return user.avatar
    if (fallbackUrl) return fallbackUrl
    
    // Gravatar fallback
    const email = user?.email || ''
    const hash = btoa(email.toLowerCase().trim())
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=40`
  },

  /**
   * 사용자 상태 확인
   */
  isEmailVerified: (user: User | null): boolean => {
    return user?.isEmailVerified ?? false
  },

  /**
   * 마지막 로그인 시간 포맷
   */
  getLastLoginText: (user: User | null): string => {
    if (!user?.lastLoginAt) return 'Never'
    
    const now = new Date()
    const lastLogin = new Date(user.lastLoginAt)
    const diffMs = now.getTime() - lastLogin.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  },

  /**
   * 사용자 계정 생성일 포맷
   */
  getAccountAgeText: (user: User | null): string => {
    if (!user?.createdAt) return 'Unknown'
    
    const now = new Date()
    const created = new Date(user.createdAt)
    const diffMs = now.getTime() - created.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays < 30) return 'New member'
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months old`
    return `${Math.floor(diffDays / 365)} years old`
  }
}

/**
 * 사용자 검증 함수들
 */
export const UserValidation = {
  /**
   * 이메일 유효성 검사
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  /**
   * 비밀번호 강도 확인
   */
  isStrongPassword: (password: string): { isValid: boolean; message?: string } => {
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long' }
    }
    
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter' }
    }
    
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter' }
    }
    
    if (!/\d/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number' }
    }
    
    return { isValid: true }
  },

  /**
   * 사용자 이름 유효성 검사
   */
  isValidName: (name: string): boolean => {
    return name.trim().length >= 2 && name.trim().length <= 50
  },

  /**
   * 회원가입 데이터 유효성 검사
   */
  validateRegisterData: (data: RegisterData): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!UserValidation.isValidEmail(data.email)) {
      errors.push('Invalid email address')
    }

    if (!UserValidation.isValidName(data.name)) {
      errors.push('Name must be between 2 and 50 characters')
    }

    const passwordCheck = UserValidation.isStrongPassword(data.password)
    if (!passwordCheck.isValid) {
      errors.push(passwordCheck.message!)
    }

    if (data.password !== data.confirmPassword) {
      errors.push('Passwords do not match')
    }

    if (!data.agreeToTerms) {
      errors.push('You must agree to the terms and conditions')
    }

    return { isValid: errors.length === 0, errors }
  }
}

/**
 * 사용자 세션 관리
 */
export class UserSession {
  private static readonly SESSION_KEY = 'user_session'
  private static readonly TOKEN_KEY = 'auth_token'

  /**
   * 세션에서 사용자 정보 가져오기
   */
  static getUser(): User | null {
    if (typeof window === 'undefined') return null
    
    try {
      const userJson = localStorage.getItem(UserSession.SESSION_KEY)
      
      // null, undefined, 빈 문자열, "undefined" 문자열 처리
      if (!userJson || userJson === 'undefined' || userJson === 'null') {
        // 잘못된 값이 저장된 경우 정리
        localStorage.removeItem(UserSession.SESSION_KEY)
        return null
      }
      
      const parsedUser = JSON.parse(userJson)
      
      // 파싱된 결과가 유효한 객체인지 확인
      if (!parsedUser || typeof parsedUser !== 'object' || !parsedUser.id) {
        console.warn('Invalid user data in localStorage, clearing...')
        localStorage.removeItem(UserSession.SESSION_KEY)
        return null
      }
      
      return parsedUser
    } catch (error) {
      console.error('Failed to parse user session:', error)
      // 파싱 오류 시 localStorage 정리
      localStorage.removeItem(UserSession.SESSION_KEY)
      return null
    }
  }

  /**
   * 세션에 사용자 정보 저장
   */
  static setUser(user: User): void {
    if (typeof window === 'undefined') return
    
    try {
      // 유효한 사용자 객체인지 확인
      if (!user || !user.id) {
        console.error('Invalid user object provided to setUser')
        return
      }
      
      localStorage.setItem(UserSession.SESSION_KEY, JSON.stringify(user))
      console.log('User session saved successfully:', user.id)
    } catch (error) {
      console.error('Failed to save user session:', error)
    }
  }

  /**
   * 세션에서 사용자 정보 제거
   */
  static clearUser(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem(UserSession.SESSION_KEY)
    localStorage.removeItem(UserSession.TOKEN_KEY)
    console.log('User session cleared')
  }

  /**
   * 인증 토큰 가져오기
   */
  static getToken(): string | null {
    if (typeof window === 'undefined') return null
    const token = localStorage.getItem(UserSession.TOKEN_KEY)
    return token && token !== 'undefined' && token !== 'null' ? token : null
  }

  /**
   * 인증 토큰 저장
   */
  static setToken(token: string): void {
    if (typeof window === 'undefined') return
    if (!token || token === 'undefined') {
      console.error('Invalid token provided to setToken')
      return
    }
    localStorage.setItem(UserSession.TOKEN_KEY, token)
  }

  /**
   * 인증 여부 확인
   */
  static isAuthenticated(): boolean {
    return UserSession.getUser() !== null && UserSession.getToken() !== null
  }
}

/**
 * 기본 사용자 생성 헬퍼
 */
export const UserFactory = {
  /**
   * 게스트 사용자 생성
   */
  createGuest(): User {
    return {
      id: 'guest',
      email: '',
      name: 'Guest',
      role: 'guest',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  },

  /**
   * 새 사용자 템플릿 생성
   */
  createNewUser(email: string, name: string): Omit<User, 'id'> {
    return {
      email,
      name,
      role: 'customer',
      preferences: {
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          push: false,
          sms: false
        },
        dietary: {
          allergies: [],
          preferences: []
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      isEmailVerified: false
    }
  }
}

/**
 * 사용자 컨텍스트에서 사용할 액션 타입들
 */
export const UserActionTypes = {
  SET_USER: 'SET_USER',
  CLEAR_USER: 'CLEAR_USER',
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
} as const

/**
 * 사용자 액션 인터페이스
 */
export interface UserAction {
  type: keyof typeof UserActionTypes
  payload?: any
}

/**
 * 기본 인증 상태
 */
export const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null
}

// 편의 함수들을 export
export function identifyUser(user: User): void {
  UserSession.setUser(user)
}

export function getUserPreferences(): UserPreferences | null {
  const user = UserSession.getUser()
  return user?.preferences || null
}

export function updateUserPreferences(preferences: Partial<UserPreferences>): void {
  const user = UserSession.getUser()
  if (user) {
    const updatedUser = {
      ...user,
      preferences: {
        ...user.preferences,
        ...preferences
      }
    }
    UserSession.setUser(updatedUser)
  }
}

export function clearUserSession(): void {
  UserSession.clearUser()
} 