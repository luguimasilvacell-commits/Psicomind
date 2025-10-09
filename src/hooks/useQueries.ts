import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Paciente, type Agendamento, type Prontuario, type TransacaoFinanceira } from '../lib/supabase'
import { queryKeys, invalidateQueries } from '../lib/queryClient'
import { useAuthStore } from '../stores/authStore'
import { toast } from 'sonner'
import { supabaseWithRetry } from '../lib/supabaseUtils'

// Hook para buscar pacientes
export const usePacientes = (filters?: { search?: string; status?: string }) => {
  const { psicologo } = useAuthStore()
  
  return useQuery({
    queryKey: queryKeys.pacientes.list(filters),
    queryFn: async () => {
      if (!psicologo?.id) throw new Error('Psicólogo não encontrado')
      
      const cacheKey = `pacientes_${psicologo.id}_${JSON.stringify(filters || {})}`
      
      const { data, error } = await supabaseWithRetry(
        async () => {
          let query = supabase
            .from('pacientes')
            .select('*')
            .eq('psicologo_id', psicologo.id)
            .order('nome')
          
          if (filters?.search) {
            query = query.or(`nome.ilike.%${filters.search}%,cpf.ilike.%${filters.search}%,telefone.ilike.%${filters.search}%`)
          }
          
          if (filters?.status && filters.status !== 'todos') {
            query = query.eq('status', filters.status)
          }
          
          return await query
        },
        {
          useCache: true,
          cacheKey,
          cacheTtl: 2 * 60 * 1000, // 2 minutos
          maxRetries: 5,
          showToast: false // Evitar múltiplos toasts
        }
      )
      
      if (error) throw error
      return data as Paciente[]
    },
    enabled: !!psicologo?.id,
    retry: false, // Deixar o retry para o supabaseWithRetry
    staleTime: 1 * 60 * 1000, // 1 minuto
  })
}

// Hook para buscar agendamentos
export const useAgendamentos = (filters?: { search?: string; status?: string; date?: string }) => {
  const { psicologo } = useAuthStore()
  
  return useQuery({
    queryKey: queryKeys.agendamentos.list(filters),
    queryFn: async () => {
      if (!psicologo?.id) throw new Error('Psicólogo não encontrado')
      
      const cacheKey = `agendamentos_${psicologo.id}_${JSON.stringify(filters || {})}`
      
      const { data, error } = await supabaseWithRetry(
        async () => {
          let query = supabase
            .from('agendamentos')
            .select(`
              *,
              paciente:pacientes(id, nome, telefone)
            `)
            .eq('psicologo_id', psicologo.id)
            .order('data_hora', { ascending: true })
          
          if (filters?.date) {
            const startDate = `${filters.date}T00:00:00`
            const endDate = `${filters.date}T23:59:59`
            query = query.gte('data_hora', startDate).lte('data_hora', endDate)
          }
          
          if (filters?.status && filters.status !== 'todos') {
            query = query.eq('status', filters.status)
          }
          
          return await query
        },
        {
          useCache: true,
          cacheKey,
          cacheTtl: 1 * 60 * 1000, // 1 minuto para agendamentos (dados mais dinâmicos)
          maxRetries: 5,
          showToast: false
        }
      )
      
      if (error) throw error
      return data as Agendamento[]
    },
    enabled: !!psicologo?.id,
    retry: false,
    staleTime: 30 * 1000, // 30 segundos
  })
}

