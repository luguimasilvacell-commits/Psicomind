import React from 'react'
import { Calendar, Clock, User, FileText, Play, Edit, Trash2, CheckCircle, AlertCircle, Circle, FileCheck, FilePlus } from 'lucide-react'
import { Agendamento } from '../lib/supabase'
import { formatDate, formatTime } from '../lib/utils'
import { useAgendamentoProntuario, useProntuarioExists } from '../hooks/useAgendamentoProntuario'

interface AgendamentoCardProps {
  agendamento: Agendamento
  onIniciarSessao?: (agendamento: Agendamento) => void
  onEditarAgendamento?: (agendamento: Agendamento) => void
  onExcluirAgendamento?: (agendamento: Agendamento) => void
  onVerProntuario?: (agendamento: Agendamento) => void
  showActions?: boolean
  compact?: boolean
}

export default function AgendamentoCard({ 
  agendamento, 
  onIniciarSessao,
  onEditarAgendamento,
  onExcluirAgendamento,
  onVerProntuario,
  showActions = true,
  compact = false
}: AgendamentoCardProps) {
  
  // Hooks para gerenciar prontuário
  const { navegarParaProntuario, criarProntuarioParaAgendamento } = useAgendamentoProntuario()
  const { exists: temProntuario, loading: loadingProntuario } = useProntuarioExists(agendamento.id)
  
  const getStatusIcon = () => {
    switch (agendamento.status_sessao) {
      case 'finalizada':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'em_andamento':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (agendamento.status_sessao) {
      case 'finalizada':
        return 'bg-green-50 border-green-200'
      case 'em_andamento':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-white border-gray-200'
    }
  }

  const getStatusText = () => {
    switch (agendamento.status_sessao) {
      case 'finalizada':
        return 'Finalizada'
      case 'em_andamento':
        return 'Em Andamento'
      default:
        return 'Agendada'
    }
  }

  const getStatusBadgeColor = () => {
    switch (agendamento.status) {
      case 'confirmado':
        return 'bg-green-100 text-green-800'
      case 'cancelado':
        return 'bg-red-100 text-red-800'
      case 'realizado':
        return 'bg-green-100 text-green-800'
      case 'faltou':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const isAgendamentoPassado = () => {
    const agendamentoDate = new Date(agendamento.data_hora)
    return agendamentoDate < new Date()
  }

  const podeIniciarSessao = () => {
    return agendamento.status === 'agendado' && 
           agendamento.status_sessao === 'nao_iniciada' && 
           !isAgendamentoPassado()
  }



  if (compact) {
    return (
      <div className={`rounded-lg border p-3 ${getStatusColor()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <div className="font-medium text-gray-900">{agendamento.paciente?.nome}</div>
              <div className="text-sm text-gray-600">
                {new Date(agendamento.data_hora).toLocaleDateString('pt-BR')} às {new Date(agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor()}`}>
              {agendamento.status}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border shadow-sm p-4 transition-all hover:shadow-md ${getStatusColor()}`}>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <div>
            <h3 className="font-medium text-gray-900">{agendamento.paciente?.nome}</h3>
            <div className="text-sm text-gray-600">{agendamento.tipo}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor()}`}>
            {agendamento.status}
          </div>
          <div className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {getStatusText()}
          </div>
        </div>
      </div>

      {/* Informações */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          {new Date(agendamento.data_hora).toLocaleDateString('pt-BR')}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="h-4 w-4 mr-2" />
          {new Date(agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({agendamento.duracao_minutos}min)
        </div>
        {agendamento.valor && (
          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">💰</span>
            R$ {agendamento.valor.toFixed(2)}
          </div>
        )}
        {temProntuario && (
          <div className="flex items-center text-sm text-green-600">
            <FileCheck className="h-4 w-4 mr-2" />
            Com Prontuário
          </div>
        )}
      </div>

      {/* Observações */}
      {agendamento.observacoes && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">
            {agendamento.observacoes}
          </p>
        </div>
      )}

      {/* Ações */}
      {showActions && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            {podeIniciarSessao() && onIniciarSessao && (
              <button
                onClick={() => onIniciarSessao(agendamento)}
                className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                <Play className="h-3 w-3 mr-1" />
                Iniciar Sessão
              </button>
            )}
            
            {/* Botão inteligente para prontuário */}
            {!loadingProntuario && (
              <button
                onClick={() => {
                  if (temProntuario) {
                    navegarParaProntuario(agendamento)
                  } else {
                    criarProntuarioParaAgendamento(agendamento)
                  }
                }}
                className={`inline-flex items-center px-3 py-1.5 text-white text-sm rounded-lg transition-colors ${
                  temProntuario 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {temProntuario ? (
                  <>
                    <FileCheck className="h-3 w-3 mr-1" />
                    Ver Prontuário
                  </>
                ) : (
                  <>
                    <FilePlus className="h-3 w-3 mr-1" />
                    Criar Prontuário
                  </>
                )}
              </button>
            )}
            
            {loadingProntuario && (
              <button
                disabled
                className="inline-flex items-center px-3 py-1.5 bg-gray-400 text-white text-sm rounded-lg"
              >
                <Circle className="h-3 w-3 mr-1 animate-spin" />
                Verificando...
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {onEditarAgendamento && (
              <button
                onClick={() => onEditarAgendamento(agendamento)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Editar agendamento"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            
            {onExcluirAgendamento && agendamento.status !== 'cancelado' && (
              <button
                onClick={() => onExcluirAgendamento(agendamento)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Excluir agendamento"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Indicador de atraso */}
      {isAgendamentoPassado() && agendamento.status_sessao === 'nao_iniciada' && agendamento.status === 'agendado' && (
        <div className="mt-3 flex items-center p-2 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
          <span className="text-red-800 text-sm">Agendamento em atraso</span>
        </div>
      )}
    </div>
  )
}