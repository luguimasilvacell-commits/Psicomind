import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos por padrão
      staleTime: 5 * 60 * 1000,
      // Manter dados em cache por 10 minutos
      gcTime: 10 * 60 * 1000,
      // Retry automático em caso de erro
      retry: (failureCount, error: any) => {
        // Não retry em erros de autenticação
        if (error?.status === 401 || error?.status === 403) {
          return false
        }
        // Retry até 3 vezes para outros erros
        return failureCount < 3
      },
      // Refetch quando a janela ganha foco
      refetchOnWindowFocus: true,
      // Refetch quando reconecta à internet
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry automático para mutations
      retry: (failureCount, error: any) => {
        // Não retry em erros de validação ou autenticação
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        // Retry até 2 vezes para erros de servidor
        return failureCount < 2
      },
    },
  },
})

// Chaves de query organizadas
export const queryKeys = {
  // Dados do usuário
  user: ['user'] as const,
  psicologo: ['psicologo'] as const,
  
  // Pacientes
  pacientes: {
    all: ['pacientes'] as const,
    list: (filters?: any) => ['pacientes', 'list', filters] as const,
    detail: (id: string) => ['pacientes', 'detail', id] as const,
  },
  
  // Agendamentos
  agendamentos: {
    all: ['agendamentos'] as const,
    list: (filters?: any) => ['agendamentos', 'list', filters] as const,
    detail: (id: string) => ['agendamentos', 'detail', id] as const,
    byDate: (date: string) => ['agendamentos', 'byDate', date] as const,
  },
  
  // Prontuários
  prontuarios: {
    all: ['prontuarios'] as const,
    list: (filters?: any) => ['prontuarios', 'list', filters] as const,
    detail: (id: string) => ['prontuarios', 'detail', id] as const,
    byPaciente: (pacienteId: string) => ['prontuarios', 'byPaciente', pacienteId] as const,
  },
  
  // Transações financeiras
  transacoes: {
    all: ['transacoes'] as const,
    list: (filters?: any) => ['transacoes', 'list', filters] as const,
    detail: (id: string) => ['transacoes', 'detail', id] as const,
    byPeriod: (startDate: string, endDate: string) => ['transacoes', 'byPeriod', startDate, endDate] as const,
  },
  
  // Dashboard
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    charts: ['dashboard', 'charts'] as const,
  },
  
  // Chat
  chat: {
    history: ['chat', 'history'] as const,
    conversation: (id: string) => ['chat', 'conversation', id] as const,
  },
} as const

// Utilitários para invalidação de cache
export const invalidateQueries = {
  pacientes: () => queryClient.invalidateQueries({ queryKey: queryKeys.pacientes.all }),
  agendamentos: () => queryClient.invalidateQueries({ queryKey: queryKeys.agendamentos.all }),
  prontuarios: () => queryClient.invalidateQueries({ queryKey: queryKeys.prontuarios.all }),
  transacoes: () => queryClient.invalidateQueries({ queryKey: queryKeys.transacoes.all }),
  dashboard: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats }),
  all: () => queryClient.invalidateQueries(),
}