import React, { useState } from 'react'
import { Plus, Search, Filter, Edit, Trash2, Phone, Mail, Calendar, FileText, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase, type Paciente } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { formatDate } from '../lib/utils'
import { toast } from 'sonner'
import PacienteForm from '../components/PacienteForm'
import HistoricoPaciente from '../components/HistoricoPaciente'
import { usePacientes } from '../hooks/useQueries'
import { useDebounce } from '../hooks/useDebounce'

function Pacientes() {
  const { psicologo } = useAuthStore()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [showForm, setShowForm] = useState(false)
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [showHistorico, setShowHistorico] = useState(false)
  const [pacienteHistorico, setPacienteHistorico] = useState<Paciente | null>(null)

  // Debounce do termo de busca para evitar requisições excessivas
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Usar o hook otimizado com retry e cache
  const { data: pacientes = [], isLoading: loading, error } = usePacientes({
    search: debouncedSearchTerm,
    status: statusFilter === 'todos' ? undefined : statusFilter
  })

  // Funções auxiliares para formatação segura
  const formatCPF = (cpf: string | null | undefined): string => {
    if (!cpf) return 'Não informado'
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const formatTelefone = (telefone: string | null | undefined): string => {
    if (!telefone) return 'Não informado'
    return telefone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
  }

  const formatDataNascimento = (data: string | null | undefined): string => {
    if (!data) return 'Não informado'
    try {
      return formatDate(data)
    } catch (error) {
      return 'Data inválida'
    }
  }

  // Mostrar erro se houver
  if (error) {
    console.error('Erro ao carregar pacientes:', error)
    toast.error('Erro ao carregar pacientes')
  }

  const handleEdit = (paciente: Paciente) => {
    setSelectedPaciente(paciente)
    setShowForm(true)
  }

  const handleDelete = async (paciente: Paciente) => {
    if (!confirm(`Tem certeza que deseja excluir o paciente ${paciente.nome}?`)) return

    try {
      const { error } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', paciente.id)

      if (error) throw error
      
      toast.success('Paciente excluído com sucesso!')
      // O cache será invalidado automaticamente pelo React Query
    } catch (error) {
      console.error('Erro ao excluir paciente:', error)
      toast.error('Erro ao excluir paciente')
    }
  }

  const handleViewHistorico = (paciente: Paciente) => {
    setPacienteHistorico(paciente)
    setShowHistorico(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedPaciente(null)
  }

  const handleHistoricoClose = () => {
    setShowHistorico(false)
    setPacienteHistorico(null)
  }

  const handleNavigateToFinanceiro = (transacaoId?: string) => {
    // Navegar para a página financeira, opcionalmente com uma transação específica
    if (transacaoId) {
      navigate(`/financeiro?transacao=${transacaoId}`)
    } else {
      navigate('/financeiro')
    }
  }

  const handleEditProntuario = (prontuarioId: string, agendamentoId: string) => {
    // Navegar para a página de prontuários com o prontuário específico para edição
    navigate(`/prontuarios?edit=${prontuarioId}&agendamento=${agendamentoId}`)
    toast.success('Abrindo prontuário para edição')
  }

  const handleFormSave = () => {
    loadPacientes()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-100 text-green-800'
      case 'inativo':
        return 'bg-yellow-100 text-yellow-800'
      case 'arquivado':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const stats = {
    total: pacientes.length,
    ativos: pacientes.filter(p => p.status === 'ativo').length,
    inativos: pacientes.filter(p => p.status === 'inativo').length,
    arquivados: pacientes.filter(p => p.status === 'arquivado').length,
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
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Pacientes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie informações dos seus pacientes e visualize históricos de tratamento
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Paciente
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">{stats.total}</span>
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
                <span className="text-green-600 font-semibold text-sm">{stats.ativos}</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Ativos</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.ativos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 font-semibold text-sm">{stats.inativos}</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Inativos</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.inativos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-sm">{stats.arquivados}</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Arquivados</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.arquivados}</p>
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
                placeholder="Buscar por nome, CPF ou telefone..."
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
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Patients List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {pacientes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'todos' 
                ? 'Nenhum paciente encontrado com os filtros aplicados.'
                : 'Nenhum paciente cadastrado ainda.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Nascimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pacientes.map((paciente) => (
                  <tr key={paciente.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {paciente.nome}
                        </div>
                        <div className="text-sm text-gray-500">
                          CPF: {formatCPF(paciente.cpf)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-900">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {formatTelefone(paciente.telefone)}
                        </div>
                        {paciente.email && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            {paciente.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDataNascimento(paciente.data_nascimento)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(paciente.status)}`}>
                        {paciente.status.charAt(0).toUpperCase() + paciente.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewHistorico(paciente)}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50"
                          title="Ver Histórico"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(paciente)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(paciente)}
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
        <PacienteForm
          paciente={selectedPaciente}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}

      {/* Histórico Modal */}
      {showHistorico && pacienteHistorico && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Histórico do Paciente
              </h3>
              <button
                onClick={handleHistoricoClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <HistoricoPaciente
                pacienteId={pacienteHistorico.id}
                pacienteNome={pacienteHistorico.nome}
                onEditProntuario={handleEditProntuario}
                onNavigateToFinanceiro={handleNavigateToFinanceiro}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Pacientes