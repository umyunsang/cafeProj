import useSWR from 'swr'
import { useState } from 'react'
// import { api } from './api-client'  // 임시로 주석처리

// SWR을 위한 fetcher 함수
const fetcher = (url: string) => fetch(url).then(res => res.json())

// 에러 타입 정의
interface ApiError extends Error {
  status?: number
  info?: any
}

// 로딩 상태를 포함한 mutation hook 타입
interface MutationResult<T> {
  data: T | null
  error: ApiError | null
  loading: boolean
  mutate: (data?: any) => Promise<T>
}

// 기본 API hook
export function useApi<T>(key: string | null) {
  const { data, error, mutate } = useSWR<T, ApiError>(key, fetcher)
  
  return {
    data,
    loading: !error && !data,
    error,
    mutate
  }
}

// 메뉴 관련 hooks - 프론트엔드 API 라우트 사용
export function useMenu() {
  return useApi('/api/menus')
}

export function useMenuItem(id: string | null) {
  return useApi(id ? `/api/menu/${id}` : null)
}

// 재료 관련 hooks - 프론트엔드 API 라우트 사용
export function useIngredients() {
  return useApi('/api/admin/ingredients')
}

export function useIngredient(id: string | null) {
  return useApi(id ? `/api/admin/ingredients/${id}` : null)
}

// 주문 관련 hooks - 프론트엔드 API 라우트 사용
export function useOrders() {
  return useApi('/api/admin/orders')
}

export function useOrder(id: string | null) {
  return useApi(id ? `/api/admin/orders/${id}` : null)
}

// AI 추천 관련 hooks
export function useRecommendations(preferences?: any) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const getRecommendations = async (prefs?: any) => {
    setLoading(true)
    setError(null)
    try {
      // 임시로 간단한 fetch 사용
      const response = await fetch('/api/chat/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs || preferences)
      })
      const result = await response.json()
      setData(result)
      return result
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    data,
    loading,
    error,
    getRecommendations
  }
}

// Mutation hooks (데이터 생성/수정/삭제)
export function useCreateMenuItem(): MutationResult<any> {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const mutate = async (menuData: any) => {
    setLoading(true)
    setError(null)
    try {
      // 임시로 간단한 fetch 사용
      const response = await fetch('/api/admin/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuData)
      })
      const result = await response.json()
      setData(result)
      return result
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { data, error, loading, mutate }
}

export function useUpdateMenuItem(): MutationResult<any> {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const mutate = async ({ id, data: menuData }: { id: string, data: any }) => {
    setLoading(true)
    setError(null)
    try {
      // 임시로 간단한 fetch 사용
      const response = await fetch(`/api/admin/menus/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuData)
      })
      const result = await response.json()
      setData(result)
      return result
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { data, error, loading, mutate }
}

export function useDeleteMenuItem(): MutationResult<any> {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const mutate = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      // 임시로 간단한 fetch 사용
      const response = await fetch(`/api/admin/menus/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      setData(result)
      return result
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { data, error, loading, mutate }
}

// 재료 관련 mutation hooks
export function useCreateIngredient(): MutationResult<any> {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const mutate = async (ingredientData: any) => {
    setLoading(true)
    setError(null)
    try {
      // 임시로 간단한 fetch 사용
      const response = await fetch('/api/admin/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ingredientData)
      })
      const result = await response.json()
      setData(result)
      return result
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { data, error, loading, mutate }
}

export function useUpdateIngredient(): MutationResult<any> {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const mutate = async ({ id, data: ingredientData }: { id: string, data: any }) => {
    setLoading(true)
    setError(null)
    try {
      // 임시로 간단한 fetch 사용
      const response = await fetch(`/api/admin/ingredients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ingredientData)
      })
      const result = await response.json()
      setData(result)
      return result
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { data, error, loading, mutate }
}

export function useRestockIngredient(): MutationResult<any> {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const mutate = async ({ id, data: restockData }: { id: string, data: any }) => {
    setLoading(true)
    setError(null)
    try {
      // 임시로 간단한 fetch 사용
      const response = await fetch(`/api/admin/ingredients/${id}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restockData)
      })
      const result = await response.json()
      setData(result)
      return result
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { data, error, loading, mutate }
}

// 주문 관련 mutation hooks
export function useCreateOrder(): MutationResult<any> {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const mutate = async (orderData: any) => {
    setLoading(true)
    setError(null)
    try {
      // 임시로 간단한 fetch 사용
      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })
      const result = await response.json()
      setData(result)
      return result
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { data, error, loading, mutate }
}

export function useUpdateOrder(): MutationResult<any> {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const mutate = async ({ id, data: orderData }: { id: string, data: any }) => {
    setLoading(true)
    setError(null)
    try {
      // 임시로 간단한 fetch 사용
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })
      const result = await response.json()
      setData(result)
      return result
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { data, error, loading, mutate }
}

// 일반적인 API GET hook 별칭
export function useApiGet<T>(key: string | null) {
  return useApi<T>(key)
}

// 일반적인 API POST hook
export function useApiPost<T>(): MutationResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const mutate = async (endpoint: string, postData?: any) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: postData ? JSON.stringify(postData) : undefined,
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json() as T
      setData(result)
      return result
    } catch (err) {
      const apiError = err as ApiError
      setError(apiError)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { data, error, loading, mutate }
} 