import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Users, 
  Calendar, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Clock,
  UserPlus,
  CalendarPlus,
  FileTextIcon
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { cn } from '@/lib/utils'
import { Skeleton, StatCardSkeleton, ChartSkeleton, ListSkeleton } from '@/components/ui/Skeleton'
import { 
  useDashboardStats, 
  useRevenueData, 
  useAppointmentStatusData, 
  useWeeklyAppointmentData,
  useRecentActivities 
} from '@/hooks/useQueries'
import { useAuthStore } from '@/stores/authStore'

interface DashboardStats {
  totalPacientes: number
  agendamentosHoje: number
  receitaMensal: number
  prontuariosPendentes: number
}

export default function Dashboard() {
  const { psicologo, isAdmin, isPsicologo } = useAuthStore()
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  const { data: revenueData, isLoading: revenueLoading } = useRevenueData()
  const { data: statusData, isLoading: statusLoading } = useAppointmentStatusData()
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklyAppointmentData()
  const { data: activities, isLoading: activitiesLoading } = useRecentActivities()

  // Dados padrão caso não haja dados ainda
  const defaultStats: DashboardStats = {
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
      gradient: 'from-blue-500 to-blue-600',
      ring: 'ring-blue-100',
      badge: 'bg-blue-100 text-blue-800',
      change: '+12%',
      changeType: 'positive',
      description: 'Novos pacientes este mês'
    },
    {
      title: 'Agendamentos Hoje',
      value: currentStats.agendamentosHoje,
      icon: Calendar,
      gradient: 'from-green-500 to-emerald-600',
      ring: 'ring-green-100',
      badge: 'bg-green-100 text-green-800',
      change: '+8%',
      changeType: 'positive',
      description: 'Consultas agendadas'
    },
    {
      title: 'Receita Mensal',
      value: `R$ ${currentStats.receitaMensal.toFixed(2)}`,
      icon: DollarSign,
      gradient: 'from-purple-500 to-purple-600',
      ring: 'ring-purple-100',
      badge: 'bg-purple-100 text-purple-800',
      change: '+15%',
      changeType: 'positive',
      description: 'Faturamento do mês'
    },
    {
      title: 'Prontuários Pendentes',
      value: currentStats.prontuariosPendentes,
      icon: FileText,
      gradient: 'from-orange-500 to-orange-600',
      ring: 'ring-orange-100',
      badge: 'bg-orange-100 text-orange-800',
      change: '-5%',
      changeType: 'negative',
      description: 'Aguardando preenchimento'
    },
  ]

  // Mostrar erro se houver
  if (statsError) {
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

  if (statsLoading) {
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
        {statCards.map((stat, index) => {
          const TrendIcon = stat.changeType === 'positive' ? TrendingUp : TrendingDown
          
          return (
            <div 
              key={index} 
              className="group relative bg-gradient-to-br from-white via-gray-50 to-blue-50/30 rounded-xl shadow-lg border border-gray-200/60 p-6 backdrop-blur-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-600 group-hover:text-gray-500 transition-colors">
                      {stat.title}
                    </h3>
                    <span className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                      stat.badge
                    )}>
                      Métrica
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors mb-2">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                    {stat.description}
                  </p>
                </div>
                
                <div className={cn(
                  "relative p-3 rounded-xl shadow-md ring-4 transition-all duration-300 group-hover:scale-110 bg-gradient-to-r",
                  stat.gradient,
                  stat.ring
                )}>
                  <stat.icon className="h-6 w-6 text-white" />
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-white rounded-full flex items-center justify-center">
                    <div className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
                    stat.changeType === 'positive' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  )}>
                    <TrendIcon className="h-3 w-3" />
                    <span>{stat.change}</span>
                  </div>
                  <span className="text-xs text-gray-500">vs mês anterior</span>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className={cn(
                    "h-1 w-8 rounded-full bg-gradient-to-r",
                    stat.gradient
                  )}></div>
                </div>
              </div>
              
              {/* Hover effect overlay */}
              <div className={cn(
                "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-r",
                stat.gradient.replace('from-', 'from-').replace('to-', 'to-') + '/5'
              )}></div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receita Mensal</h3>
          {revenueLoading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Receita']} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#2563EB" 
                  strokeWidth={2}
                  dot={{ fill: '#2563EB' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Appointments Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agendamentos por Dia</h3>
          {weeklyLoading ? (
            <Skeleton className="h-[300px]" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="appointments" fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointment Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status dos Agendamentos</h3>
          {statusLoading ? (
            <Skeleton className="h-[200px]" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {(statusData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {(statusData || []).map((item, index) => (
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
            </>
          )}
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
        <div className="bg-gradient-to-br from-white via-gray-50 to-blue-50/30 rounded-xl shadow-lg border border-gray-200/60 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Atividades Recentes</h3>
                <p className="text-sm text-gray-500">Últimas ações realizadas</p>
              </div>
            </div>
            <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          
          {activitiesLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-gray-200 rounded-xl"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const getIcon = () => {
                  switch (activity.icon) {
                    case 'calendar':
                      return Calendar
                    case 'file-text':
                      return FileText
                    case 'dollar-sign':
                      return DollarSign
                    default:
                      return Clock
                  }
                }
                
                const getIconStyles = () => {
                  switch (activity.color) {
                    case 'blue':
                      return {
                        bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
                        ring: 'ring-blue-100',
                        badge: 'bg-blue-100 text-blue-800'
                      }
                    case 'green':
                      return {
                        bg: 'bg-gradient-to-r from-green-500 to-emerald-600',
                        ring: 'ring-green-100',
                        badge: 'bg-green-100 text-green-800'
                      }
                    case 'red':
                      return {
                        bg: 'bg-gradient-to-r from-red-500 to-rose-600',
                        ring: 'ring-red-100',
                        badge: 'bg-red-100 text-red-800'
                      }
                    case 'yellow':
                      return {
                        bg: 'bg-gradient-to-r from-yellow-500 to-orange-500',
                        ring: 'ring-yellow-100',
                        badge: 'bg-yellow-100 text-yellow-800'
                      }
                    default:
                      return {
                        bg: 'bg-gradient-to-r from-gray-500 to-gray-600',
                        ring: 'ring-gray-100',
                        badge: 'bg-gray-100 text-gray-800'
                      }
                  }
                }
                
                const Icon = getIcon()
                const styles = getIconStyles()
                const timeAgo = new Date(activity.time).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })
                
                const getActivityType = () => {
                  switch (activity.icon) {
                    case 'calendar':
                      return 'Agendamento'
                    case 'file-text':
                      return 'Prontuário'
                    case 'dollar-sign':
                      return activity.title.includes('Receita') ? 'Receita' : 'Despesa'
                    default:
                      return 'Atividade'
                  }
                }
                
                return (
                  <div 
                    key={index} 
                    className="group relative bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 hover:border-gray-300/70 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                  >
                    <div className="flex items-start space-x-4">
                      <div className={cn(
                        "relative p-3 rounded-xl shadow-md ring-4 transition-all duration-300 group-hover:scale-110",
                        styles.bg,
                        styles.ring
                      )}>
                        <Icon className="h-5 w-5 text-white" />
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-white rounded-full flex items-center justify-center">
                          <div className="h-1.5 w-1.5 bg-green-400 rounded-full"></div>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                                {activity.title}
                              </h4>
                              <span className={cn(
                                "px-2 py-0.5 text-xs font-medium rounded-full",
                                styles.badge
                              )}>
                                {getActivityType()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 group-hover:text-gray-500 transition-colors leading-relaxed">
                              {activity.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span className="font-medium">{timeAgo}</span>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="h-1 w-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Hover effect overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-500/20 rounded-full blur-xl"></div>
                <div className="relative bg-gradient-to-r from-gray-100 to-gray-200 p-6 rounded-full mx-auto w-24 h-24 flex items-center justify-center mb-6">
                  <Clock className="h-10 w-10 text-gray-400" />
                </div>
              </div>
              <h4 className="text-lg font-semibold text-gray-700 mb-2">Nenhuma atividade ainda</h4>
              <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                Suas atividades recentes aparecerão aqui conforme você utiliza o sistema
              </p>
              <div className="mt-6 flex justify-center">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="h-2 w-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="h-2 w-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}