// Hook para buscar prontuários
export const useProntuarios = (filters?: { search?: string; pacienteId?: string }) => {
  const { psicologo } = useAuthStore()
  
  return useQuery({
    queryKey: queryKeys.prontuarios.list(filters),
    queryFn: async () => {
      if (!psicologo?.id) throw new Error('Psicólogo não encontrado')
      
      let query = supabase
        .from('prontuarios')
        .select(`
          *,
          paciente:pacientes(id, nome)
        `)
        .eq('psicologo_id', psicologo.id)
        .order('data_sessao', { ascending: false })
      
      if (filters?.pacienteId && filters.pacienteId !== 'todos') {
        query = query.eq('paciente_id', filters.pacienteId)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data as Prontuario[]
    },
    enabled: !!psicologo?.id,
  })
}

// Hook para buscar transações financeiras
export const useTransacoes = (filters?: { startDate?: string; endDate?: string; tipo?: string }) => {
  const { psicologo } = useAuthStore()
  
  return useQuery({
    queryKey: queryKeys.transacoes.list(filters),
    queryFn: async () => {
      if (!psicologo?.id) throw new Error('Psicólogo não encontrado')
      
      let query = supabase
        .from('transacoes_financeiras')
        .select('*')
        .eq('psicologo_id', psicologo.id)
        .order('data_transacao', { ascending: false })
      
      if (filters?.startDate) {
        query = query.gte('data_transacao', filters.startDate)
      }
      
      if (filters?.endDate) {
        query = query.lte('data_transacao', filters.endDate)
      }
      
      if (filters?.tipo && filters.tipo !== 'todos') {
        query = query.eq('tipo', filters.tipo)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data as TransacaoFinanceira[]
    },
    enabled: !!psicologo?.id,
  })
}

// Hook para estatísticas do dashboard
export const useDashboardStats = () => {
  const { psicologo } = useAuthStore()
  
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: async () => {
      if (!psicologo?.id) throw new Error('Psicólogo não encontrado')
      
      // Buscar total de pacientes
      const { count: totalPacientes } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .eq('psicologo_id', psicologo.id)
      
      // Buscar agendamentos de hoje
      const today = new Date().toISOString().split('T')[0]
      const { count: agendamentosHoje } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true })
        .eq('psicologo_id', psicologo.id)
        .gte('data_hora', `${today}T00:00:00`)
        .lt('data_hora', `${today}T23:59:59`)
      
      // Buscar receita mensal
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const { data: transacoes } = await supabase
        .from('transacoes_financeiras')
        .select('valor')
        .eq('psicologo_id', psicologo.id)
        .eq('tipo', 'receita')
        .gte('data_transacao', firstDayOfMonth)
      
      const receitaMensal = transacoes?.reduce((sum, t) => sum + t.valor, 0) || 0
      
      // Prontuários pendentes (simulado)
      const prontuariosPendentes = Math.floor(Math.random() * 10) + 1
      
      return {
        totalPacientes: totalPacientes || 0,
        agendamentosHoje: agendamentosHoje || 0,
        receitaMensal,
        prontuariosPendentes,
      }
    },
    enabled: !!psicologo?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

// Mutations para criar/atualizar/deletar dados
export const useCreatePaciente = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (paciente: Omit<Paciente, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('pacientes')
        .insert(paciente)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidateQueries.pacientes()
      invalidateQueries.dashboard()
      toast.success('Paciente criado com sucesso!')
    },
    onError: (error: any) => {
      toast.error('Erro ao criar paciente: ' + error.message)
    },
  })
}

export const useUpdatePaciente = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Paciente> & { id: string }) => {
      const { data, error } = await supabase
        .from('pacientes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidateQueries.pacientes()
      toast.success('Paciente atualizado com sucesso!')
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar paciente: ' + error.message)
    },
  })
}

export const useDeletePaciente = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      invalidateQueries.pacientes()
      invalidateQueries.dashboard()
      toast.success('Paciente removido com sucesso!')
    },
    onError: (error: any) => {
      toast.error('Erro ao remover paciente: ' + error.message)
    },
  })
}

// Mutations similares para agendamentos
export const useCreateAgendamento = () => {
  return useMutation({
    mutationFn: async (agendamento: Omit<Agendamento, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('agendamentos')
        .insert(agendamento)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidateQueries.agendamentos()
      invalidateQueries.dashboard()
      toast.success('Agendamento criado com sucesso!')
    },
    onError: (error: any) => {
      toast.error('Erro ao criar agendamento: ' + error.message)
    },
  })
}

export const useUpdateAgendamento = () => {
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Agendamento> & { id: string }) => {
      const { data, error } = await supabase
        .from('agendamentos')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidateQueries.agendamentos()
      toast.success('Agendamento atualizado com sucesso!')
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar agendamento: ' + error.message)
    },
  })
}