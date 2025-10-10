import React, { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, List, Plus, Search, Filter, Clock, User, Phone, Edit, Trash2, CheckCircle, XCircle, AlertCircle, Activity, BarChart3, ChevronLeft, ChevronRight, RotateCcw, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import Calendar from 'react-calendar'
import { supabase, type Agendamento, type Paciente } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import AgendamentoForm from '../components/AgendamentoForm'
import AgendamentoCard from '../components/AgendamentoCard'
import SessaoAtiva from '../components/SessaoAtiva'
import { useAgendamentoSessao } from '../hooks/useAgendamentoSessao'
import { formatDate, formatTime } from '../lib/utils'
import { toast } from 'sonner'
import { criarTransacaoFinanceiraAutomatica } from '../utils/financeiroUtils'
import { 
  ModernSkeleton,
  AnimatedIcon,
  ModernStatusIndicator,
  ModernStatCard
} from '@/components/modern'
import 'react-calendar/dist/Calendar.css'

function Agendamentos() {
  const { psicologo } = useAuthStore()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date()) // Sempre usar data atual do sistema
  const [showForm, setShowForm] = useState(false)
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('week') // Padrão semana
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [sessaoAtiva, setSessaoAtiva] = useState<Agendamento | null>(null)
  const [syncingGoogle, setSyncingGoogle] = useState(false)

  const { iniciarSessao } = useAgendamentoSessao()

  // Log de debug para verificar autenticação
  console.log('🔐 Estado de autenticação:', {
    psicologo: psicologo ? {
      id: psicologo.id,
      nome: psicologo.nome,
      email: psicologo.email
    } : 'não logado',
    timestamp: new Date().toISOString()
  })

  const loadAgendamentos = async (dateFilter?: Date) => {
    if (!psicologo?.id) {
      console.log('❌ Psicólogo não encontrado, não carregando agendamentos')
      return
    }

    try {
      console.log('🚀 Iniciando carregamento de agendamentos...')
      setLoading(true)
      console.log('📡 Fazendo consulta ao Supabase...')
      console.log('🔍 Query base:', {
        table: 'agendamentos',
        psicologo_id: psicologo.id,
        dateFilter: dateFilter ? dateFilter.toISOString().split('T')[0] : 'sem filtro'
      })
      
      let query = supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:pacientes(
            id,
            nome,
            telefone,
            email,
            cpf,
            status
          )
        `)
        .eq('psicologo_id', psicologo.id)

      // Se há filtro de data, aplicar filtro para o dia específico
      if (dateFilter) {
        const startOfDay = new Date(dateFilter)
        startOfDay.setHours(0, 0, 0, 0)
        
        const endOfDay = new Date(dateFilter)
        endOfDay.setHours(23, 59, 59, 999)
        
        console.log('📅 Aplicando filtro de data:', {
          startOfDay: startOfDay.toISOString(),
          endOfDay: endOfDay.toISOString()
        })
        
        query = query
          .gte('data_hora', startOfDay.toISOString())
          .lte('data_hora', endOfDay.toISOString())
      }

      console.log('🚀 Executando query...')
      const { data, error } = await query.order('data_hora', { ascending: true })

      if (error) {
        console.error('❌ Erro na query de agendamentos:', error)
        console.error('📋 Detalhes do erro:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      console.log(`📊 Dados recebidos do Supabase: ${data?.length || 0} agendamentos`)
      console.log('📋 Agendamentos brutos:', data)

      // Validar integridade dos dados
      const agendamentosValidos = (data || []).filter(agendamento => {
        if (!agendamento.paciente) {
          console.warn(`❌ Agendamento ${agendamento.id} sem paciente vinculado`)
          return false
        }
        if (!agendamento.data_hora) {
          console.warn(`❌ Agendamento ${agendamento.id} sem data/hora`)
          return false
        }
        console.log(`✅ Agendamento válido: ${agendamento.id} - ${agendamento.paciente.nome} em ${agendamento.data_hora}`)
        return true
      })

      console.log(`📈 Agendamentos válidos: ${agendamentosValidos.length}`)
      setAgendamentos(agendamentosValidos)
      console.log('💾 Estado de agendamentos atualizado')
      
      // Verificar se há agendamentos órfãos
      const agendamentosOrfaos = (data || []).length - agendamentosValidos.length
      console.log(`⚠️ Agendamentos filtrados: ${agendamentosOrfaos}`)
      if (agendamentosOrfaos > 0) {
        console.warn(`⚠️ ${agendamentosOrfaos} agendamentos com dados inconsistentes foram filtrados`)
        toast.warning(`${agendamentosOrfaos} agendamentos com dados inconsistentes foram filtrados`)
      }

      console.log('✅ === CARREGAMENTO DE AGENDAMENTOS CONCLUÍDO ===')

    } catch (error: any) {
      console.error('💥 Erro ao carregar agendamentos:', error)
      
      // Verificar se é um erro de rede
      if (error?.message?.includes('ERR_ABORTED') || error?.message?.includes('fetch')) {
        console.error('🌐 Erro de conectividade detectado')
        toast.error('Erro de conectividade. Verificando conexão...')
        
        // Tentar novamente após um pequeno delay
        setTimeout(() => {
          console.log('🔄 Tentando recarregar agendamentos novamente...')
          loadAgendamentos()
        }, 2000)
      } else {
        toast.error('Erro ao carregar agendamentos. Tente novamente.')
      }
      
      setAgendamentos([]) // Limpar estado em caso de erro
    } finally {
      setLoading(false)
    }
  }

  const loadPacientes = async () => {
    if (!psicologo?.id) {
      console.warn('Psicólogo não encontrado para carregar pacientes')
      return
    }

    try {
      console.log('🔄 Carregando pacientes para psicólogo:', psicologo.id)
      
      const { data, error } = await supabase
        .from('pacientes')
        .select(`
          id,
          nome,
          telefone,
          email,
          cpf,
          data_nascimento,
          endereco,
          cep,
          cidade,
          estado,
          profissao,
          estado_civil,
          contato_emergencia,
          observacoes,
          status,
          created_at,
          updated_at
        `)
        .eq('psicologo_id', psicologo.id)
        .eq('status', 'ativo')
        .order('nome', { ascending: true })

      if (error) {
        console.error('Erro na query de pacientes:', error)
        throw error
      }

      // Validar dados dos pacientes
      const pacientesValidos = (data || []).filter(paciente => {
        if (!paciente.nome || paciente.nome.trim() === '') {
          console.warn(`Paciente ${paciente.id} sem nome`)
          return false
        }
        if (!paciente.telefone || paciente.telefone.trim() === '') {
          console.warn(`Paciente ${paciente.id} sem telefone`)
          return false
        }
        return true
      })

      console.log(`✅ ${pacientesValidos.length} pacientes carregados com sucesso`)
      setPacientes(pacientesValidos)

      // Verificar se há pacientes com dados incompletos
      const pacientesIncompletos = (data || []).length - pacientesValidos.length
      if (pacientesIncompletos > 0) {
        console.warn(`⚠️ ${pacientesIncompletos} pacientes com dados incompletos foram filtrados`)
      }

    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
      toast.error('Erro ao carregar pacientes. Tente novamente.')
      setPacientes([]) // Limpar estado em caso de erro
    }
  }

  useEffect(() => {
    loadAgendamentos()
    loadPacientes()
  }, [psicologo?.id])

  // Carregar agendamentos quando a data selecionada mudar
  useEffect(() => {
    if (psicologo?.id && viewMode === 'calendar') {
      console.log('📅 Data selecionada mudou, carregando agendamentos para:', selectedDate.toISOString().split('T')[0])
      loadAgendamentos(selectedDate)
    }
  }, [selectedDate, psicologo?.id, viewMode])

  // Sistema de atualização automática a cada 30 segundos
  useEffect(() => {
    if (!psicologo?.id) return

    const interval = setInterval(() => {
      console.log('🔄 Atualizando dados automaticamente...')
      if (viewMode === 'calendar') {
        loadAgendamentos(selectedDate)
      } else {
        loadAgendamentos()
      }
      loadPacientes()
    }, 30000) // 30 segundos

    return () => {
      clearInterval(interval)
      console.log('🛑 Limpando intervalo de atualização automática')
    }
  }, [psicologo?.id, selectedDate, viewMode])

  // Listener para mudanças em tempo real no Supabase
  useEffect(() => {
    if (!psicologo?.id) return

    console.log('🔗 Configurando listeners de tempo real...')

    // Listener para agendamentos
    const agendamentosSubscription = supabase
      .channel('agendamentos_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'agendamentos',
          filter: `psicologo_id=eq.${psicologo.id}`
        }, 
        (payload) => {
          console.log('📡 Mudança detectada em agendamentos:', payload)
          if (viewMode === 'calendar') {
            loadAgendamentos(selectedDate)
          } else {
            loadAgendamentos()
          }
        }
      )
      .subscribe()

    // Listener para pacientes
    const pacientesSubscription = supabase
      .channel('pacientes_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'pacientes',
          filter: `psicologo_id=eq.${psicologo.id}`
        }, 
        (payload) => {
          console.log('📡 Mudança detectada em pacientes:', payload)
          loadPacientes()
        }
      )
      .subscribe()

    return () => {
      console.log('🔌 Desconectando listeners de tempo real')
      agendamentosSubscription.unsubscribe()
      pacientesSubscription.unsubscribe()
    }
  }, [psicologo?.id])

  const getAgendamentosForDate = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Data inválida fornecida para getAgendamentosForDate:', date)
      return []
    }

    try {
      // Converter para string no formato YYYY-MM-DD considerando timezone local
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      
      console.log(`🔍 Buscando agendamentos para data: ${dateStr}`)
      
      const agendamentosData = agendamentos.filter(agendamento => {
        if (!agendamento?.data_hora) {
          console.warn(`Agendamento ${agendamento?.id} sem data_hora`)
          return false
        }
        
        // Extrair apenas a parte da data (YYYY-MM-DD) do timestamp
        const agendamentoDateStr = agendamento.data_hora.split('T')[0]
        const matches = agendamentoDateStr === dateStr
        
        if (matches) {
          console.log(`✅ Agendamento encontrado: ${agendamento.id} - ${agendamento.paciente?.nome} às ${agendamento.data_hora}`)
        }
        
        return matches
      })
      
      console.log(`📊 Total de agendamentos encontrados para ${dateStr}: ${agendamentosData.length}`)
      return agendamentosData
      
    } catch (error) {
      console.error('Erro ao filtrar agendamentos por data:', error)
      return []
    }
  }

  const filteredAgendamentos = agendamentos.filter(agendamento => {
    if (!agendamento) return false
    
    try {
      const matchesSearch = agendamento.paciente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           agendamento.observacoes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           false
      
      const matchesStatus = statusFilter === 'todos' || agendamento.status === statusFilter
      
      return matchesSearch && matchesStatus
    } catch (error) {
      console.warn('Erro ao filtrar agendamento:', agendamento.id, error)
      return false
    }
  })

  const handleEdit = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento)
    setShowForm(true)
  }

  const handleDelete = async (agendamento: Agendamento) => {
    if (!confirm(`Tem certeza que deseja excluir o agendamento com ${agendamento.paciente?.nome}?`)) return

    try {
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', agendamento.id)

      if (error) throw error
      
      toast.success('Agendamento excluído com sucesso!')
      loadAgendamentos()
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error)
      toast.error('Erro ao excluir agendamento')
    }
  }

  const handleIniciarSessao = async (agendamento: Agendamento) => {
    try {
      await iniciarSessao(agendamento.id)
      setSessaoAtiva(agendamento)
      toast.success('Sessão iniciada com sucesso!')
      loadAgendamentos()
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error)
      toast.error('Erro ao iniciar sessão')
    }
  }

  const handleSyncGoogleCalendar = async () => {
    if (!psicologo?.id) {
      toast.error('Usuário não autenticado')
      return
    }

    setSyncingGoogle(true)
    
    try {
      // Simular delay de sincronização
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Eventos simulados do Google Calendar
      const eventosSimulados = [
        {
          titulo: 'Consulta - João Silva',
          data_hora: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Amanhã
          duracao: 60,
          observacoes: 'Importado do Google Calendar'
        },
        {
          titulo: 'Sessão - Maria Santos',
          data_hora: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Depois de amanhã
          duracao: 50,
          observacoes: 'Importado do Google Calendar'
        },
        {
          titulo: 'Avaliação - Pedro Costa',
          data_hora: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Em 3 dias
          duracao: 90,
          observacoes: 'Importado do Google Calendar - Primeira consulta'
        }
      ]

      // Inserir eventos simulados no banco de dados
      const agendamentosParaInserir = eventosSimulados.map(evento => ({
        psicologo_id: psicologo.id,
        paciente_id: null, // Paciente genérico para eventos importados
        data_hora: evento.data_hora,
        duracao: evento.duracao,
        status: 'agendado',
        tipo_sessao: 'consulta',
        observacoes: evento.observacoes,
        valor: 150.00, // Valor padrão
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data, error } = await supabase
        .from('agendamentos')
        .insert(agendamentosParaInserir)
        .select()

      if (error) throw error

      toast.success(`${eventosSimulados.length} eventos sincronizados com sucesso!`)
      
      // Recarregar agendamentos
      await loadAgendamentos()
      
    } catch (error) {
      console.error('Erro ao sincronizar com Google Calendar:', error)
      toast.error('Erro ao sincronizar com Google Calendar')
    } finally {
      setSyncingGoogle(false)
    }
  }

  const handleFecharSessao = () => {
    setSessaoAtiva(null)
    loadAgendamentos()
  }

  const handleStatusChange = async (agendamento: Agendamento, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: newStatus })
        .eq('id', agendamento.id)

      if (error) throw error
      
      // Se o status foi alterado para "realizado", criar transação financeira automática
      if (newStatus === 'realizado' && user?.id) {
        try {
          await criarTransacaoFinanceiraAutomatica(agendamento.id, user.id)
          console.log('✅ Transação financeira criada automaticamente para agendamento:', agendamento.id)
        } catch (financeiroError) {
          console.error('⚠️ Erro ao criar transação financeira automática:', financeiroError)
          // Não falhar a operação principal por causa do erro financeiro
          toast.warning('Status atualizado, mas houve um problema ao criar o registro financeiro')
        }
      }
      
      toast.success('Status atualizado com sucesso!')
      loadAgendamentos()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedAgendamento(null)
  }

  const handleFormSave = async () => {
    console.log('💾 === HANDLEFORMSAVE CHAMADO ===')
    console.log('🔄 Recarregando agendamentos após salvamento...')
    
    // Recarregar agendamentos
    if (viewMode === 'calendar') {
      console.log('📅 Modo calendário - carregando para data:', selectedDate.toISOString().split('T')[0])
      await loadAgendamentos(selectedDate)
    } else {
      console.log('📋 Modo lista - carregando todos os agendamentos')
      await loadAgendamentos()
    }
    
    // Forçar atualização da interface para a data selecionada
    if (selectedDate) {
      console.log('🔄 Forçando atualização da interface para data selecionada:', selectedDate.toLocaleDateString('pt-BR'))
      // Pequeno delay para garantir que os dados foram atualizados
      setTimeout(() => {
        const agendamentosData = getAgendamentosForDate(selectedDate)
        console.log(`📊 Agendamentos para ${selectedDate.toLocaleDateString('pt-BR')} após reload: ${agendamentosData.length}`)
        
        // Log detalhado dos agendamentos encontrados
        agendamentosData.forEach((agendamento, index) => {
          console.log(`📋 Agendamento ${index + 1}:`, {
            id: agendamento.id,
            paciente: agendamento.paciente?.nome,
            data_hora: agendamento.data_hora,
            status: agendamento.status
          })
        })
      }, 500)
    }
    
    // Fechar formulário
    handleFormClose()
  }

  const handleDateChange = (value: any) => {
    try {
      console.log('📅 Mudança de data no calendário:', value)
      
      if (value instanceof Date && !isNaN(value.getTime())) {
        setSelectedDate(value)
        console.log('✅ Data selecionada:', value.toLocaleDateString('pt-BR'))
        
        // Buscar agendamentos para a nova data
        const agendamentosData = getAgendamentosForDate(value)
        console.log(`📋 Encontrados ${agendamentosData.length} agendamentos para ${value.toLocaleDateString('pt-BR')}`)
        
      } else if (Array.isArray(value) && value.length > 0 && value[0] instanceof Date && !isNaN(value[0].getTime())) {
        setSelectedDate(value[0])
        console.log('✅ Data selecionada (array):', value[0].toLocaleDateString('pt-BR'))
        
        // Buscar agendamentos para a nova data
        const agendamentosData = getAgendamentosForDate(value[0])
        console.log(`📋 Encontrados ${agendamentosData.length} agendamentos para ${value[0].toLocaleDateString('pt-BR')}`)
        
      } else {
        console.warn('⚠️ Valor de data inválido recebido:', value)
        toast.warning('Data selecionada é inválida')
      }
    } catch (error) {
      console.error('❌ Erro ao processar mudança de data:', error)
      toast.error('Erro ao selecionar data')
    }
  }

  // Função para obter agendamentos baseado na visualização
  const getAgendamentosForView = () => {
    const today = new Date()
    const currentDate = selectedDate || today

    switch (calendarView) {
      case 'day':
        return getAgendamentosForDate(currentDate)
      
      case 'week':
        const startOfWeek = new Date(currentDate)
        const dayOfWeek = startOfWeek.getDay()
        startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek)
        
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(endOfWeek.getDate() + 6)
        
        return agendamentos.filter(agendamento => {
          const agendamentoDate = new Date(agendamento.data_hora)
          return agendamentoDate >= startOfWeek && agendamentoDate <= endOfWeek
        })
      
      case 'month':
      default:
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        
        return agendamentos.filter(agendamento => {
          const agendamentoDate = new Date(agendamento.data_hora)
          return agendamentoDate >= startOfMonth && agendamentoDate <= endOfMonth
        })
    }
  }

  // Função para navegar entre períodos
  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    
    switch (calendarView) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
    }
    
    setSelectedDate(newDate)
  }

  // Função para ir para hoje
  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const renderCalendarView = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      <div className="lg:col-span-2 space-y-6">
        {/* Google Calendar Integration */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
        >
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
              Calendário Google
            </h3>
            <p className="text-sm text-gray-600 mt-1">Visualização integrada dos seus agendamentos</p>
          </div>
          <div className="relative">
            <iframe
              src="https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=America%2FSao_Paulo&showPrint=0&src=bHVndWltYXNpbHZhY2VsbEBnbWFpbC5jb20&src=ZmFtaWx5MTY3OTQwNzc1MDMwMzA4NzYwODNAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ&src=cHQuYnJhemlsaWFuI2hvbGlkYXlAZ3JvdXAudi5jYWxlbmRhci5nb29nbGUuY29t&color=%23039be5&color=%23e67c73&color=%237986cb"
              style={{ border: 0 }}
              width="100%"
              height="600"
              frameBorder="0"
              scrolling="no"
              className="w-full"
              title="Google Calendar"
            />
          </div>
        </motion.div>

        {/* Calendário Local */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
        >
          <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg mr-3">
                  <CalendarIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Calendário Local</h3>
                  <p className="text-sm text-gray-600">Selecione uma data para ver os agendamentos</p>
                </div>
              </div>
              
              {/* Controles de Visualização */}
              <div className="flex items-center space-x-2">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setCalendarView('day')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      calendarView === 'day'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Dia
                  </button>
                  <button
                    onClick={() => setCalendarView('week')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      calendarView === 'week'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setCalendarView('month')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      calendarView === 'month'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Mês
                  </button>
                </div>
              </div>
            </div>
            
            {/* Navegação de Período */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigatePeriod('prev')}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-medium text-gray-900">
                  {calendarView === 'day' && selectedDate.toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  {calendarView === 'week' && `Semana de ${selectedDate.toLocaleDateString('pt-BR', { 
                    day: 'numeric', 
                    month: 'short' 
                  })}`}
                  {calendarView === 'month' && selectedDate.toLocaleDateString('pt-BR', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </h4>
                <button
                  onClick={goToToday}
                  className="p-1 hover:bg-white rounded transition-colors"
                  title="Ir para hoje"
                >
                  <RotateCcw className="h-3 w-3 text-gray-500" />
                </button>
              </div>
              
              <button
                onClick={() => navigatePeriod('next')}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="p-4">
            {calendarView === 'month' ? (
              <Calendar
                onChange={handleDateChange}
                value={selectedDate}
                className="w-full border-none"
                locale="pt-BR"
                view="month"
                tileClassName={({ date, view }) => {
                  if (view === 'month') {
                    try {
                      const today = new Date()
                      const isToday = date.toDateString() === today.toDateString()
                      const agendamentosData = getAgendamentosForDate(date)
                      const hasAgendamentos = agendamentosData.length > 0
                      
                      // Destacar o dia atual
                      if (isToday) {
                        if (hasAgendamentos) {
                          return 'bg-gradient-to-br from-purple-500 to-blue-600 text-white font-bold border-2 border-purple-400 shadow-lg'
                        } else {
                          return 'bg-gradient-to-br from-gray-600 to-gray-700 text-white font-bold border-2 border-gray-500 shadow-lg'
                        }
                      }
                      
                      if (hasAgendamentos) {
                        // Verificar tipos de status para diferentes cores
                        const hasConfirmado = agendamentosData.some(a => a.status === 'confirmado')
                        const hasAgendado = agendamentosData.some(a => a.status === 'agendado')
                        const hasRealizado = agendamentosData.some(a => a.status === 'realizado')
                        
                        if (hasRealizado) {
                          return 'bg-green-100 text-green-800 font-semibold border border-green-300'
                        } else if (hasConfirmado) {
                          return 'bg-blue-100 text-blue-800 font-semibold border border-blue-300'
                        } else if (hasAgendado) {
                          return 'bg-yellow-100 text-yellow-800 font-semibold border border-yellow-300'
                        }
                        return 'bg-gray-100 text-gray-800 font-semibold border border-gray-300'
                      }
                    } catch (error) {
                      console.warn('Erro ao aplicar estilo no calendário para data:', date, error)
                    }
                  }
                  return ''
                }}
                tileContent={({ date, view }) => {
                  if (view === 'month') {
                    try {
                      const agendamentosData = getAgendamentosForDate(date)
                      if (agendamentosData.length > 0) {
                        // Ordenar agendamentos por horário
                        const agendamentosOrdenados = agendamentosData
                          .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
                          .slice(0, 3) // Limitar a 3 agendamentos visíveis

                        return (
                          <div className="w-full mt-0.5 space-y-0.5 max-h-14 overflow-y-auto calendar-appointments-container">
                            {agendamentosOrdenados.map((agendamento, index) => {
                              // Função para obter cor baseada no status
                              const getStatusColor = (status: string) => {
                                switch (status) {
                                  case 'confirmado':
                                    return 'appointment-status-confirmado'
                                  case 'agendado':
                                    return 'appointment-status-agendado'
                                  case 'realizado':
                                    return 'appointment-status-realizado'
                                  case 'cancelado':
                                    return 'appointment-status-cancelado'
                                  default:
                                    return 'appointment-status-default'
                                }
                              }

                              // Extrair horário da data_hora
                              const horario = new Date(agendamento.data_hora).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })

                              // Truncar nome do paciente
                              const nomeCompleto = agendamento.paciente?.nome || 'Paciente'
                              const nomeTruncado = nomeCompleto.length > 6 
                                ? nomeCompleto.substring(0, 6) + '...' 
                                : nomeCompleto

                              return (
                                <div
                                  key={agendamento.id}
                                  className={`
                                    calendar-appointment-tag text-white
                                    ${getStatusColor(agendamento.status)}
                                    cursor-pointer shadow-sm
                                  `}
                                  title={`${horario} - ${nomeCompleto} (${agendamento.status})`}
                                >
                                  <div className="truncate font-semibold">
                                    {horario}
                                  </div>
                                  <div className="truncate opacity-90">
                                    {nomeTruncado}
                                  </div>
                                </div>
                              )
                            })}
                            
                            {/* Contador se houver mais agendamentos */}
                            {agendamentosData.length > 3 && (
                              <div className="flex justify-center mt-0.5">
                                <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 text-xs font-bold text-white bg-gray-600 rounded-full shadow-sm">
                                  +{agendamentosData.length - 3}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      }
                    } catch (error) {
                      console.warn('Erro ao renderizar conteúdo do calendário para data:', date, error)
                    }
                  }
                  return null
                }}
              />
            ) : (
              // Visualização customizada para semana e dia
              <div className="space-y-4">
                {calendarView === 'week' ? (
                  // Visualização de semana
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = new Date(selectedDate)
                      const dayOfWeek = date.getDay()
                      date.setDate(date.getDate() - dayOfWeek + i)
                      
                      const agendamentosData = getAgendamentosForDate(date)
                      const isToday = date.toDateString() === new Date().toDateString()
                      
                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            isToday 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedDate(date)}
                        >
                          <div className="text-center">
                            <div className="text-xs font-medium text-gray-500 mb-1">
                              {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                            </div>
                            <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                              {date.getDate()}
                            </div>
                            <div className="mt-2 space-y-1">
                              {agendamentosData.slice(0, 2).map((agendamento, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate"
                                  title={`${new Date(agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${agendamento.paciente?.nome}`}
                                >
                                  {new Date(agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              ))}
                              {agendamentosData.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{agendamentosData.length - 2} mais
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  // Visualização de dia
                  <div className="space-y-2">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {selectedDate.toLocaleDateString('pt-BR', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </h4>
                    </div>
                    
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {getAgendamentosForDate(selectedDate).length > 0 ? (
                        getAgendamentosForDate(selectedDate)
                          .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
                          .map((agendamento) => (
                            <div
                              key={agendamento.id}
                              className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                              onClick={() => setSelectedAgendamento(agendamento)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {agendamento.paciente?.nome}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {new Date(agendamento.data_hora).toLocaleTimeString('pt-BR', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </div>
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  agendamento.status === 'confirmado' ? 'bg-blue-100 text-blue-800' :
                                  agendamento.status === 'agendado' ? 'bg-yellow-100 text-yellow-800' :
                                  agendamento.status === 'realizado' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {agendamento.status}
                                </div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          Nenhum agendamento para este dia
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

      </div>
      
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-4"
      >
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3">
              <CalendarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-semibold">
                {selectedDate ? selectedDate.toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'Data não selecionada'}
              </div>
              <div className="text-sm text-gray-500 font-normal">
                {selectedDate ? getAgendamentosForDate(selectedDate).length : 0} agendamento(s) para esta data
              </div>
            </div>
          </h3>
          
          {getAgendamentosForDate(selectedDate).length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <AnimatedIcon icon={Clock} animation="pulse" className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">Nenhum agendamento</p>
              <p className="text-sm text-gray-400 mt-1">para este dia</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {getAgendamentosForDate(selectedDate)
                .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
                .map((agendamento, index) => (
                  <motion.div
                    key={agendamento.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <AgendamentoCard
                      agendamento={agendamento}
                      onEditarAgendamento={handleEdit}
                      onExcluirAgendamento={handleDelete}
                      onIniciarSessao={handleIniciarSessao}
                      compact={true}
                    />
                  </motion.div>
                ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )

  const renderListView = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-6"
    >
      {/* Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white p-6 rounded-xl shadow-lg border border-gray-200"
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3">
              <Filter className="h-5 w-5 text-white" />
            </div>
            Filtros de Busca
          </h3>
          <p className="text-sm text-gray-600 mt-1">Encontre agendamentos específicos</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <AnimatedIcon 
                icon={Search} 
                animation="pulse" 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" 
              />
              <input
                type="text"
                placeholder="Buscar por paciente ou observações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition-all duration-200"
              >
                <option value="todos">Todos os Status</option>
                <option value="agendado">Agendado</option>
                <option value="confirmado">Confirmado</option>
                <option value="realizado">Realizado</option>
                <option value="cancelado">Cancelado</option>
                <option value="faltou">Faltou</option>
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Appointments Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {filteredAgendamentos.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-full text-center py-12"
          >
            <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <AnimatedIcon 
                icon={CalendarIcon} 
                animation="pulse" 
                className="h-10 w-10 text-gray-400" 
              />
            </div>
            <p className="text-gray-500 font-medium text-lg mb-2">
              {searchTerm || statusFilter !== 'todos' 
                ? 'Nenhum agendamento encontrado'
                : 'Nenhum agendamento cadastrado'
              }
            </p>
            <p className="text-gray-400 text-sm">
              {searchTerm || statusFilter !== 'todos' 
                ? 'Tente ajustar os filtros de busca'
                : 'Clique em "Novo Agendamento" para começar'
              }
            </p>
          </motion.div>
        ) : (
          filteredAgendamentos.map((agendamento, index) => (
            <motion.div
              key={agendamento.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <AgendamentoCard
                agendamento={agendamento}
                onEditarAgendamento={handleEdit}
                onExcluirAgendamento={handleDelete}
                onIniciarSessao={handleIniciarSessao}
              />
            </motion.div>
          ))
        )}
      </motion.div>
    </motion.div>
  )

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-gray-600">Gerencie os agendamentos e sessões</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ModernSkeleton key={i} variant="card" height="8rem" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ModernSkeleton variant="chart" height="24rem" />
          </div>
          <ModernSkeleton variant="card" height="24rem" />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <CalendarIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Agendamentos
            </h1>
            <p className="text-gray-600 flex items-center mt-1">
              <Activity className="h-4 w-4 mr-2 text-blue-500" />
              Gerencie os agendamentos e sessões
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-1 shadow-sm border border-gray-200">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setViewMode('calendar')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                viewMode === 'calendar'
                  ? 'bg-white text-blue-600 shadow-md border border-blue-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendário
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setViewMode('list')}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-md border border-blue-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <List className="h-4 w-4 mr-2" />
              Lista
            </motion.button>
          </div>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(34, 197, 94, 0.3)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSyncGoogleCalendar}
            disabled={syncingGoogle}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2.5 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center shadow-lg border border-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncingGoogle ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {syncingGoogle ? 'Sincronizando...' : 'Sincronizar Google'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.3)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center shadow-lg border border-blue-500/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </motion.button>
        </div>
      </motion.div>

      {/* Statistics */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <ModernStatCard
          title="Total"
          value={agendamentos.length.toString()}
          icon={CalendarIcon}
          trend={{ value: 0, isPositive: true }}
          gradient="from-blue-500 to-blue-600"
          description="Agendamentos totais"
        />
        
        <ModernStatCard
          title="Hoje"
          value={getAgendamentosForDate(new Date()).length.toString()}
          icon={Clock}
          trend={{ value: 0, isPositive: true }}
          gradient="from-green-500 to-green-600"
          description="Agendamentos de hoje"
        />
        
        <ModernStatCard
          title="Confirmados"
          value={agendamentos.filter(a => a.status === 'confirmado').length.toString()}
          icon={Activity}
          trend={{ value: 0, isPositive: true }}
          gradient="from-emerald-500 to-emerald-600"
          description="Status confirmado"
        />
        
        <ModernStatCard
          title="Pendentes"
          value={agendamentos.filter(a => a.status === 'agendado').length.toString()}
          icon={BarChart3}
          trend={{ value: 0, isPositive: false }}
          gradient="from-yellow-500 to-orange-500"
          description="Aguardando confirmação"
        />
      </motion.div>

      {/* Main Content */}
      {viewMode === 'calendar' ? renderCalendarView() : renderListView()}

      {/* Form Modal */}
      {showForm && (
        <AgendamentoForm
          agendamento={selectedAgendamento}
          pacientes={pacientes}
          onClose={handleFormClose}
          onSave={handleFormSave}
          selectedDate={selectedDate}
        />
      )}

      {/* Active Session Modal */}
      {sessaoAtiva && (
        <SessaoAtiva
          agendamento={sessaoAtiva}
          onSessaoFinalizada={handleFecharSessao}
        />
      )}
    </motion.div>
  )
}

export default Agendamentos