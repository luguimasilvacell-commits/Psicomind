import Redis from 'ioredis'
import Queue from 'bull'

// Configuração do Redis
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
}

// Verificar se Redis está habilitado
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false'

// Cliente Redis principal (opcional)
export const redis = REDIS_ENABLED ? new Redis(redisConfig) : null

// Cliente Redis para Bull (filas) (opcional)
export const redisForBull = REDIS_ENABLED ? new Redis(redisConfig) : null

// Configuração das filas (opcionais)
export const messageQueue = REDIS_ENABLED ? new Queue('message processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
}) : null

export const webhookQueue = REDIS_ENABLED ? new Queue('webhook processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
}) : null

export const automationQueue = REDIS_ENABLED ? new Queue('automation processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
}) : null

// Tipos para jobs
export interface MessageJob {
  conversationId: string
  messageId: string
  content: string
  direction: 'inbound' | 'outbound'
  phoneNumber: string
  psicologoId: string
}

export interface WebhookJob {
  source: 'n8n' | 'evolution_api'
  eventType: string
  payload: any
  psicologoId?: string
}

export interface AutomationJob {
  automationId: string
  conversationId: string
  messageId: string
  triggerData: any
  psicologoId: string
}

// Event listeners para as filas (apenas se Redis estiver habilitado)
if (REDIS_ENABLED && messageQueue) {
  messageQueue.on('completed', (job) => {
    console.log(`✅ Message job ${job.id} completed`)
  })

  messageQueue.on('failed', (job, err) => {
    console.error(`❌ Message job ${job.id} failed:`, err)
  })
}

if (REDIS_ENABLED && webhookQueue) {
  webhookQueue.on('completed', (job) => {
    console.log(`✅ Webhook job ${job.id} completed`)
  })

  webhookQueue.on('failed', (job, err) => {
    console.error(`❌ Webhook job ${job.id} failed:`, err)
  })
}

if (REDIS_ENABLED && automationQueue) {
  automationQueue.on('completed', (job) => {
    console.log(`✅ Automation job ${job.id} completed`)
  })

  automationQueue.on('failed', (job, err) => {
    console.error(`❌ Automation job ${job.id} failed:`, err)
  })
}

// Função para verificar conexão Redis
export const checkRedisConnection = async (): Promise<boolean> => {
  if (!REDIS_ENABLED || !redis) {
    console.log('⚠️ Redis is disabled - running without Redis support')
    return false
  }
  
  try {
    await redis.ping()
    console.log('✅ Redis connected successfully')
    return true
  } catch (error) {
    console.error('❌ Redis connection failed:', error)
    return false
  }
}

// Função para limpar filas (útil para desenvolvimento)
export const clearQueues = async () => {
  if (!REDIS_ENABLED) {
    console.log('⚠️ Redis is disabled - no queues to clear')
    return
  }
  
  if (messageQueue) await messageQueue.empty()
  if (webhookQueue) await webhookQueue.empty()
  if (automationQueue) await automationQueue.empty()
  console.log('🧹 All queues cleared')
}