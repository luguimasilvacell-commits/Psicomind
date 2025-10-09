import { z } from 'zod'
import fs from 'fs/promises'
import path from 'path'

// Schemas para validação
export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error', 'critical'])
export const LogCategorySchema = z.enum([
  'ai_interaction',
  'api_request',
  'authentication',
  'database',
  'webhook',
  'template',
  'sentiment_analysis',
  'error_handling',
  'performance',
  'security'
])

export const LogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  level: LogLevelSchema,
  category: LogCategorySchema,
  message: z.string(),
  details: z.record(z.any()).optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  requestId: z.string().optional(),
  duration: z.number().optional(),
  metadata: z.record(z.any()).optional()
})

export const LogQuerySchema = z.object({
  level: LogLevelSchema.optional(),
  category: LogCategorySchema.optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0)
})

export type LogLevel = z.infer<typeof LogLevelSchema>
export type LogCategory = z.infer<typeof LogCategorySchema>
export type LogEntry = z.infer<typeof LogEntrySchema>
export type LogQuery = z.infer<typeof LogQuerySchema>

export interface AIInteractionLog {
  requestId: string
  userId?: string
  sessionId?: string
  model: string
  prompt: string
  response: string
  tokens: {
    input: number
    output: number
    total: number
  }
  duration: number
  success: boolean
  error?: string
  sentiment?: {
    score?: number
    label?: string
    confidence?: number
  }
  riskLevel?: 'low' | 'medium' | 'high'
  templateUsed?: string
  metadata?: Record<string, any>
}

export interface PerformanceMetrics {
  requestId: string
  endpoint: string
  method: string
  duration: number
  statusCode: number
  memoryUsage: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  }
  cpuUsage: {
    user: number
    system: number
  }
}

