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
        .eq('status', 'ativo')
      
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
        .eq('status', 'pago')
        .gte('data_transacao', firstDayOfMonth)
      
      const receitaMensal = transacoes?.reduce((sum, t) => sum + Number(t.valor), 0) || 0
      
      // Buscar prontuários pendentes (agendamentos realizados sem prontuário)
      const { data: agendamentosRealizados, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('psicologo_id', psicologo.id)
        .eq('status', 'realizado')
      
      let prontuariosPendentes = 0
      
      if (!agendamentosError && agendamentosRealizados && agendamentosRealizados.length > 0) {
        const agendamentoIds = agendamentosRealizados.map(a => a.id)
        
        try {
          const { data: prontuariosExistentes, error: prontuariosError } = await supabase
            .from('prontuarios')
            .select('agendamento_id')
            .in('agendamento_id', agendamentoIds)
            .not('agendamento_id', 'is', null)
          
          if (!prontuariosError && prontuariosExistentes) {
            const prontuariosIds = prontuariosExistentes.map(p => p.agendamento_id).filter(Boolean)
            prontuariosPendentes = agendamentoIds.filter(id => !prontuariosIds.includes(id)).length
          }
        } catch (error) {
          // Se houver erro ao buscar prontuários, assumir 0 pendentes
          console.warn('Erro ao buscar prontuários:', error)
          prontuariosPendentes = 0
        }
      }
      
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

// Hook para dados de receita mensal (últimos 6 meses)
export const useRevenueData = () => {
  const { psicologo } = useAuthStore()
  
  return useQuery({
    queryKey: ['dashboard', 'revenue', psicologo?.id],
    queryFn: async () => {
      if (!psicologo?.id) throw new Error('Psicólogo não encontrado')
      
      const months = []
      const now = new Date()
      
      // Gerar últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const startDate = date.toISOString().split('T')[0]
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]
        
        const { data: transacoes } = await supabase
          .from('transacoes_financeiras')
          .select('valor')
          .eq('psicologo_id', psicologo.id)
          .eq('tipo', 'receita')
          .eq('status', 'pago')
          .gte('data_transacao', startDate)
          .lte('data_transacao', endDate)
        
        const revenue = transacoes?.reduce((sum, t) => sum + Number(t.valor), 0) || 0
        
        months.push({
          month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
          revenue
        })
      }
      
      return months
    },
    enabled: !!psicologo?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

// Hook para dados de agendamentos por status
export const useAppointmentStatusData = () => {
  const { psicologo } = useAuthStore()
  
  return useQuery({
    queryKey: ['dashboard', 'appointment-status', psicologo?.id],
    queryFn: async () => {
      if (!psicologo?.id) throw new Error('Psicólogo não encontrado')
      
      // Buscar agendamentos do mês atual
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      
      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('status')
        .eq('psicologo_id', psicologo.id)
        .gte('data_hora', `${firstDayOfMonth}T00:00:00`)
        .lte('data_hora', `${lastDayOfMonth}T23:59:59`)
      
      if (!agendamentos || agendamentos.length === 0) {
        return [
          { name: 'Confirmados', value: 0, color: '#059669' },
          { name: 'Agendados', value: 0, color: '#F59E0B' },
          { name: 'Cancelados', value: 0, color: '#EF4444' },
          { name: 'Realizados', value: 0, color: '#3B82F6' },
        ]
      }
      
      const total = agendamentos.length
      const statusCount = agendamentos.reduce((acc, agendamento) => {
        acc[agendamento.status] = (acc[agendamento.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      return [
        { 
          name: 'Confirmados', 
          value: Math.round(((statusCount.confirmado || 0) / total) * 100),
          color: '#059669' 
        },
        { 
          name: 'Agendados', 
          value: Math.round(((statusCount.agendado || 0) / total) * 100),
          color: '#F59E0B' 
        },
        { 
          name: 'Cancelados', 
          value: Math.round(((statusCount.cancelado || 0) / total) * 100),
          color: '#EF4444' 
        },
        { 
          name: 'Realizados', 
          value: Math.round(((statusCount.realizado || 0) / total) * 100),
          color: '#3B82F6' 
        },
      ]
    },
    enabled: !!psicologo?.id,
    staleTime: 3 * 60 * 1000, // 3 minutos
  })
}

// Hook para dados de agendamentos por dia da semana
export const useWeeklyAppointmentData = () => {
  const { psicologo } = useAuthStore()
  
  return useQuery({
    queryKey: ['dashboard', 'weekly-appointments', psicologo?.id],
    queryFn: async () => {
      if (!psicologo?.id) throw new Error('Psicólogo não encontrado')
      
      // Buscar agendamentos das últimas 4 semanas
      const now = new Date()
      const fourWeeksAgo = new Date(now.getTime() - (28 * 24 * 60 * 60 * 1000))
      
      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('data_hora')
        .eq('psicologo_id', psicologo.id)
        .gte('data_hora', fourWeeksAgo.toISOString())
        .lte('data_hora', now.toISOString())
      
      const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      const dayCount = Array(7).fill(0)
      
      agendamentos?.forEach(agendamento => {
        const date = new Date(agendamento.data_hora)
        const dayOfWeek = date.getDay()
        dayCount[dayOfWeek]++
      })
      
      return weekDays.map((day, index) => ({
        day,
        appointments: dayCount[index]
      }))
    },
    enabled: !!psicologo?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

// Hook para atividades recentes
export const useRecentActivities = () => {
  const { psicologo } = useAuthStore()
  
  return useQuery({
    queryKey: ['dashboard', 'recent-activities', psicologo?.id],
    queryFn: async () => {
      if (!psicologo?.id) throw new Error('Psicólogo não encontrado')
      
      const activities = []
      
      // Últimos agendamentos criados
      const { data: recentAgendamentos } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          status,
          created_at,
          paciente:pacientes(nome)
        `)
        .eq('psicologo_id', psicologo.id)
        .order('created_at', { ascending: false })
        .limit(3)
      
      recentAgendamentos?.forEach(agendamento => {
        activities.push({
          type: 'agendamento',
          title: 'Agendamento criado',
          description: `${agendamento.paciente?.nome} - ${new Date(agendamento.data_hora).toLocaleDateString('pt-BR')}`,
          time: agendamento.created_at,
          icon: 'calendar',
          color: 'blue'
        })
      })
      
      // Últimos prontuários criados
      const { data: recentProntuarios } = await supabase
        .from('prontuarios')
        .select(`
          id,
          created_at,
          agendamento:agendamentos(
            paciente:pacientes(nome)
          )
        `)
        .eq('psicologo_id', psicologo.id)
        .order('created_at', { ascending: false })
        .limit(3)
      
      recentProntuarios?.forEach(prontuario => {
        activities.push({
          type: 'prontuario',
          title: 'Prontuário criado',
          description: `${prontuario.agendamento?.paciente?.nome}`,
          time: prontuario.created_at,
          icon: 'file-text',
          color: 'green'
        })
      })
      
      // Últimas transações
      const { data: recentTransacoes } = await supabase
        .from('transacoes_financeiras')
        .select(`
          id,
          valor,
          tipo,
          descricao,
          created_at,
          paciente:pacientes(nome)
        `)
        .eq('psicologo_id', psicologo.id)
        .order('created_at', { ascending: false })
        .limit(2)
      
      recentTransacoes?.forEach(transacao => {
        activities.push({
          type: 'transacao',
          title: transacao.tipo === 'receita' ? 'Receita registrada' : 'Despesa registrada',
          description: `${transacao.paciente?.nome || transacao.descricao} - R$ ${Number(transacao.valor).toFixed(2)}`,
          time: transacao.created_at,
          icon: 'dollar-sign',
          color: transacao.tipo === 'receita' ? 'green' : 'red'
        })
      })
      
      // Ordenar por data mais recente
      return activities
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5)
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