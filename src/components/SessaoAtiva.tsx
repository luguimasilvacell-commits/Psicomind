import React, { useState, useEffect } from 'react'
import { Play, Pause, Square, Clock, User, Calendar, FileText, Save, AlertCircle } from 'lucide-react'
import { useAgendamentoSessao } from '../hooks/useAgendamentoSessao'
import { useProntuarioSessao } from '../hooks/useProntuarioSessao'
import { Agendamento, SessaoAtiva as SessaoAtivaType } from '../lib/supabase'
import { formatTime } from '../utils/timeUtils'
import { toast } from 'sonner'

interface SessaoAtivaProps {
  agendamento: Agendamento
  onSessaoFinalizada?: () => void
  onProntuarioCriado?: () => void
}

export default function SessaoAtiva({ agendamento, onSessaoFinalizada, onProntuarioCriado }: SessaoAtivaProps) {
  const [observacoes, setObservacoes] = useState('')
  const [showProntuarioForm, setShowProntuarioForm] = useState(false)
  const [tempoDecorrido, setTempoDecorrido] = useState(0)
  
  const {
    iniciarSessao,
    finalizarSessao,
    pausarSessao,
    retomarSessao,
    loading: sessaoLoading
  } = useAgendamentoSessao()

  const {
    prontuario,
    criarNovoProntuario,
    atualizarProntuario,
    loading: prontuarioLoading
  } = useProntuarioSessao()

  // Timer para atualizar tempo decorrido
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (agendamento.status_sessao === 'em_andamento') {
      interval = setInterval(() => {
        setTempoDecorrido(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [agendamento.status_sessao])

  const handleIniciarSessao = async () => {
    try {
      await iniciarSessao(agendamento.id)
      setTempoDecorrido(0)
      toast.success('Sessão iniciada!')
    } catch (error) {
      toast.error('Erro ao iniciar sessão')
    }
  }

  const handlePausarSessao = async () => {
    try {
      await pausarSessao(agendamento.id)
      toast.success('Sessão pausada')
    } catch (error) {
      toast.error('Erro ao pausar sessão')
    }
  }

  const handleRetomarSessao = async () => {
    try {
      await retomarSessao(agendamento.id)
      toast.success('Sessão retomada')
    } catch (error) {
      toast.error('Erro ao retomar sessão')
    }
  }

  const handleFinalizarSessao = async () => {
    try {
      await finalizarSessao(agendamento.id)
      toast.success('Sessão finalizada!')
      onSessaoFinalizada?.()
    } catch (error) {
      toast.error('Erro ao finalizar sessão')
    }
  }

  const handleCriarProntuario = async () => {
    if (!observacoes.trim()) {
      toast.error('Adicione observações antes de criar o prontuário')
      return
    }

    try {
      const prontuarioData = {
        observacoes: observacoes.trim(),
        duracao_sessao_segundos: tempoDecorrido,
        tempo_inicio_sessao: new Date().toISOString(),
        tempo_fim_sessao: new Date().toISOString(),
        conteudo: observacoes.trim()
      }

      await criarNovoProntuario(agendamento.id, prontuarioData)
      toast.success('Prontuário criado com sucesso!')
      setObservacoes('')
      setShowProntuarioForm(false)
      onProntuarioCriado?.()
    } catch (error) {
      toast.error('Erro ao criar prontuário')
    }
  }

  const getStatusColor = () => {
    switch (agendamento.status_sessao) {
      case 'em_andamento':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'finalizada':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = () => {
    switch (agendamento.status_sessao) {
      case 'em_andamento':
        return 'Em Andamento'
      case 'finalizada':
        return 'Finalizada'
      default:
        return 'Não Iniciada'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Cabeçalho da Sessão */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <span className="font-medium text-gray-900">{agendamento.paciente?.nome}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-gray-600">
              {new Date(agendamento.data_hora).toLocaleDateString('pt-BR')} às {new Date(agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      {/* Timer e Controles */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-blue-600 mr-2" />
              <span className="text-2xl font-mono font-bold text-gray-900">
                {formatTime(tempoDecorrido)}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Duração prevista: {agendamento.duracao_minutos}min
            </div>
          </div>

          {/* Controles da Sessão */}
          <div className="flex items-center space-x-2">
            {agendamento.status_sessao === 'nao_iniciada' && (
              <button
                onClick={handleIniciarSessao}
                disabled={sessaoLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Play className="h-4 w-4 mr-2" />
                Iniciar Sessão
              </button>
            )}

            {agendamento.status_sessao === 'em_andamento' && (
              <>
                <button
                  onClick={handlePausarSessao}
                  disabled={sessaoLoading}
                  className="inline-flex items-center px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                >
                  <Pause className="h-4 w-4" />
                </button>
                <button
                  onClick={handleFinalizarSessao}
                  disabled={sessaoLoading}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Finalizar
                </button>
              </>
            )}

            {agendamento.status_sessao === 'finalizada' && !prontuario && (
              <button
                onClick={() => setShowProntuarioForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText className="h-4 w-4 mr-2" />
                Criar Prontuário
              </button>
            )}
          </div>
        </div>

        {/* Alerta se sessão exceder tempo previsto */}
        {agendamento.status_sessao === 'em_andamento' && tempoDecorrido > (agendamento.duracao_minutos * 60) && (
          <div className="mt-4 flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800 text-sm">
              A sessão excedeu o tempo previsto de {agendamento.duracao_minutos} minutos.
            </span>
          </div>
        )}
      </div>

      {/* Observações Rápidas */}
      {agendamento.status_sessao === 'em_andamento' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações da Sessão
          </label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Anote observações importantes durante a sessão..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Formulário de Prontuário Rápido */}
      {showProntuarioForm && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Criar Prontuário</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações da Sessão *
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Descreva o que foi observado durante a sessão..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowProntuarioForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriarProntuario}
                disabled={prontuarioLoading || !observacoes.trim()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {prontuarioLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Prontuário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Informações do Prontuário Existente */}
      {prontuario && (
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Prontuário da Sessão</h3>
            <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
              Prontuário Criado
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700">{prontuario.observacoes}</p>
            {prontuario.diagnostico && (
              <div className="mt-2">
                <span className="text-sm font-medium text-gray-600">Diagnóstico: </span>
                <span className="text-sm text-gray-700">{prontuario.diagnostico}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}