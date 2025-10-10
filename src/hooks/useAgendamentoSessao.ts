import { useState, useCallback } from 'react'
import { supabase, type Agendamento, type SessaoAtiva, type Prontuario } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { toast } from 'sonner'
import { criarTransacaoFinanceiraAutomatica } from '../utils/financeiroUtils'

export interface UseAgendamentoSessaoReturn {
  iniciarSessao: (agendamentoId: string) => Promise<boolean>
  finalizarSessao: (agendamentoId: string) => Promise<boolean>
  pausarSessao: (agendamentoId: string) => Promise<boolean>
  retomarSessao: (agendamentoId: string) => Promise<boolean>
  criarProntuario: (agendamentoId: string, dadosProntuario: Partial<Prontuario>) => Promise<string | null>
  atualizarStatusAgendamento: (agendamentoId: string, status: Agendamento['status']) => Promise<boolean>
  loading: boolean
  error: string | null
}

export const useAgendamentoSessao = (): UseAgendamentoSessaoReturn => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthStore()

  const iniciarSessao = useCallback(async (agendamentoId: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      // Atualizar status da sessão para 'em_andamento'
      const { error: updateError } = await supabase
        .from('agendamentos')
        .update({ 
          status_sessao: 'em_andamento',
          status: 'confirmado' // Confirma o agendamento ao iniciar
        })
        .eq('id', agendamentoId)
        .eq('psicologo_id', user.id)

      if (updateError) {
        throw updateError
      }

      toast.success('Sessão iniciada com sucesso!')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao iniciar sessão'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  const finalizarSessao = useCallback(async (agendamentoId: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      // Atualizar status da sessão para 'finalizada' e agendamento para 'realizado'
      const { error: updateError } = await supabase
        .from('agendamentos')
        .update({ 
          status_sessao: 'finalizada',
          status: 'realizado'
        })
        .eq('id', agendamentoId)
        .eq('psicologo_id', user.id)

      if (updateError) {
        throw updateError
      }

      // Criar transação financeira automática quando a sessão for finalizada
      try {
        await criarTransacaoFinanceiraAutomatica(agendamentoId, user.id)
        console.log('✅ Transação financeira criada automaticamente para agendamento:', agendamentoId)
      } catch (financeiroError) {
        console.error('⚠️ Erro ao criar transação financeira automática:', financeiroError)
        // Não falhar a operação principal por causa do erro financeiro
        toast.warning('Sessão finalizada, mas houve um problema ao criar o registro financeiro')
      }

      toast.success('Sessão finalizada com sucesso!')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao finalizar sessão'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  const pausarSessao = useCallback(async (agendamentoId: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      // Manter status_sessao como 'em_andamento' mas pode ser usado para lógica de pausa
      toast.success('Sessão pausada')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao pausar sessão'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  const retomarSessao = useCallback(async (agendamentoId: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      // Garantir que status_sessao seja 'em_andamento'
      const { error: updateError } = await supabase
        .from('agendamentos')
        .update({ status_sessao: 'em_andamento' })
        .eq('id', agendamentoId)
        .eq('psicologo_id', user.id)

      if (updateError) {
        throw updateError
      }

      toast.success('Sessão retomada')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao retomar sessão'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  const criarProntuario = useCallback(async (
    agendamentoId: string, 
    dadosProntuario: Partial<Prontuario>
  ): Promise<string | null> => {
    if (!user) {
      setError('Usuário não autenticado')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      // Buscar dados do agendamento
      const { data: agendamento, error: agendamentoError } = await supabase
        .from('agendamentos')
        .select('paciente_id, data_hora')
        .eq('id', agendamentoId)
        .eq('psicologo_id', user.id)
        .single()

      if (agendamentoError || !agendamento) {
        throw new Error('Agendamento não encontrado')
      }

      // Criar prontuário
      const prontuarioData = {
        paciente_id: agendamento.paciente_id,
        psicologo_id: user.id,
        agendamento_id: agendamentoId,
        data_sessao: agendamento.data_hora,
        conteudo: dadosProntuario.conteudo || '',
        diagnostico: dadosProntuario.diagnostico,
        observacoes: dadosProntuario.observacoes,
        plano_tratamento: dadosProntuario.plano_tratamento,
        medicamentos: dadosProntuario.medicamentos,
        proxima_sessao: dadosProntuario.proxima_sessao,
        duracao_sessao_segundos: dadosProntuario.duracao_sessao_segundos,
        tempo_inicio_sessao: dadosProntuario.tempo_inicio_sessao,
        tempo_fim_sessao: dadosProntuario.tempo_fim_sessao,
        campos_estruturados: dadosProntuario.campos_estruturados
      }

      const { data: prontuario, error: prontuarioError } = await supabase
        .from('prontuarios')
        .insert(prontuarioData)
        .select('id')
        .single()

      if (prontuarioError) {
        throw prontuarioError
      }

      toast.success('Prontuário criado com sucesso!')
      return prontuario.id
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar prontuário'
      setError(errorMessage)
      toast.error(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [user])

  const atualizarStatusAgendamento = useCallback(async (
    agendamentoId: string, 
    status: Agendamento['status']
  ): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('agendamentos')
        .update({ status })
        .eq('id', agendamentoId)
        .eq('psicologo_id', user.id)

      if (updateError) {
        throw updateError
      }

      toast.success('Status do agendamento atualizado!')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar status'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  return {
    iniciarSessao,
    finalizarSessao,
    pausarSessao,
    retomarSessao,
    criarProntuario,
    atualizarStatusAgendamento,
    loading,
    error
  }
}