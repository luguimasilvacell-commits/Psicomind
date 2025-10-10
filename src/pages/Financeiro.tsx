import React from 'react'
import { DollarSign, Plus, Search, Filter, Edit, Trash2, TrendingUp, TrendingDown, Calendar, CreditCard, BarChart3, Activity, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase, type TransacaoFinanceira, type Paciente } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils'
import { toast } from 'sonner'
import TransacaoForm from '../components/TransacaoForm'
import ReciboGenerator from '../components/ReciboGenerator'
import { 
  ModernStatCard, 
  ModernBarChart, 
  ModernPieChart, 
  ModernSkeleton,
  AnimatedIcon,
  ModernStatusIndicator
} from '../components/modern'

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
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <ModernSkeleton key={i} variant="card" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ModernSkeleton variant="chart" />
          <ModernSkeleton variant="chart" />
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
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
            <DollarSign className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Controle Financeiro</h1>
            <p className="mt-1 text-sm text-gray-600 flex items-center">
              <Activity className="h-4 w-4 mr-1" />
              Gerencie suas receitas, despesas e relatórios financeiros
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(true)}
          className="mt-4 sm:mt-0 inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Transação
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <ModernStatCard
          title="Receitas Pagas"
          value={formatCurrency(stats.receitasPagas)}
          icon={TrendingUp}
          trend={{ value: "+12%", type: "positive" }}
          gradient="from-green-500 to-green-600"
          description="Total de receitas recebidas"
        />

        <ModernStatCard
          title="Despesas Pagas"
          value={formatCurrency(stats.despesasPagas)}
          icon={TrendingDown}
          trend={{ value: "-5%", type: "negative" }}
          gradient="from-red-500 to-red-600"
          description="Total de despesas pagas"
        />

        <ModernStatCard
          title="Saldo Líquido"
          value={formatCurrency(saldoLiquido)}
          icon={DollarSign}
          trend={{ 
            value: saldoLiquido >= 0 ? "+7%" : "-3%", 
            type: saldoLiquido >= 0 ? "positive" : "negative" 
          }}
          gradient={saldoLiquido >= 0 ? "from-green-500 to-green-600" : "from-red-500 to-red-600"}
          description="Receitas - Despesas"
        />

        <ModernStatCard
          title="Pendentes"
          value={formatCurrency(stats.pendentes)}
          icon={CreditCard}
          trend={{ value: "0%", type: "neutral" }}
          gradient="from-yellow-500 to-yellow-600"
          description="Valores em aberto"
        />
      </motion.div>

      {/* Charts */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Monthly Revenue Chart */}
        <ModernBarChart
          title="Receitas vs Despesas"
          subtitle="Últimos 6 meses"
          data={monthlyData}
          xAxisKey="month"
          bars={[
            { dataKey: "receitas", name: "Receitas", color: "#10B981" },
            { dataKey: "despesas", name: "Despesas", color: "#EF4444" }
          ]}
          height={350}
          gradient={true}
          icon={BarChart3}
        />

        {/* Status Distribution */}
        <ModernPieChart
          title="Distribuição por Status"
          subtitle="Status das transações"
          data={statusData}
          height={350}
          icon={Activity}
        />
      </motion.div>

      {/* Filters */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100"
      >
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <Filter className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Filtros</h3>
            <p className="text-sm text-gray-600">Refine sua busca</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <AnimatedIcon icon={Search} animation="pulse" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por descrição ou paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition-all duration-200"
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
              className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              <option value="todos">Todos os Status</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="vencido">Vencido</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Transactions List */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
      >
        {filteredTransacoes.length === 0 ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-sm">
              <AnimatedIcon icon={DollarSign} animation="pulse" className="h-8 w-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">
              {searchTerm || tipoFilter !== 'todos' || statusFilter !== 'todos'
                ? 'Nenhuma transação encontrada'
                : 'Nenhuma transação cadastrada'
              }
            </h4>
            <p className="text-sm text-gray-600">
              {searchTerm || tipoFilter !== 'todos' || statusFilter !== 'todos'
                ? 'Tente ajustar os filtros para encontrar o que procura.'
                : 'Comece criando sua primeira transação financeira.'
              }
            </p>
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredTransacoes.map((transacao, index) => (
                  <motion.tr 
                    key={transacao.id} 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6 + index * 0.05 }}
                    whileHover={{ x: 4, backgroundColor: '#f8fafc' }}
                    className="hover:shadow-sm transition-all duration-200"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <AnimatedIcon icon={Calendar} animation="pulse" className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">{formatDate(transacao.data_transacao)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {transacao.descricao}
                        </div>
                        {transacao.paciente && (
                          <div className="text-sm text-gray-600 font-medium">
                            {transacao.paciente.nome}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${transacao.tipo === 'receita' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className={`text-sm font-semibold ${getTipoColor(transacao.tipo)}`}>
                          {transacao.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-bold ${getTipoColor(transacao.tipo)}`}>
                        {transacao.tipo === 'receita' ? '+' : '-'} {formatCurrency(transacao.valor)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ModernStatusIndicator 
                        status={transacao.status === 'pago' ? 'success' : 
                               transacao.status === 'pendente' ? 'pending' : 
                               transacao.status === 'vencido' ? 'error' : 'offline'} 
                        size="sm"
                        label={transacao.status.charAt(0).toUpperCase() + transacao.status.slice(1)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col space-y-2">
                        <div className="flex space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEdit(transacao)}
                            className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(transacao)}
                            className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </motion.button>
                        </div>
                        
                        {/* Componente de Recibo - apenas para receitas pagas */}
                        {transacao.tipo === 'receita' && transacao.status === 'pago' && transacao.paciente && psicologo && (
                          <ReciboGenerator
                            transacao={{
                              id: transacao.id,
                              valor: transacao.valor,
                              data_transacao: transacao.data_transacao,
                              descricao: transacao.descricao,
                              forma_pagamento: transacao.forma_pagamento,
                              data_pagamento: transacao.data_pagamento,
                              paciente: transacao.paciente
                            }}
                            psicologo={psicologo}
                            onReciboGenerated={(reciboId) => {
                              toast.success('Recibo gerado e salvo com sucesso!');
                              // Aqui poderia recarregar dados se necessário
                            }}
                          />
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Form Modal */}
      {showForm && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl border border-gray-100"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedTransacao ? 'Editar Transação' : 'Nova Transação'}
                </h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleFormClose}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-6 w-6" />
              </motion.button>
            </div>
            <TransacaoForm
              transacao={selectedTransacao}
              pacientes={pacientes}
              onClose={handleFormClose}
              onSave={handleFormSave}
            />
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}