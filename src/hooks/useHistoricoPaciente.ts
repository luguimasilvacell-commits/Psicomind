import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, type HistoricoPaciente } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

// Tipos para filtros avançados
export interface FiltrosHistorico {
  status?: string
  tipoSessao?: string
  periodo?: 'ultimos30' | 'ultimos60' | 'ultimos90' | 'anoAtual' | 'personalizado'
  dataInicio?: string
  dataFim?: string
  temProntuario?: boolean | null
  valorMin?: number
  valorMax?: number
  duracaoMin?: number
  duracaoMax?: number
  buscarTexto?: string
}

// Tipos para alertas
export interface AlertaHistorico {
  id: string
  tipo: 'sem_prontuario' | 'faltas_consecutivas' | 'sessao_curta' | 'sessao_longa' | 'intervalo_longo' | 'padrao_cancelamento'
  severidade: 'baixa' | 'media' | 'alta'
  titulo: string
  descricao: string
  agendamentoId?: string
  dataReferencia?: string
  valor?: number
}

// Tipos para estatísticas avançadas
export interface EstatisticasAvancadas {
  totalSessoes: number
  sessoesRealizadas: number
  sessoesAgendadas: number
  sessoesCanceladas: number
  taxaComparecimento: number
  duracaoMediaPlanejada: number
  duracaoMediaReal: number
  valorTotalPeriodo: number
  valorMedioPorSessao: number
  frequenciaMedia: number // dias entre sessões
  tempoMedioProntuario: number // dias para criar prontuário
  tendenciaComparecimento: 'melhorando' | 'piorando' | 'estavel'
  ultimaSessao?: Date
  proximaSessao?: Date
}

// Tipos para agrupamento
export interface GrupoHistorico {
  periodo: string
  sessoes: HistoricoPaciente[]
  estatisticas: {
    total: number
    realizadas: number
    canceladas: number
    valorTotal: number
  }
}

export interface UseHistoricoPacienteReturn {
  historico: HistoricoPaciente[]
  historicoFiltrado: HistoricoPaciente[]
  loading: boolean
  error: string | null
  filtros: FiltrosHistorico
  alertas: AlertaHistorico[]
  estatisticas: EstatisticasAvancadas
  gruposTemporais: GrupoHistorico[]
  
  // Funções básicas
  buscarHistorico: (pacienteId: string) => Promise<void>
  recarregarHistorico: () => Promise<void>
  
  // Funções de filtro
  aplicarFiltros: (novosFiltros: Partial<FiltrosHistorico>) => void
  limparFiltros: () => void
  
  // Funções de análise
  analisarPadroes: () => AlertaHistorico[]
  obterEstatisticasAvancadas: () => EstatisticasAvancadas
  agruparPorPeriodo: (tipo: 'mes' | 'trimestre' | 'ano') => GrupoHistorico[]
  
  // Funções de exportação
  exportarCSV: () => string
  exportarJSON: () => string
  
  // Funções de comparação
  compararPeriodos: (periodo1: { inicio: string; fim: string }, periodo2: { inicio: string; fim: string }) => {
    periodo1: EstatisticasAvancadas
    periodo2: EstatisticasAvancadas
    diferencas: Record<string, number>
  }
}

