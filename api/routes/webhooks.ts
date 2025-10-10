import { Router, Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { queueWebhook } from '../services/queueProcessors.js'
import { n8nService } from '../services/n8nService.js'
import { evolutionApiService } from '../services/evolutionApiService.js'
import { supabase } from '../lib/supabase.js'

const router = Router()

// Rate limiting para webhooks
const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requests por minuto
  message: { error: 'Too many webhook requests' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Middleware de validação de API key
const validateApiKey = (req: Request, res: Response, next: any) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '')
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' })
  }

  // Validação básica da API key (pode ser melhorada)
  const validApiKey = process.env.WEBHOOK_API_KEY || 'psicomind-webhook-key'
  if (apiKey !== validApiKey) {
    return res.status(401).json({ error: 'Invalid API key' })
  }

  next()
}

/**
 * Webhook para receber dados do n8n
 */
router.post('/n8n',
  webhookRateLimit,
  validateApiKey,
  [
    body('workflowId').notEmpty().withMessage('Workflow ID is required'),
    body('data').isObject().withMessage('Data must be an object'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { workflowId, executionId, data, psicologoId } = req.body

      console.log(`📥 Received n8n webhook: workflow ${workflowId}`)

      // Adiciona à fila de processamento
      await queueWebhook({
        source: 'n8n',
        eventType: 'workflow_result',
        payload: {
          workflowId,
          executionId,
          data,
          timestamp: new Date().toISOString(),
          psicologoId,
        },
        psicologoId,
      })

      res.status(200).json({
        success: true,
        message: 'Webhook received and queued for processing',
        workflowId,
        executionId,
      })

    } catch (error: any) {
      console.error('❌ N8n webhook error:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Webhook para receber dados da Evolution API
 */
router.post('/evolution',
  webhookRateLimit,
  [
    body('event').notEmpty().withMessage('Event type is required'),
    body('instance').notEmpty().withMessage('Instance is required'),
    body('data').isObject().withMessage('Data must be an object'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { event, instance, data } = req.body

      console.log(`📥 Received Evolution API webhook: ${event} from ${instance}`)

      // Adiciona à fila de processamento
      await queueWebhook({
        source: 'evolution_api',
        eventType: event,
        payload: { event, instance, data },
      })

      res.status(200).json({
        success: true,
        message: 'Webhook received and queued for processing',
        event,
        instance,
      })

    } catch (error: any) {
      console.error('❌ Evolution API webhook error:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Endpoint para testar conectividade do webhook
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'webhook-receiver',
  })
})

/**
 * Endpoint para testar conexões com n8n e Evolution API
 */
router.post('/test-connection',
  webhookRateLimit,
  [
    body('service').isIn(['n8n', 'evolution', 'both']).withMessage('Service must be n8n, evolution, or both'),
    body('config').isObject().withMessage('Config must be an object'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        })
      }

      const { service, config } = req.body
      const results: any = {}

      if (service === 'n8n' || service === 'both') {
        try {
          const startTime = Date.now()
          const n8nResult = await n8nService.testConnection(config.n8n)
          const responseTime = Date.now() - startTime
          
          results.n8n = {
            success: true,
            status: 'connected',
            responseTime: `${responseTime}ms`,
            message: 'n8n connection successful',
            details: n8nResult
          }
        } catch (error: any) {
          results.n8n = {
            success: false,
            status: 'error',
            message: error.message || 'Failed to connect to n8n',
            error: error.toString()
          }
        }
      }

      if (service === 'evolution' || service === 'both') {
        try {
          const startTime = Date.now()
          const evolutionResult = await evolutionApiService.testConnection(config.evolution)
          const responseTime = Date.now() - startTime
          
          results.evolution = {
            success: true,
            status: 'connected',
            responseTime: `${responseTime}ms`,
            message: 'Evolution API connection successful',
            details: evolutionResult
          }
        } catch (error: any) {
          results.evolution = {
            success: false,
            status: 'error',
            message: error.message || 'Failed to connect to Evolution API',
            error: error.toString()
          }
        }
      }

      // Determinar o status geral
      const allSuccessful = Object.values(results).every((result: any) => result.success)
      
      res.json({
        success: allSuccessful,
        timestamp: new Date().toISOString(),
        results
      })

    } catch (error: any) {
      console.error('Error testing connections:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error while testing connections',
        error: error.message
      })
    }
  }
)

