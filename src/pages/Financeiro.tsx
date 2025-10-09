import React from 'react'
import { DollarSign, Plus, Search, Filter, Edit, Trash2, TrendingUp, TrendingDown, Calendar, CreditCard } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { supabase, type TransacaoFinanceira, type Paciente } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils'
import { toast } from 'sonner'
import TransacaoForm from '../components/TransacaoForm'

export default function Financeiro() {
  const { psicologo } = useAuthStore()
  const [transacoes, setTransacoes] = React.useState<(TransacaoFinanceira & { paciente?: Paciente })[]>([])
  const [pacientes, setPacientes] = React.useState<Paciente[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [tipoFilter, setTipoFilter] = React.useState<string>('todos')
  const [statusFilter, setStatusFilter] = React.useState<string>('todos')
  const [showForm, setShowForm] = React.useState(false)
  const [selectedTransacao, setSelectedTransacao] = React.useState<TransacaoFinanceira | null>(null)

  const loadTransacoes = async () => {
    if (!psicologo?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select(`
          *,
          paciente:pacientes(*)
        `)
        .eq('psicologo_id', psicologo.id)
        .order('data_transacao', { ascending: false })

      if (error) throw error
      setTransacoes(data || [])
    } catch (error) {
      console.error('Erro ao carregar transações:', error)
      toast.error('Erro ao carregar transações')
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

  React.useEffect(() => {
    loadTransacoes()
    loadPacientes()
  }, [psicologo?.id])

  const filteredTransacoes = transacoes.filter(transacao => {
    const matchesSearch = transacao.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transacao.paciente?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTipo = tipoFilter === 'todos' || transacao.tipo === tipoFilter
    const matchesStatus = statusFilter === 'todos' || transacao.status === statusFilter
    
    return matchesSearch && matchesTipo && matchesStatus
  })

  const handleEdit = (transacao: TransacaoFinanceira) => {
    setSelectedTransacao(transacao)
    setShowForm(true)
  }

  const handleDelete = async (transacao: TransacaoFinanceira) => {
    if (!confirm(`Tem certeza que deseja excluir esta transação?`)) return

    try {
      const { error } = await supabase
        .from('transacoes_financeiras')
        .delete()
        .eq('id', transacao.id)

      if (error) throw error
      
      toast.success('Transação excluída com sucesso!')
      loadTransacoes()
    } catch (error) {
      console.error('Erro ao excluir transação:', error)
      toast.error('Erro ao excluir transação')
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedTransacao(null)
  }

  const handleFormSave = () => {
    loadTransacoes()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago':
        return 'bg-green-100 text-green-800'
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800'
      case 'vencido':
        return 'bg-red-100 text-red-800'
      case 'cancelado':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'receita':
        return 'text-green-600'
      case 'despesa':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  // Cálculos financeiros
  const receitas = transacoes.filter(t => t.tipo === 'receita')
  const despesas = transacoes.filter(t => t.tipo === 'despesa')
  const receitasPagas = receitas.filter(t => t.status === 'pago')
  const despesasPagas = despesas.filter(t => t.status === 'pago')

  const stats = {
    totalReceitas: receitas.reduce((sum, t) => sum + t.valor, 0),
    totalDespesas: despesas.reduce((sum, t) => sum + t.valor, 0),
    receitasPagas: receitasPagas.reduce((sum, t) => sum + t.valor, 0),
    despesasPagas: despesasPagas.reduce((sum, t) => sum + t.valor, 0),
    pendentes: transacoes.filter(t => t.status === 'pendente').reduce((sum, t) => sum + t.valor, 0),
    vencidas: transacoes.filter(t => t.status === 'vencido').reduce((sum, t) => sum + t.valor, 0),
  }

  const saldoLiquido = stats.receitasPagas - stats.despesasPagas

  // Dados para gráficos
  const monthlyData = React.useMemo(() => {
    const months = {}
    transacoes.forEach(transacao => {
      if (transacao.status === 'pago') {
        const month = new Date(transacao.data_transacao).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        if (!months[month]) {
          months[month] = { month, receitas: 0, despesas: 0 }
        }
        if (transacao.tipo === 'receita') {
          months[month].receitas += transacao.valor
        } else {
          months[month].despesas += transacao.valor
        }
      }
    })
    return Object.values(months).slice(-6)
  }, [transacoes])

  const statusData = [
    { name: 'Pago', value: transacoes.filter(t => t.status === 'pago').length, color: '#10B981' },
    { name: 'Pendente', value: transacoes.filter(t => t.status === 'pendente').length, color: '#F59E0B' },
    { name: 'Vencido', value: transacoes.filter(t => t.status === 'vencido').length, color: '#EF4444' },
    { name: 'Cancelado', value: transacoes.filter(t => t.status === 'cancelado').length, color: '#6B7280' },
  ]

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
          <h1 className="text-2xl font-bold text-gray-900">Controle Financeiro</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie suas receitas, despesas e relatórios financeiros
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Transação
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Receitas Pagas</p>
              <p className="text-2xl font-semibold text-green-600">{formatCurrency(stats.receitasPagas)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Despesas Pagas</p>
              <p className="text-2xl font-semibold text-red-600">{formatCurrency(stats.despesasPagas)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 ${saldoLiquido >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-lg flex items-center justify-center`}>
                <DollarSign className={`h-5 w-5 ${saldoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Saldo Líquido</p>
              <p className={`text-2xl font-semibold ${saldoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(saldoLiquido)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pendentes</p>
              <p className="text-2xl font-semibold text-yellow-600">{formatCurrency(stats.pendentes)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Receitas vs Despesas (Últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Bar dataKey="receitas" fill="#10B981" name="Receitas" />
              <Bar dataKey="despesas" fill="#EF4444" name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Distribuição por Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
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
                placeholder="Buscar por descrição ou paciente..."
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
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="todos">Todos os Tipos</option>
                <option value="receita">Receitas</option>
                <option value="despesa">Despesas</option>
              </select>
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="todos">Todos os Status</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="vencido">Vencido</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredTransacoes.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || tipoFilter !== 'todos' || statusFilter !== 'todos'
                ? 'Nenhuma transação encontrada com os filtros aplicados.'
                : 'Nenhuma transação cadastrada ainda.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
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
                {filteredTransacoes.map((transacao) => (
                  <tr key={transacao.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDate(transacao.data_transacao)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {transacao.descricao}
                        </div>
                        {transacao.paciente && (
                          <div className="text-sm text-gray-500">
                            {transacao.paciente.nome}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getTipoColor(transacao.tipo)}`}>
                        {transacao.tipo === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${getTipoColor(transacao.tipo)}`}>
                        {transacao.tipo === 'receita' ? '+' : '-'} {formatCurrency(transacao.valor)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transacao.status)}`}>
                        {transacao.status.charAt(0).toUpperCase() + transacao.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(transacao)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(transacao)}
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
        <TransacaoForm
          transacao={selectedTransacao}
          pacientes={pacientes}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}
    </div>
  )
}