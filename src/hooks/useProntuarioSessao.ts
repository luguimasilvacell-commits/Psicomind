import { useState, useEffect, useCallback } from 'react'
import { supabase, type Prontuario, type Agendamento, type SessaoAtiva } from '../lib/supabase'
import { supabaseWithRetry } from '../lib/supabaseUtils'
import { useAuthStore } from '../stores/authStore'
import { toast } from 'sonner'

export interface UseProntuarioSessaoReturn {
  prontuario: Prontuario | null
  agendamento: Agendamento | null
  sessaoAtiva: SessaoAtiva | null
  loading: boolean
  error: string | null
  salvarProntuario: (dados: Partial<Prontuario>) => Promise<boolean>
  buscarProntuarioPorAgendamento: (agendamentoId: string) => Promise<void>
  buscarProntuarioPorId: (prontuarioId: string) => Promise<void>
  criarNovoProntuario: (agendamentoId: string, dados: Partial<Prontuario>) => Promise<string | null>
  atualizarProntuario: (prontuarioId: string, dados: Partial<Prontuario>) => Promise<boolean>
  excluirProntuario: (prontuarioId: string) => Promise<boolean>
  verificarExisteProntuario: (agendamentoId: string) => Promise<boolean>
  limparDados: () => void
}

export const useProntuarioSessao = (): UseProntuarioSessaoReturn => {
  const [prontuario, setProntuario] = useState<Prontuario | null>(null)
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null)
  const [sessaoAtiva, setSessaoAtiva] = useState<SessaoAtiva | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthStore()

  const buscarProntuarioPorAgendamento = useCallback(async (agendamentoId: string): Promise<void> => {
    if (!user) {
      setError('Usuário não autenticado')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Buscar agendamento
      const { data: agendamentoData, error: agendamentoError } = await supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:pacientes(*)
        `)
        .eq('id', agendamentoId)
        .eq('psicologo_id', user.id)
        .single()

      if (agendamentoError) {
        throw agendamentoError
      }

      setAgendamento(agendamentoData)

      // Buscar prontuário associado
      const { data: prontuarioData, error: prontuarioError } = await supabase
        .from('prontuarios')
        .select(`
          *,
          paciente:pacientes(*),
          agendamento:agendamentos(*)
        `)
        .eq('agendamento_id', agendamentoId)
        .eq('psicologo_id', user.id)
        .single()

      if (prontuarioError && prontuarioError.code !== 'PGRST116') {
        throw prontuarioError
      }

      setProntuario(prontuarioData || null)

      // Criar objeto de sessão ativa
      setSessaoAtiva({
        agendamento: agendamentoData,
        prontuario: prontuarioData || undefined
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar dados da sessão'
      setError(errorMessage)
      console.error('Erro ao buscar prontuário por agendamento:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const buscarProntuarioPorId = useCallback(async (prontuarioId: string): Promise<void> => {
    if (!user) {
      setError('Usuário não autenticado')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from('prontuarios')
        .select(`
          *,
          paciente:pacientes(*),
          agendamento:agendamentos(*)
        `)
        .eq('id', prontuarioId)
        .eq('psicologo_id', user.id)
        .single()

      if (queryError) {
        throw queryError
      }

      setProntuario(data)
      setAgendamento(data.agendamento || null)

      setSessaoAtiva({
        agendamento: data.agendamento,
        prontuario: data
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar prontuário'
      setError(errorMessage)
      console.error('Erro ao buscar prontuário por ID:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const criarNovoProntuario = useCallback(async (
    agendamentoId: string, 
    dados: Partial<Prontuario>
  ): Promise<string | null> => {
    if (!user) {
      setError('Usuário não autenticado')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      // Verificar se já existe prontuário para este agendamento
      const { data: existente } = await supabase
        .from('prontuarios')
        .select('id')
        .eq('agendamento_id', agendamentoId)
        .single()

      if (existente) {
        throw new Error('Já existe um prontuário para este agendamento')
      }

      // Buscar dados do agendamento
      const { data: agendamentoData, error: agendamentoError } = await supabase
        .from('agendamentos')
        .select('paciente_id, data_hora')
        .eq('id', agendamentoId)
        .eq('psicologo_id', user.id)
        .single()

      if (agendamentoError || !agendamentoData) {
        throw new Error('Agendamento não encontrado')
      }

      // Criar prontuário
      const prontuarioData = {
        paciente_id: agendamentoData.paciente_id,
        psicologo_id: user.id,
        agendamento_id: agendamentoId,
        data_sessao: agendamentoData.data_hora,
        conteudo: dados.conteudo || '',
        diagnostico: dados.diagnostico,
        observacoes: dados.observacoes,
        plano_tratamento: dados.plano_tratamento,
        medicamentos: dados.medicamentos,
        proxima_sessao: dados.proxima_sessao,
        duracao_sessao_segundos: dados.duracao_sessao_segundos,
        tempo_inicio_sessao: dados.tempo_inicio_sessao,
        tempo_fim_sessao: dados.tempo_fim_sessao,
        campos_estruturados: dados.campos_estruturados
      }

      const { data: novoProntuario, error: prontuarioError } = await supabase
        .from('prontuarios')
        .insert(prontuarioData)
        .select('*')
        .single()

      if (prontuarioError) {
        throw prontuarioError
      }

      setProntuario(novoProntuario)
      toast.success('Prontuário criado com sucesso!')
      return novoProntuario.id

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar prontuário'
      setError(errorMessage)
      toast.error(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [user])

  const atualizarProntuario = useCallback(async (
    prontuarioId: string, 
    dados: Partial<Prontuario>
  ): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: updateError } = await supabase
        .from('prontuarios')
        .update(dados)
        .eq('id', prontuarioId)
        .eq('psicologo_id', user.id)
        .select('*')
        .single()

      if (updateError) {
        throw updateError
      }

      setProntuario(data)
      toast.success('Prontuário atualizado com sucesso!')
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar prontuário'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  const salvarProntuario = useCallback(async (dados: Partial<Prontuario>): Promise<boolean> => {
    if (prontuario) {
      return await atualizarProntuario(prontuario.id, dados)
    } else if (agendamento) {
      const novoId = await criarNovoProntuario(agendamento.id, dados)
      return novoId !== null
    }
    return false
  }, [prontuario, agendamento, atualizarProntuario, criarNovoProntuario])

  const excluirProntuario = useCallback(async (prontuarioId: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('prontuarios')
        .delete()
        .eq('id', prontuarioId)
        .eq('psicologo_id', user.id)

      if (deleteError) {
        throw deleteError
      }

      setProntuario(null)
      toast.success('Prontuário excluído com sucesso!')
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir prontuário'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  const verificarExisteProntuario = useCallback(async (agendamentoId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const { data, error } = await supabase
        .from('prontuarios')
        .select('id')
        .eq('agendamento_id', agendamentoId)
        .eq('psicologo_id', user.id)
        .single()

      return !error && !!data
    } catch {
      return false
    }
  }, [user])

  const limparDados = useCallback(() => {
    setProntuario(null)
    setAgendamento(null)
    setSessaoAtiva(null)
    setError(null)
  }, [])

  return {
    prontuario,
    agendamento,
    sessaoAtiva,
    loading,
    error,
    salvarProntuario,
    buscarProntuarioPorAgendamento,
    buscarProntuarioPorId,
    criarNovoProntuario,
    atualizarProntuario,
    excluirProntuario,
    verificarExisteProntuario,
    limparDados
  }
}