/**
 * Endpoint para obter logs de webhooks
 */
router.get('/logs',
  validateApiKey,
  async (req: Request, res: Response) => {
    try {
      const { source, limit = 50, offset = 0 } = req.query

      let query = supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1)

      if (source) {
        query = query.eq('source', source)
      }

      const { data: logs, error } = await query

      if (error) {
        throw error
      }

      res.status(200).json({
        success: true,
        logs,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
        },
      })

    } catch (error: any) {
      console.error('❌ Error fetching webhook logs:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Endpoint para reprocessar webhook com falha
 */
router.post('/retry/:logId',
  validateApiKey,
  async (req: Request, res: Response) => {
    try {
      const { logId } = req.params

      // Busca log do webhook
      const { data: log, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('id', logId)
        .single()

      if (error || !log) {
        return res.status(404).json({ error: 'Webhook log not found' })
      }

      if (log.response_status === 200) {
        return res.status(400).json({ error: 'Webhook was already processed successfully' })
      }

      // Reprocessa o webhook
      await queueWebhook({
        source: log.source as 'n8n' | 'evolution_api',
        eventType: log.event_type,
        payload: log.payload,
        psicologoId: log.psicologo_id,
      })

      res.status(200).json({
        success: true,
        message: 'Webhook queued for reprocessing',
        logId,
      })

    } catch (error: any) {
      console.error('❌ Error retrying webhook:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Endpoint para estatísticas de webhooks
 */
router.get('/stats',
  validateApiKey,
  async (req: Request, res: Response) => {
    try {
      const { timeframe = '24h' } = req.query

      // Calcula data de início baseada no timeframe
      const now = new Date()
      let startDate: Date

      switch (timeframe) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000)
          break
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      }

      // Busca estatísticas
      const { data: stats, error } = await supabase
        .from('webhook_logs')
        .select('source, response_status, created_at')
        .gte('created_at', startDate.toISOString())

      if (error) {
        throw error
      }

      // Processa estatísticas
      const summary = {
        total: stats.length,
        successful: stats.filter(s => s.response_status === 200).length,
        failed: stats.filter(s => s.response_status !== 200).length,
        bySource: {
          n8n: stats.filter(s => s.source === 'n8n').length,
          evolution_api: stats.filter(s => s.source === 'evolution_api').length,
        },
        timeframe,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      }

      res.status(200).json({
        success: true,
        stats: summary,
      })

    } catch (error: any) {
      console.error('❌ Error fetching webhook stats:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Webhook para receber mensagens de teste
 */
router.post('/message',
  webhookRateLimit,
  [
    body('content').notEmpty().withMessage('Message content is required'),
    body('conversationId').optional().isString(),
    body('messageType').optional().isIn(['text', 'image', 'audio', 'video', 'document']),
    body('senderType').optional().isIn(['patient', 'psychologist']),
    body('patientName').optional().isString(),
    body('phoneNumber').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        })
      }

      const {
        content,
        conversationId,
        messageType = 'text',
        senderType = 'patient',
        patientName = 'Paciente Teste',
        phoneNumber = '+5511999999999',
        metadata = {}
      } = req.body

      console.log('📨 [Webhook] Recebendo mensagem de teste:', {
        content,
        conversationId,
        messageType,
        senderType,
        patientName,
        phoneNumber
      })

      // Buscar ou criar conversa
      let conversation
      if (conversationId) {
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .single()
        
        conversation = existingConv
      }

      if (!conversation) {
        // Buscar paciente pelo telefone ou criar um novo
        let { data: patient } = await supabase
          .from('pacientes')
          .select('*')
          .eq('telefone', phoneNumber)
          .single()

        if (!patient) {
          // Criar paciente de teste
          const { data: newPatient, error: patientError } = await supabase
            .from('pacientes')
            .insert({
              nome: patientName,
              telefone: phoneNumber,
              email: `teste${Date.now()}@example.com`,
              psicologo_id: '975cdada-b05b-4604-b4ab-e664aad693eb', // ID do psicólogo admin
              status: 'ativo'
            })
            .select()
            .single()

          if (patientError) {
            console.error('❌ Erro ao criar paciente:', patientError)
            throw new Error('Erro ao criar paciente de teste')
          }

          patient = newPatient
        }

        // Criar nova conversa
        const { data: newConversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            patient_id: patient.id,
            psychologist_id: '975cdada-b05b-4604-b4ab-e664aad693eb',
            whatsapp_chat_id: `test-${Date.now()}`,
            is_active: true,
            last_message_at: new Date().toISOString()
          })
          .select(`
            *,
            patient:pacientes(id, nome, telefone, email)
          `)
          .single()

        if (convError) {
          console.error('❌ Erro ao criar conversa:', convError)
          throw new Error('Erro ao criar conversa de teste')
        }

        conversation = newConversation
      }

      // Criar mensagem
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          content,
          message_type: messageType,
          sender_type: senderType,
          status: 'delivered',
          timestamp: new Date().toISOString()
        })
        .select()
        .single()

      if (messageError) {
        console.error('❌ Erro ao criar mensagem:', messageError)
        throw new Error('Erro ao criar mensagem de teste')
      }

      // Atualizar conversa com última mensagem
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          unread_count: senderType === 'patient' ? 1 : 0
        })
        .eq('id', conversation.id)

      // Log do webhook
      await supabase
        .from('webhook_logs')
        .insert({
          source: 'test_webhook',
          endpoint: '/webhooks/message',
          method: 'POST',
          payload: req.body,
          response_status: 200,
          response_body: { success: true, messageId: message.id },
          processing_time_ms: Date.now() - req.startTime,
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        })

      console.log('✅ [Webhook] Mensagem de teste criada:', {
        messageId: message.id,
        conversationId: conversation.id,
        content: message.content
      })

      // Emitir evento via WebSocket para atualização em tempo real
      const websocketService = req.app.get('websocketService')
      if (websocketService) {
        // Emitir nova mensagem para a conversa específica
        websocketService.emitNewMessage(conversation.id, {
          conversationId: conversation.id,
          message: {
            ...message,
            conversation: conversation
          }
        })

        // Emitir atualização da conversa
        websocketService.emitConversationUpdate(conversation.id, {
          last_message: {
            content: message.content,
            message_type: message.message_type,
            sender_type: message.sender_type,
            timestamp: message.timestamp
          }
        })

        // Broadcast geral para atualização da lista de conversas
        websocketService.broadcast('conversations_updated', {
          conversationId: conversation.id,
          lastMessage: {
            content: message.content,
            message_type: message.message_type,
            sender_type: message.sender_type,
            timestamp: message.timestamp
          }
        })
      }

      res.status(200).json({
        success: true,
        message: 'Mensagem de teste recebida com sucesso',
        data: {
          messageId: message.id,
          conversationId: conversation.id,
          content: message.content,
          timestamp: message.timestamp
        }
      })

    } catch (error: any) {
      console.error('❌ [Webhook] Erro ao processar mensagem de teste:', error)
      
      // Log do erro
      await supabase
        .from('webhook_logs')
        .insert({
          source: 'test_webhook',
          endpoint: '/webhooks/message',
          method: 'POST',
          payload: req.body,
          response_status: 500,
          error_message: error.message,
          processing_time_ms: Date.now() - req.startTime,
          ip_address: req.ip,
          user_agent: req.get('User-Agent')
        })

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      })
    }
  }
)

export default router