import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { X, Save, User, Calendar, FileText, Stethoscope, Clock, AlertCircle, CheckCircle, Search, ChevronDown } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase, type Prontuario, type Agendamento } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useProntuarioSessao } from '../hooks/useProntuarioSessao'
import { toast } from 'sonner'
import SessionTimer from './SessionTimer'
import { useDateInput } from '@/hooks/useMaskedInput'
import { FileUpload } from './FileUpload'
import { FileList } from './FileList'

const prontuarioSchema = z.object({
  agendamento_id: z.string()
    .min(1, 'Agendamento é obrigatório')
    .uuid('ID do agendamento deve ser válido'),
  diagnostico: z.string().optional(),
  observacoes: z.string()
    .min(10, 'Observações devem ter pelo menos 10 caracteres')
    .max(5000, 'Observações não podem exceder 5000 caracteres'),
  plano_tratamento: z.string()
    .max(2000, 'Plano de tratamento não pode exceder 2000 caracteres')
    .optional(),
  medicamentos: z.string()
    .max(1000, 'Medicamentos não podem exceder 1000 caracteres')
    .optional(),
  proxima_sessao: z.string().optional(),
  duracao_sessao_segundos: z.number().min(0).default(0),
  tempo_inicio_sessao: z.string().optional(),
  tempo_fim_sessao: z.string().optional(),
})

type ProntuarioFormData = z.infer<typeof prontuarioSchema>

interface ProntuarioFormProps {
  prontuario?: Prontuario | null
  agendamento?: Agendamento | null
  agendamentos: Agendamento[]
  onClose: () => void
  onSave: () => void
}

