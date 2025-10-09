import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  Info, 
  AlertCircle, 
  XCircle,
  Zap,
  Calendar,
  User,
  Clock,
  Database,
  Shield,
  Brain,
  MessageSquare,
  Settings,
  Activity,
  ChevronDown,
  ChevronRight,
  Eye,
  Copy,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

// Tipos para logs
interface LogEntry {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical'
  category: string
  message: string
  details?: Record<string, any>
  userId?: string
  sessionId?: string
  requestId?: string
  duration?: number
  metadata?: Record<string, any>
}

interface LogStats {
  totalLogs: number
  logsByLevel: Record<string, number>
  logsByCategory: Record<string, number>
  diskUsage: number
}

// Mock data para demonstração
const mockLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: '2024-01-15T10:30:00Z',
    level: 'info',
    category: 'ai_interaction',
    message: 'AI interaction completed successfully',
    details: {
      model: 'gemini-pro',
      tokens: { input: 150, output: 200, total: 350 },
      duration: 1200,
      sentiment: { score: 0.8, label: 'positive', confidence: 0.95 }
    },
    userId: 'user123',
    sessionId: 'session456',
    requestId: 'req789',
    duration: 1200
  },
  {
    id: '2',
    timestamp: '2024-01-15T10:25:00Z',
    level: 'error',
    category: 'api_request',
    message: 'Failed to connect to external API',
    details: {
      endpoint: '/api/external/service',
      statusCode: 500,
      error: 'Connection timeout'
    },
    requestId: 'req788'
  },
  {
    id: '3',
    timestamp: '2024-01-15T10:20:00Z',
    level: 'warn',
    category: 'security',
    message: 'Multiple failed login attempts detected',
    details: {
      ip: '192.168.1.100',
      attempts: 5,
      timeWindow: '5 minutes'
    },
    userId: 'user456'
  }
]

const mockStats: LogStats = {
  totalLogs: 15420,
  logsByLevel: {
    debug: 2340,
    info: 8950,
    warn: 2130,
    error: 1800,
    critical: 200
  },
  logsByCategory: {
    ai_interaction: 4500,
    api_request: 3200,
    authentication: 1800,
    database: 2100,
    webhook: 1200,
    template: 800,
    sentiment_analysis: 900,
    error_handling: 600,
    performance: 220,
    security: 100
  },
  diskUsage: 45678912 // bytes
}

const levelColors = {
  debug: 'bg-gray-100 text-gray-800',
  info: 'bg-blue-100 text-blue-800',
  warn: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  critical: 'bg-purple-100 text-purple-800'
}

const levelIcons = {
  debug: Info,
  info: Info,
  warn: AlertTriangle,
  error: AlertCircle,
  critical: XCircle
}

const categoryIcons = {
  ai_interaction: Brain,
  api_request: Activity,
  authentication: User,
  database: Database,
  webhook: Zap,
  template: MessageSquare,
  sentiment_analysis: Brain,
  error_handling: AlertTriangle,
  performance: Activity,
  security: Shield
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs)
  const [stats, setStats] = useState<LogStats>(mockStats)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [dateRange, setDateRange] = useState('24h')
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      // Simular carregamento
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Logs atualizados com sucesso')
    } catch (error) {
      toast.error('Erro ao atualizar logs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = () => {
    const filteredLogs = getFilteredLogs()
    const data = {
      exportDate: new Date().toISOString(),
      filters: { searchQuery, selectedLevel, selectedCategory, dateRange },
      totalLogs: filteredLogs.length,
      logs: filteredLogs
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `system-logs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Logs exportados com sucesso')
  }

  const getFilteredLogs = () => {
    return logs.filter(log => {
      if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !JSON.stringify(log.details || {}).toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (selectedLevel && log.level !== selectedLevel) {
        return false
      }
      if (selectedCategory && log.category !== selectedCategory) {
        return false
      }
      return true
    })
  }

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado para a área de transferência')
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR')
  }

  const filteredLogs = getFilteredLogs()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs do Sistema</h1>
          <p className="text-gray-600">Monitoramento e análise de logs detalhados</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
          </button>
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

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Logs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalLogs.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Erros Críticos</p>
              <p className="text-2xl font-bold text-red-600">{stats.logsByLevel.critical}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avisos</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.logsByLevel.warn}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Uso de Disco</p>
              <p className="text-2xl font-bold text-gray-900">{formatBytes(stats.diskUsage)}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Database className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar em logs..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nível</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos os níveis</option>
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warn">Aviso</option>
                <option value="error">Erro</option>
                <option value="critical">Crítico</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas as categorias</option>
                <option value="ai_interaction">Interação IA</option>
                <option value="api_request">Requisição API</option>
                <option value="authentication">Autenticação</option>
                <option value="database">Banco de Dados</option>
                <option value="webhook">Webhook</option>
                <option value="security">Segurança</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1h">Última hora</option>
                <option value="24h">Últimas 24 horas</option>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Logs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Logs ({filteredLogs.length})
            </h3>
            <div className="text-sm text-gray-600">
              Mostrando {filteredLogs.length} de {logs.length} logs
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredLogs.map((log) => {
            const LevelIcon = levelIcons[log.level]
            const CategoryIcon = categoryIcons[log.category as keyof typeof categoryIcons] || Activity
            const isExpanded = expandedLogs.has(log.id)

            return (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`p-2 rounded-lg ${levelColors[log.level]}`}>
                      <LevelIcon className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CategoryIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">{log.category}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${levelColors[log.level]}`}>
                          {log.level.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        <button
                          onClick={() => toggleLogExpansion(log.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="mt-1 text-sm text-gray-700">{log.message}</p>

                    {log.userId && (
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                        <span>Usuário: {log.userId}</span>
                        {log.sessionId && <span>Sessão: {log.sessionId}</span>}
                        {log.requestId && <span>Request: {log.requestId}</span>}
                        {log.duration && <span>Duração: {log.duration}ms</span>}
                      </div>
                    )}

                    {isExpanded && (log.details || log.metadata) && (
                      <div className="mt-3 space-y-2">
                        {log.details && (
                          <div>
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-medium text-gray-700">Detalhes:</h4>
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(log.details, null, 2))}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <Copy className="h-3 w-3 text-gray-500" />
                              </button>
                            </div>
                            <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}

                        {log.metadata && (
                          <div>
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-medium text-gray-700">Metadata:</h4>
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(log.metadata, null, 2))}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <Copy className="h-3 w-3 text-gray-500" />
                              </button>
                            </div>
                            <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {filteredLogs.length === 0 && (
            <div className="p-8 text-center">
              <Activity className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum log encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Tente ajustar os filtros para encontrar os logs desejados.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}