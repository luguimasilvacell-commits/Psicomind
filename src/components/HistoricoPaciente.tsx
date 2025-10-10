import React, { useState, useEffect } from 'react'
import { 
  Calendar, Clock, FileText, Filter, Search, User, ChevronDown, ChevronUp, Plus, Edit, Eye, Link,
  AlertTriangle, TrendingUp, TrendingDown, Minus, Download, BarChart3, Activity, Target,
  CheckCircle, XCircle, AlertCircle, Info, Zap, Timer, DollarSign, Users, BookOpen, CreditCard
} from 'lucide-react'
import { useHistoricoPaciente, type FiltrosHistorico, type AlertaHistorico } from '../hooks/useHistoricoPaciente'
import { formatDate, formatTime } from '../lib/utils'
import { buscarTransacoesVinculadas } from '../utils/financeiroUtils'
import { TransacaoFinanceira } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

interface HistoricoPacienteProps {
  pacienteId: string
  pacienteNome: string
  onCreateProntuario?: (agendamentoId: string) => void
  onEditProntuario?: (prontuarioId: string, agendamentoId: string) => void
  onViewProntuario?: (prontuarioId: string) => void
  onNavigateToFinanceiro?: (transacaoId?: string) => void
}

export default function HistoricoPaciente({ 
  pacienteId, 
  pacienteNome, 
  onCreateProntuario, 
  onEditProntuario, 
  onViewProntuario,
  onNavigateToFinanceiro 
}: HistoricoPacienteProps) {
  const [expandedSessao, setExpandedSessao] = useState<string | null>(null)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [agrupamento, setAgrupamento] = useState<'mes' | 'trimestre' | 'ano'>('mes')
  const [visualizacao, setVisualizacao] = useState<'lista' | 'timeline' | 'agrupado'>('lista')
  const [mostrarAlertas, setMostrarAlertas] = useState(true)
  const [transacoesVinculadas, setTransacoesVinculadas] = useState<Record<string, TransacaoFinanceira[]>>({})
  
  const { user } = useAuthStore()
  
  const {
    historicoFiltrado,
    loading,
    error,
    filtros,
    alertas,
    estatisticas,
    gruposTemporais,
    aplicarFiltros,
    limparFiltros,
    agruparPorPeriodo,
    exportarCSV,
    exportarJSON
  } = useHistoricoPaciente(pacienteId)

  // Carregar transações vinculadas quando o histórico for carregado
  useEffect(() => {
    const carregarTransacoes = async () => {
      if (!user?.id || !historicoFiltrado.length) return
      
      const transacoes: Record<string, TransacaoFinanceira[]> = {}
      
      for (const sessao of historicoFiltrado) {
        try {
          const transacoesVinculadas = await buscarTransacoesVinculadas(sessao.id, user.id)
          if (transacoesVinculadas.length > 0) {
            transacoes[sessao.id] = transacoesVinculadas
          }
        } catch (error) {
          console.error(`Erro ao carregar transações para agendamento ${sessao.id}:`, error)
        }
      }
      
      setTransacoesVinculadas(transacoes)
    }
    
    carregarTransacoes()
  }, [historicoFiltrado, user?.id])

  const toggleSessaoExpanded = (sessaoId: string) => {
    setExpandedSessao(expandedSessao === sessaoId ? null : sessaoId)
  }

  const handleExportarCSV = () => {
    const csv = exportarCSV()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `historico_${pacienteNome}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportarJSON = () => {
    const json = exportarJSON()
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `historico_${pacienteNome}_${new Date().toISOString().split('T')[0]}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getAlertaIcon = (tipo: AlertaHistorico['tipo']) => {
    switch (tipo) {
      case 'sem_prontuario': return <FileText className="h-4 w-4" />
      case 'faltas_consecutivas': return <XCircle className="h-4 w-4" />
      case 'sessao_curta': return <Timer className="h-4 w-4" />
      case 'sessao_longa': return <Clock className="h-4 w-4" />
      case 'intervalo_longo': return <Calendar className="h-4 w-4" />
      case 'padrao_cancelamento': return <AlertTriangle className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const getAlertaColor = (severidade: AlertaHistorico['severidade']) => {
    switch (severidade) {
      case 'alta': return 'bg-red-50 border-red-200 text-red-800'
      case 'media': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'baixa': return 'bg-blue-50 border-blue-200 text-blue-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getSeveridadeIcon = (severidade: AlertaHistorico['severidade']) => {
    switch (severidade) {
      case 'alta': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'media': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'baixa': return <Info className="h-4 w-4 text-blue-500" />
      default: return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'melhorando': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'piorando': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getSessaoStatusColor = (status: string) => {
    switch (status) {
      case 'realizado': return 'bg-green-100 text-green-800 border-green-200'
      case 'agendado': case 'confirmado': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelado': case 'faltou': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSessaoStatusIcon = (status: string) => {
    switch (status) {
      case 'realizado': return <CheckCircle className="h-4 w-4" />
      case 'agendado': case 'confirmado': return <Calendar className="h-4 w-4" />
      case 'cancelado': case 'faltou': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const hasAlertas = (agendamentoId: string) => {
    return alertas.some(alerta => alerta.agendamentoId === agendamentoId)
  }

  const getAlertasSessao = (agendamentoId: string) => {
    return alertas.filter(alerta => alerta.agendamentoId === agendamentoId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando histórico...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Erro ao carregar histórico: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com Informações do Paciente */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-sm border border-blue-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-3 rounded-full">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Histórico de {pacienteNome}</h2>
              <p className="text-gray-600">Análise completa do tratamento</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="bg-white hover:bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
            </button>
            
            <div className="relative">
              <select
                value={visualizacao}
                onChange={(e) => setVisualizacao(e.target.value as any)}
                className="bg-white border border-gray-200 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="lista">Lista</option>
                <option value="timeline">Timeline</option>
                <option value="agrupado">Agrupado</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={handleExportarCSV}
                className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-lg transition-colors"
                title="Exportar CSV"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={handleExportarJSON}
                className="bg-purple-100 hover:bg-purple-200 text-purple-700 p-2 rounded-lg transition-colors"
                title="Exportar JSON"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Estatísticas Principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{estatisticas.totalSessoes}</div>
                <div className="text-sm text-blue-800">Total</div>
              </div>
              <Users className="h-6 w-6 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{estatisticas.sessoesRealizadas}</div>
                <div className="text-sm text-green-800">Realizadas</div>
              </div>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-yellow-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{estatisticas.sessoesAgendadas}</div>
                <div className="text-sm text-yellow-800">Agendadas</div>
              </div>
              <Calendar className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{estatisticas.taxaComparecimento.toFixed(1)}%</div>
                <div className="text-sm text-purple-800">Comparecimento</div>
              </div>
              <Target className="h-6 w-6 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-indigo-600">R$ {estatisticas.valorTotalPeriodo.toFixed(0)}</div>
                <div className="text-sm text-indigo-800">Valor Total</div>
              </div>
              <DollarSign className="h-6 w-6 text-indigo-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-1">
                  <span className="text-2xl font-bold text-gray-600">{estatisticas.frequenciaMedia.toFixed(0)}</span>
                  {getTendenciaIcon(estatisticas.tendenciaComparecimento)}
                </div>
                <div className="text-sm text-gray-800">Dias entre sessões</div>
              </div>
              <Activity className="h-6 w-6 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && mostrarAlertas && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-orange-500" />
              Alertas e Recomendações ({alertas.length})
            </h3>
            <button
              onClick={() => setMostrarAlertas(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alertas.slice(0, 6).map((alerta) => (
              <div
                key={alerta.id}
                className={`p-4 rounded-lg border-2 ${getAlertaColor(alerta.severidade)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getSeveridadeIcon(alerta.severidade)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {getAlertaIcon(alerta.tipo)}
                      <h4 className="font-medium">{alerta.titulo}</h4>
                    </div>
                    <p className="text-sm opacity-90">{alerta.descricao}</p>
                    {alerta.dataReferencia && (
                      <p className="text-xs mt-1 opacity-75">
                        {formatDate(alerta.dataReferencia)} às {formatTime(alerta.dataReferencia)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {alertas.length > 6 && (
            <div className="mt-4 text-center">
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                Ver todos os {alertas.length} alertas
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filtros Avançados */}
      {mostrarFiltros && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filtros Avançados</h3>
            <button
              onClick={limparFiltros}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Limpar Filtros
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro por Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filtros.status || ''}
                onChange={(e) => aplicarFiltros({ status: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="realizado">Realizado</option>
                <option value="agendado">Agendado</option>
                <option value="confirmado">Confirmado</option>
                <option value="cancelado">Cancelado</option>
                <option value="faltou">Faltou</option>
              </select>
            </div>

            {/* Filtro por Período */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
              <select
                value={filtros.periodo || ''}
                onChange={(e) => aplicarFiltros({ periodo: e.target.value as any || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="ultimos30">Últimos 30 dias</option>
                <option value="ultimos60">Últimos 60 dias</option>
                <option value="ultimos90">Últimos 90 dias</option>
                <option value="anoAtual">Ano atual</option>
              </select>
            </div>

            {/* Filtro por Prontuário */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prontuário</label>
              <select
                value={filtros.temProntuario === null ? '' : String(filtros.temProntuario)}
                onChange={(e) => aplicarFiltros({ 
                  temProntuario: e.target.value === '' ? null : e.target.value === 'true' 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Com prontuário</option>
                <option value="false">Sem prontuário</option>
              </select>
            </div>

            {/* Busca Textual */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filtros.buscarTexto || ''}
                  onChange={(e) => aplicarFiltros({ buscarTexto: e.target.value || undefined })}
                  placeholder="Buscar em observações..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filtros de Valor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Mínimo</label>
              <input
                type="number"
                value={filtros.valorMin || ''}
                onChange={(e) => aplicarFiltros({ valorMin: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="R$ 0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Máximo</label>
              <input
                type="number"
                value={filtros.valorMax || ''}
                onChange={(e) => aplicarFiltros({ valorMax: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="R$ 1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filtros de Duração */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração Mín. (min)</label>
              <input
                type="number"
                value={filtros.duracaoMin || ''}
                onChange={(e) => aplicarFiltros({ duracaoMin: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="30"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração Máx. (min)</label>
              <input
                type="number"
                value={filtros.duracaoMax || ''}
                onChange={(e) => aplicarFiltros({ duracaoMax: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="120"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Lista de Sessões */}
      <div className="space-y-4">
        {historicoFiltrado.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma sessão encontrada</h3>
            <p className="text-gray-600">Ajuste os filtros ou verifique se há sessões cadastradas para este paciente.</p>
          </div>
        ) : (
          historicoFiltrado.map((sessao) => (
            <div 
              key={sessao.agendamento_id} 
              className={`bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md ${
                hasAlertas(sessao.agendamento_id) ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'
              }`}
            >
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => toggleSessaoExpanded(sessao.agendamento_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    {/* Data e Hora */}
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{formatDate(sessao.data_hora)}</div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatTime(sessao.data_hora)}
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className={`px-4 py-2 rounded-full text-sm font-medium border flex items-center space-x-2 ${getSessaoStatusColor(sessao.status_agendamento)}`}>
                      {getSessaoStatusIcon(sessao.status_agendamento)}
                      <span className="capitalize">{sessao.status_agendamento}</span>
                    </div>

                    {/* Tipo de Sessão */}
                    {sessao.tipo_sessao && (
                      <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium border border-purple-200 flex items-center space-x-2">
                        <BookOpen className="h-4 w-4" />
                        <span>{sessao.tipo_sessao}</span>
                      </div>
                    )}

                    {/* Duração */}
                    {sessao.duracao_sessao_segundos && (
                      <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium border border-blue-200 flex items-center space-x-2">
                        <Timer className="h-4 w-4" />
                        <span>{Math.round(sessao.duracao_sessao_segundos / 60)}min</span>
                      </div>
                    )}

                    {/* Valor */}
                    {sessao.valor > 0 && (
                      <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium border border-green-200 flex items-center space-x-2">
                        <DollarSign className="h-4 w-4" />
                        <span>R$ {sessao.valor.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Status Financeiro */}
                    {(() => {
                      const transacoes = transacoesVinculadas[sessao.id] || []
                      const temTransacao = transacoes.length > 0
                      
                      if (temTransacao) {
                        const primeiraTransacao = transacoes[0]
                        return (
                          <button
                            onClick={() => onNavigateToFinanceiro?.(primeiraTransacao.id)}
                            className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium border border-green-200 flex items-center space-x-2 hover:bg-green-200 transition-colors"
                          >
                            <CreditCard className="h-4 w-4" />
                            <span>Financeiro Vinculado</span>
                          </button>
                        )
                      } else {
                        return (
                          <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium border border-orange-200 flex items-center space-x-2">
                            <CreditCard className="h-4 w-4" />
                            <span>Sem Financeiro</span>
                          </div>
                        )
                      }
                    })()}
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Alertas da Sessão */}
                    {hasAlertas(sessao.agendamento_id) && (
                      <div className="flex items-center space-x-1">
                        {getAlertasSessao(sessao.agendamento_id).slice(0, 2).map((alerta) => (
                          <div
                            key={alerta.id}
                            className={`p-1 rounded-full ${getAlertaColor(alerta.severidade)}`}
                            title={alerta.titulo}
                          >
                            {getSeveridadeIcon(alerta.severidade)}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Status do Prontuário */}
                    {sessao.tem_prontuario ? (
                      <div className="flex items-center space-x-2">
                        <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium border border-green-200 flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>Prontuário Vinculado</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {onViewProntuario && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onViewProntuario(sessao.prontuario_id!)
                              }}
                              className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-2 rounded-full text-sm font-medium border border-blue-200 flex items-center space-x-1 transition-colors"
                              title="Visualizar Prontuário"
                            >
                              <Eye className="h-4 w-4" />
                              <span>Ver</span>
                            </button>
                          )}
                          {onEditProntuario && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditProntuario(sessao.prontuario_id!, sessao.agendamento_id)
                              }}
                              className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-2 rounded-full text-sm font-medium border border-green-200 flex items-center space-x-1 transition-colors"
                              title="Editar Prontuário"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Editar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium border border-orange-200 flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>Sem Prontuário</span>
                        </div>
                        {onCreateProntuario && sessao.status_sessao === 'finalizada' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onCreateProntuario(sessao.agendamento_id)
                            }}
                            className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-2 rounded-full text-sm font-medium border border-blue-200 flex items-center space-x-1 transition-colors"
                            title="Criar Prontuário"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Criar</span>
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Ícone de Expansão */}
                    <div className="text-gray-400">
                      {expandedSessao === sessao.agendamento_id ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detalhes Expandidos */}
              {expandedSessao === sessao.agendamento_id && (
                <div className="border-t border-gray-200 bg-gray-50/50 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Informações da Sessão */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-blue-600" />
                        Informações da Sessão
                      </h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div><span className="font-medium">Tipo:</span> {sessao.tipo_sessao}</div>
                        <div><span className="font-medium">Duração Planejada:</span> {sessao.duracao_minutos}min</div>
                        {sessao.duracao_sessao_segundos && sessao.duracao_sessao_segundos > 0 && (
                          <div><span className="font-medium">Duração Real:</span> {Math.round(sessao.duracao_sessao_segundos / 60)}min</div>
                        )}
                        {sessao.valor && (
                          <div><span className="font-medium">Valor:</span> R$ {sessao.valor.toFixed(2)}</div>
                        )}
                        <div><span className="font-medium">Status Agendamento:</span> 
                          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                            sessao.status_agendamento === 'realizado' ? 'bg-green-100 text-green-800' :
                            sessao.status_agendamento === 'agendado' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {sessao.status_agendamento}
                          </span>
                        </div>
                        <div><span className="font-medium">Status Sessão:</span> 
                          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                            sessao.status_sessao === 'finalizada' ? 'bg-green-100 text-green-800' :
                            sessao.status_sessao === 'em_andamento' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {sessao.status_sessao === 'finalizada' ? 'Finalizada' :
                             sessao.status_sessao === 'em_andamento' ? 'Em Andamento' : 'Não Iniciada'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Relacionamentos */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <Link className="h-4 w-4 mr-1 text-purple-600" />
                        Vínculo Agendamento-Prontuário
                      </h4>
                      <div className="space-y-3 text-sm">
                        {/* Status do Vínculo */}
                        <div 
                          className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            sessao.tem_prontuario 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-orange-50 border-orange-200'
                          } ${
                            sessao.tem_prontuario && onEditProntuario 
                              ? 'cursor-pointer hover:bg-green-100 hover:border-green-300 hover:shadow-sm' 
                              : ''
                          }`}
                          onClick={
                            sessao.tem_prontuario && onEditProntuario 
                              ? (e) => {
                                  e.stopPropagation()
                                  onEditProntuario(sessao.prontuario_id!, sessao.agendamento_id)
                                }
                              : undefined
                          }
                          title={
                            sessao.tem_prontuario && onEditProntuario 
                              ? "Clique para editar o prontuário" 
                              : undefined
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`w-4 h-4 rounded-full mr-3 ${
                                sessao.tem_prontuario ? 'bg-green-500' : 'bg-orange-400'
                              }`}></div>
                              <span className={`font-medium ${
                                sessao.tem_prontuario ? 'text-green-800' : 'text-orange-800'
                              }`}>
                                {sessao.tem_prontuario ? 'Prontuário Vinculado' : 'Sem Prontuário'}
                              </span>
                            </div>
                            {sessao.tem_prontuario && (
                              <FileText className={`h-4 w-4 text-green-600 ${
                                onEditProntuario ? 'group-hover:text-green-700' : ''
                              }`} />
                            )}
                          </div>
                          
                          {sessao.tem_prontuario && sessao.prontuario_criado_em && (
                            <div className="mt-2 text-xs text-green-700">
                              Criado em: {new Date(sessao.prontuario_criado_em).toLocaleDateString('pt-BR')} às {new Date(sessao.prontuario_criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                        
                        {/* IDs Técnicos */}
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>
                            <span className="font-medium">Agendamento:</span> 
                            <code className="ml-1 bg-gray-100 px-1 rounded">{sessao.agendamento_id.slice(-12)}</code>
                          </div>
                          {sessao.prontuario_id && (
                            <div>
                              <span className="font-medium">Prontuário:</span> 
                              <code className="ml-1 bg-gray-100 px-1 rounded">{sessao.prontuario_id.slice(-12)}</code>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Prontuário */}
                    {sessao.tem_prontuario ? (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          {onEditProntuario ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditProntuario(sessao.prontuario_id!, sessao.agendamento_id)
                              }}
                              className="hover:bg-green-100 p-1 rounded transition-colors cursor-pointer mr-1"
                              title="Clique para editar o prontuário"
                            >
                              <FileText className="h-4 w-4 text-green-600 hover:text-green-700" />
                            </button>
                          ) : (
                            <FileText className="h-4 w-4 mr-1 text-green-600" />
                          )}
                          Conteúdo do Prontuário
                        </h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          {sessao.diagnostico && (
                            <div><span className="font-medium">Diagnóstico:</span> 
                              <p className="mt-1 text-xs bg-white p-2 rounded border">{sessao.diagnostico}</p>
                            </div>
                          )}
                          {sessao.observacoes && (
                            <div><span className="font-medium">Observações:</span> 
                              <p className="mt-1 text-xs bg-white p-2 rounded border max-h-20 overflow-y-auto">{sessao.observacoes}</p>
                            </div>
                          )}
                          {sessao.plano_tratamento && (
                            <div><span className="font-medium">Plano de Tratamento:</span> 
                              <p className="mt-1 text-xs bg-white p-2 rounded border max-h-20 overflow-y-auto">{sessao.plano_tratamento}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <FileText className="h-4 w-4 mr-1 text-gray-400" />
                          Prontuário
                        </h4>
                        <div className="text-sm text-gray-500 text-center py-4">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p>Nenhum prontuário vinculado</p>
                          {sessao.status_sessao === 'finalizada' && onCreateProntuario && (
                            <button
                              onClick={() => onCreateProntuario(sessao.agendamento_id)}
                              className="mt-2 text-blue-600 hover:text-blue-800 text-xs underline"
                            >
                              Criar prontuário para esta sessão
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}