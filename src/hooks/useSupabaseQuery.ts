import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { PostgrestError } from '@supabase/supabase-js'

interface SupabaseQueryOptions<T> extends Omit<UseQueryOptions<T, Error>, 'queryFn'> {
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>
}

export function useSupabaseQuery<T>(options: SupabaseQueryOptions<T>) {
  return useQuery({
    ...options,
    queryFn: async () => {
      try {
        const { data, error } = await options.queryFn()
        
        if (error) {
          // Log do erro para debug
          console.error('❌ [Supabase] Erro na consulta:', error)
          throw new Error(error.message)
        }
        
        return data
      } catch (err) {
        // Tratar erros de rede e abort
        if (err instanceof Error) {
          if (err.name === 'AbortError' || err.message.includes('aborted')) {
            console.warn('⚠️ [Supabase] Consulta cancelada (AbortError)')
            throw new Error('Consulta cancelada. Tente novamente.')
          }
          
          if (err.message.includes('fetch')) {
            console.warn('⚠️ [Supabase] Erro de rede:', err.message)
            throw new Error('Erro de conexão. Verifique sua internet.')
          }
        }
        
        throw err
      }
    },
    retry: (failureCount, error) => {
      // Não fazer retry para erros de abort ou cancelamento
      if (error.message.includes('cancelada') || error.message.includes('aborted')) {
        return false
      }
      
      // Fazer retry até 3 vezes para outros erros
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  })
}