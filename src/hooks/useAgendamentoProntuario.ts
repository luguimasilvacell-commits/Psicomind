import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { supabaseWithRetry } from '../lib/supabaseUtils'
import { useAuthStore } from '../stores/authStore'
import { Agendamento, Prontuario } from '../lib/supabase'
import { toast } from 'sonner'

interface AgendamentoProntuarioStatus {
  agendamentoId: string
  temProntuario: boolean
  prontuarioId?: string
  loading: boolean
}

interface UseAgendamentoProntuarioReturn {
  verificarProntuario: (agendamentoId: string) => Promise<AgendamentoProntuarioStatus>
  navegarParaProntuario: (agendamento: Agendamento) => Promise<void>
  criarProntuarioParaAgendamento: (agendamento: Agendamento) => Promise<void>
  statusCache: Map<string, AgendamentoProntuarioStatus>
  loading: boolean
}

export const useAgendamentoProntuario = (): UseAgendamentoProntuarioReturn => {
  const [statusCache, setStatusCache] = useState<Map<string, AgendamentoProntuarioStatus>>(new Map())
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  // Função para verificar se existe prontuário para um agendamento
  const verificarProntuario = useCallback(async (agendamentoId: string): Promise<AgendamentoProntuarioStatus> => {
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    // Verificar cache primeiro
    const cached = statusCache.get(agendamentoId)
    if (cached && !cached.loading) {
      return cached
    }

    const status: AgendamentoProntuarioStatus = {
      agendamentoId,
      temProntuario: false,
      loading: true
    }

    // Atualizar cache com status de loading
    setStatusCache(prev => new Map(prev.set(agendamentoId, status)))

    try {
      const result = await supabaseWithRetry(
        async () => {
          const response = await supabase
            .from('prontuarios')
            .select('id')
            .eq('agendamento_id', agendamentoId)
            .eq('psicologo_id', user.id)
            .single()
          return response
        },
        {
          maxRetries: 3,
          showToast: false,
          useCache: true,
          cacheKey: `prontuario_check_${agendamentoId}`,
          cacheTtl: 60000 // 1 minuto
        }
      )

      const finalStatus: AgendamentoProntuarioStatus = {
        agendamentoId,
        temProntuario: !result.error && !!result.data,
        prontuarioId: result.data?.id,
        loading: false
      }

      // Atualizar cache
      setStatusCache(prev => new Map(prev.set(agendamentoId, finalStatus)))
      
      return finalStatus
    } catch (error) {
      const errorStatus: AgendamentoProntuarioStatus = {
        agendamentoId,
        temProntuario: false,
        loading: false
      }

      setStatusCache(prev => new Map(prev.set(agendamentoId, errorStatus)))
      console.error('Erro ao verificar prontuário:', error)
      
      return errorStatus
    }
  }, [user, statusCache])

  // Função para navegar para o prontuário (existente ou criar novo)
  const navegarParaProntuario = useCallback(async (agendamento: Agendamento) => {
    if (!agendamento.paciente) {
      toast.error('Agendamento deve ter um paciente associado')
      return
    }

    setLoading(true)
    
    try {
      const status = await verificarProntuario(agendamento.id)
      
      if (status.temProntuario && status.prontuarioId) {
        // Navegar para editar prontuário existente
        navigate(`/prontuarios?edit=${status.prontuarioId}&agendamento=${agendamento.id}`)
        toast.success('Abrindo prontuário existente')
      } else {
        // Navegar para criar novo prontuário
        navigate(`/prontuarios?new=true&agendamento=${agendamento.id}&paciente=${agendamento.paciente_id}`)
        toast.info('Criando novo prontuário')
      }
    } catch (error) {
      console.error('Erro ao navegar para prontuário:', error)
      toast.error('Erro ao acessar prontuário')
    } finally {
      setLoading(false)
    }
  }, [verificarProntuario, navigate])

  // Função para criar prontuário diretamente para um agendamento
  const criarProntuarioParaAgendamento = useCallback(async (agendamento: Agendamento) => {
    if (!user) {
      toast.error('Usuário não autenticado')
      return
    }

    if (!agendamento.paciente) {
      toast.error('Agendamento deve ter um paciente associado')
      return
    }

    // Verificar se já existe prontuário
    const status = await verificarProntuario(agendamento.id)
    if (status.temProntuario) {
      toast.warning('Já existe um prontuário para este agendamento')
      return navegarParaProntuario(agendamento)
    }

    // Validar dependências obrigatórias
    if (!agendamento.paciente_id) {
      toast.error('Agendamento deve estar vinculado a um paciente')
      return
    }

    if (agendamento.status_sessao !== 'finalizada' && agendamento.status_sessao !== 'em_andamento') {
      toast.warning('Recomenda-se criar prontuário apenas para sessões finalizadas ou em andamento')
    }

    // Navegar para criar novo prontuário com dados pré-preenchidos
    navigate(`/prontuarios?new=true&agendamento=${agendamento.id}&paciente=${agendamento.paciente_id}`)
  }, [user, verificarProntuario, navegarParaProntuario, navigate])

  // Limpar cache quando usuário muda
  useEffect(() => {
    setStatusCache(new Map())
  }, [user])

  return {
    verificarProntuario,
    navegarParaProntuario,
    criarProntuarioParaAgendamento,
    statusCache,
    loading
  }
}

// Hook simplificado para verificar apenas se existe prontuário
export const useProntuarioExists = (agendamentoId: string | null) => {
  const [exists, setExists] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const { verificarProntuario } = useAgendamentoProntuario()

  useEffect(() => {
    if (!agendamentoId) {
      setExists(null)
      return
    }

    const checkExists = async () => {
      setLoading(true)
      try {
        const status = await verificarProntuario(agendamentoId)
        setExists(status.temProntuario)
      } catch (error) {
        console.error('Erro ao verificar prontuário:', error)
        setExists(false)
      } finally {
        setLoading(false)
      }
    }

    checkExists()
  }, [agendamentoId, verificarProntuario])

  return { exists, loading }
}