export default function ProntuarioForm({ prontuario, agendamento, agendamentos, onClose, onSave }: ProntuarioFormProps) {
  const { psicologo } = useAuthStore()
  const [loading, setLoading] = React.useState(false)
  const [sessionTime, setSessionTime] = useState(prontuario?.duracao_sessao_segundos || 0)
  const [fileListKey, setFileListKey] = useState(0) // Para forçar re-render da lista de arquivos

  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null)
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(agendamento || null)
  const [selectedPacienteId, setSelectedPacienteId] = useState<string>(
    prontuario?.agendamento?.paciente?.id || agendamento?.paciente?.id || ''
  )
  const [agendamentosComProntuario, setAgendamentosComProntuario] = useState<Set<string>>(new Set())
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  
  // Estados para busca de pacientes
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedPacienteName, setSelectedPacienteName] = useState('')
  const [todosPacientes, setTodosPacientes] = useState<any[]>([])
  const [loadingPacientes, setLoadingPacientes] = useState(false)
  
  const { 
    criarNovoProntuario, 
    atualizarProntuario, 
    verificarExisteProntuario,
    loading: prontuarioLoading 
  } = useProntuarioSessao()

  // Função para carregar todos os pacientes do psicólogo
  const carregarTodosPacientes = async () => {
    if (!psicologo?.id) return

    setLoadingPacientes(true)
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('psicologo_id', psicologo.id)
        .eq('status', 'ativo')
        .order('nome', { ascending: true })

      if (error) throw error
      setTodosPacientes(data || [])
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
      toast.error('Erro ao carregar lista de pacientes')
      setTodosPacientes([])
    } finally {
      setLoadingPacientes(false)
    }
  }

  // Carregar todos os pacientes quando o componente montar
  useEffect(() => {
    carregarTodosPacientes()
  }, [psicologo?.id])

  // Verificar quais agendamentos já possuem prontuários
  useEffect(() => {
    const verificarProntuariosExistentes = async () => {
      setCheckingDuplicates(true)
      const agendamentosComProntuarioSet = new Set<string>()
      
      for (const agendamentoItem of agendamentos) {
        const existeProntuario = await verificarExisteProntuario(agendamentoItem.id)
        if (existeProntuario) {
          agendamentosComProntuarioSet.add(agendamentoItem.id)
        }
      }
      
      setAgendamentosComProntuario(agendamentosComProntuarioSet)
      setCheckingDuplicates(false)
    }

    if (agendamentos.length > 0) {
      verificarProntuariosExistentes()
    }
  }, [agendamentos, verificarExisteProntuario])

  // Usar todos os pacientes carregados da base de dados
  const pacientesUnicos = useMemo(() => {
    return todosPacientes.sort((a, b) => a.nome.localeCompare(b.nome))
  }, [todosPacientes])

  // Filtrar pacientes baseado no termo de busca
  const pacientesFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return pacientesUnicos
    return pacientesUnicos.filter(paciente => 
      paciente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paciente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paciente.telefone?.includes(searchTerm)
    )
  }, [pacientesUnicos, searchTerm])

  // Inicializar nome do paciente selecionado
  useEffect(() => {
    if (selectedPacienteId && pacientesUnicos.length > 0) {
      const paciente = pacientesUnicos.find(p => p.id === selectedPacienteId)
      if (paciente) {
        setSelectedPacienteName(paciente.nome)
        setSearchTerm(paciente.nome)
      }
    }
  }, [selectedPacienteId, pacientesUnicos])

  // Filtrar agendamentos baseado no paciente selecionado
  const agendamentosFiltrados = useMemo(() => {
    console.log('🔍 [ProntuarioForm] Filtrando agendamentos para paciente:', selectedPacienteId)
    console.log('📋 [ProntuarioForm] Total de agendamentos recebidos:', agendamentos.length)
    console.log('📊 [ProntuarioForm] Agendamentos recebidos:', agendamentos.map(a => ({
      id: a.id,
      data: a.data_hora,
      paciente: a.paciente?.nome,
      pacienteId: a.paciente?.id,
      status: a.status
    })))
    
    if (!selectedPacienteId) {
      console.log('⚠️ [ProntuarioForm] Nenhum paciente selecionado, retornando todos os agendamentos')
      return agendamentos
    }
    
    const filtrados = agendamentos.filter(a => {
      const match = a.paciente?.id === selectedPacienteId
      console.log(`🔍 [ProntuarioForm] Verificando agendamento ${a.id}:`, {
        agendamentoPacienteId: a.paciente?.id,
        selectedPacienteId,
        pacienteNome: a.paciente?.nome,
        match
      })
      return match
    })
    
    console.log(`✅ [ProntuarioForm] Agendamentos filtrados para paciente ${selectedPacienteId}:`, filtrados.length)
    console.log('📊 [ProntuarioForm] Detalhes dos agendamentos filtrados:', filtrados.map(a => ({
      id: a.id,
      data: a.data_hora,
      paciente: a.paciente?.nome,
      pacienteId: a.paciente?.id,
      status: a.status
    })))
    
    return filtrados
  }, [agendamentos, selectedPacienteId])

  // Função para ordenar agendamentos por proximidade ao horário atual
  const sortedAgendamentos = useMemo(() => {
    const now = new Date()
    
    return agendamentosFiltrados
      .filter(a => {
        // Mostrar agendamentos confirmados, realizados ou o agendamento já vinculado ao prontuário
        return (
          a.status === 'confirmado' || 
          a.status === 'realizado' ||
          a.id === prontuario?.agendamento_id
        )
      })
      .sort((a, b) => {
        // Primeiro, priorizar o agendamento já vinculado ao prontuário
        if (a.id === prontuario?.agendamento_id) return -1
        if (b.id === prontuario?.agendamento_id) return 1
        
        // Depois, ordenar por data (mais recentes primeiro)
        const aTime = new Date(a.data_hora).getTime()
        const bTime = new Date(b.data_hora).getTime()
        
        return bTime - aTime
      })
  }, [agendamentosFiltrados, prontuario?.agendamento_id])

  // Função para determinar o status visual do agendamento
  const getAgendamentoStatus = (agendamento: Agendamento) => {
    const now = new Date()
    const agendamentoDate = new Date(agendamento.data_hora)
    const diffInHours = (agendamentoDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 0) {
      return { type: 'past', label: 'Passado', color: 'text-gray-500', icon: Clock }
    } else if (diffInHours <= 1) {
      return { type: 'imminent', label: 'Próximo', color: 'text-red-600', icon: AlertCircle }
    } else if (diffInHours <= 24) {
      return { type: 'today', label: 'Hoje', color: 'text-orange-600', icon: Clock }
    } else if (diffInHours <= 168) { // 7 dias
      return { type: 'week', label: 'Esta semana', color: 'text-blue-600', icon: Calendar }
    } else {
      return { type: 'future', label: 'Futuro', color: 'text-green-600', icon: CheckCircle }
    }
  }

  // Funções para lidar com a busca de pacientes
  const handlePacienteSearch = (value: string) => {
    setSearchTerm(value)
    setShowDropdown(true)
  }

  const handlePacienteSelect = (paciente: any) => {
    console.log('👤 [ProntuarioForm] Paciente selecionado:', paciente)
    console.log('📋 [ProntuarioForm] Agendamentos disponíveis no momento da seleção:', agendamentos.length)
    setSelectedPacienteId(paciente.id)
    setSelectedPacienteName(paciente.nome)
    setSearchTerm(paciente.nome)
    setShowDropdown(false)
    handlePacienteChange(paciente.id)
  }

  const handleInputFocus = () => {
    setShowDropdown(true)
  }

  const handleInputBlur = () => {
    // Delay para permitir clique no dropdown
    setTimeout(() => setShowDropdown(false), 200)
  }

  // Função para formatar a exibição do agendamento
  const formatAgendamentoDisplay = (agendamento: Agendamento) => {
    const date = new Date(agendamento.data_hora)
    const status = getAgendamentoStatus(agendamento)
    const StatusIcon = status.icon
    
    return {
      text: `${agendamento.paciente?.nome} - ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      status,
      StatusIcon
    }
  }

  // Adicionar máscara para próxima sessão
  const proximaSessaoMask = useDateInput(
    prontuario?.proxima_sessao ? new Date(prontuario.proxima_sessao).toLocaleDateString('pt-BR') : ''
  )

  // Callbacks para gerenciamento de arquivos
  const handleFileUploadComplete = useCallback(() => {
    setFileListKey(prev => prev + 1) // Força re-render da lista
    toast.success('Arquivos enviados com sucesso!')
  }, [])

  const handleFileDeleted = useCallback(() => {
    setFileListKey(prev => prev + 1) // Força re-render da lista
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProntuarioFormData>({
    resolver: zodResolver(prontuarioSchema),
    defaultValues: {
      agendamento_id: prontuario?.agendamento_id || agendamento?.id || '',
      diagnostico: prontuario?.diagnostico || '',
      observacoes: prontuario?.observacoes || '',
      plano_tratamento: prontuario?.plano_tratamento || '',
      medicamentos: prontuario?.medicamentos || '',
      proxima_sessao: prontuario?.proxima_sessao ? prontuario.proxima_sessao.split('T')[0] : '',
      duracao_sessao_segundos: prontuario?.duracao_sessao_segundos || 0,
      tempo_inicio_sessao: prontuario?.tempo_inicio_sessao || '',
      tempo_fim_sessao: prontuario?.tempo_fim_sessao || '',
    },
  })

  const watchedAgendamentoId = watch('agendamento_id')

  // Atualizar agendamento selecionado quando o ID muda
  useEffect(() => {
    if (watchedAgendamentoId) {
      const agendamento = agendamentos.find(a => a.id === watchedAgendamentoId)
      setSelectedAgendamento(agendamento || null)
    }
  }, [watchedAgendamentoId, agendamentos])

  // Selecionar automaticamente o agendamento quando há apenas um disponível
  useEffect(() => {
    console.log('🎯 [ProntuarioForm] Verificando seleção automática de agendamento')
    console.log('📊 [ProntuarioForm] sortedAgendamentos.length:', sortedAgendamentos.length)
    console.log('📊 [ProntuarioForm] selectedPacienteId:', selectedPacienteId)
    console.log('📊 [ProntuarioForm] watchedAgendamentoId:', watchedAgendamentoId)
    
    // Se há um paciente selecionado, apenas um agendamento disponível e nenhum agendamento selecionado
    if (selectedPacienteId && sortedAgendamentos.length === 1 && !watchedAgendamentoId) {
      const agendamentoUnico = sortedAgendamentos[0]
      console.log('✅ [ProntuarioForm] Selecionando automaticamente agendamento único:', agendamentoUnico.id)
      setValue('agendamento_id', agendamentoUnico.id)
      setSelectedAgendamento(agendamentoUnico)
    }
  }, [sortedAgendamentos, selectedPacienteId, watchedAgendamentoId, setValue])

  // Função para lidar com a mudança de paciente
  const handlePacienteChange = (pacienteId: string) => {
    setSelectedPacienteId(pacienteId)
    // Limpar agendamento selecionado quando mudar de paciente
    setSelectedAgendamento(null)
    setValue('agendamento_id', '')
  }

  const handleTimeUpdate = useCallback((seconds: number) => {
    setSessionTime(seconds)
  }, [])

  const onSubmit = async (data: ProntuarioFormData) => {
    // Validações obrigatórias de dependências
    if (!psicologo?.id) {
      toast.error('Psicólogo não identificado')
      return
    }

    if (!selectedAgendamento) {
      toast.error('Agendamento é obrigatório')
      return
    }

    if (!selectedAgendamento.paciente_id) {
      toast.error('Agendamento deve estar vinculado a um paciente')
      return
    }

    if (!selectedAgendamento.paciente) {
      toast.error('Dados do paciente não encontrados')
      return
    }

    // Verificar se o agendamento pertence ao psicólogo logado
    if (selectedAgendamento.psicologo_id !== psicologo.id) {
      toast.error('Agendamento não pertence ao psicólogo atual')
      return
    }

    // Verificar se já existe prontuário para este agendamento (apenas para novos prontuários)
    if (!prontuario) {
      const existeProntuario = await verificarExisteProntuario(data.agendamento_id)
      if (existeProntuario) {
        toast.error('Já existe um prontuário para este agendamento. Selecione outro agendamento.')
        return
      }
    }

    // Validação adicional: prontuário deve ter conteúdo mínimo
    if (!data.observacoes?.trim()) {
      toast.error('Observações são obrigatórias para criar um prontuário')
      return
    }

    try {
      setLoading(true)

      const prontuarioData = {
        agendamento_id: data.agendamento_id,
        diagnostico: data.diagnostico || '',
        observacoes: data.observacoes,
        plano_tratamento: data.plano_tratamento || '',
        medicamentos: data.medicamentos || '',
        proxima_sessao: proximaSessaoMask.getISOValue() || null,
        duracao_sessao_segundos: sessionTime,
        tempo_inicio_sessao: sessionStartTime?.toISOString() || null,
        tempo_fim_sessao: sessionEndTime?.toISOString() || null,
        conteudo: data.observacoes || '', // Usar observações como conteúdo principal
      }

      if (prontuario) {
        // Atualizar prontuário existente
        await atualizarProntuario(prontuario.id, prontuarioData)
        toast.success('Prontuário atualizado com sucesso!')
      } else {
        // Criar novo prontuário
        await criarNovoProntuario(selectedAgendamento.id, prontuarioData)
        toast.success('Prontuário criado com sucesso!')
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Erro ao salvar prontuário:', error)
      toast.error('Erro ao salvar prontuário')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] form-scrollbar">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {prontuario ? 'Editar Prontuário' : 'Novo Prontuário'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Cronômetro da Sessão */}
          <SessionTimer
            onTimeUpdate={handleTimeUpdate}
            initialTime={sessionTime}
            sessionId={prontuario?.id}
            autoSave={true}
          />

          {/* Busca de Paciente */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              Paciente *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handlePacienteSearch(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder={loadingPacientes ? "Carregando pacientes..." : "Digite o nome do paciente..."}
                disabled={loadingPacientes}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                {loadingPacientes ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
            
            {/* Dropdown de sugestões */}
            {showDropdown && pacientesFiltrados.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {pacientesFiltrados.map((paciente) => (
                  <div
                    key={paciente.id}
                    onClick={() => handlePacienteSelect(paciente)}
                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{paciente.nome}</div>
                        {paciente.email && (
                          <div className="text-sm text-gray-500">{paciente.email}</div>
                        )}
                        {paciente.telefone && (
                          <div className="text-sm text-gray-500">{paciente.telefone}</div>
                        )}
                      </div>
                      {selectedPacienteId === paciente.id && (
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Mensagem quando não há resultados */}
            {showDropdown && searchTerm && pacientesFiltrados.length === 0 && !loadingPacientes && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
                {todosPacientes.length === 0 ? 
                  "Nenhum paciente cadastrado" : 
                  `Nenhum paciente encontrado para "${searchTerm}"`
                }
              </div>
            )}
          </div>

          {/* Agendamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Agendamento *
            </label>
            <select
              {...register('agendamento_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={checkingDuplicates || !selectedPacienteId}
            >
              <option value="">
                {checkingDuplicates 
                  ? 'Verificando prontuários...' 
                  : !selectedPacienteId 
                    ? 'Primeiro selecione um paciente'
                    : sortedAgendamentos.length === 0
                      ? `Nenhum agendamento encontrado para ${selectedPacienteName || 'este paciente'}`
                      : 'Selecione um agendamento'
                }
              </option>
              {sortedAgendamentos.map((agendamento) => {
                const display = formatAgendamentoDisplay(agendamento)
                const temProntuario = agendamentosComProntuario.has(agendamento.id)
                const isCurrentProntuario = agendamento.id === prontuario?.agendamento_id
                
                // Permitir seleção apenas se for o prontuário atual ou se não tiver prontuário
                const isDisabled = temProntuario && !isCurrentProntuario
                
                return (
                  <option 
                    key={agendamento.id} 
                    value={agendamento.id}
                    disabled={isDisabled}
                  >
                    {temProntuario && !isCurrentProntuario ? '✓ ' : ''}
                    {display.status.label} | {display.text}
                    {temProntuario && !isCurrentProntuario ? ' (Já possui prontuário)' : ''}
                  </option>
                )
              })}
            </select>
            
            {/* Lista visual dos agendamentos próximos */}
            {sortedAgendamentos.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <h5 className="text-xs font-medium text-gray-700 mb-2">Agendamentos próximos:</h5>
                <div className="space-y-1">
                  {sortedAgendamentos.slice(0, 3).map((agendamento) => {
                    const display = formatAgendamentoDisplay(agendamento)
                    const StatusIcon = display.StatusIcon
                    const isSelected = watchedAgendamentoId === agendamento.id
                    const temProntuario = agendamentosComProntuario.has(agendamento.id)
                    const isCurrentProntuario = agendamento.id === prontuario?.agendamento_id
                    const isDisabled = temProntuario && !isCurrentProntuario
                    
                    return (
                      <div 
                        key={agendamento.id}
                        className={`flex items-center text-xs p-2 rounded transition-colors ${
                          isSelected 
                            ? 'bg-blue-100 border border-blue-300' 
                            : isDisabled
                            ? 'bg-gray-100 opacity-60 cursor-not-allowed'
                            : 'hover:bg-gray-100 cursor-pointer'
                        }`}
                        onClick={() => !isDisabled && setValue('agendamento_id', agendamento.id)}
                      >
                        <StatusIcon className={`h-3 w-3 mr-2 ${display.status.color}`} />
                        <span className={`font-medium ${display.status.color} mr-2`}>
                          {display.status.label}
                        </span>
                        <span className="text-gray-700">{display.text}</span>
                        {temProntuario && !isCurrentProntuario && (
                          <span className="ml-2 text-green-600 font-medium">✓ Prontuário</span>
                        )}
                        {isSelected && (
                          <CheckCircle className="h-3 w-3 ml-auto text-blue-600" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {errors.agendamento_id && (
              <p className="mt-1 text-sm text-red-600">{errors.agendamento_id.message}</p>
            )}
            
            {/* Status da filtragem de agendamentos */}
            {selectedPacienteId && (
              <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  <span>
                    Mostrando agendamentos para: <strong>{selectedPacienteName}</strong>
                  </span>
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {sortedAgendamentos.length} agendamento{sortedAgendamentos.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {sortedAgendamentos.length === 0 && (
                  <div className="mt-2 text-sm text-amber-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Nenhum agendamento encontrado para este paciente
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Informações do Agendamento Selecionado */}
          {selectedAgendamento && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Detalhes da Sessão
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
                <div>
                  <span className="font-medium">Paciente:</span> {selectedAgendamento.paciente?.nome}
                </div>
                <div>
                  <span className="font-medium">Data:</span> {new Date(selectedAgendamento.data_hora).toLocaleDateString('pt-BR')}
                </div>
                <div>
                  <span className="font-medium">Horário:</span> {new Date(selectedAgendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({selectedAgendamento.duracao_minutos}min)
                </div>
              </div>
            </div>
          )}

          {/* Diagnóstico */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Stethoscope className="h-4 w-4 inline mr-1" />
              Diagnóstico
            </label>
            <input
              type="text"
              {...register('diagnostico')}
              placeholder="Ex: Transtorno de ansiedade generalizada"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.diagnostico && (
              <p className="mt-1 text-sm text-red-600">{errors.diagnostico.message}</p>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              Observações da Sessão *
            </label>
            <textarea
              {...register('observacoes')}
              rows={4}
              placeholder="Descreva o que foi observado durante a sessão, comportamentos, progressos, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.observacoes && (
              <p className="mt-1 text-sm text-red-600">{errors.observacoes.message}</p>
            )}
          </div>

          {/* Plano de Tratamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plano de Tratamento
            </label>
            <textarea
              {...register('plano_tratamento')}
              rows={3}
              placeholder="Descreva o plano de tratamento, objetivos terapêuticos, técnicas utilizadas, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.plano_tratamento && (
              <p className="mt-1 text-sm text-red-600">{errors.plano_tratamento.message}</p>
            )}
          </div>

          {/* Medicamentos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Medicamentos
            </label>
            <textarea
              {...register('medicamentos')}
              rows={2}
              placeholder="Liste medicamentos prescritos, dosagens e orientações"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.medicamentos && (
              <p className="mt-1 text-sm text-red-600">{errors.medicamentos.message}</p>
            )}
          </div>

          {/* Próxima Sessão */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Próxima Sessão
            </label>
            <input
              type="text"
              value={proximaSessaoMask.displayValue}
              onChange={(e) => proximaSessaoMask.onChange(e.target.value)}
              placeholder="DD/MM/AAAA"
              maxLength={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.proxima_sessao && (
              <p className="mt-1 text-sm text-red-600">{errors.proxima_sessao.message}</p>
            )}
          </div>

          {/* Seção de Arquivos - só mostra se o prontuário já foi salvo */}
          {prontuario?.id && (
            <div className="space-y-6 pt-6 border-t border-gray-200">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  <FileText className="h-5 w-5 inline mr-2" />
                  Arquivos do Prontuário
                </h4>
                
                {/* Lista de arquivos existentes */}
                <div className="mb-6">
                  <FileList
                    key={fileListKey}
                    prontuarioId={prontuario.id}
                    onFileDeleted={handleFileDeleted}
                  />
                </div>

                {/* Upload de novos arquivos */}
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Adicionar novos arquivos</h5>
                  <FileUpload
                    prontuarioId={prontuario.id}
                    onUploadComplete={handleFileUploadComplete}
                    maxFiles={5}
                    maxSizeBytes={10 * 1024 * 1024} // 10MB
                  />
                </div>
              </div>
            </div>
          )}

          {/* Aviso para prontuários novos */}
          {!prontuario?.id && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
                <p className="text-sm text-amber-800">
                  <strong>Nota:</strong> Para anexar arquivos, primeiro salve o prontuário. 
                  Após salvar, você poderá fazer upload de documentos, imagens e outros arquivos relacionados à sessão.
                </p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || prontuarioLoading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {(loading || prontuarioLoading) ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {prontuario ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}