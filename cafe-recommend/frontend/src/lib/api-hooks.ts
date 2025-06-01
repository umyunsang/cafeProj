import useSWR from 'swr'
import { useState } from 'react'
import { api } from './api-client'

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

// 메뉴 관련 hooks
export function useMenu() {
  return useApi('/api/menu')
}

export function useMenuItem(id: string | null) {
  return useApi(id ? `/api/menu/${id}` : null)
}

// 재료 관련 hooks
export function useIngredients() {
  return useApi('/api/ingredients')
}

export function useIngredient(id: string | null) {
  return useApi(id ? `/api/ingredients/${id}` : null)
}

// 주문 관련 hooks
export function useOrders() {
  return useApi('/api/orders')
}

export function useOrder(id: string | null) {
  return useApi(id ? `/api/orders/${id}` : null)
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
      const result = await api.recommendations.get(prefs || preferences)
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
      const result = await api.menu.create(menuData)
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
      const result = await api.menu.update(id, menuData)
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
      const result = await api.menu.delete(id)
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
      const result = await api.ingredients.create(ingredientData)
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
      const result = await api.ingredients.update(id, ingredientData)
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
      const result = await api.ingredients.restock(id, restockData)
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
      const result = await api.orders.create(orderData)
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
      const result = await api.orders.update(id, orderData)
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