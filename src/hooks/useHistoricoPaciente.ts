import { useState, useEffect, useCallback } from 'react'
import { supabase, type HistoricoPaciente } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export interface UseHistoricoPacienteReturn {
  historico: HistoricoPaciente[]
  loading: boolean
  error: string | null
  buscarHistorico: (pacienteId: string) => Promise<void>
  recarregarHistorico: () => Promise<void>
  filtrarPorPeriodo: (dataInicio: string, dataFim: string) => HistoricoPaciente[]
  filtrarPorStatus: (status: string) => HistoricoPaciente[]
  obterEstatisticas: () => {
    totalSessoes: number
    sessoesRealizadas: number
    sessoesAgendadas: number
    sessoesCanceladas: number
    tempoTotalSessoes: number
    valorTotalSessoes: number
  }
}

export const useHistoricoPaciente = (pacienteId?: string): UseHistoricoPacienteReturn => {
  const [historico, setHistorico] = useState<HistoricoPaciente[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthStore()

  const buscarHistorico = useCallback(async (targetPacienteId: string): Promise<void> => {
    if (!user) {
      setError('Usuário não autenticado')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Usar a view vw_historico_paciente criada na migração
      const { data, error: queryError } = await supabase
        .from('vw_historico_paciente')
        .select('*')
        .eq('paciente_id', targetPacienteId)
        .order('data_hora', { ascending: false })

      if (queryError) {
        throw queryError
      }

      setHistorico(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar histórico'
      setError(errorMessage)
      console.error('Erro ao buscar histórico:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const recarregarHistorico = useCallback(async (): Promise<void> => {
    if (pacienteId) {
      await buscarHistorico(pacienteId)
    }
  }, [pacienteId, buscarHistorico])

  const filtrarPorPeriodo = useCallback((dataInicio: string, dataFim: string): HistoricoPaciente[] => {
    return historico.filter(item => {
      const dataItem = new Date(item.data_hora)
      const inicio = new Date(dataInicio)
      const fim = new Date(dataFim)
      return dataItem >= inicio && dataItem <= fim
    })
  }, [historico])

  const filtrarPorStatus = useCallback((status: string): HistoricoPaciente[] => {
    return historico.filter(item => item.status_agendamento === status)
  }, [historico])

  const obterEstatisticas = useCallback(() => {
    const totalSessoes = historico.length
    const sessoesRealizadas = historico.filter(item => item.status_agendamento === 'realizado').length
    const sessoesAgendadas = historico.filter(item => 
      ['agendado', 'confirmado'].includes(item.status_agendamento)
    ).length
    const sessoesCanceladas = historico.filter(item => 
      ['cancelado', 'faltou'].includes(item.status_agendamento)
    ).length
    
    const tempoTotalSessoes = historico
      .filter(item => item.duracao_sessao_segundos)
      .reduce((total, item) => total + (item.duracao_sessao_segundos || 0), 0)
    
    const valorTotalSessoes = historico
      .filter(item => item.status_agendamento === 'realizado')
      .reduce((total, item) => total + item.valor, 0)

    return {
      totalSessoes,
      sessoesRealizadas,
      sessoesAgendadas,
      sessoesCanceladas,
      tempoTotalSessoes,
      valorTotalSessoes
    }
  }, [historico])

  // Carregar histórico automaticamente se pacienteId for fornecido
  useEffect(() => {
    if (pacienteId && user) {
      buscarHistorico(pacienteId)
    }
  }, [pacienteId, user, buscarHistorico])

  return {
    historico,
    loading,
    error,
    buscarHistorico,
    recarregarHistorico,
    filtrarPorPeriodo,
    filtrarPorStatus,
    obterEstatisticas
  }
}