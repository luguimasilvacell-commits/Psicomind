import { supabase } from './supabase'
import { toast } from 'sonner'

// Tipos para melhor tipagem
export interface SupabaseError {
  message: string
  details?: string
  hint?: string
  code?: string
}

// Cache local simples para dados críticos
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live em ms
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>()

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void { // 5 minutos padrão
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }
}

export const dataCache = new SimpleCache()

// Função para verificar se é um erro de rede
const isNetworkError = (error: any): boolean => {
  if (!error) return false
  
  const errorMessage = error.message?.toLowerCase() || ''
  const errorCode = error.code?.toLowerCase() || ''
  
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('aborted') ||
    errorMessage.includes('err_aborted') ||
    errorCode.includes('network') ||
    errorCode === 'fetch_error' ||
    errorCode === 'aborted'
  )
}

// Função para verificar se é um erro de timeout
const isTimeoutError = (error: any): boolean => {
  return (
    error?.message?.includes('timeout') ||
    error?.message?.includes('TIMEOUT') ||
    error?.message?.includes('Request timed out') ||
    error?.code === 'TIMEOUT' ||
    error?.code === 'ETIMEDOUT'
  )
}

// Função para verificar se é um erro temporário que vale a pena tentar novamente
const isRetryableError = (error: any): boolean => {
  return (
    isNetworkError(error) ||
    isTimeoutError(error) ||
    error?.status >= 500 || // Erros de servidor
    error?.status === 429 || // Rate limiting
    error?.status === 408 || // Request timeout
    error?.status === 503 || // Service unavailable
    error?.status === 502 || // Bad gateway
    error?.status === 504    // Gateway timeout
  )
}

// Função para retry com backoff exponencial
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Configurações de retry mais robustas
interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  showToast: boolean
  useCache: boolean
  cacheKey?: string
  cacheTtl?: number
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 500,
  maxDelay: 5000,
  backoffMultiplier: 1.5,
  showToast: true,
  useCache: false
}

