import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Users, 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  TrendingDown
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
  Cell
} from 'recharts'
import { formatCurrency } from '../lib/utils'
import { StatCardSkeleton, ChartSkeleton, ListSkeleton } from '../components/ui/Skeleton'
import { useDashboardStats } from '../hooks/useQueries'
import { useAuthStore } from '../stores/authStore'


interface DashboardStats {
  totalPacientes: number
  agendamentosHoje: number
  receitaMensal: number
  prontuariosPendentes: number
}

const mockRevenueData = [
  { month: 'Jan', revenue: 4500 },
  { month: 'Fev', revenue: 5200 },
  { month: 'Mar', revenue: 4800 },
  { month: 'Abr', revenue: 6100 },
  { month: 'Mai', revenue: 5800 },
  { month: 'Jun', revenue: 6500 },
]

const mockAppointmentData = [
  { day: 'Seg', appointments: 8 },
  { day: 'Ter', appointments: 12 },
  { day: 'Qua', appointments: 10 },
  { day: 'Qui', appointments: 15 },
  { day: 'Sex', appointments: 9 },
  { day: 'Sáb', appointments: 6 },
]

const mockStatusData = [
  { name: 'Confirmados', value: 65, color: '#059669' },
  { name: 'Pendentes', value: 25, color: '#F59E0B' },
  { name: 'Cancelados', value: 10, color: '#EF4444' },
]

export default function Dashboard() {
  const { data: stats, isLoading, error } = useDashboardStats()
  const { psicologo, isAdmin, isPsicologo } = useAuthStore()

  // Dados padrão caso não haja dados ainda
  const defaultStats = {
    totalPacientes: 0,
    agendamentosHoje: 0,
    receitaMensal: 0,
    prontuariosPendentes: 0,
  }

  const currentStats = stats || defaultStats

  const statCards = [
    {
      title: 'Total de Pacientes',
      value: currentStats.totalPacientes,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      title: 'Agendamentos Hoje',
      value: currentStats.agendamentosHoje,
      icon: Calendar,
      color: 'bg-green-500',
      change: '+5%',
      changeType: 'positive' as const,
    },
    {
      title: 'Receita Mensal',
      value: formatCurrency(currentStats.receitaMensal),
      icon: DollarSign,
      color: 'bg-yellow-500',
      change: '+8%',
      changeType: 'positive' as const,
    },
    {
      title: 'Prontuários Pendentes',
      value: currentStats.prontuariosPendentes,
      icon: FileText,
      color: 'bg-red-500',
      change: '-3%',
      changeType: 'negative' as const,
    },
  ]

  // Mostrar erro se houver
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral da sua prática clínica</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Erro ao carregar dados do dashboard. Tente novamente.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral da sua prática clínica</p>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>

        {/* Bottom Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartSkeleton />
          <ListSkeleton items={3} />
          <ListSkeleton items={3} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral da sua prática clínica</p>
        </div>
        {psicologo && (
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{psicologo.nome}</p>
              <p className="text-sm text-gray-500">{psicologo.email}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              isAdmin() 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {isAdmin() ? '👑 Administrador' : '👨‍⚕️ Psicólogo'}
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <span
                    className={`text-sm font-medium ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs mês anterior</span>
                </div>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receita Mensal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockRevenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#2563EB" 
                strokeWidth={2}
                dot={{ fill: '#2563EB' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Appointments Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agendamentos por Dia</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockAppointmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="appointments" fill="#059669" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointment Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status dos Agendamentos</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={mockStatusData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                dataKey="value"
              >
                {mockStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {mockStatusData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-blue-600 mr-3" />
                <span className="text-sm font-medium text-blue-900">Novo Paciente</span>
              </div>
            </button>
            <button className="w-full flex items-center justify-between p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-green-600 mr-3" />
                <span className="text-sm font-medium text-green-900">Agendar Consulta</span>
              </div>
            </button>
            <button className="w-full flex items-center justify-between p-3 text-left bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-yellow-600 mr-3" />
                <span className="text-sm font-medium text-yellow-900">Novo Prontuário</span>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Atividades Recentes</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Consulta finalizada</p>
                <p className="text-xs text-gray-500">Maria Silva - há 2 horas</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Agendamento confirmado</p>
                <p className="text-xs text-gray-500">João Santos - há 4 horas</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Prontuário pendente</p>
                <p className="text-xs text-gray-500">Ana Costa - há 1 dia</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}