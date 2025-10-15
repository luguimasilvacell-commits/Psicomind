import { Job } from 'bull'
import { messageQueue, webhookQueue, automationQueue, MessageJob, WebhookJob, AutomationJob } from '../lib/redis.js'
import { supabase } from '../lib/supabase.js'
import { n8nService } from './n8nService.js'
import { evolutionApiService } from './evolutionApiService.js'
import { websocketService } from './websocketService.js'

/**
 * Processador de mensagens
 */
if (messageQueue) {
  messageQueue.process('send-message', async (job: Job<MessageJob>) => {
  const { conversationId, messageId, content, direction, phoneNumber, psicologoId } = job.data

  try {
    console.log(`📤 Processing message job: ${job.id}`)

    if (direction === 'outbound') {
      // Envia mensagem via Evolution API
      const success = await evolutionApiService.sendTextMessage(phoneNumber, content, psicologoId)
      
      if (success) {
        // Atualiza status da mensagem
        await supabase
          .from('messages')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', messageId)

        // Notificar via WebSocket
        websocketService.emitMessageStatusUpdate(
          conversationId,
          messageId,
          'sent'
        )

        // Registra métrica
        await supabase
          .from('automation_metrics')
          .insert({
            psicologo_id: psicologoId,
            metric_type: 'message_sent',
            metric_value: 1,
            metadata: { conversationId, messageId, phoneNumber },
            date: new Date().toISOString().split('T')[0],
          })

        console.log(`✅ Message sent successfully: ${messageId}`)
      } else {
        throw new Error('Failed to send message via Evolution API')
      }
    }

    return { success: true, messageId }
  } catch (error: any) {
    console.error(`❌ Message job ${job.id} failed:`, error.message)
    
    // Atualiza status da mensagem para erro
    await supabase
      .from('messages')
      .update({ status: 'failed' })
      .eq('id', messageId)

    throw error
  }
  })
}

/**
 * Processador de webhooks
 */
if (webhookQueue) {
  webhookQueue.process('process-webhook', async (job: Job<WebhookJob>) => {
  const { source, eventType, payload, psicologoId } = job.data

  try {
    console.log(`🔗 Processing webhook job: ${job.id} from ${source}`)

    switch (source) {
      case 'n8n':
        await n8nService.processIncomingWebhook(payload)
        break
      case 'evolution_api':
        await evolutionApiService.processIncomingWebhook(payload)
        break
      default:
        throw new Error(`Unknown webhook source: ${source}`)
    }

    // Log de sucesso
    await supabase
      .from('webhook_logs')
      .insert({
        psicologo_id: psicologoId,
        source,
        event_type: eventType,
        payload,
        response_status: 200,
        processed_at: new Date().toISOString(),
      })

    console.log(`✅ Webhook processed successfully: ${job.id}`)
    return { success: true, source, eventType }
  } catch (error: any) {
    console.error(`❌ Webhook job ${job.id} failed:`, error.message)
    
    // Log de erro
    await supabase
      .from('webhook_logs')
      .insert({
        psicologo_id: psicologoId,
        source,
        event_type: eventType,
        payload,
        response_status: 500,
        error_message: error.message,
        processed_at: new Date().toISOString(),
      })

    throw error
  }
  })
}

/**
 * Processador de automações
 */
