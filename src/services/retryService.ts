/**
 * Serviço de retry e failover para integrações
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

export interface FailoverConfig {
  primaryService: string;
  fallbackServices: string[];
  healthCheckInterval: number;
  failureThreshold: number;
}

export interface ServiceHealth {
  serviceName: string;
  isHealthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  responseTime?: number;
}

export class RetryService {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true
  };

  /**
   * Executa uma função com retry automático
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        const data = await fn();
        return {
          success: true,
          data,
          attempts: attempt,
          totalTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.warn(`[Retry] Tentativa ${attempt}/${finalConfig.maxAttempts} falhou:`, lastError.message);

        // Se não é a última tentativa, aguarda antes de tentar novamente
        if (attempt < finalConfig.maxAttempts) {
          const delay = this.calculateDelay(attempt, finalConfig);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: finalConfig.maxAttempts,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Calcula o delay para a próxima tentativa
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
    
    // Aplica o limite máximo
    delay = Math.min(delay, config.maxDelay);
    
    // Adiciona jitter se configurado
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  /**
   * Função auxiliar para aguardar
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry específico para requisições HTTP
   */
  static async withHttpRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    return this.withRetry(async () => {
      try {
        return await fn();
      } catch (error: any) {
        // Verifica se é um erro que vale a pena tentar novamente
        if (this.isRetryableHttpError(error)) {
          throw error;
        } else {
          // Para erros não retryáveis, não tenta novamente
          throw new Error(`Erro não retryável: ${error.message}`);
        }
      }
    }, config);
  }

  /**
   * Verifica se um erro HTTP é retryável
   */
  private static isRetryableHttpError(error: any): boolean {
    // Erros de rede
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Status codes retryáveis
    if (error.response?.status) {
      const status = error.response.status;
      return status >= 500 || status === 429 || status === 408;
    }

    return true; // Por padrão, tenta novamente
  }
}

export class FailoverService {
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private config: FailoverConfig;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config: FailoverConfig) {
    this.config = config;
    this.initializeServices();
    this.startHealthChecks();
  }

  /**
   * Inicializa o estado de saúde dos serviços
   */
  private initializeServices(): void {
    const allServices = [this.config.primaryService, ...this.config.fallbackServices];
    
    allServices.forEach(serviceName => {
      this.serviceHealth.set(serviceName, {
        serviceName,
        isHealthy: true,
        lastCheck: new Date(),
        consecutiveFailures: 0
      });
    });
  }

  /**
   * Inicia verificações periódicas de saúde
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.checkAllServicesHealth();
    }, this.config.healthCheckInterval);
  }

  /**
   * Para as verificações de saúde
   */
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Executa uma operação com failover automático
   */
  async withFailover<T>(
    operations: Map<string, () => Promise<T>>,
    retryConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const availableServices = this.getAvailableServices();
    
    for (const serviceName of availableServices) {
      const operation = operations.get(serviceName);
      if (!operation) {
        console.warn(`[Failover] Operação não encontrada para serviço: ${serviceName}`);
        continue;
      }

      console.log(`[Failover] Tentando serviço: ${serviceName}`);
      
      const result = await RetryService.withRetry(operation, retryConfig);
      
      if (result.success) {
        this.markServiceHealthy(serviceName);
        return result;
      } else {
        this.markServiceUnhealthy(serviceName);
        console.warn(`[Failover] Serviço ${serviceName} falhou:`, result.error?.message);
      }
    }

    return {
      success: false,
      error: new Error('Todos os serviços falharam'),
      attempts: availableServices.length,
      totalTime: 0
    };
  }

  /**
   * Retorna lista de serviços disponíveis em ordem de prioridade
   */
  private getAvailableServices(): string[] {
    const services = [this.config.primaryService, ...this.config.fallbackServices];
    
    return services.filter(serviceName => {
      const health = this.serviceHealth.get(serviceName);
      return health?.isHealthy ?? true;
    });
  }

  /**
   * Marca um serviço como saudável
   */
  private markServiceHealthy(serviceName: string): void {
    const health = this.serviceHealth.get(serviceName);
    if (health) {
      health.isHealthy = true;
      health.consecutiveFailures = 0;
      health.lastCheck = new Date();
    }
  }

  /**
   * Marca um serviço como não saudável
   */
  private markServiceUnhealthy(serviceName: string): void {
    const health = this.serviceHealth.get(serviceName);
    if (health) {
      health.consecutiveFailures++;
      health.lastCheck = new Date();
      
      if (health.consecutiveFailures >= this.config.failureThreshold) {
        health.isHealthy = false;
      }
    }
  }

  /**
   * Verifica a saúde de todos os serviços
   */
  private async checkAllServicesHealth(): Promise<void> {
    const services = [this.config.primaryService, ...this.config.fallbackServices];
    
    for (const serviceName of services) {
      try {
        await this.checkServiceHealth(serviceName);
      } catch (error) {
        console.error(`[Failover] Erro ao verificar saúde do serviço ${serviceName}:`, error);
      }
    }
  }

  /**
   * Verifica a saúde de um serviço específico
   */
  private async checkServiceHealth(serviceName: string): Promise<void> {
    const health = this.serviceHealth.get(serviceName);
    if (!health) return;

    const startTime = Date.now();
    
    try {
      // Aqui você implementaria a verificação específica para cada serviço
      // Por exemplo, uma requisição HTTP simples para um endpoint de health check
      await this.performHealthCheck(serviceName);
      
      health.isHealthy = true;
      health.consecutiveFailures = 0;
      health.responseTime = Date.now() - startTime;
      
    } catch (error) {
      health.consecutiveFailures++;
      
      if (health.consecutiveFailures >= this.config.failureThreshold) {
        health.isHealthy = false;
      }
    }
    
    health.lastCheck = new Date();
  }

  /**
   * Executa verificação de saúde específica do serviço
   */
  private async performHealthCheck(serviceName: string): Promise<void> {
    // Implementação específica para cada tipo de serviço
    // Por exemplo, para n8n seria uma requisição GET /health
    // Para Evolution API seria uma requisição GET /instance/fetchInstances
    
    switch (serviceName) {
      case 'n8n':
        // Implementar verificação n8n
        break;
      case 'evolution':
        // Implementar verificação Evolution API
        break;
      default:
        throw new Error(`Verificação de saúde não implementada para: ${serviceName}`);
    }
  }

  /**
   * Retorna o estado atual de todos os serviços
   */
  getServicesHealth(): ServiceHealth[] {
    return Array.from(this.serviceHealth.values());
  }

  /**
   * Força a verificação de saúde de um serviço
   */
  async forceHealthCheck(serviceName: string): Promise<ServiceHealth | null> {
    await this.checkServiceHealth(serviceName);
    return this.serviceHealth.get(serviceName) || null;
  }

  /**
   * Redefine o estado de saúde de um serviço
   */
  resetServiceHealth(serviceName: string): void {
    const health = this.serviceHealth.get(serviceName);
    if (health) {
      health.isHealthy = true;
      health.consecutiveFailures = 0;
      health.lastCheck = new Date();
    }
  }
}

// Instância singleton do serviço de failover
let failoverServiceInstance: FailoverService | null = null;

export const createFailoverService = (config: FailoverConfig): FailoverService => {
  failoverServiceInstance = new FailoverService(config);
  return failoverServiceInstance;
};

export const getFailoverService = (): FailoverService | null => {
  return failoverServiceInstance;
};