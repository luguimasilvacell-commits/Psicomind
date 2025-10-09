import { useState, useCallback } from 'react'

interface UseLoadingReturn {
  isLoading: boolean
  startLoading: () => void
  stopLoading: () => void
  withLoading: <T>(asyncFn: () => Promise<T>) => Promise<T>
}

export const useLoading = (initialState = false): UseLoadingReturn => {
  const [isLoading, setIsLoading] = useState(initialState)

  const startLoading = useCallback(() => {
    setIsLoading(true)
  }, [])

  const stopLoading = useCallback(() => {
    setIsLoading(false)
  }, [])

  const withLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T> => {
    try {
      setIsLoading(true)
      const result = await asyncFn()
      return result
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading
  }
}

// Hook para múltiplos estados de loading
export const useMultipleLoading = () => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }))
  }, [])

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false
  }, [loadingStates])

  const withLoading = useCallback(async <T>(
    key: string, 
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    try {
      setLoading(key, true)
      const result = await asyncFn()
      return result
    } finally {
      setLoading(key, false)
    }
  }, [setLoading])

  return {
    loadingStates,
    setLoading,
    isLoading,
    withLoading
  }
}