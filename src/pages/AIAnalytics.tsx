import React, { useState } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  MessageSquare, 
  Clock, 
  Users, 
  AlertTriangle, 
  Heart, 
  Brain, 
  Zap,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Target,
  Activity
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'

// Mock data para demonstração
const sentimentTrendData = [
  { date: '2024-01-01', positive: 45, neutral: 35, negative: 20 },
  { date: '2024-01-02', positive: 52, neutral: 30, negative: 18 },
  { date: '2024-01-03', positive: 48, neutral: 32, negative: 20 },
  { date: '2024-01-04', positive: 55, neutral: 28, negative: 17 },
  { date: '2024-01-05', positive: 60, neutral: 25, negative: 15 },
  { date: '2024-01-06', positive: 58, neutral: 27, negative: 15 },
  { date: '2024-01-07', positive: 62, neutral: 23, negative: 15 }
]

const riskLevelData = [
  { name: 'Baixo', value: 65, color: '#10B981' },
  { name: 'Médio', value: 25, color: '#F59E0B' },
  { name: 'Alto', value: 10, color: '#EF4444' }
]

const responseTimeData = [
  { hour: '00:00', avgTime: 1.2, count: 5 },
  { hour: '06:00', avgTime: 0.8, count: 12 },
  { hour: '12:00', avgTime: 1.5, count: 25 },
  { hour: '18:00', avgTime: 1.8, count: 30 },
  { hour: '21:00', avgTime: 1.1, count: 18 }
]

const templateUsageData = [
  { name: 'Saudação Matinal', usage: 45, success: 92 },
  { name: 'Resposta Empática', usage: 38, success: 88 },
  { name: 'Agendamento', usage: 32, success: 95 },
  { name: 'Emergência', usage: 15, success: 85 },
  { name: 'Acompanhamento', usage: 28, success: 90 }
]

const aiModelPerformance = [
  { model: 'Gemini Pro', requests: 1250, success: 98.5, avgTime: 1.2 },
  { model: 'Gemini Flash', requests: 850, success: 97.8, avgTime: 0.8 },
  { model: 'Fallback', requests: 45, success: 85.0, avgTime: 0.3 }
]

const emotionalStatesData = [
  { state: 'Ansiedade', count: 45, trend: 'up' },
  { state: 'Depressão', count: 32, trend: 'down' },
  { state: 'Estresse', count: 28, trend: 'up' },
  { state: 'Alegria', count: 65, trend: 'up' },
  { state: 'Raiva', count: 18, trend: 'down' },
  { state: 'Medo', count: 22, trend: 'stable' }
]

export default function AIAnalytics() {
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedMetric, setSelectedMetric] = useState('sentiment')
  const [isLoading, setIsLoading] = useState(false)

  const handleRefresh = async () => {
    setIsLoading(true)
    // Simular carregamento
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsLoading(false)
  }

  const handleExport = () => {
    // Simular exportação
    const data = {
      timeRange,
      sentimentTrend: sentimentTrendData,
      riskLevels: riskLevelData,
      templates: templateUsageData,
      models: aiModelPerformance
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-analytics-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics de IA</h1>
          <p className="text-gray-600">Métricas e análises de desempenho da inteligência artificial</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1d">Último dia</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Interações Totais</p>
              <p className="text-2xl font-bold text-gray-900">2,145</p>
              <div className="flex items-center space-x-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">+12.5%</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tempo Médio de Resposta</p>
              <p className="text-2xl font-bold text-gray-900">1.2s</p>
              <div className="flex items-center space-x-1 mt-1">
                <TrendingDown className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">-8.3%</span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Zap className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Sucesso</p>
              <p className="text-2xl font-bold text-gray-900">97.8%</p>
              <div className="flex items-center space-x-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">+2.1%</span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Alertas de Alto Risco</p>
              <p className="text-2xl font-bold text-gray-900">23</p>
              <div className="flex items-center space-x-1 mt-1">
                <TrendingDown className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">-15.2%</span>
              </div>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendência de Sentimentos */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tendência de Sentimentos</h3>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Positivo</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Neutro</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Negativo</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={sentimentTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                formatter={(value, name) => [`${value}%`, name === 'positive' ? 'Positivo' : name === 'neutral' ? 'Neutro' : 'Negativo']}
              />
              <Area type="monotone" dataKey="positive" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
              <Area type="monotone" dataKey="neutral" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
              <Area type="monotone" dataKey="negative" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição de Níveis de Risco */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Níveis de Risco</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskLevelData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {riskLevelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-4 mt-4">
            {riskLevelData.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-600">{item.name}: {item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Métricas Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance dos Templates */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance dos Templates</h3>
          <div className="space-y-4">
            {templateUsageData.map((template, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{template.name}</span>
                    <span className="text-sm text-gray-600">{template.usage} usos</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${template.success}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">Taxa de sucesso</span>
                    <span className="text-xs font-medium text-gray-700">{template.success}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance dos Modelos de IA */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance dos Modelos de IA</h3>
          <div className="space-y-4">
            {aiModelPerformance.map((model, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{model.model}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    model.success >= 98 ? 'bg-green-100 text-green-800' :
                    model.success >= 95 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {model.success}% sucesso
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Requisições</span>
                    <p className="font-medium">{model.requests.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Tempo Médio</span>
                    <p className="font-medium">{model.avgTime}s</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Status</span>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${
                        model.success >= 98 ? 'bg-green-500' :
                        model.success >= 95 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}></div>
                      <span className="text-xs">
                        {model.success >= 98 ? 'Excelente' :
                         model.success >= 95 ? 'Bom' : 'Atenção'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Estados Emocionais e Tempo de Resposta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estados Emocionais Detectados */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estados Emocionais Detectados</h3>
          <div className="space-y-3">
            {emotionalStatesData.map((state, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Brain className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{state.state}</p>
                    <p className="text-sm text-gray-600">{state.count} detecções</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {state.trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                  {state.trend === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
                  {state.trend === 'stable' && <Activity className="h-4 w-4 text-gray-500" />}
                  <span className="text-sm font-medium text-gray-700">{state.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tempo de Resposta por Horário */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tempo de Resposta por Horário</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={responseTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'avgTime' ? `${value}s` : value,
                  name === 'avgTime' ? 'Tempo Médio' : 'Quantidade'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="avgTime" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights e Recomendações */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights e Recomendações</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium text-blue-900">Melhoria Detectada</h4>
            </div>
            <p className="text-sm text-blue-800">
              A taxa de sentimentos positivos aumentou 12.5% na última semana, indicando melhoria na qualidade das interações.
            </p>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <h4 className="font-medium text-yellow-900">Atenção Necessária</h4>
            </div>
            <p className="text-sm text-yellow-800">
              Tempo de resposta aumentou durante o horário de pico (18h). Considere otimizar a infraestrutura.
            </p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-green-900">Meta Atingida</h4>
            </div>
            <p className="text-sm text-green-800">
              Taxa de sucesso dos templates mantém-se acima de 90%, superando a meta estabelecida.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}