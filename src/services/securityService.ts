/**
 * Serviço de segurança e rate limiting
 */
import { logger, LogCategory } from './loggingService';

export interface RateLimitConfig {
  windowMs: number; // Janela de tempo em ms
  maxRequests: number; // Máximo de requisições na janela
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (identifier: string) => string;
}

export interface SecurityConfig {
  rateLimits: {
    api: RateLimitConfig;
    webhook: RateLimitConfig;
    message: RateLimitConfig;
    automation: RateLimitConfig;
  };
  apiKeys: {
    required: boolean;
    validKeys: string[];
  };
  webhook: {
    validateSignature: boolean;
    secretKey?: string;
  };
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
  };
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

export interface SecurityEvent {
  type: 'rate_limit' | 'invalid_api_key' | 'invalid_signature' | 'suspicious_activity';
  identifier: string;
  timestamp: Date;
  details: any;
  blocked: boolean;
}

export class SecurityService {
  private static instance: SecurityService | null = null;
  private config: SecurityConfig;
  private rateLimitStore: Map<string, RateLimitEntry> = new Map();
  private securityEvents: SecurityEvent[] = [];
  private blockedIPs: Set<string> = new Set();
  private suspiciousActivity: Map<string, number> = new Map();

  private constructor(config: SecurityConfig) {
    this.config = config;
    this.startCleanupTimer();
  }

  /**
   * Obtém instância singleton
   */
  static getInstance(config?: SecurityConfig): SecurityService {
    if (!SecurityService.instance && config) {
      SecurityService.instance = new SecurityService(config);
    }
    return SecurityService.instance!;
  }

