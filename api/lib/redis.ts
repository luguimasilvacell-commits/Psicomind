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

// Cliente Redis principal
export const redis = new Redis(redisConfig)

// Cliente Redis para Bull (filas)
export const redisForBull = new Redis(redisConfig)

// Configuração das filas
export const messageQueue = new Queue('message processing', {
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
})

export const webhookQueue = new Queue('webhook processing', {
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
})

export const automationQueue = new Queue('automation processing', {
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
})

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

// Eventos de monitoramento
messageQueue.on('completed', (job) => {
  console.log(`✅ Message job ${job.id} completed`)
})

messageQueue.on('failed', (job, err) => {
  console.error(`❌ Message job ${job.id} failed:`, err.message)
})

webhookQueue.on('completed', (job) => {
  console.log(`✅ Webhook job ${job.id} completed`)
})

webhookQueue.on('failed', (job, err) => {
  console.error(`❌ Webhook job ${job.id} failed:`, err.message)
})

automationQueue.on('completed', (job) => {
  console.log(`✅ Automation job ${job.id} completed`)
})

automationQueue.on('failed', (job, err) => {
  console.error(`❌ Automation job ${job.id} failed:`, err.message)
})

// Função para verificar conexão Redis
export const checkRedisConnection = async (): Promise<boolean> => {
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
  await messageQueue.empty()
  await webhookQueue.empty()
  await automationQueue.empty()
  console.log('🧹 All queues cleared')
}