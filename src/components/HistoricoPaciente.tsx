import React, { useState, useEffect } from 'react'
import { Calendar, Clock, FileText, Filter, Search, User, ChevronDown, ChevronUp, Plus, Edit, Eye, Link } from 'lucide-react'
import { useHistoricoPaciente } from '../hooks/useHistoricoPaciente'
import { formatDate, formatTime } from '../lib/utils'

interface HistoricoPacienteProps {
  pacienteId: string
  pacienteNome: string
  onCreateProntuario?: (agendamentoId: string) => void
  onEditProntuario?: (prontuarioId: string, agendamentoId: string) => void
  onViewProntuario?: (prontuarioId: string) => void
}

export default function HistoricoPaciente({ 
  pacienteId, 
  pacienteNome, 
  onCreateProntuario, 
  onEditProntuario, 
  onViewProntuario 
}: HistoricoPacienteProps) {
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [filtroPeriodo, setFiltroPeriodo] = useState<{ inicio?: string; fim?: string }>({})
  const [expandedSessao, setExpandedSessao] = useState<string | null>(null)
  
  const {
    historico,
    loading,
    error,
    buscarHistorico,
    filtrarPorPeriodo,
    filtrarPorStatus,
    obterEstatisticas
  } = useHistoricoPaciente(pacienteId)

  useEffect(() => {
    if (pacienteId) {
      buscarHistorico(pacienteId)
    }
  }, [pacienteId, filtroPeriodo, filtroStatus, buscarHistorico])

  const handleFiltroChange = () => {
    if (pacienteId) {
      buscarHistorico(pacienteId)
    }
  }

  const toggleSessaoExpanded = (sessaoId: string) => {
    setExpandedSessao(expandedSessao === sessaoId ? null : sessaoId)
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
      {/* Cabeçalho */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Histórico de {pacienteNome}
          </h2>
        </div>

        {/* Estatísticas */}
        {historico.length > 0 && (() => {
          const stats = obterEstatisticas()
          return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.totalSessoes}</div>
                <div className="text-sm text-blue-800">Total de Sessões</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{stats.sessoesRealizadas}</div>
                <div className="text-sm text-green-800">Realizadas</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.sessoesAgendadas}</div>
                <div className="text-sm text-yellow-800">Agendadas</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.tempoTotalSessoes > 0 ? Math.round(stats.tempoTotalSessoes / 60) : 0}min
                </div>
                <div className="text-sm text-purple-800">Tempo Total</div>
              </div>
            </div>
          )
        })()}

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status da Sessão
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos os status</option>
              <option value="nao_iniciada">Não Iniciada</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="finalizada">Finalizada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={filtroPeriodo.inicio || ''}
              onChange={(e) => setFiltroPeriodo(prev => ({ ...prev, inicio: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={filtroPeriodo.fim || ''}
              onChange={(e) => setFiltroPeriodo(prev => ({ ...prev, fim: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Lista de Sessões */}
      <div className="space-y-4">
        {historico.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma sessão encontrada para os filtros selecionados.</p>
          </div>
        ) : (
          historico.map((sessao) => (
            <div key={sessao.agendamento_id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSessaoExpanded(sessao.agendamento_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(sessao.data_hora)}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatTime(sessao.data_hora)}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sessao.status_sessao === 'finalizada' 
                        ? 'bg-green-100 text-green-800'
                        : sessao.status_sessao === 'em_andamento'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {sessao.status_sessao === 'finalizada' ? 'Finalizada' :
                       sessao.status_sessao === 'em_andamento' ? 'Em Andamento' : 'Não Iniciada'}
                    </div>
                    {sessao.duracao_sessao_segundos > 0 && (
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-1" />
                        {Math.round(sessao.duracao_sessao_segundos / 60)}min
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Status do Prontuário */}
                    {sessao.tem_prontuario ? (
                      <div className="flex items-center space-x-2">
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-lg text-sm font-medium flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Prontuário Vinculado
                        </div>
                        <div className="flex items-center space-x-1">
                          {onViewProntuario && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onViewProntuario(sessao.prontuario_id!)
                              }}
                              className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-lg text-sm font-medium flex items-center transition-colors"
                              title="Visualizar Prontuário"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </button>
                          )}
                          {onEditProntuario && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditProntuario(sessao.prontuario_id!, sessao.agendamento_id)
                              }}
                              className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded-lg text-sm font-medium flex items-center transition-colors"
                              title="Editar Prontuário"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-sm font-medium flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Sem Prontuário
                        </div>
                        {onCreateProntuario && sessao.status_sessao === 'finalizada' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onCreateProntuario(sessao.agendamento_id)
                            }}
                            className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-lg text-sm font-medium flex items-center transition-colors"
                            title="Criar Prontuário"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Criar
                          </button>
                        )}
                      </div>
                    )}
                    
                    {expandedSessao === sessao.agendamento_id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Detalhes Expandidos */}
              {expandedSessao === sessao.agendamento_id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
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
                        <div className={`p-3 rounded-lg border-2 ${
                          sessao.tem_prontuario 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-orange-50 border-orange-200'
                        }`}>
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
                              <FileText className="h-4 w-4 text-green-600" />
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
                          <FileText className="h-4 w-4 mr-1 text-green-600" />
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