// Wrapper para chamadas do Supabase com retry e melhor tratamento de erros
export async function supabaseWithRetry<T>(
  operation: () => Promise<{ data: T; error: any }>,
  config: Partial<RetryConfig> = {}
): Promise<{ data: T | null; error: SupabaseError | null }> {
  const finalConfig = { ...defaultRetryConfig, ...config }
  let lastError: any = null

  // Verificar cache primeiro se habilitado
  if (finalConfig.useCache && finalConfig.cacheKey) {
    const cachedData = dataCache.get<T>(finalConfig.cacheKey)
    if (cachedData) {
      console.log(`Cache hit para: ${finalConfig.cacheKey}`)
      return { data: cachedData, error: null }
    }
  }

  for (let attempt = 1; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      const result = await operation()
      
      if (result.error) {
        lastError = result.error
        
        // Se for erro que vale a pena tentar novamente e ainda há tentativas
        if (isRetryableError(result.error) && attempt < finalConfig.maxRetries) {
          const delayTime = Math.min(
            finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
            finalConfig.maxDelay
          )
          
          console.warn(`Tentativa ${attempt}/${finalConfig.maxRetries} falhou, tentando novamente em ${delayTime}ms...`, result.error)
          await delay(delayTime)
          continue
        }
        
        // Se não for erro que vale tentar novamente ou já esgotou as tentativas
        const formattedError: SupabaseError = {
          message: result.error.message || 'Erro desconhecido',
          details: result.error.details,
          hint: result.error.hint,
          code: result.error.code
        }
        
        if (finalConfig.showToast) {
          if (isNetworkError(result.error)) {
            toast.error('Erro de conexão. Verifique sua internet e tente novamente.')
          } else if (isTimeoutError(result.error)) {
            toast.error('Timeout na conexão. Tente novamente.')
          } else {
            toast.error(`Erro: ${formattedError.message}`)
          }
        }
        
        // Se há cache e é erro de rede, tentar retornar dados do cache como fallback
        if (finalConfig.useCache && finalConfig.cacheKey && isNetworkError(result.error)) {
          const cachedData = dataCache.get<T>(finalConfig.cacheKey)
          if (cachedData) {
            console.log(`Usando cache como fallback para: ${finalConfig.cacheKey}`)
            if (finalConfig.showToast) {
              toast.warning('Usando dados em cache devido a problemas de conexão')
            }
            return { data: cachedData, error: null }
          }
        }
        
        return { data: null, error: formattedError }
      }
      
      // Sucesso - salvar no cache se habilitado
      if (finalConfig.useCache && finalConfig.cacheKey && result.data) {
        dataCache.set(finalConfig.cacheKey, result.data, finalConfig.cacheTtl)
        console.log(`Dados salvos no cache: ${finalConfig.cacheKey}`)
      }
      
      return { data: result.data, error: null }
    } catch (error: any) {
      lastError = error
      
      // Se for erro que vale tentar novamente
      if (isRetryableError(error) && attempt < finalConfig.maxRetries) {
        const delayTime = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
          finalConfig.maxDelay
        )
        
        console.warn(`Tentativa ${attempt}/${finalConfig.maxRetries} falhou com exceção, tentando novamente em ${delayTime}ms...`, error)
        await delay(delayTime)
        continue
      }
      
      // Se não conseguiu recuperar, retorna o erro
      const formattedError: SupabaseError = {
        message: error.message || 'Erro de conexão',
        code: 'NETWORK_ERROR'
      }
      
      if (finalConfig.showToast) {
        if (isNetworkError(error)) {
          toast.error('Erro de conexão. Verifique sua internet e tente novamente.')
        } else {
          toast.error('Erro inesperado. Tente novamente.')
        }
      }
      
      // Tentar cache como fallback
      if (finalConfig.useCache && finalConfig.cacheKey && isNetworkError(error)) {
        const cachedData = dataCache.get<T>(finalConfig.cacheKey)
        if (cachedData) {
          console.log(`Usando cache como fallback após exceção: ${finalConfig.cacheKey}`)
          if (finalConfig.showToast) {
            toast.warning('Usando dados em cache devido a problemas de conexão')
          }
          return { data: cachedData, error: null }
        }
      }
      
      return { data: null, error: formattedError }
    }
  }
  
  // Se chegou aqui, esgotou todas as tentativas
  const formattedError: SupabaseError = {
    message: lastError?.message || 'Erro após múltiplas tentativas',
    code: 'MAX_RETRIES_EXCEEDED'
  }
  
  if (finalConfig.showToast) {
    toast.error('Não foi possível conectar ao servidor. Tente novamente mais tarde.')
  }
  
  // Última tentativa de usar cache
  if (finalConfig.useCache && finalConfig.cacheKey) {
    const cachedData = dataCache.get<T>(finalConfig.cacheKey)
    if (cachedData) {
      console.log(`Usando cache como último recurso: ${finalConfig.cacheKey}`)
      if (finalConfig.showToast) {
        toast.warning('Usando dados em cache - sem conexão com servidor')
      }
      return { data: cachedData, error: null }
    }
  }
  
  return { data: null, error: formattedError }
}

// Função específica para verificar conectividade
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('psicologos')
      .select('id')
      .limit(1)
    
    return !error
  } catch (error) {
    console.error('Erro ao verificar conexão com Supabase:', error)
    return false
  }
}

// Função para mostrar status de conexão
export async function showConnectionStatus(): Promise<void> {
  const isConnected = await checkSupabaseConnection()
  
  if (isConnected) {
    toast.success('Conectado ao servidor')
  } else {
    toast.error('Sem conexão com o servidor')
  }
}

// Função para limpar cache quando necessário
export function clearCache(): void {
  dataCache.clear()
  toast.info('Cache limpo')
}

// Função para verificar status da rede
export function isOnline(): boolean {
  return navigator.onLine
}

// Hook para monitorar status da rede
export function setupNetworkMonitoring(): () => void {
  const handleOnline = () => {
    toast.success('Conexão restaurada')
    console.log('Rede online')
  }
  
  const handleOffline = () => {
    toast.error('Conexão perdida')
    console.log('Rede offline')
  }
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  // Retornar função de cleanup
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}