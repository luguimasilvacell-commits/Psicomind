/**
 * Serviço de logs e monitoramento
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum LogCategory {
  SYSTEM = 'system',
  INTEGRATION = 'integration',
  AUTOMATION = 'automation',
  WEBHOOK = 'webhook',
  MESSAGE = 'message',
  AUTH = 'auth',
  PERFORMANCE = 'performance'
}

export interface LogEntry {
  id?: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  source?: string;
  stack?: string;
}

export interface LogFilter {
  level?: LogLevel[];
  category?: LogCategory[];
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  source?: string;
  search?: string;
}

export interface LogMetrics {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  criticalCount: number;
  categoryCounts: Record<LogCategory, number>;
  levelCounts: Record<LogLevel, number>;
  recentErrors: LogEntry[];
  topSources: Array<{ source: string; count: number }>;
}

export class LoggingService {
  private static instance: LoggingService | null = null;
  private logs: LogEntry[] = [];
  private maxLogsInMemory = 1000;
  private logQueue: LogEntry[] = [];
  private isProcessingQueue = false;

  private constructor() {
    // Inicia processamento da fila de logs
    this.startLogProcessing();
  }

  /**
   * Obtém instância singleton
   */
  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Registra um log
   */
  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: any,
    source?: string
  ): void {
    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      source,
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId(),
      requestId: this.getCurrentRequestId()
    };

    // Adiciona stack trace para erros
    if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
      logEntry.stack = new Error().stack;
    }

    // Adiciona à fila para processamento
    this.logQueue.push(logEntry);

    // Log no console para desenvolvimento
    this.logToConsole(logEntry);

    // Processa fila se não estiver processando
    if (!this.isProcessingQueue) {
      this.processLogQueue();
    }
  }

  /**
   * Métodos de conveniência para diferentes níveis
   */
  debug(category: LogCategory, message: string, data?: any, source?: string): void {
    this.log(LogLevel.DEBUG, category, message, data, source);
  }

  info(category: LogCategory, message: string, data?: any, source?: string): void {
    this.log(LogLevel.INFO, category, message, data, source);
  }

  warn(category: LogCategory, message: string, data?: any, source?: string): void {
    this.log(LogLevel.WARN, category, message, data, source);
  }

  error(category: LogCategory, message: string, data?: any, source?: string): void {
    this.log(LogLevel.ERROR, category, message, data, source);
  }

  critical(category: LogCategory, message: string, data?: any, source?: string): void {
    this.log(LogLevel.CRITICAL, category, message, data, source);
  }

  /**
   * Registra erro com stack trace completo
   */
  logError(category: LogCategory, error: Error, context?: any, source?: string): void {
    this.log(
      LogLevel.ERROR,
      category,
      error.message,
      {
        name: error.name,
        stack: error.stack,
        context
      },
      source
    );
  }

  /**
   * Registra métricas de performance
   */
  logPerformance(
    operation: string,
    duration: number,
    data?: any,
    source?: string
  ): void {
    this.log(
      LogLevel.INFO,
      LogCategory.PERFORMANCE,
      `${operation} completed in ${duration}ms`,
      {
        operation,
        duration,
        ...data
      },
      source
    );
  }

  /**
   * Registra evento de integração
   */
  logIntegration(
    service: string,
    action: string,
    success: boolean,
    data?: any,
    error?: string
  ): void {
    this.log(
      success ? LogLevel.INFO : LogLevel.ERROR,
      LogCategory.INTEGRATION,
      `${service}: ${action} ${success ? 'succeeded' : 'failed'}`,
      {
        service,
        action,
        success,
        error,
        ...data
      },
      service
    );
  }

  /**
   * Registra evento de automação
   */
  logAutomation(
    automationId: string,
    action: string,
    success: boolean,
    data?: any,
    error?: string
  ): void {
    this.log(
      success ? LogLevel.INFO : LogLevel.ERROR,
      LogCategory.AUTOMATION,
      `Automation ${automationId}: ${action} ${success ? 'succeeded' : 'failed'}`,
      {
        automationId,
        action,
        success,
        error,
        ...data
      },
      'automation'
    );
  }

  /**
   * Registra evento de webhook
   */
  logWebhook(
    source: string,
    event: string,
    success: boolean,
    payload?: any,
    error?: string
  ): void {
    this.log(
      success ? LogLevel.INFO : LogLevel.ERROR,
      LogCategory.WEBHOOK,
      `Webhook ${source}: ${event} ${success ? 'processed' : 'failed'}`,
      {
        source,
        event,
        success,
        payload,
        error
      },
      source
    );
  }

  /**
   * Busca logs com filtros
   */
  async getLogs(filter?: LogFilter, limit = 100, offset = 0): Promise<LogEntry[]> {
    let filteredLogs = [...this.logs];

    if (filter) {
      filteredLogs = filteredLogs.filter(log => {
        // Filtro por nível
        if (filter.level && !filter.level.includes(log.level)) {
          return false;
        }

        // Filtro por categoria
        if (filter.category && !filter.category.includes(log.category)) {
          return false;
        }

        // Filtro por data
        if (filter.startDate && log.timestamp < filter.startDate) {
          return false;
        }

        if (filter.endDate && log.timestamp > filter.endDate) {
          return false;
        }

        // Filtro por usuário
        if (filter.userId && log.userId !== filter.userId) {
          return false;
        }

        // Filtro por fonte
        if (filter.source && log.source !== filter.source) {
          return false;
        }

        // Filtro por busca textual
        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          return (
            log.message.toLowerCase().includes(searchLower) ||
            (log.source && log.source.toLowerCase().includes(searchLower)) ||
            (log.data && JSON.stringify(log.data).toLowerCase().includes(searchLower))
          );
        }

        return true;
      });
    }

    // Ordena por timestamp (mais recente primeiro)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Aplica paginação
    return filteredLogs.slice(offset, offset + limit);
  }

  /**
   * Obtém métricas dos logs
   */
  async getLogMetrics(filter?: LogFilter): Promise<LogMetrics> {
    const logs = await this.getLogs(filter, 10000); // Busca mais logs para métricas

    const metrics: LogMetrics = {
      totalLogs: logs.length,
      errorCount: 0,
      warningCount: 0,
      criticalCount: 0,
      categoryCounts: {} as Record<LogCategory, number>,
      levelCounts: {} as Record<LogLevel, number>,
      recentErrors: [],
      topSources: []
    };

    // Inicializa contadores
    Object.values(LogCategory).forEach(category => {
      metrics.categoryCounts[category] = 0;
    });

    Object.values(LogLevel).forEach(level => {
      metrics.levelCounts[level] = 0;
    });

    const sourceCounts: Record<string, number> = {};

    // Processa logs
    logs.forEach(log => {
      // Conta por nível
      metrics.levelCounts[log.level]++;

      // Conta por categoria
      metrics.categoryCounts[log.category]++;

      // Conta erros específicos
      if (log.level === LogLevel.ERROR) {
        metrics.errorCount++;
        if (metrics.recentErrors.length < 10) {
          metrics.recentErrors.push(log);
        }
      } else if (log.level === LogLevel.WARN) {
        metrics.warningCount++;
      } else if (log.level === LogLevel.CRITICAL) {
        metrics.criticalCount++;
      }

      // Conta por fonte
      if (log.source) {
        sourceCounts[log.source] = (sourceCounts[log.source] || 0) + 1;
      }
    });

    // Top fontes
    metrics.topSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return metrics;
  }

  /**
   * Limpa logs antigos
   */
  async cleanOldLogs(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp > cutoffDate);
    const removedCount = initialCount - this.logs.length;

    this.info(
      LogCategory.SYSTEM,
      `Limpeza de logs concluída: ${removedCount} logs removidos`,
      { daysToKeep, removedCount },
      'logging-service'
    );

    return removedCount;
  }

  /**
   * Exporta logs para arquivo
   */
  async exportLogs(filter?: LogFilter, format: 'json' | 'csv' = 'json'): Promise<string> {
    const logs = await this.getLogs(filter, 10000);

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else {
      // CSV format
      const headers = ['timestamp', 'level', 'category', 'message', 'source', 'userId'];
      const csvRows = [headers.join(',')];

      logs.forEach(log => {
        const row = [
          log.timestamp.toISOString(),
          log.level,
          log.category,
          `"${log.message.replace(/"/g, '""')}"`,
          log.source || '',
          log.userId || ''
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    }
  }

  /**
   * Processa fila de logs
   */
  private async processLogQueue(): Promise<void> {
    if (this.isProcessingQueue || this.logQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.logQueue.length > 0) {
        const logEntry = this.logQueue.shift();
        if (logEntry) {
          await this.persistLog(logEntry);
          this.addToMemoryLogs(logEntry);
        }
      }
    } catch (error) {
      console.error('Erro ao processar fila de logs:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Persiste log (implementar integração com banco de dados)
   */
  private async persistLog(logEntry: LogEntry): Promise<void> {
    try {
      // Aqui você implementaria a persistência no banco de dados
      // Por exemplo, usando Supabase:
      // await supabase.from('system_logs').insert(logEntry);
      
      // Por enquanto, apenas simula a persistência
      await new Promise(resolve => setTimeout(resolve, 1));
    } catch (error) {
      console.error('Erro ao persistir log:', error);
    }
  }

  /**
   * Adiciona log à memória
   */
  private addToMemoryLogs(logEntry: LogEntry): void {
    this.logs.push(logEntry);

    // Mantém apenas os logs mais recentes na memória
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs = this.logs.slice(-this.maxLogsInMemory);
    }
  }

  /**
   * Log no console para desenvolvimento
   */
  private logToConsole(logEntry: LogEntry): void {
    const timestamp = logEntry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${logEntry.level.toUpperCase()}] [${logEntry.category}]`;
    const message = `${prefix} ${logEntry.message}`;

    switch (logEntry.level) {
      case LogLevel.DEBUG:
        console.debug(message, logEntry.data);
        break;
      case LogLevel.INFO:
        console.info(message, logEntry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, logEntry.data);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message, logEntry.data);
        break;
    }
  }

  /**
   * Inicia processamento automático da fila
   */
  private startLogProcessing(): void {
    setInterval(() => {
      if (!this.isProcessingQueue && this.logQueue.length > 0) {
        this.processLogQueue();
      }
    }, 1000); // Processa a cada segundo
  }

  /**
   * Gera ID único para o log
   */
  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém ID do usuário atual (implementar conforme seu sistema de auth)
   */
  private getCurrentUserId(): string | undefined {
    // Implementar conforme seu sistema de autenticação
    return undefined;
  }

  /**
   * Obtém ID da sessão atual
   */
  private getCurrentSessionId(): string | undefined {
    // Implementar conforme necessário
    return undefined;
  }

  /**
   * Obtém ID da requisição atual
   */
  private getCurrentRequestId(): string | undefined {
    // Implementar conforme necessário
    return undefined;
  }
}

// Instância singleton
export const logger = LoggingService.getInstance();

// Funções de conveniência para uso global
export const logDebug = (category: LogCategory, message: string, data?: any, source?: string) =>
  logger.debug(category, message, data, source);

export const logInfo = (category: LogCategory, message: string, data?: any, source?: string) =>
  logger.info(category, message, data, source);

export const logWarn = (category: LogCategory, message: string, data?: any, source?: string) =>
  logger.warn(category, message, data, source);

export const logError = (category: LogCategory, message: string, data?: any, source?: string) =>
  logger.error(category, message, data, source);

export const logCritical = (category: LogCategory, message: string, data?: any, source?: string) =>
  logger.critical(category, message, data, source);