export class LogService {
  private static instance: LogService
  private logsDir: string
  private maxFileSize = 10 * 1024 * 1024 // 10MB
  private maxFiles = 30 // Manter 30 arquivos de log

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs')
    this.ensureLogsDirectory()
  }

  static getInstance(): LogService {
    if (!LogService.instance) {
      LogService.instance = new LogService()
    }
    return LogService.instance
  }

  private async ensureLogsDirectory(): Promise<void> {
    try {
      await fs.access(this.logsDir)
    } catch {
      await fs.mkdir(this.logsDir, { recursive: true })
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private getLogFileName(category: LogCategory, date: Date = new Date()): string {
    const dateStr = date.toISOString().split('T')[0]
    return path.join(this.logsDir, `${category}-${dateStr}.log`)
  }

  async log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    details?: Record<string, any>,
    context?: {
      userId?: string
      sessionId?: string
      requestId?: string
      duration?: number
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
      ...context
    }

    try {
      const fileName = this.getLogFileName(category)
      const logLine = JSON.stringify(logEntry) + '\n'
      
      await fs.appendFile(fileName, logLine, 'utf8')
      
      // Verificar tamanho do arquivo e rotacionar se necessário
      await this.rotateLogIfNeeded(fileName, category)
      
      // Log crítico também vai para console
      if (level === 'critical' || level === 'error') {
        console.error(`[${level.toUpperCase()}] ${category}: ${message}`, details)
      }
    } catch (error) {
      console.error('Erro ao escrever log:', error)
    }
  }

  async logAIInteraction(interaction: AIInteractionLog): Promise<void> {
    await this.log(
      interaction.success ? 'info' : 'error',
      'ai_interaction',
      `AI interaction ${interaction.success ? 'completed' : 'failed'}`,
      {
        model: interaction.model,
        tokens: interaction.tokens,
        duration: interaction.duration,
        success: interaction.success,
        error: interaction.error,
        sentiment: interaction.sentiment,
        riskLevel: interaction.riskLevel,
        templateUsed: interaction.templateUsed
      },
      {
        userId: interaction.userId,
        sessionId: interaction.sessionId,
        requestId: interaction.requestId,
        duration: interaction.duration,
        metadata: interaction.metadata
      }
    )
  }

  async logPerformance(metrics: PerformanceMetrics): Promise<void> {
    await this.log(
      'info',
      'performance',
      `${metrics.method} ${metrics.endpoint} - ${metrics.duration}ms`,
      {
        endpoint: metrics.endpoint,
        method: metrics.method,
        statusCode: metrics.statusCode,
        memoryUsage: metrics.memoryUsage,
        cpuUsage: metrics.cpuUsage
      },
      {
        requestId: metrics.requestId,
        duration: metrics.duration
      }
    )
  }

  async logError(
    error: Error,
    context?: {
      userId?: string
      sessionId?: string
      requestId?: string
      category?: LogCategory
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    await this.log(
      'error',
      context?.category || 'error_handling',
      error.message,
      {
        name: error.name,
        stack: error.stack,
        cause: (error as any).cause
      },
      context
    )
  }

  async logSecurity(
    event: string,
    details: Record<string, any>,
    context?: {
      userId?: string
      sessionId?: string
      requestId?: string
    }
  ): Promise<void> {
    await this.log(
      'warn',
      'security',
      event,
      details,
      context
    )
  }

  async queryLogs(query: LogQuery): Promise<{
    logs: LogEntry[]
    total: number
    hasMore: boolean
  }> {
    const logs: LogEntry[] = []
    const categories = query.category ? [query.category] : Object.values(LogCategorySchema.enum)
    
    for (const category of categories) {
      const categoryLogs = await this.readLogsFromCategory(category, query)
      logs.push(...categoryLogs)
    }

    // Ordenar por timestamp (mais recente primeiro)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Filtrar por critérios
    const filteredLogs = this.filterLogs(logs, query)
    
    // Paginação
    const total = filteredLogs.length
    const paginatedLogs = filteredLogs.slice(query.offset, query.offset + query.limit)
    
    return {
      logs: paginatedLogs,
      total,
      hasMore: query.offset + query.limit < total
    }
  }

  private async readLogsFromCategory(category: LogCategory, query: LogQuery): Promise<LogEntry[]> {
    const logs: LogEntry[] = []
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const endDate = query.endDate ? new Date(query.endDate) : new Date()

    // Ler logs dos últimos dias baseado no range de datas
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const fileName = this.getLogFileName(category, currentDate)
      
      try {
        const content = await fs.readFile(fileName, 'utf8')
        const lines = content.trim().split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          try {
            const logEntry = JSON.parse(line) as LogEntry
            logs.push(logEntry)
          } catch (error) {
            console.warn('Erro ao parsear linha de log:', line)
          }
        }
      } catch (error) {
        // Arquivo não existe, continuar
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return logs
  }

  private filterLogs(logs: LogEntry[], query: LogQuery): LogEntry[] {
    return logs.filter(log => {
      // Filtro por nível
      if (query.level && log.level !== query.level) {
        return false
      }

      // Filtro por usuário
      if (query.userId && log.userId !== query.userId) {
        return false
      }

      // Filtro por sessão
      if (query.sessionId && log.sessionId !== query.sessionId) {
        return false
      }

      // Filtro por data
      const logDate = new Date(log.timestamp)
      if (query.startDate && logDate < new Date(query.startDate)) {
        return false
      }
      if (query.endDate && logDate > new Date(query.endDate)) {
        return false
      }

      // Filtro por busca textual
      if (query.search) {
        const searchLower = query.search.toLowerCase()
        const searchableText = [
          log.message,
          JSON.stringify(log.details || {}),
          JSON.stringify(log.metadata || {})
        ].join(' ').toLowerCase()
        
        if (!searchableText.includes(searchLower)) {
          return false
        }
      }

      return true
    })
  }

  private async rotateLogIfNeeded(fileName: string, category: LogCategory): Promise<void> {
    try {
      const stats = await fs.stat(fileName)
      
      if (stats.size > this.maxFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const rotatedFileName = fileName.replace('.log', `-${timestamp}.log`)
        
        await fs.rename(fileName, rotatedFileName)
        
        // Limpar arquivos antigos
        await this.cleanOldLogs(category)
      }
    } catch (error) {
      console.warn('Erro ao rotacionar log:', error)
    }
  }

  private async cleanOldLogs(category: LogCategory): Promise<void> {
    try {
      const files = await fs.readdir(this.logsDir)
      const categoryFiles = files
        .filter(file => file.startsWith(category) && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logsDir, file)
        }))

      if (categoryFiles.length > this.maxFiles) {
        // Ordenar por data de modificação (mais antigo primeiro)
        const filesWithStats = await Promise.all(
          categoryFiles.map(async file => ({
            ...file,
            stats: await fs.stat(file.path)
          }))
        )

        filesWithStats.sort((a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime())

        // Remover arquivos mais antigos
        const filesToRemove = filesWithStats.slice(0, filesWithStats.length - this.maxFiles)
        
        for (const file of filesToRemove) {
          await fs.unlink(file.path)
        }
      }
    } catch (error) {
      console.warn('Erro ao limpar logs antigos:', error)
    }
  }

  async getLogStats(): Promise<{
    totalLogs: number
    logsByLevel: Record<LogLevel, number>
    logsByCategory: Record<LogCategory, number>
    diskUsage: number
  }> {
    const stats = {
      totalLogs: 0,
      logsByLevel: {} as Record<LogLevel, number>,
      logsByCategory: {} as Record<LogCategory, number>,
      diskUsage: 0
    }

    // Inicializar contadores
    Object.values(LogLevelSchema.enum).forEach(level => {
      stats.logsByLevel[level] = 0
    })
    Object.values(LogCategorySchema.enum).forEach(category => {
      stats.logsByCategory[category] = 0
    })

    try {
      const files = await fs.readdir(this.logsDir)
      
      for (const file of files) {
        if (!file.endsWith('.log')) continue
        
        const filePath = path.join(this.logsDir, file)
        const fileStats = await fs.stat(filePath)
        stats.diskUsage += fileStats.size

        try {
          const content = await fs.readFile(filePath, 'utf8')
          const lines = content.trim().split('\n').filter(line => line.trim())
          
          for (const line of lines) {
            try {
              const logEntry = JSON.parse(line) as LogEntry
              stats.totalLogs++
              stats.logsByLevel[logEntry.level]++
              stats.logsByCategory[logEntry.category]++
            } catch (error) {
              // Ignorar linhas inválidas
            }
          }
        } catch (error) {
          console.warn(`Erro ao ler arquivo de log ${file}:`, error)
        }
      }
    } catch (error) {
      console.error('Erro ao calcular estatísticas de logs:', error)
    }

    return stats
  }
}

// Instância singleton
export const logService = LogService.getInstance()

// Middleware para logging automático de requests
export const requestLoggerMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now()
  const requestId = req.headers['x-request-id'] || logService['generateId']()
  
  req.requestId = requestId
  req.startTime = startTime

  // Log da requisição
  logService.log(
    'info',
    'api_request',
    `${req.method} ${req.path}`,
    {
      method: req.method,
      path: req.path,
      query: req.query,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    },
    {
      requestId,
      userId: req.user?.id,
      sessionId: req.sessionId
    }
  )

  // Interceptar resposta
  const originalSend = res.send
  res.send = function(data: any) {
    const duration = Date.now() - startTime
    
    // Log da resposta
    logService.logPerformance({
      requestId,
      endpoint: req.path,
      method: req.method,
      duration,
      statusCode: res.statusCode,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    })

    return originalSend.call(this, data)
  }

  next()
}