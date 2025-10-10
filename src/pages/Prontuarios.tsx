import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, User, Calendar, FileText, Clock, AlertCircle } from 'lucide-react'
import { supabase, type Prontuario, type Agendamento } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { formatDate, formatDateTime } from '../lib/utils'
import { toast } from 'sonner'
import ProntuarioForm from '../components/ProntuarioForm'

function Prontuarios() {
  const { psicologo } = useAuthStore()
  const [prontuarios, setProntuarios] = useState<(Prontuario & { agendamento: Agendamento })[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [pacienteFilter, setPacienteFilter] = useState<string>('todos')
  const [showForm, setShowForm] = useState(false)
  const [selectedProntuario, setSelectedProntuario] = useState<Prontuario | null>(null)

  const loadProntuarios = async () => {
    if (!psicologo?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('prontuarios')
        .select(`
          *,
          agendamento:agendamentos(
            *,
            paciente:pacientes(*)
          )
        `)
        .eq('psicologo_id', psicologo.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProntuarios(data || [])
    } catch (error) {
      console.error('Erro ao carregar prontuários:', error)
      toast.error('Erro ao carregar prontuários')
    } finally {
      setLoading(false)
    }
  }

  const loadAgendamentos = async () => {
    if (!psicologo?.id) return

    try {
      console.log('🔍 [Prontuarios] Carregando agendamentos para prontuários...')
      
      // Buscar agendamentos confirmados, realizados e finalizados (mais flexível)
      const { data: agendamentosData, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          duracao_minutos,
          tipo,
          status,
          status_sessao,
          observacoes,
          valor,
          paciente_id,
          psicologo_id,
          paciente:pacientes(
            id,
            nome,
            email,
            telefone,
            data_nascimento,
            status
          )
        `)
        .eq('psicologo_id', psicologo.id)
        .in('status', ['confirmado', 'realizado'])
        .order('data_hora', { ascending: false })

      console.log('📊 [Prontuarios] Agendamentos encontrados:', agendamentosData?.length || 0)
      console.log('📋 [Prontuarios] Detalhes dos agendamentos:')
      agendamentosData?.forEach((a, index) => {
        console.log(`  ${index + 1}. ID: ${a.id}, Data: ${a.data_hora}, Paciente: ${a.paciente?.nome} (ID: ${a.paciente?.id}), Status: ${a.status}`)
      })

      if (agendamentosError) {
        console.error('❌ [Prontuarios] Erro ao buscar agendamentos:', agendamentosError)
        throw agendamentosError
      }

      // Depois, buscar todos os prontuários para filtrar agendamentos que já têm prontuário
      const { data: prontuariosData, error: prontuariosError } = await supabase
        .from('prontuarios')
        .select('agendamento_id')
        .eq('psicologo_id', psicologo.id)

      if (prontuariosError) {
        console.error('❌ [Prontuarios] Erro ao buscar prontuários:', prontuariosError)
        throw prontuariosError
      }

      console.log('📋 [Prontuarios] Prontuários existentes:', prontuariosData?.length || 0)

      // Para o ProntuarioForm, vamos passar TODOS os agendamentos
      // A filtragem de prontuários existentes será feita dentro do próprio ProntuarioForm
      console.log('✅ [Prontuarios] Total de agendamentos encontrados:', agendamentosData?.length || 0)
      console.log('👥 [Prontuarios] Pacientes únicos:', [...new Set(agendamentosData?.map(a => a.paciente?.nome))].join(', '))
      console.log('📊 [Prontuarios] Agendamentos que serão passados para ProntuarioForm:')
      agendamentosData?.forEach((a, index) => {
        console.log(`  ${index + 1}. ID: ${a.id}, Data: ${a.data_hora}, Paciente: ${a.paciente?.nome} (ID: ${a.paciente?.id}), Status: ${a.status}`)
      })

      setAgendamentos(agendamentosData || [])
    } catch (error) {
      console.error('💥 [Prontuarios] Erro ao carregar agendamentos:', error)
      toast.error('Erro ao carregar agendamentos para prontuários')
    }
  }

  useEffect(() => {
    console.log('🔄 [Prontuarios] Carregando dados da página de prontuários...')
    loadProntuarios()
    loadAgendamentos()
  }, [psicologo?.id])

  const filteredProntuarios = prontuarios.filter(prontuario => {
    const pacienteNome = prontuario.agendamento?.paciente?.nome || ''
    const matchesSearch = pacienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prontuario.observacoes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prontuario.diagnostico?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPaciente = pacienteFilter === 'todos' || prontuario.agendamento?.paciente?.id === pacienteFilter
    
    return matchesSearch && matchesPaciente
  })

  const handleEdit = (prontuario: Prontuario) => {
    setSelectedProntuario(prontuario)
    setShowForm(true)
  }

  const handleDelete = async (prontuario: Prontuario) => {
    const pacienteNome = prontuarios.find(p => p.id === prontuario.id)?.agendamento?.paciente?.nome || 'este paciente'
    if (!confirm(`Tem certeza que deseja excluir o prontuário de ${pacienteNome}?`)) return

    try {
      const { error } = await supabase
        .from('prontuarios')
        .delete()
        .eq('id', prontuario.id)

      if (error) throw error
      
      toast.success('Prontuário excluído com sucesso!')
      loadProntuarios()
      loadAgendamentos()
    } catch (error) {
      console.error('Erro ao excluir prontuário:', error)
      toast.error('Erro ao excluir prontuário')
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedProntuario(null)
  }

  const handleFormSave = () => {
    loadProntuarios()
    loadAgendamentos()
  }

  // Get unique patients from prontuários for filter
  const pacientesUnicos = Array.from(
    new Map(
      prontuarios
        .filter(p => p.agendamento?.paciente)
        .map(p => [p.agendamento.paciente.id, p.agendamento.paciente])
    ).values()
  )

  const stats = {
    total: prontuarios.length,
    esteMes: prontuarios.filter(p => {
      const date = new Date(p.created_at)
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length,
    pacientesAtendidos: pacientesUnicos.length,
    ultimaSemana: prontuarios.filter(p => {
      const date = new Date(p.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return date >= weekAgo
    }).length,
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prontuários</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie os prontuários eletrônicos das sessões realizadas
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          title="Criar novo prontuário"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Prontuário
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Este Mês</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.esteMes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pacientes</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pacientesAtendidos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Última Semana</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.ultimaSemana}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por paciente, diagnóstico ou observações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="sm:w-64">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                value={pacienteFilter}
                onChange={(e) => setPacienteFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="todos">Todos os Pacientes</option>
                {pacientesUnicos.map((paciente) => (
                  <option key={paciente.id} value={paciente.id}>
                    {paciente.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Prontuarios List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredProntuarios.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || pacienteFilter !== 'todos' 
                ? 'Nenhum prontuário encontrado com os filtros aplicados.'
                : 'Nenhum prontuário cadastrado ainda.'
              }
            </p>
            {prontuarios.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">
                Os prontuários são criados automaticamente após finalizar uma sessão.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data da Sessão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de Sessão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diagnóstico
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Observações
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProntuarios.map((prontuario) => (
                  <tr key={prontuario.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {prontuario.agendamento?.data_hora ? 
                          formatDateTime(prontuario.agendamento.data_hora) : 
                          formatDate(prontuario.created_at)
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {prontuario.agendamento?.paciente?.nome || 'Paciente não encontrado'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {prontuario.agendamento?.paciente?.email || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {prontuario.agendamento?.tipo || 'Não especificado'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {prontuario.diagnostico || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {prontuario.observacoes || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(prontuario)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(prontuario)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <ProntuarioForm
          prontuario={selectedProntuario}
          agendamentos={agendamentos}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}
    </div>
  )
}

export default Prontuarios