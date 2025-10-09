import React, { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, List, Plus, Search, Filter, Clock, User, Phone, Edit, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Calendar from 'react-calendar'
import { supabase, type Agendamento, type Paciente } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import AgendamentoForm from '../components/AgendamentoForm'
import AgendamentoCard from '../components/AgendamentoCard'
import SessaoAtiva from '../components/SessaoAtiva'
import { useAgendamentoSessao } from '../hooks/useAgendamentoSessao'
import { formatDate, formatTime } from '../lib/utils'
import { toast } from 'sonner'
import 'react-calendar/dist/Calendar.css'

function Agendamentos() {
  const { psicologo } = useAuthStore()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [sessaoAtiva, setSessaoAtiva] = useState<Agendamento | null>(null)

  const { iniciarSessao } = useAgendamentoSessao()

  const loadAgendamentos = async () => {
    if (!psicologo?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:pacientes(*)
        `)
        .eq('psicologo_id', psicologo.id)
        .order('data_hora')

      if (error) throw error
      setAgendamentos(data || [])
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
      toast.error('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }

  const loadPacientes = async () => {
    if (!psicologo?.id) return

    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('psicologo_id', psicologo.id)
        .eq('status', 'ativo')
        .order('nome')

      if (error) throw error
      setPacientes(data || [])
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
    }
  }

  useEffect(() => {
    loadAgendamentos()
    loadPacientes()
  }, [psicologo?.id])

  const getAgendamentosForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return agendamentos.filter(agendamento => 
      agendamento.data_hora.startsWith(dateStr)
    )
  }

  const filteredAgendamentos = agendamentos.filter(agendamento => {
    const matchesSearch = agendamento.paciente?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agendamento.observacoes?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'todos' || agendamento.status === statusFilter
    
    return matchesSearch && matchesStatus
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

  const handleFormSave = () => {
    loadAgendamentos()
  }

  const handleDateChange = (value: any) => {
    if (value instanceof Date) {
      setSelectedDate(value)
    } else if (Array.isArray(value) && value[0] instanceof Date) {
      setSelectedDate(value[0])
    }
  }

  const renderCalendarView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <Calendar
            onChange={handleDateChange}
            value={selectedDate}
            locale="pt-BR"
            className="w-full border-0"
            tileClassName={({ date }) => {
              const hasAppointments = getAgendamentosForDate(date).length > 0
              return hasAppointments ? 'has-appointments' : ''
            }}
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            {selectedDate.toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          
          {getAgendamentosForDate(selectedDate).length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum agendamento para este dia</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getAgendamentosForDate(selectedDate)
                .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
                .map((agendamento) => (
                  <AgendamentoCard
                    key={agendamento.id}
                    agendamento={agendamento}
                    onEditarAgendamento={handleEdit}
                    onExcluirAgendamento={handleDelete}
                    onIniciarSessao={handleIniciarSessao}
                    compact={true}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderListView = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por paciente ou observações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
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
      </div>

      {/* Appointments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgendamentos.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'todos' 
                ? 'Nenhum agendamento encontrado com os filtros aplicados.'
                : 'Nenhum agendamento cadastrado ainda.'
              }
            </p>
          </div>
        ) : (
          filteredAgendamentos.map((agendamento) => (
            <AgendamentoCard
              key={agendamento.id}
              agendamento={agendamento}
              onEditarAgendamento={handleEdit}
              onExcluirAgendamento={handleDelete}
              onIniciarSessao={handleIniciarSessao}
            />
          ))
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-gray-600">Gerencie os agendamentos e sessões</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendário
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4 mr-2" />
              Lista
            </button>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{agendamentos.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Hoje</p>
              <p className="text-2xl font-semibold text-gray-900">
                {getAgendamentosForDate(new Date()).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-green-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Confirmados</p>
              <p className="text-2xl font-semibold text-gray-900">
                {agendamentos.filter(a => a.status === 'confirmado').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-yellow-600 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pendentes</p>
              <p className="text-2xl font-semibold text-gray-900">
                {agendamentos.filter(a => a.status === 'agendado').length}
              </p>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  )
}

export default Agendamentos