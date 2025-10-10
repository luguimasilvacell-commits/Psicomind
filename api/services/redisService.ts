// RedisService para Sistema de Chat WhatsApp da Fernanda
// Gerencia cache, sessões e controle de bloqueio de agente

import Redis from 'ioredis';
import { 
  RedisSessionData,
  RateLimit,
  CacheEntry,
  HealthCheck
} from '../types/fernanda-chat';

export class RedisService {
  private redis: Redis;
  private readonly SESSION_PREFIX = 'chat_session:';
  private readonly BLOCK_PREFIX = 'agent_block:';
  private readonly RATE_LIMIT_PREFIX = 'rate_limit:';
  private readonly CACHE_PREFIX = 'cache:';
  private readonly MESSAGE_CONCAT_PREFIX = 'msg_concat:';

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  // Métodos para sessões de chat
  async setSession(telefone: string, sessionData: RedisSessionData, ttl: number = 86400): Promise<void> {
    const key = `${this.SESSION_PREFIX}${telefone}`;
    await this.redis.setex(key, ttl, JSON.stringify(sessionData));
  }

  async getSession(telefone: string): Promise<RedisSessionData | null> {
    const key = `${this.SESSION_PREFIX}${telefone}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(telefone: string): Promise<void> {
    const key = `${this.SESSION_PREFIX}${telefone}`;
    await this.redis.del(key);
  }

  async updateSessionActivity(telefone: string): Promise<void> {
    const session = await this.getSession(telefone);
    if (session) {
      session.ultima_atividade = new Date().toISOString();
      await this.setSession(telefone, session);
    }
  }

  // Métodos para controle de bloqueio de agente
  async blockAgent(telefone: string, motivo: string, ttl: number = 3600): Promise<void> {
    const key = `${this.BLOCK_PREFIX}${telefone}`;
    const blockData = {
      bloqueado: true,
      motivo,
      bloqueado_em: new Date().toISOString(),
    };
    await this.redis.setex(key, ttl, JSON.stringify(blockData));
  }

  async unblockAgent(telefone: string): Promise<void> {
    const key = `${this.BLOCK_PREFIX}${telefone}`;
    await this.redis.del(key);
  }

  async isAgentBlocked(telefone: string): Promise<boolean> {
    const key = `${this.BLOCK_PREFIX}${telefone}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async getBlockInfo(telefone: string): Promise<any> {
    const key = `${this.BLOCK_PREFIX}${telefone}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Métodos para concatenação de mensagens (msgPicotada)
  async appendMessage(telefone: string, mensagem: string, ttl: number = 3600): Promise<void> {
    const key = `${this.MESSAGE_CONCAT_PREFIX}${telefone}`;
    const existingMessages = await this.redis.get(key);
    const newMessage = existingMessages ? `${existingMessages}\n${mensagem}` : mensagem;
    await this.redis.setex(key, ttl, newMessage);
  }

  async getConcatenatedMessages(telefone: string): Promise<string | null> {
    const key = `${this.MESSAGE_CONCAT_PREFIX}${telefone}`;
    return await this.redis.get(key);
  }

  async clearConcatenatedMessages(telefone: string): Promise<void> {
    const key = `${this.MESSAGE_CONCAT_PREFIX}${telefone}`;
    await this.redis.del(key);
  }

  // Métodos para rate limiting
  async checkRateLimit(telefone: string, limite: number = 10, janela: number = 60): Promise<RateLimit> {
    const key = `${this.RATE_LIMIT_PREFIX}${telefone}`;
    const current = await this.redis.get(key);
    
    if (!current) {
      await this.redis.setex(key, janela, '1');
      return {
        telefone,
        contador: 1,
        janela_tempo: new Date().toISOString(),
        limite_maximo: limite,
      };
    }

    const contador = parseInt(current) + 1;
    await this.redis.setex(key, janela, contador.toString());

    const rateLimit: RateLimit = {
      telefone,
      contador,
      janela_tempo: new Date().toISOString(),
      limite_maximo: limite,
    };

    if (contador > limite) {
      rateLimit.bloqueado_ate = new Date(Date.now() + janela * 1000).toISOString();
    }

    return rateLimit;
  }

  // Métodos para cache genérico
  async setCache<T>(chave: string, valor: T, ttl: number = 3600): Promise<void> {
    const key = `${this.CACHE_PREFIX}${chave}`;
    const cacheEntry: CacheEntry<T> = {
      chave,
      valor,
      ttl,
      timestamp: new Date().toISOString(),
    };
    await this.redis.setex(key, ttl, JSON.stringify(cacheEntry));
  }

  async getCache<T>(chave: string): Promise<T | null> {
    const key = `${this.CACHE_PREFIX}${chave}`;
    const data = await this.redis.get(key);
    if (!data) return null;

    const cacheEntry: CacheEntry<T> = JSON.parse(data);
    return cacheEntry.valor;
  }

  async deleteCache(chave: string): Promise<void> {
    const key = `${this.CACHE_PREFIX}${chave}`;
    await this.redis.del(key);
  }

  async clearCacheByPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(`${this.CACHE_PREFIX}${pattern}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // Métodos para listas (filas)
  async pushToList(listName: string, item: any): Promise<void> {
    await this.redis.lpush(listName, JSON.stringify(item));
  }

  async popFromList(listName: string): Promise<any> {
    const item = await this.redis.rpop(listName);
    return item ? JSON.parse(item) : null;
  }

  async getListLength(listName: string): Promise<number> {
    return await this.redis.llen(listName);
  }

  async getListItems(listName: string, start: number = 0, end: number = -1): Promise<any[]> {
    const items = await this.redis.lrange(listName, start, end);
    return items.map(item => JSON.parse(item));
  }

  // Métodos para sets (conjuntos)
  async addToSet(setName: string, member: string): Promise<void> {
    await this.redis.sadd(setName, member);
  }

  async removeFromSet(setName: string, member: string): Promise<void> {
    await this.redis.srem(setName, member);
  }

  async isInSet(setName: string, member: string): Promise<boolean> {
    const result = await this.redis.sismember(setName, member);
    return result === 1;
  }

  async getSetMembers(setName: string): Promise<string[]> {
    return await this.redis.smembers(setName);
  }

  // Métodos para hashes
  async setHash(hashName: string, field: string, value: any): Promise<void> {
    await this.redis.hset(hashName, field, JSON.stringify(value));
  }

  async getHash(hashName: string, field: string): Promise<any> {
    const value = await this.redis.hget(hashName, field);
    return value ? JSON.parse(value) : null;
  }

  async getAllHash(hashName: string): Promise<Record<string, any>> {
    const hash = await this.redis.hgetall(hashName);
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(hash)) {
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    }
    
    return result;
  }

  async deleteHashField(hashName: string, field: string): Promise<void> {
    await this.redis.hdel(hashName, field);
  }

  // Métodos para pub/sub
  async publish(channel: string, message: any): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    const subscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    });

    subscriber.subscribe(channel);
    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          console.error('Error parsing Redis message:', error);
        }
      }
    });
  }

  // Métodos para estatísticas e monitoramento
  async getSessionCount(): Promise<number> {
    const keys = await this.redis.keys(`${this.SESSION_PREFIX}*`);
    return keys.length;
  }

  async getBlockedAgentsCount(): Promise<number> {
    const keys = await this.redis.keys(`${this.BLOCK_PREFIX}*`);
    return keys.length;
  }

  async getActivePhones(): Promise<string[]> {
    const keys = await this.redis.keys(`${this.SESSION_PREFIX}*`);
    return keys.map(key => key.replace(this.SESSION_PREFIX, ''));
  }

  async getBlockedPhones(): Promise<string[]> {
    const keys = await this.redis.keys(`${this.BLOCK_PREFIX}*`);
    return keys.map(key => key.replace(this.BLOCK_PREFIX, ''));
  }

  // Métodos para limpeza e manutenção
  async cleanExpiredSessions(): Promise<number> {
    const keys = await this.redis.keys(`${this.SESSION_PREFIX}*`);
    let cleaned = 0;

    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl === -1) { // Chave sem TTL
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const lastActivity = new Date(session.ultima_atividade);
          const now = new Date();
          const diffHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
          
          if (diffHours > 24) { // Sessões inativas por mais de 24h
            await this.redis.del(key);
            cleaned++;
          }
        }
      }
    }

    return cleaned;
  }

  async getRedisInfo(): Promise<any> {
    const info = await this.redis.info();
    const memory = await this.redis.info('memory');
    const stats = await this.redis.info('stats');
    
    return {
      info,
      memory,
      stats,
      connected_clients: await this.redis.info('clients'),
    };
  }

  // Método para fechar conexão
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }

  // Método para verificar saúde do Redis
  async healthCheck(): Promise<HealthCheck> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return {
        servico: 'redis',
        status: 'saudavel',
        latencia: latency,
        ultima_verificacao: new Date().toISOString(),
      };
    } catch (error) {
      return {
        servico: 'redis',
        status: 'indisponivel',
        latencia: -1,
        ultima_verificacao: new Date().toISOString(),
        detalhes: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // Método para backup de dados críticos
  async backupCriticalData(): Promise<any> {
    const sessions = await this.redis.keys(`${this.SESSION_PREFIX}*`);
    const blocks = await this.redis.keys(`${this.BLOCK_PREFIX}*`);
    const messages = await this.redis.keys(`${this.MESSAGE_CONCAT_PREFIX}*`);

    const backup: any = {
      timestamp: new Date().toISOString(),
      sessions: {},
      blocks: {},
      messages: {},
    };

    // Backup das sessões
    for (const key of sessions) {
      const data = await this.redis.get(key);
      if (data) {
        backup.sessions[key] = JSON.parse(data);
      }
    }

    // Backup dos bloqueios
    for (const key of blocks) {
      const data = await this.redis.get(key);
      if (data) {
        backup.blocks[key] = JSON.parse(data);
      }
    }

    // Backup das mensagens concatenadas
    for (const key of messages) {
      const data = await this.redis.get(key);
      if (data) {
        backup.messages[key] = data;
      }
    }

    return backup;
  }

  // Método para restaurar backup
  async restoreBackup(backupData: any): Promise<void> {
    // Restaurar sessões
    for (const [key, data] of Object.entries(backupData.sessions)) {
      await this.redis.set(key, JSON.stringify(data));
    }

    // Restaurar bloqueios
    for (const [key, data] of Object.entries(backupData.blocks)) {
      await this.redis.set(key, JSON.stringify(data));
    }

    // Restaurar mensagens
    for (const [key, data] of Object.entries(backupData.messages)) {
      await this.redis.set(key, data as string);
    }
  }
}

// Instância singleton do RedisService
export const redisService = new RedisService();