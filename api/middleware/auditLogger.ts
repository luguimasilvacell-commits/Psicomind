/**
 * Middleware para logs de auditoria
 */
import { Request, Response, NextFunction } from 'express'
import fs from 'fs/promises'
import path from 'path'

export interface AuditLogEntry {
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
  requestBody?: any
  responseData?: any
  duration: number
  sessionId?: string
  metadata?: Record<string, any>
}

export interface AuditLogConfig {
  logLevel: 'minimal' | 'standard' | 'detailed'
  logSensitiveData: boolean
  logRequestBody: boolean
  logResponseData: boolean
  maxLogFileSize: number // em MB
  retentionDays: number
}

class AuditLogger {
  private config: AuditLogConfig
  private logDir: string

  constructor(config: Partial<AuditLogConfig> = {}) {
    this.config = {
      logLevel: 'standard',
      logSensitiveData: false,
      logRequestBody: false,
      logResponseData: false,
      maxLogFileSize: 10,
      retentionDays: 90,
      ...config
    }
    
    this.logDir = path.join(process.cwd(), 'logs', 'audit')
    this.ensureLogDirectory()
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true })
    } catch (error) {
      console.error('Erro ao criar diretório de logs:', error)
    }
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data

    const sensitiveFields = [
      'password', 'senha', 'token', 'secret', 'key', 'authorization',
      'cpf', 'rg', 'credit_card', 'cartao', 'cvv', 'pin'
    ]

    const sanitized = { ...data }

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
      }
    }

    return sanitized
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0]
    return path.join(this.logDir, `audit-${date}.log`)
  }

  private async rotateLogIfNeeded(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath)
      const fileSizeMB = stats.size / (1024 * 1024)

      if (fileSizeMB > this.config.maxLogFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const rotatedPath = filePath.replace('.log', `-${timestamp}.log`)
        await fs.rename(filePath, rotatedPath)
      }
    } catch (error) {
      // Arquivo não existe ainda, não há problema
    }
  }

  private async cleanOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.logDir)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays)

      for (const file of files) {
        if (file.startsWith('audit-') && file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file)
          const stats = await fs.stat(filePath)
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath)
            console.log(`Log antigo removido: ${file}`)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao limpar logs antigos:', error)
    }
  }

  async log(entry: Partial<AuditLogEntry>): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        action: entry.action || 'unknown',
        resource: entry.resource || 'unknown',
        method: entry.method || 'unknown',
        endpoint: entry.endpoint || 'unknown',
        ip: entry.ip || 'unknown',
        userAgent: entry.userAgent || 'unknown',
        success: entry.success ?? false,
        statusCode: entry.statusCode || 0,
        duration: entry.duration || 0,
        ...entry
      }

      // Sanitizar dados sensíveis se necessário
      if (!this.config.logSensitiveData) {
        if (logEntry.requestBody) {
          logEntry.requestBody = this.sanitizeData(logEntry.requestBody)
        }
        if (logEntry.responseData) {
          logEntry.responseData = this.sanitizeData(logEntry.responseData)
        }
      }

      // Filtrar dados baseado no nível de log
      if (this.config.logLevel === 'minimal') {
        delete logEntry.requestBody
        delete logEntry.responseData
        delete logEntry.userAgent
        delete logEntry.metadata
      } else if (this.config.logLevel === 'standard') {
        if (!this.config.logRequestBody) delete logEntry.requestBody
        if (!this.config.logResponseData) delete logEntry.responseData
      }

      const logLine = JSON.stringify(logEntry) + '\n'
      const logFile = this.getLogFileName()

      await this.rotateLogIfNeeded(logFile)
      await fs.appendFile(logFile, logLine, 'utf8')

      // Limpar logs antigos periodicamente (1% de chance a cada log)
      if (Math.random() < 0.01) {
        this.cleanOldLogs()
      }
    } catch (error) {
      console.error('Erro ao escrever log de auditoria:', error)
    }
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now()
      
      // Capturar dados da requisição
      const originalSend = res.send
      let responseData: any

      res.send = function(data: any) {
        responseData = data
        return originalSend.call(this, data)
      }

      // Continuar com a requisição
      res.on('finish', async () => {
        const duration = Date.now() - startTime
        const user = (req as any).user

        const logEntry: Partial<AuditLogEntry> = {
          userId: user?.id,
          userEmail: user?.email,
          action: this.getActionFromRequest(req),
          resource: this.getResourceFromRequest(req),
          resourceId: req.params.id,
          method: req.method,
          endpoint: req.originalUrl,
          ip: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          success: res.statusCode < 400,
          statusCode: res.statusCode,
          duration,
          sessionId: (req as any).sessionID,
          requestBody: this.config.logRequestBody ? req.body : undefined,
          responseData: this.config.logResponseData ? responseData : undefined,
          metadata: {
            contentType: req.get('Content-Type'),
            contentLength: req.get('Content-Length'),
            referer: req.get('Referer')
          }
        }

        if (res.statusCode >= 400) {
          logEntry.errorMessage = responseData?.message || responseData?.error || 'Unknown error'
        }

        await this.log(logEntry)
      })

      next()
    }
  }

  private getActionFromRequest(req: Request): string {
    const method = req.method.toLowerCase()
    const path = req.route?.path || req.path

    // Mapear ações baseadas no método e caminho
    if (method === 'post' && path.includes('login')) return 'login'
    if (method === 'post' && path.includes('logout')) return 'logout'
    if (method === 'post' && path.includes('register')) return 'register'
    if (method === 'post') return 'create'
    if (method === 'put' || method === 'patch') return 'update'
    if (method === 'delete') return 'delete'
    if (method === 'get') return 'read'

    return method
  }

  private getResourceFromRequest(req: Request): string {
    const path = req.route?.path || req.path
    
    // Extrair recurso do caminho
    const segments = path.split('/').filter(Boolean)
    if (segments.length > 0) {
      return segments[segments.length - 1].replace(/:\w+/g, '') || segments[0]
    }
    
    return 'unknown'
  }

  // Métodos para consultar logs
  async getLogs(filters: {
    startDate?: Date
    endDate?: Date
    userId?: string
    action?: string
    resource?: string
    success?: boolean
    limit?: number
  } = {}): Promise<AuditLogEntry[]> {
    try {
      const logs: AuditLogEntry[] = []
      const files = await fs.readdir(this.logDir)
      
      for (const file of files.sort().reverse()) {
        if (file.startsWith('audit-') && file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file)
          const content = await fs.readFile(filePath, 'utf8')
          
          const fileEntries = content
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
              try {
                return JSON.parse(line) as AuditLogEntry
              } catch {
                return null
              }
            })
            .filter(Boolean) as AuditLogEntry[]

          logs.push(...fileEntries)
        }
      }

      // Aplicar filtros
      let filteredLogs = logs

      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) >= filters.startDate!
        )
      }

      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) <= filters.endDate!
        )
      }

      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId)
      }

      if (filters.action) {
        filteredLogs = filteredLogs.filter(log => log.action === filters.action)
      }

      if (filters.resource) {
        filteredLogs = filteredLogs.filter(log => log.resource === filters.resource)
      }

      if (filters.success !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.success === filters.success)
      }

      // Ordenar por timestamp (mais recente primeiro)
      filteredLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      // Aplicar limite
      if (filters.limit) {
        filteredLogs = filteredLogs.slice(0, filters.limit)
      }

      return filteredLogs
    } catch (error) {
      console.error('Erro ao buscar logs:', error)
      return []
    }
  }

  async getLogStats(period: 'day' | 'week' | 'month' = 'day'): Promise<{
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    uniqueUsers: number
    topActions: Array<{ action?: string; resource?: string; count: number }>
    topResources: Array<{ action?: string; resource?: string; count: number }>
  }> {
    const now = new Date()
    const startDate = new Date()

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
    }

    const logs = await this.getLogs({ startDate })

    const stats = {
      totalRequests: logs.length,
      successfulRequests: logs.filter(log => log.success).length,
      failedRequests: logs.filter(log => !log.success).length,
      uniqueUsers: new Set(logs.map(log => log.userId).filter(Boolean)).size,
      topActions: this.getTopItems(logs, 'action'),
      topResources: this.getTopItems(logs, 'resource')
    }

    return stats
  }

  private getTopItems(logs: AuditLogEntry[], field: 'action' | 'resource'): Array<{ action?: string; resource?: string; count: number }> {
    const counts = logs.reduce((acc, log) => {
      const value = log[field] as string
      if (value) {
        acc[value] = (acc[value] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    return Object.entries(counts)
      .map(([key, count]) => ({ [field]: key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }
}

// Instância global do logger
export const auditLogger = new AuditLogger({
  logLevel: process.env.NODE_ENV === 'production' ? 'standard' : 'detailed',
  logSensitiveData: process.env.NODE_ENV !== 'production',
  logRequestBody: true,
  logResponseData: false
})

// Middleware para ações sensíveis específicas
export const logSensitiveAction = (action: string, resource: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user

    await auditLogger.log({
      userId: user?.id,
      userEmail: user?.email,
      action,
      resource,
      resourceId: req.params.id,
      method: req.method,
      endpoint: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      success: true,
      statusCode: 200,
      duration: 0,
      metadata: {
        triggeredBy: 'sensitive_action_middleware'
      }
    })

    next()
  }
}