export const useHistoricoPaciente = (pacienteId?: string): UseHistoricoPacienteReturn => {
  const [historico, setHistorico] = useState<HistoricoPaciente[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filtros, setFiltros] = useState<FiltrosHistorico>({})
  const { user } = useAuthStore()

  // Função principal para buscar histórico
  const buscarHistorico = useCallback(async (targetPacienteId: string): Promise<void> => {
    if (!user) {
      setError('Usuário não autenticado')
      return
    }

    setLoading(true)
    setError(null)

    try {
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

  // Histórico filtrado com base nos filtros aplicados
  const historicoFiltrado = useMemo(() => {
    let resultado = [...historico]

    // Filtro por status
    if (filtros.status) {
      resultado = resultado.filter(item => item.status_agendamento === filtros.status)
    }

    // Filtro por tipo de sessão
    if (filtros.tipoSessao) {
      resultado = resultado.filter(item => item.tipo_sessao === filtros.tipoSessao)
    }

    // Filtro por período
    if (filtros.periodo) {
      const hoje = new Date()
      let dataInicio: Date
      
      switch (filtros.periodo) {
        case 'ultimos30':
          dataInicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'ultimos60':
          dataInicio = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000)
          break
        case 'ultimos90':
          dataInicio = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case 'anoAtual':
          dataInicio = new Date(hoje.getFullYear(), 0, 1)
          break
        default:
          dataInicio = filtros.dataInicio ? new Date(filtros.dataInicio) : new Date(0)
      }
      
      const dataFim = filtros.dataFim ? new Date(filtros.dataFim) : hoje
      
      resultado = resultado.filter(item => {
        const dataItem = new Date(item.data_hora)
        return dataItem >= dataInicio && dataItem <= dataFim
      })
    }

    // Filtro por prontuário
    if (filtros.temProntuario !== null && filtros.temProntuario !== undefined) {
      resultado = resultado.filter(item => item.tem_prontuario === filtros.temProntuario)
    }

    // Filtro por valor
    if (filtros.valorMin !== undefined) {
      resultado = resultado.filter(item => item.valor >= filtros.valorMin!)
    }
    if (filtros.valorMax !== undefined) {
      resultado = resultado.filter(item => item.valor <= filtros.valorMax!)
    }

    // Filtro por duração
    if (filtros.duracaoMin !== undefined) {
      resultado = resultado.filter(item => 
        item.duracao_sessao_segundos ? 
        (item.duracao_sessao_segundos / 60) >= filtros.duracaoMin! : 
        item.duracao_minutos >= filtros.duracaoMin!
      )
    }
    if (filtros.duracaoMax !== undefined) {
      resultado = resultado.filter(item => 
        item.duracao_sessao_segundos ? 
        (item.duracao_sessao_segundos / 60) <= filtros.duracaoMax! : 
        item.duracao_minutos <= filtros.duracaoMax!
      )
    }

    // Filtro por busca textual
    if (filtros.buscarTexto) {
      const termo = filtros.buscarTexto.toLowerCase()
      resultado = resultado.filter(item => 
        item.observacoes?.toLowerCase().includes(termo) ||
        item.diagnostico?.toLowerCase().includes(termo) ||
        item.plano_tratamento?.toLowerCase().includes(termo) ||
        item.tipo_sessao?.toLowerCase().includes(termo)
      )
    }

    return resultado
  }, [historico, filtros])

  // Análise de padrões e alertas
  const analisarPadroes = useCallback((): AlertaHistorico[] => {
    const alertas: AlertaHistorico[] = []
    const hoje = new Date()

    // 1. Sessões sem prontuário há mais de 7 dias
    const sessoesRealizadas = historico.filter(s => s.status_agendamento === 'realizado')
    sessoesRealizadas.forEach(sessao => {
      if (!sessao.tem_prontuario) {
        const diasSemProntuario = Math.floor((hoje.getTime() - new Date(sessao.data_hora).getTime()) / (1000 * 60 * 60 * 24))
        if (diasSemProntuario > 7) {
          alertas.push({
            id: `sem_prontuario_${sessao.agendamento_id}`,
            tipo: 'sem_prontuario',
            severidade: diasSemProntuario > 30 ? 'alta' : diasSemProntuario > 14 ? 'media' : 'baixa',
            titulo: 'Sessão sem prontuário',
            descricao: `Sessão realizada há ${diasSemProntuario} dias sem prontuário`,
            agendamentoId: sessao.agendamento_id,
            dataReferencia: sessao.data_hora,
            valor: diasSemProntuario
          })
        }
      }
    })

    // 2. Faltas consecutivas
    const sessoesOrdenadas = [...historico].sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
    let faltasConsecutivas = 0
    let ultimaFalta: HistoricoPaciente | null = null

    sessoesOrdenadas.forEach(sessao => {
      if (['cancelado', 'faltou'].includes(sessao.status_agendamento)) {
        faltasConsecutivas++
        ultimaFalta = sessao
      } else if (sessao.status_agendamento === 'realizado') {
        if (faltasConsecutivas >= 3 && ultimaFalta) {
          alertas.push({
            id: `faltas_consecutivas_${ultimaFalta.agendamento_id}`,
            tipo: 'faltas_consecutivas',
            severidade: faltasConsecutivas >= 5 ? 'alta' : 'media',
            titulo: 'Faltas consecutivas',
            descricao: `${faltasConsecutivas} faltas consecutivas detectadas`,
            agendamentoId: ultimaFalta.agendamento_id,
            dataReferencia: ultimaFalta.data_hora,
            valor: faltasConsecutivas
          })
        }
        faltasConsecutivas = 0
        ultimaFalta = null
      }
    })

    // 3. Sessões muito curtas ou longas
    historico.forEach(sessao => {
      if (sessao.duracao_sessao_segundos) {
        const duracaoMinutos = sessao.duracao_sessao_segundos / 60
        
        if (duracaoMinutos < 30) {
          alertas.push({
            id: `sessao_curta_${sessao.agendamento_id}`,
            tipo: 'sessao_curta',
            severidade: duracaoMinutos < 15 ? 'alta' : 'media',
            titulo: 'Sessão muito curta',
            descricao: `Sessão durou apenas ${Math.round(duracaoMinutos)} minutos`,
            agendamentoId: sessao.agendamento_id,
            dataReferencia: sessao.data_hora,
            valor: duracaoMinutos
          })
        } else if (duracaoMinutos > 90) {
          alertas.push({
            id: `sessao_longa_${sessao.agendamento_id}`,
            tipo: 'sessao_longa',
            severidade: duracaoMinutos > 120 ? 'alta' : 'baixa',
            titulo: 'Sessão muito longa',
            descricao: `Sessão durou ${Math.round(duracaoMinutos)} minutos`,
            agendamentoId: sessao.agendamento_id,
            dataReferencia: sessao.data_hora,
            valor: duracaoMinutos
          })
        }
      }
    })

    // 4. Intervalos longos entre sessões
    const sessoesRealizadasOrdenadas = sessoesRealizadas.sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
    for (let i = 1; i < sessoesRealizadasOrdenadas.length; i++) {
      const sessaoAnterior = sessoesRealizadasOrdenadas[i - 1]
      const sessaoAtual = sessoesRealizadasOrdenadas[i]
      const diasEntre = Math.floor((new Date(sessaoAtual.data_hora).getTime() - new Date(sessaoAnterior.data_hora).getTime()) / (1000 * 60 * 60 * 24))
      
      if (diasEntre > 15) {
        alertas.push({
          id: `intervalo_longo_${sessaoAtual.agendamento_id}`,
          tipo: 'intervalo_longo',
          severidade: diasEntre > 30 ? 'alta' : 'media',
          titulo: 'Intervalo longo entre sessões',
          descricao: `${diasEntre} dias entre sessões`,
          agendamentoId: sessaoAtual.agendamento_id,
          dataReferencia: sessaoAtual.data_hora,
          valor: diasEntre
        })
      }
    }

    // 5. Padrão de cancelamento
    const ultimasSessoes = sessoesOrdenadas.slice(-10) // últimas 10 sessões
    const cancelamentos = ultimasSessoes.filter(s => ['cancelado', 'faltou'].includes(s.status_agendamento)).length
    const taxaCancelamento = cancelamentos / ultimasSessoes.length

    if (taxaCancelamento > 0.3 && ultimasSessoes.length >= 5) {
      alertas.push({
        id: `padrao_cancelamento_${pacienteId}`,
        tipo: 'padrao_cancelamento',
        severidade: taxaCancelamento > 0.5 ? 'alta' : 'media',
        titulo: 'Padrão de cancelamento',
        descricao: `${Math.round(taxaCancelamento * 100)}% de cancelamentos nas últimas sessões`,
        valor: taxaCancelamento
      })
    }

    return alertas
  }, [historico, pacienteId])

  // Estatísticas avançadas
  const obterEstatisticasAvancadas = useCallback((): EstatisticasAvancadas => {
    const totalSessoes = historicoFiltrado.length
    const sessoesRealizadas = historicoFiltrado.filter(item => item.status_agendamento === 'realizado').length
    const sessoesAgendadas = historicoFiltrado.filter(item => 
      ['agendado', 'confirmado'].includes(item.status_agendamento)
    ).length
    const sessoesCanceladas = historicoFiltrado.filter(item => 
      ['cancelado', 'faltou'].includes(item.status_agendamento)
    ).length

    const taxaComparecimento = totalSessoes > 0 ? (sessoesRealizadas / totalSessoes) * 100 : 0

    const duracaoMediaPlanejada = totalSessoes > 0 ? 
      historicoFiltrado.reduce((acc, item) => acc + item.duracao_minutos, 0) / totalSessoes : 0

    const sessoesComDuracaoReal = historicoFiltrado.filter(item => item.duracao_sessao_segundos)
    const duracaoMediaReal = sessoesComDuracaoReal.length > 0 ? 
      sessoesComDuracaoReal.reduce((acc, item) => acc + (item.duracao_sessao_segundos! / 60), 0) / sessoesComDuracaoReal.length : 0

    const valorTotalPeriodo = historicoFiltrado
      .filter(item => item.status_agendamento === 'realizado')
      .reduce((acc, item) => acc + item.valor, 0)

    const valorMedioPorSessao = sessoesRealizadas > 0 ? valorTotalPeriodo / sessoesRealizadas : 0

    // Calcular frequência média (dias entre sessões)
    const sessoesOrdenadas = [...historicoFiltrado]
      .filter(s => s.status_agendamento === 'realizado')
      .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
    
    let frequenciaMedia = 0
    if (sessoesOrdenadas.length > 1) {
      const intervalos = []
      for (let i = 1; i < sessoesOrdenadas.length; i++) {
        const dias = Math.floor((new Date(sessoesOrdenadas[i].data_hora).getTime() - new Date(sessoesOrdenadas[i-1].data_hora).getTime()) / (1000 * 60 * 60 * 24))
        intervalos.push(dias)
      }
      frequenciaMedia = intervalos.reduce((acc, val) => acc + val, 0) / intervalos.length
    }

    // Calcular tempo médio para criação de prontuário
    const sessoesComProntuario = historicoFiltrado.filter(s => s.tem_prontuario && s.prontuario_criado_em)
    let tempoMedioProntuario = 0
    if (sessoesComProntuario.length > 0) {
      const tempos = sessoesComProntuario.map(s => {
        const dataSessao = new Date(s.data_hora)
        const dataProntuario = new Date(s.prontuario_criado_em!)
        return Math.floor((dataProntuario.getTime() - dataSessao.getTime()) / (1000 * 60 * 60 * 24))
      })
      tempoMedioProntuario = tempos.reduce((acc, val) => acc + val, 0) / tempos.length
    }

    // Calcular tendência de comparecimento
    const ultimasSessoes = sessoesOrdenadas.slice(-6) // últimas 6 sessões
    const primeiraMetade = ultimasSessoes.slice(0, 3)
    const segundaMetade = ultimasSessoes.slice(3)
    
    const taxaPrimeira = primeiraMetade.length > 0 ? 
      primeiraMetade.filter(s => s.status_agendamento === 'realizado').length / primeiraMetade.length : 0
    const taxaSegunda = segundaMetade.length > 0 ? 
      segundaMetade.filter(s => s.status_agendamento === 'realizado').length / segundaMetade.length : 0
    
    let tendenciaComparecimento: 'melhorando' | 'piorando' | 'estavel' = 'estavel'
    if (taxaSegunda > taxaPrimeira + 0.1) tendenciaComparecimento = 'melhorando'
    else if (taxaSegunda < taxaPrimeira - 0.1) tendenciaComparecimento = 'piorando'

    const ultimaSessao = sessoesOrdenadas.length > 0 ? new Date(sessoesOrdenadas[sessoesOrdenadas.length - 1].data_hora) : undefined
    const proximaSessao = historicoFiltrado
      .filter(s => ['agendado', 'confirmado'].includes(s.status_agendamento) && new Date(s.data_hora) > new Date())
      .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())[0]
    const proximaSessaoData = proximaSessao ? new Date(proximaSessao.data_hora) : undefined

    return {
      totalSessoes,
      sessoesRealizadas,
      sessoesAgendadas,
      sessoesCanceladas,
      taxaComparecimento,
      duracaoMediaPlanejada,
      duracaoMediaReal,
      valorTotalPeriodo,
      valorMedioPorSessao,
      frequenciaMedia,
      tempoMedioProntuario,
      tendenciaComparecimento,
      ultimaSessao,
      proximaSessao: proximaSessaoData
    }
  }, [historicoFiltrado])

  // Agrupamento por período
  const agruparPorPeriodo = useCallback((tipo: 'mes' | 'trimestre' | 'ano'): GrupoHistorico[] => {
    const grupos: Record<string, HistoricoPaciente[]> = {}

    historicoFiltrado.forEach(sessao => {
      const data = new Date(sessao.data_hora)
      let chave: string

      switch (tipo) {
        case 'mes':
          chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
          break
        case 'trimestre':
          const trimestre = Math.floor(data.getMonth() / 3) + 1
          chave = `${data.getFullYear()}-T${trimestre}`
          break
        case 'ano':
          chave = String(data.getFullYear())
          break
      }

      if (!grupos[chave]) {
        grupos[chave] = []
      }
      grupos[chave].push(sessao)
    })

    return Object.entries(grupos).map(([periodo, sessoes]) => ({
      periodo,
      sessoes,
      estatisticas: {
        total: sessoes.length,
        realizadas: sessoes.filter(s => s.status_agendamento === 'realizado').length,
        canceladas: sessoes.filter(s => ['cancelado', 'faltou'].includes(s.status_agendamento)).length,
        valorTotal: sessoes.filter(s => s.status_agendamento === 'realizado').reduce((acc, s) => acc + s.valor, 0)
      }
    })).sort((a, b) => a.periodo.localeCompare(b.periodo))
  }, [historicoFiltrado])

  // Funções de filtro
  const aplicarFiltros = useCallback((novosFiltros: Partial<FiltrosHistorico>) => {
    setFiltros(prev => ({ ...prev, ...novosFiltros }))
  }, [])

  const limparFiltros = useCallback(() => {
    setFiltros({})
  }, [])

  // Funções de exportação
  const exportarCSV = useCallback((): string => {
    const headers = [
      'Data/Hora', 'Tipo', 'Status Agendamento', 'Status Sessão', 'Duração Planejada (min)', 
      'Duração Real (min)', 'Valor', 'Tem Prontuário', 'Diagnóstico', 'Observações'
    ]
    
    const rows = historicoFiltrado.map(sessao => [
      new Date(sessao.data_hora).toLocaleString('pt-BR'),
      sessao.tipo_sessao || '',
      sessao.status_agendamento || '',
      sessao.status_sessao || '',
      sessao.duracao_minutos || '',
      sessao.duracao_sessao_segundos ? Math.round(sessao.duracao_sessao_segundos / 60) : '',
      `R$ ${sessao.valor.toFixed(2)}`,
      sessao.tem_prontuario ? 'Sim' : 'Não',
      sessao.diagnostico || '',
      sessao.observacoes || ''
    ])

    return [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')
  }, [historicoFiltrado])

  const exportarJSON = useCallback((): string => {
    return JSON.stringify(historicoFiltrado, null, 2)
  }, [historicoFiltrado])

  // Comparação entre períodos
  const compararPeriodos = useCallback((
    periodo1: { inicio: string; fim: string }, 
    periodo2: { inicio: string; fim: string }
  ) => {
    const filtrarPorPeriodo = (inicio: string, fim: string) => {
      return historico.filter(item => {
        const dataItem = new Date(item.data_hora)
        return dataItem >= new Date(inicio) && dataItem <= new Date(fim)
      })
    }

    const dados1 = filtrarPorPeriodo(periodo1.inicio, periodo1.fim)
    const dados2 = filtrarPorPeriodo(periodo2.inicio, periodo2.fim)

    // Calcular estatísticas para cada período
    const calcularEstatisticas = (dados: HistoricoPaciente[]): EstatisticasAvancadas => {
      const totalSessoes = dados.length
      const sessoesRealizadas = dados.filter(item => item.status_agendamento === 'realizado').length
      const sessoesAgendadas = dados.filter(item => ['agendado', 'confirmado'].includes(item.status_agendamento)).length
      const sessoesCanceladas = dados.filter(item => ['cancelado', 'faltou'].includes(item.status_agendamento)).length
      
      return {
        totalSessoes,
        sessoesRealizadas,
        sessoesAgendadas,
        sessoesCanceladas,
        taxaComparecimento: totalSessoes > 0 ? (sessoesRealizadas / totalSessoes) * 100 : 0,
        duracaoMediaPlanejada: totalSessoes > 0 ? dados.reduce((acc, item) => acc + item.duracao_minutos, 0) / totalSessoes : 0,
        duracaoMediaReal: 0, // Simplificado para comparação
        valorTotalPeriodo: dados.filter(item => item.status_agendamento === 'realizado').reduce((acc, item) => acc + item.valor, 0),
        valorMedioPorSessao: sessoesRealizadas > 0 ? dados.filter(item => item.status_agendamento === 'realizado').reduce((acc, item) => acc + item.valor, 0) / sessoesRealizadas : 0,
        frequenciaMedia: 0, // Simplificado
        tempoMedioProntuario: 0, // Simplificado
        tendenciaComparecimento: 'estavel' as const
      }
    }

    const stats1 = calcularEstatisticas(dados1)
    const stats2 = calcularEstatisticas(dados2)

    const diferencas = {
      totalSessoes: stats2.totalSessoes - stats1.totalSessoes,
      sessoesRealizadas: stats2.sessoesRealizadas - stats1.sessoesRealizadas,
      taxaComparecimento: stats2.taxaComparecimento - stats1.taxaComparecimento,
      valorTotalPeriodo: stats2.valorTotalPeriodo - stats1.valorTotalPeriodo,
      valorMedioPorSessao: stats2.valorMedioPorSessao - stats1.valorMedioPorSessao
    }

    return {
      periodo1: stats1,
      periodo2: stats2,
      diferencas
    }
  }, [historico])

  // Memoized values
  const alertas = useMemo(() => analisarPadroes(), [analisarPadroes])
  const estatisticas = useMemo(() => obterEstatisticasAvancadas(), [obterEstatisticasAvancadas])
  const gruposTemporais = useMemo(() => agruparPorPeriodo('mes'), [agruparPorPeriodo])

  // Carregar histórico automaticamente
  useEffect(() => {
    if (pacienteId && user) {
      buscarHistorico(pacienteId)
    }
  }, [pacienteId, user, buscarHistorico])

  return {
    historico,
    historicoFiltrado,
    loading,
    error,
    filtros,
    alertas,
    estatisticas,
    gruposTemporais,
    buscarHistorico,
    recarregarHistorico,
    aplicarFiltros,
    limparFiltros,
    analisarPadroes,
    obterEstatisticasAvancadas,
    agruparPorPeriodo,
    exportarCSV,
    exportarJSON,
    compararPeriodos
  }
}