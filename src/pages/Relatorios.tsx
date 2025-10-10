import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts'
import { Calendar, Download, Filter, TrendingUp, Users, DollarSign, FileText, Clock } from 'lucide-react'
import { supabase, type Agendamento, type Paciente, type TransacaoFinanceira, type Prontuario } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { formatCurrency, formatDate } from '../lib/utils'
import { toast } from 'sonner'

export default function Relatorios() {
  const { psicologo } = useAuthStore()
  const [loading, setLoading] = React.useState(true)
  const [dateRange, setDateRange] = React.useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  // Estados para dados
  const [agendamentos, setAgendamentos] = React.useState<(Agendamento & { paciente: Paciente })[]>([])
  const [pacientes, setPacientes] = React.useState<Paciente[]>([])
  const [transacoes, setTransacoes] = React.useState<TransacaoFinanceira[]>([])
  const [prontuarios, setProntuarios] = React.useState<Prontuario[]>([])

  const loadData = async () => {
    if (!psicologo?.id) return

    try {
      setLoading(true)

      // Carregar agendamentos
      const { data: agendamentosData, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:pacientes(*)
        `)
        .eq('psicologo_id', psicologo.id)
        .gte('data_hora', dateRange.start)
        .lte('data_hora', dateRange.end + 'T23:59:59')

      if (agendamentosError) throw agendamentosError

      // Carregar pacientes
      const { data: pacientesData, error: pacientesError } = await supabase
        .from('pacientes')
        .select('*')
        .eq('psicologo_id', psicologo.id)

      if (pacientesError) throw pacientesError

      // Carregar transações
      const { data: transacoesData, error: transacoesError } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .eq('psicologo_id', psicologo.id)
        .gte('data_transacao', dateRange.start)
        .lte('data_transacao', dateRange.end + 'T23:59:59')

      if (transacoesError) throw transacoesError

      // Carregar prontuários
      const { data: prontuariosData, error: prontuariosError } = await supabase
        .from('prontuarios')
        .select('*')
        .eq('psicologo_id', psicologo.id)
        .gte('data_sessao', dateRange.start)
        .lte('data_sessao', dateRange.end + 'T23:59:59')

      if (prontuariosError) throw prontuariosError

      setAgendamentos(agendamentosData || [])
      setPacientes(pacientesData || [])
      setTransacoes(transacoesData || [])
      setProntuarios(prontuariosData || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados dos relatórios')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [psicologo?.id, dateRange])

  // Dados para gráficos
  const monthlyData = React.useMemo(() => {
    const months = {}
    
    // Processar agendamentos
    agendamentos.forEach(agendamento => {
      const month = new Date(agendamento.data_hora).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      if (!months[month]) {
        months[month] = { month, agendamentos: 0, receitas: 0, prontuarios: 0 }
      }
      months[month].agendamentos++
    })

    // Processar receitas
    transacoes.filter(t => t.tipo === 'receita' && t.status === 'pago').forEach(transacao => {
      const month = new Date(transacao.data_transacao).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      if (!months[month]) {
        months[month] = { month, agendamentos: 0, receitas: 0, prontuarios: 0 }
      }
      months[month].receitas += transacao.valor
    })

    // Processar prontuários
    prontuarios.forEach(prontuario => {
      const month = new Date(prontuario.data_sessao).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      if (!months[month]) {
        months[month] = { month, agendamentos: 0, receitas: 0, prontuarios: 0 }
      }
      months[month].prontuarios++
    })

    return Object.values(months).sort((a: any, b: any) => {
      const dateA = new Date(a.month + ' 01')
      const dateB = new Date(b.month + ' 01')
      return dateA.getTime() - dateB.getTime()
    })
  }, [agendamentos, transacoes, prontuarios])

  const statusAgendamentosData = [
    { name: 'Realizados', value: agendamentos.filter(a => a.status === 'realizado').length, color: '#10B981' },
    { name: 'Confirmados', value: agendamentos.filter(a => a.status === 'confirmado').length, color: '#3B82F6' },
    { name: 'Agendados', value: agendamentos.filter(a => a.status === 'agendado').length, color: '#F59E0B' },
    { name: 'Cancelados', value: agendamentos.filter(a => a.status === 'cancelado').length, color: '#EF4444' },
    { name: 'Faltou', value: agendamentos.filter(a => a.status === 'faltou').length, color: '#6B7280' },
  ]

  const pacientesPorIdadeData = React.useMemo(() => {
    const faixas = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56-65': 0,
      '65+': 0
    }

    pacientes.forEach(paciente => {
      if (paciente.data_nascimento) {
        const idade = new Date().getFullYear() - new Date(paciente.data_nascimento).getFullYear()
        if (idade >= 18 && idade <= 25) faixas['18-25']++
        else if (idade >= 26 && idade <= 35) faixas['26-35']++
        else if (idade >= 36 && idade <= 45) faixas['36-45']++
        else if (idade >= 46 && idade <= 55) faixas['46-55']++
        else if (idade >= 56 && idade <= 65) faixas['56-65']++
        else if (idade > 65) faixas['65+']++
      }
    })

    return Object.entries(faixas).map(([faixa, quantidade]) => ({
      faixa,
      quantidade
    }))
  }, [pacientes])

  const receitasPorCategoriaData = React.useMemo(() => {
    const categorias = {}
    transacoes.filter(t => t.tipo === 'receita' && t.status === 'pago').forEach(transacao => {
      const categoria = transacao.categoria || 'Outros'
      categorias[categoria] = (categorias[categoria] || 0) + transacao.valor
    })

    return Object.entries(categorias).map(([categoria, valor]) => ({
      categoria,
      valor
    })).sort((a: any, b: any) => b.valor - a.valor)
  }, [transacoes])

  // Estatísticas gerais
  const stats = {
    totalPacientes: pacientes.length,
    pacientesAtivos: pacientes.filter(p => p.status === 'ativo').length,
    totalAgendamentos: agendamentos.length,
    agendamentosRealizados: agendamentos.filter(a => a.status === 'realizado').length,
    totalReceitas: transacoes.filter(t => t.tipo === 'receita' && t.status === 'pago').reduce((sum, t) => sum + t.valor, 0),
    totalDespesas: transacoes.filter(t => t.tipo === 'despesa' && t.status === 'pago').reduce((sum, t) => sum + t.valor, 0),
    totalProntuarios: prontuarios.length,
    taxaComparecimento: agendamentos.length > 0 ? (agendamentos.filter(a => a.status === 'realizado').length / agendamentos.length) * 100 : 0,
  }

  const handleExportReport = () => {
    // Implementar exportação de relatório
    toast.info('Funcionalidade de exportação será implementada em breve')
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
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Análises e estatísticas do seu consultório
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={handleExportReport}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-5 w-5 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Período
            </label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="flex items-center text-gray-500">até</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pacientes Ativos</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pacientesAtivos}</p>
              <p className="text-xs text-gray-500">de {stats.totalPacientes} total</p>
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
              <p className="text-sm font-medium text-gray-500">Taxa de Comparecimento</p>
              <p className="text-2xl font-semibold text-green-600">{stats.taxaComparecimento.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">{stats.agendamentosRealizados} de {stats.totalAgendamentos}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Receita Líquida</p>
              <p className="text-2xl font-semibold text-purple-600">
                {formatCurrency(stats.totalReceitas - stats.totalDespesas)}
              </p>
              <p className="text-xs text-gray-500">no período</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Prontuários</p>
              <p className="text-2xl font-semibold text-yellow-600">{stats.totalProntuarios}</p>
              <p className="text-xs text-gray-500">no período</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Mensal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'receitas' ? formatCurrency(value as number) : value,
                  name === 'receitas' ? 'Receitas' : name === 'agendamentos' ? 'Agendamentos' : 'Prontuários'
                ]}
              />
              <Area type="monotone" dataKey="agendamentos" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="prontuarios" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status dos Agendamentos */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Status dos Agendamentos</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={statusAgendamentosData}
                cx="50%"
                cy="45%"
                outerRadius={70}
                innerRadius={30}
                dataKey="value"
                nameKey="name"
                paddingAngle={2}
                strokeWidth={2}
                stroke="#fff"
              >
                {statusAgendamentosData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [value, name]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={60}
                iconType="circle"
                wrapperStyle={{
                  paddingTop: '20px',
                  fontSize: '14px'
                }}
                formatter={(value) => (
                  <span style={{ color: '#374151', fontWeight: '500' }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Receitas Mensais */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Receitas Mensais</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Line type="monotone" dataKey="receitas" stroke="#10B981" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pacientes por Faixa Etária */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pacientes por Faixa Etária</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pacientesPorIdadeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="faixa" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Receitas por Categoria */}
      {receitasPorCategoriaData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Receitas por Categoria</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={receitasPorCategoriaData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
              <YAxis dataKey="categoria" type="category" width={150} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Bar dataKey="valor" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Resumo Financeiro */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Resumo Financeiro do Período</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalReceitas)}</div>
            <div className="text-sm text-gray-500">Total de Receitas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{formatCurrency(stats.totalDespesas)}</div>
            <div className="text-sm text-gray-500">Total de Despesas</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${stats.totalReceitas - stats.totalDespesas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.totalReceitas - stats.totalDespesas)}
            </div>
            <div className="text-sm text-gray-500">Lucro Líquido</div>
          </div>
        </div>
      </div>
    </div>
  )
}