  /**
   * Verifica rate limit para um identificador
   */
  checkRateLimit(
    identifier: string,
    limitType: keyof SecurityConfig['rateLimits']
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const config = this.config.rateLimits[limitType];
    const key = config.keyGenerator ? config.keyGenerator(identifier) : `${limitType}:${identifier}`;
    
    const now = Date.now();
    const entry = this.rateLimitStore.get(key);

    // Se não existe entrada ou a janela expirou, cria nova
    if (!entry || now > entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + config.windowMs,
        blocked: false
      };
      this.rateLimitStore.set(key, newEntry);

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: newEntry.resetTime
      };
    }

    // Incrementa contador
    entry.count++;

    // Verifica se excedeu o limite
    if (entry.count > config.maxRequests) {
      entry.blocked = true;
      
      this.logSecurityEvent('rate_limit', identifier, {
        limitType,
        count: entry.count,
        maxRequests: config.maxRequests,
        windowMs: config.windowMs
      }, true);

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * Valida API key
   */
  validateApiKey(apiKey: string): boolean {
    if (!this.config.apiKeys.required) {
      return true;
    }

    const isValid = this.config.apiKeys.validKeys.includes(apiKey);
    
    if (!isValid) {
      this.logSecurityEvent('invalid_api_key', apiKey, {
        providedKey: apiKey.substring(0, 8) + '...'
      }, true);
    }

    return isValid;
  }

  /**
   * Valida assinatura de webhook
   */
  async validateWebhookSignature(
    payload: string,
    signature: string,
    source: string
  ): Promise<boolean> {
    if (!this.config.webhook.validateSignature || !this.config.webhook.secretKey) {
      return true;
    }

    try {
      // Implementar validação de assinatura específica para cada fonte
      const isValid = await this.verifySignature(payload, signature, this.config.webhook.secretKey, source);
      
      if (!isValid) {
        this.logSecurityEvent('invalid_signature', source, {
          signature: signature.substring(0, 16) + '...',
          payloadLength: payload.length
        }, true);
      }

      return isValid;
    } catch (error) {
      logger.error(LogCategory.AUTH, 'Erro ao validar assinatura de webhook', { error, source });
      return false;
    }
  }

  /**
   * Verifica se IP está bloqueado
   */
  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  /**
   * Bloqueia IP temporariamente
   */
  blockIP(ip: string, durationMs: number = 3600000): void { // 1 hora por padrão
    this.blockedIPs.add(ip);
    
    logger.warn(LogCategory.AUTH, `IP bloqueado: ${ip}`, { durationMs });
    
    // Remove bloqueio após duração especificada
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      logger.info(LogCategory.AUTH, `Bloqueio removido para IP: ${ip}`);
    }, durationMs);
  }

  /**
   * Detecta atividade suspeita
   */
  detectSuspiciousActivity(identifier: string, activity: string): boolean {
    const key = `${identifier}:${activity}`;
    const count = this.suspiciousActivity.get(key) || 0;
    const newCount = count + 1;
    
    this.suspiciousActivity.set(key, newCount);

    // Limites para diferentes tipos de atividade
    const thresholds: Record<string, number> = {
      'failed_auth': 5,
      'invalid_request': 10,
      'rate_limit_exceeded': 3,
      'webhook_failure': 5
    };

    const threshold = thresholds[activity] || 10;

    if (newCount >= threshold) {
      this.logSecurityEvent('suspicious_activity', identifier, {
        activity,
        count: newCount,
        threshold
      }, true);

      // Bloqueia automaticamente se atividade muito suspeita
      if (activity === 'failed_auth' && newCount >= 10) {
        this.blockIP(identifier, 7200000); // 2 horas
      }

      return true;
    }

    return false;
  }

  /**
   * Sanitiza entrada de dados
   */
  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/javascript:/gi, '') // Remove javascript:
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Valida CORS
   */
  validateCORS(origin: string, method: string): boolean {
    const { allowedOrigins, allowedMethods } = this.config.cors;

    // Verifica origem
    if (allowedOrigins.length > 0 && !allowedOrigins.includes('*')) {
      if (!allowedOrigins.includes(origin)) {
        return false;
      }
    }

    // Verifica método
    if (allowedMethods.length > 0 && !allowedMethods.includes('*')) {
      if (!allowedMethods.includes(method.toUpperCase())) {
        return false;
      }
    }

    return true;
  }

  /**
   * Gera token seguro
   */
  generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Hash de senha seguro (para uso futuro)
   */
  async hashPassword(password: string): Promise<string> {
    // Implementar usando bcrypt ou similar
    // Por enquanto, retorna um hash simples (NÃO usar em produção)
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifica força da senha
   */
  checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    // Comprimento
    if (password.length >= 8) score += 1;
    else feedback.push('Use pelo menos 8 caracteres');

    if (password.length >= 12) score += 1;

    // Caracteres
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Inclua letras minúsculas');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Inclua letras maiúsculas');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Inclua números');

    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else feedback.push('Inclua caracteres especiais');

    // Padrões comuns
    if (!/(.)\1{2,}/.test(password)) score += 1;
    else feedback.push('Evite repetir caracteres');

    return {
      score,
      feedback,
      isStrong: score >= 5
    };
  }

  /**
   * Obtém eventos de segurança recentes
   */
  getSecurityEvents(limit: number = 100): SecurityEvent[] {
    return this.securityEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Obtém estatísticas de segurança
   */
  getSecurityStats(): {
    totalEvents: number;
    blockedRequests: number;
    blockedIPs: number;
    rateLimitViolations: number;
    invalidApiKeys: number;
    suspiciousActivities: number;
  } {
    const events = this.securityEvents;
    
    return {
      totalEvents: events.length,
      blockedRequests: events.filter(e => e.blocked).length,
      blockedIPs: this.blockedIPs.size,
      rateLimitViolations: events.filter(e => e.type === 'rate_limit').length,
      invalidApiKeys: events.filter(e => e.type === 'invalid_api_key').length,
      suspiciousActivities: events.filter(e => e.type === 'suspicious_activity').length
    };
  }

  /**
   * Limpa dados antigos
   */
  cleanup(): void {
    const now = Date.now();
    
    // Limpa rate limits expirados
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }

    // Limpa eventos antigos (mantém últimos 1000)
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // Limpa atividades suspeitas antigas
    this.suspiciousActivity.clear();
  }

  /**
   * Verifica assinatura específica por fonte
   */
  private async verifySignature(
    payload: string,
    signature: string,
    secret: string,
    source: string
  ): Promise<boolean> {
    // Implementar verificação específica para cada fonte
    switch (source.toLowerCase()) {
      case 'n8n':
        return this.verifyN8nSignature(payload, signature, secret);
      case 'evolution':
        return this.verifyEvolutionSignature(payload, signature, secret);
      default:
        return await this.verifyGenericSignature(payload, signature, secret);
    }
  }

  /**
   * Verifica assinatura n8n
   */
  private verifyN8nSignature(payload: string, signature: string, secret: string): boolean {
    // Implementar conforme documentação do n8n
    return true; // Placeholder
  }

  /**
   * Verifica assinatura Evolution API
   */
  private verifyEvolutionSignature(payload: string, signature: string, secret: string): boolean {
    // Implementar conforme documentação da Evolution API
    return true; // Placeholder
  }

  /**
   * Verifica assinatura genérica (HMAC SHA-256)
   */
  private async verifyGenericSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      return signature.toLowerCase() === expectedSignature.toLowerCase();
    } catch (error) {
      logger.error(LogCategory.AUTH, 'Erro ao verificar assinatura genérica', { error });
      return false;
    }
  }

  /**
   * Registra evento de segurança
   */
  private logSecurityEvent(
    type: SecurityEvent['type'],
    identifier: string,
    details: any,
    blocked: boolean
  ): void {
    const event: SecurityEvent = {
      type,
      identifier,
      timestamp: new Date(),
      details,
      blocked
    };

    this.securityEvents.push(event);

    // Log no sistema de logging
    logger.warn(LogCategory.AUTH, `Evento de segurança: ${type}`, {
      identifier,
      details,
      blocked
    });
  }

  /**
   * Inicia timer de limpeza automática
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup();
    }, 300000); // Limpa a cada 5 minutos
  }
}

// Configuração padrão de segurança
export const defaultSecurityConfig: SecurityConfig = {
  rateLimits: {
    api: {
      windowMs: 60000, // 1 minuto
      maxRequests: 100
    },
    webhook: {
      windowMs: 60000, // 1 minuto
      maxRequests: 50
    },
    message: {
      windowMs: 60000, // 1 minuto
      maxRequests: 30
    },
    automation: {
      windowMs: 300000, // 5 minutos
      maxRequests: 10
    }
  },
  apiKeys: {
    required: true,
    validKeys: []
  },
  webhook: {
    validateSignature: true
  },
  cors: {
    allowedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  }
};

// Instância singleton
export const securityService = SecurityService.getInstance(defaultSecurityConfig);