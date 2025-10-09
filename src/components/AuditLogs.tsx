/**
 * Componente para visualizar logs de auditoria
 */
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Shield, 
  User, 
  Calendar, 
  Filter, 
  Download, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface AuditLogEntry {
  timestamp: string
  userId?: string
  userEmail?: string
  action: string
  resource: string
  resourceId?: string
  method: string
  endpoint: string
  ip: string
  userAgent: string
  success: boolean
  statusCode: number
  errorMessage?: string
  duration: number
  sessionId?: string
  metadata?: Record<string, any>
}

interface AuditStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  uniqueUsers: number
  topActions: Array<{ action: string; count: number }>
  topResources: Array<{ resource: string; count: number }>
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    action: '',
    resource: '',
    success: '',
    limit: 100
  })

  const fetchLogs = async () => {
    try {
      setLoading(true)
      
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString())
      })

      const response = await fetch(`/api/audit/logs?${queryParams}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.data)
      } else {
        toast.error('Erro ao carregar logs')
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error)
      toast.error('Erro ao carregar logs')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/audit/stats?period=day')
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    }
  }

  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    fetchLogs()
  }

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      userId: '',
      action: '',
      resource: '',
      success: '',
      limit: 100
    })
  }

  const exportLogs = async () => {
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString())
      })

      const response = await fetch(`/api/audit/logs?${queryParams}&format=csv`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Logs exportados com sucesso')
    } catch (error) {
      console.error('Erro ao exportar logs:', error)
      toast.error('Erro ao exportar logs')
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
      case 'logout':
        return <User className="h-4 w-4" />
      case 'create':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'update':
        return <RefreshCw className="h-4 w-4 text-blue-500" />
      case 'delete':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'read':
        return <Eye className="h-4 w-4 text-gray-500" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const getStatusColor = (success: boolean, statusCode: number) => {
    if (success) return 'text-green-600 bg-green-50'
    if (statusCode >= 500) return 'text-red-600 bg-red-50'
    if (statusCode >= 400) return 'text-yellow-600 bg-yellow-50'
    return 'text-gray-600 bg-gray-50'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs de Auditoria</h1>
          <p className="text-gray-600">Monitore atividades e eventos de segurança</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchLogs}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Atualizar</span>
          </button>
          <button
            onClick={exportLogs}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Total de Requisições</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalRequests}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Sucessos</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.successfulRequests}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-gray-600">Falhas</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.failedRequests}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-600">Usuários Únicos</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.uniqueUsers}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Filtros</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="datetime-local"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="datetime-local"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ação
            </label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="register">Registro</option>
              <option value="create">Criar</option>
              <option value="read">Ler</option>
              <option value="update">Atualizar</option>
              <option value="delete">Deletar</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recurso
            </label>
            <input
              type="text"
              value={filters.resource}
              onChange={(e) => handleFilterChange('resource', e.target.value)}
              placeholder="Ex: pacientes"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.success}
              onChange={(e) => handleFilterChange('success', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="true">Sucesso</option>
              <option value="false">Falha</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite
            </label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
            </select>
          </div>
        </div>
        
        <div className="flex space-x-2 mt-4">
          <button
            onClick={applyFilters}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Search className="h-4 w-4" />
            <span>Aplicar Filtros</span>
          </button>
          <button
            onClick={clearFilters}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-medium text-gray-900">Logs Recentes</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Carregando logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Nenhum log encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ação
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recurso
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duração
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.userEmail || 'Anônimo'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(log.action)}
                        <span className="capitalize">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.resource}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.success, log.statusCode)}`}>
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.ip}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.duration}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Detalhes do Log</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="text-sm text-gray-900">
                    {format(new Date(selectedLog.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Usuário</label>
                  <p className="text-sm text-gray-900">{selectedLog.userEmail || 'Anônimo'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ação</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recurso</label>
                  <p className="text-sm text-gray-900">{selectedLog.resource}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Método</label>
                  <p className="text-sm text-gray-900">{selectedLog.method}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="text-sm text-gray-900">{selectedLog.statusCode}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">IP</label>
                  <p className="text-sm text-gray-900">{selectedLog.ip}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duração</label>
                  <p className="text-sm text-gray-900">{selectedLog.duration}ms</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Endpoint</label>
                <p className="text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
                  {selectedLog.endpoint}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">User Agent</label>
                <p className="text-sm text-gray-900 break-all">{selectedLog.userAgent}</p>
              </div>
              
              {selectedLog.errorMessage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Erro</label>
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {selectedLog.errorMessage}
                  </p>
                </div>
              )}
              
              {selectedLog.metadata && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Metadata</label>
                  <pre className="text-xs text-gray-900 bg-gray-100 p-2 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}