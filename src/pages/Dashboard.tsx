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
  FileTextIcon,
  Activity,
  BarChart3
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { 
  ModernStatCard,
  ModernLineChart,
  ModernBarChart,
  ModernPieChart,
  ModernSkeleton,
  AnimatedIcon,
  ModernStatusIndicator
} from '@/components/modern'
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
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      change: '+12%',
      changeType: 'positive',
      description: 'Novos pacientes este mês'
    },
    {
      title: 'Agendamentos Hoje',
      value: currentStats.agendamentosHoje,
      icon: Calendar,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      change: '+8%',
      changeType: 'positive',
      description: 'Consultas agendadas'
    },
    {
      title: 'Receita Mensal',
      value: `R$ ${currentStats.receitaMensal.toFixed(2)}`,
      icon: DollarSign,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      change: '+15%',
      changeType: 'positive',
      description: 'Faturamento do mês'
    },
    {
      title: 'Prontuários Pendentes',
      value: currentStats.prontuariosPendentes,
      icon: FileText,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
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
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral da sua prática clínica</p>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <ModernSkeleton key={i} variant="card" height="12rem" />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ModernSkeleton variant="chart" />
          <ModernSkeleton variant="chart" />
        </div>

        {/* Bottom Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ModernSkeleton variant="chart" height="16rem" />
          <ModernSkeleton variant="card" height="16rem" />
          <ModernSkeleton variant="card" height="16rem" />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <div className="text-gray-600 flex items-center space-x-2">
            <AnimatedIcon icon={Activity} animation="pulse" size={16} />
            <span>Visão geral da sua prática clínica</span>
          </div>
        </div>
        {psicologo && (
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center space-x-4"
          >
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{psicologo.nome}</p>
              <p className="text-sm text-gray-500">{psicologo.email}</p>
            </div>
            <ModernStatusIndicator
              status={isAdmin() ? 'active' : 'success'}
              label={isAdmin() ? 'Administrador' : 'Psicólogo'}
              size="md"
              showIcon={true}
            />
          </motion.div>
        )}
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const gradients = [
            'from-blue-500 to-blue-600',
            'from-green-500 to-green-600', 
            'from-purple-500 to-purple-600',
            'from-orange-500 to-orange-600'
          ];
          
          return (
            <ModernStatCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              trend={{
                value: stat.change,
                type: stat.changeType as 'positive' | 'negative'
              }}
              gradient={gradients[index]}
              description={stat.description}
            />
          )
        })}
      </div>

      {/* Charts */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Revenue Chart */}
        {revenueLoading ? (
          <ModernSkeleton variant="chart" />
        ) : (
          <ModernLineChart
            data={revenueData || []}
            dataKey="revenue"
            title="Receita Mensal"
            color="#3b82f6"
            gradient={true}
            height={350}
          />
        )}

        {/* Appointments Chart */}
        {weeklyLoading ? (
          <ModernSkeleton variant="chart" />
        ) : (
          <ModernBarChart
            data={weeklyData || []}
            dataKey="appointments"
            title="Agendamentos por Dia"
            colors={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']}
            height={350}
          />
        )}
      </motion.div>

      {/* Status Overview */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Appointment Status */}
        {statusLoading ? (
          <ModernSkeleton variant="chart" height="20rem" />
        ) : (
          <ModernPieChart
            data={statusData || []}
            dataKey="value"
            nameKey="name"
            title="Status dos Agendamentos"
            colors={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']}
            height={280}
            showLegend={true}
          />
        )}

        {/* Quick Actions */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Ações Rápidas</h3>
              <p className="text-sm text-gray-600">Acesso rápido às principais funcionalidades</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <motion.button 
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center p-4 text-left bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl transition-all duration-200 border border-blue-200"
            >
              <div className="p-2 bg-blue-500 rounded-lg mr-4">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold text-blue-900">Novo Paciente</span>
                <p className="text-xs text-blue-700">Cadastrar novo paciente</p>
              </div>
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center p-4 text-left bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl transition-all duration-200 border border-green-200"
            >
              <div className="p-2 bg-green-500 rounded-lg mr-4">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold text-green-900">Agendar Consulta</span>
                <p className="text-xs text-green-700">Nova consulta</p>
              </div>
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center p-4 text-left bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-xl transition-all duration-200 border border-orange-200"
            >
              <div className="p-2 bg-orange-500 rounded-lg mr-4">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold text-orange-900">Novo Prontuário</span>
                <p className="text-xs text-orange-700">Criar prontuário</p>
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Atividades Recentes</h3>
              <p className="text-sm text-gray-600">Últimas ações realizadas no sistema</p>
            </div>
          </div>
          
          {activitiesLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <ModernSkeleton key={i} variant="card" />
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
                        bg: 'bg-blue-100',
                        color: 'text-blue-600',
                        badge: 'bg-blue-100 text-blue-800'
                      }
                    case 'green':
                      return {
                        bg: 'bg-green-100',
                        color: 'text-green-600',
                        badge: 'bg-green-100 text-green-800'
                      }
                    case 'red':
                      return {
                        bg: 'bg-red-100',
                        color: 'text-red-600',
                        badge: 'bg-red-100 text-red-800'
                      }
                    case 'yellow':
                      return {
                        bg: 'bg-yellow-100',
                        color: 'text-yellow-600',
                        badge: 'bg-yellow-100 text-yellow-800'
                      }
                    default:
                      return {
                        bg: 'bg-gray-100',
                        color: 'text-gray-600',
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
                  <motion.div 
                    key={index}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    whileHover={{ x: 4, scale: 1.01 }}
                    className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-100 p-4 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-sm font-semibold text-gray-900">
                                {activity.title}
                              </h4>
                              <ModernStatusIndicator 
                                status={activity.color === 'green' ? 'success' : activity.color === 'red' ? 'error' : 'active'} 
                                size="sm"
                                showIcon={false}
                              />
                            </div>
                            <p className="text-sm text-gray-600 font-medium">
                              {activity.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center text-xs text-gray-500">
                          <AnimatedIcon icon={Clock} animation="pulse" className="h-3 w-3 mr-1" />
                          <span>{timeAgo}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-sm">
                <AnimatedIcon icon={Clock} animation="pulse" className="h-8 w-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Nenhuma atividade ainda</h4>
              <p className="text-sm text-gray-600">
                Suas atividades recentes aparecerão aqui conforme você utiliza o sistema
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}