if (automationQueue) {
  automationQueue.process('process-automation', async (job: Job<AutomationJob>) => {
  const { automationId, conversationId, messageId, triggerData, psicologoId } = job.data

  try {
    console.log(`🤖 Processing automation job: ${job.id}`)

    // Busca dados da automação
    const { data: automation, error: automationError } = await supabase
      .from('automations')
      .select('*')
      .eq('id', automationId)
      .single()

    if (automationError || !automation) {
      throw new Error(`Automation not found: ${automationId}`)
    }

    // Busca dados da conversa
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*, paciente:pacientes(*)')
      .eq('id', conversationId)
      .single()

    if (conversationError || !conversation) {
      throw new Error(`Conversation not found: ${conversationId}`)
    }

    // Atualiza status para processando
    await supabase
      .from('automation_messages')
      .update({ execution_status: 'processing' })
      .eq('automation_id', automationId)
      .eq('message_id', messageId)

    // Processa baseado no tipo de trigger
    let result: any = { success: false }

    switch (automation.trigger_type) {
      case 'keyword':
        result = await processKeywordAutomation(automation, conversation, triggerData)
        break
      case 'webhook':
        result = await processWebhookAutomation(automation, conversation, triggerData)
        break
      case 'schedule':
        result = await processScheduleAutomation(automation, conversation, triggerData)
        break
      default:
        throw new Error(`Unknown trigger type: ${automation.trigger_type}`)
    }

    // Atualiza status final
    await supabase
      .from('automation_messages')
      .update({
        execution_status: result.success ? 'completed' : 'failed',
        error_message: result.error || null,
      })
      .eq('automation_id', automationId)
      .eq('message_id', messageId)

    // Registra métrica
    await supabase
      .from('automation_metrics')
      .insert({
        psicologo_id: psicologoId,
        automation_id: automationId,
        metric_type: result.success ? 'automation_triggered' : 'error_occurred',
        metric_value: 1,
        metadata: { conversationId, messageId, triggerData, result },
        date: new Date().toISOString().split('T')[0],
      })

    console.log(`✅ Automation processed successfully: ${job.id}`)
    return result
  } catch (error: any) {
    console.error(`❌ Automation job ${job.id} failed:`, error.message)
    
    // Atualiza status para erro
    await supabase
      .from('automation_messages')
      .update({
        execution_status: 'failed',
        error_message: error.message,
      })
      .eq('automation_id', automationId)
      .eq('message_id', messageId)

    throw error
  }
  })
}

/**
 * Processa automação por palavra-chave
 */
async function processKeywordAutomation(automation: any, conversation: any, triggerData: any): Promise<any> {
  try {
    const config = automation.trigger_config
    const responseMessage = config.response_message || 'Obrigado pela sua mensagem!'

    // Envia resposta automática
    const success = await evolutionApiService.sendTextMessage(
      conversation.phone_number,
      responseMessage,
      automation.psicologo_id
    )

    if (success) {
      // Cria registro da mensagem enviada
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          content: responseMessage,
          message_type: 'text',
          direction: 'outbound',
          status: 'sent',
          metadata: {
            source: 'automation',
            automationId: automation.id,
            trigger: 'keyword',
            keyword: triggerData.keyword,
          },
        })
    }

    // Se tem workflow n8n, dispara
    if (automation.n8n_workflow_id) {
      await n8nService.executeWorkflow(automation.n8n_workflow_id, {
        conversation,
        triggerData,
        automation,
      }, automation.psicologo_id)
    }

    return { success, responseMessage }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Processa automação por webhook
 */
async function processWebhookAutomation(automation: any, conversation: any, triggerData: any): Promise<any> {
  try {
    const config = automation.trigger_config
    const webhookUrl = config.webhook_url

    if (!webhookUrl) {
      throw new Error('Webhook URL not configured')
    }

    // Envia dados para webhook
    const success = await n8nService.triggerWebhook(webhookUrl, {
      conversationId: conversation.id,
      messageId: triggerData.messageId,
      content: triggerData.content,
      phoneNumber: conversation.phone_number,
      triggerType: 'webhook',
      metadata: {
        automation,
        conversation,
        triggerData,
      },
    })

    return { success, webhookUrl }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Processa automação agendada
 */
async function processScheduleAutomation(automation: any, conversation: any, triggerData: any): Promise<any> {
  try {
    const config = automation.trigger_config
    const message = config.scheduled_message || 'Mensagem agendada'

    // Envia mensagem agendada
    const success = await evolutionApiService.sendTextMessage(
      conversation.phone_number,
      message,
      automation.psicologo_id
    )

    if (success) {
      // Cria registro da mensagem enviada
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          content: message,
          message_type: 'text',
          direction: 'outbound',
          status: 'sent',
          metadata: {
            source: 'automation',
            automationId: automation.id,
            trigger: 'schedule',
            scheduledAt: triggerData.scheduledAt,
          },
        })
    }

    return { success, message }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Função para adicionar job de mensagem à fila
 */
export async function queueMessage(data: MessageJob): Promise<void> {
  if (messageQueue) {
    await messageQueue.add('send-message', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      delay: 1000,
    })
  }
}

/**
 * Função para adicionar job de webhook à fila
 */
export async function queueWebhook(data: WebhookJob): Promise<void> {
  if (webhookQueue) {
    await webhookQueue.add('process-webhook', data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      delay: 500,
    })
  }
}

/**
 * Função para adicionar job de automação à fila
 */
export async function queueAutomation(data: AutomationJob): Promise<void> {
  if (automationQueue) {
    await automationQueue.add('process-automation', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      delay: 2000,
    })
  }
}

console.log('🔄 Queue processors initialized')