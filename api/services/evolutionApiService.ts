import axios, { AxiosResponse } from 'axios'
import { supabase } from '../lib/supabase.js'

export interface EvolutionMessage {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  message: {
    conversation?: string
    imageMessage?: {
      url: string
      mimetype: string
      caption?: string
    }
    audioMessage?: {
      url: string
      mimetype: string
    }
    documentMessage?: {
      url: string
      mimetype: string
      title: string
    }
  }
  messageTimestamp: number
  pushName?: string
  participant?: string
}

export interface EvolutionWebhookPayload {
  event: string
  instance: string
  data: EvolutionMessage | any
}

class EvolutionApiService {
  private baseUrl: string
  private apiKey: string
  private instanceName: string

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
    this.apiKey = process.env.EVOLUTION_API_KEY || ''
    this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'psicomind'
  }

  /**
   * Envia mensagem de texto via Evolution API
   */
  async sendTextMessage(phoneNumber: string, message: string, psicologoId: string): Promise<boolean> {
    try {
      const payload = {
        number: phoneNumber,
        text: message,
      }

      const response: AxiosResponse = await axios.post(
        `${this.baseUrl}/message/sendText/${this.instanceName}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey,
          },
          timeout: 10000,
        }
      )

      // Log da mensagem enviada
      await this.logMessageSent(phoneNumber, message, 'text', psicologoId, response.data)

      return response.status >= 200 && response.status < 300
    } catch (error: any) {
      console.error('❌ Evolution API send message failed:', error.message)
      await this.logMessageError(phoneNumber, message, 'text', psicologoId, error.message)
      return false
    }
  }

  /**
   * Envia mensagem com mídia via Evolution API
   */
  async sendMediaMessage(
    phoneNumber: string,
    mediaUrl: string,
    caption: string,
    mediaType: 'image' | 'audio' | 'document',
    psicologoId: string
  ): Promise<boolean> {
    try {
      const payload = {
        number: phoneNumber,
        media: mediaUrl,
        caption: caption,
      }

      const endpoint = this.getMediaEndpoint(mediaType)
      const response: AxiosResponse = await axios.post(
        `${this.baseUrl}/message/${endpoint}/${this.instanceName}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey,
          },
          timeout: 15000,
        }
      )

      // Log da mensagem enviada
      await this.logMessageSent(phoneNumber, caption, mediaType, psicologoId, response.data)

      return response.status >= 200 && response.status < 300
    } catch (error: any) {
      console.error(`❌ Evolution API send ${mediaType} failed:`, error.message)
      await this.logMessageError(phoneNumber, caption, mediaType, psicologoId, error.message)
      return false
    }
  }

  /**
   * Testa a conexão com a Evolution API
   */
  async testConnection(config?: any): Promise<any> {
    try {
      const testBaseUrl = config?.baseUrl || this.baseUrl
      const testApiKey = config?.apiKey || this.apiKey
      const testInstanceName = config?.instanceName || this.instanceName

      // Teste básico de conectividade - verificar instância
      const instanceResponse = await axios.get(
        `${testBaseUrl}/instance/fetchInstances`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': testApiKey,
          },
          timeout: 5000,
        }
      )

      // Verificar se a instância específica existe
      const instances = instanceResponse.data
      const instanceExists = instances.some((instance: any) => 
        instance.instance?.instanceName === testInstanceName
      )

      // Teste de status da instância se ela existir
      let instanceStatus = null
      if (instanceExists) {
        try {
          const statusResponse = await axios.get(
            `${testBaseUrl}/instance/connectionState/${testInstanceName}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'apikey': testApiKey,
              },
              timeout: 5000,
            }
          )
          instanceStatus = statusResponse.data
        } catch (statusError: any) {
          instanceStatus = {
            error: statusError.message
          }
        }
      }

      return {
        connectivity: {
          status: instanceResponse.status,
          baseUrl: testBaseUrl
        },
        authentication: {
          success: instanceResponse.status === 200,
          hasApiKey: !!testApiKey
        },
        instance: {
          name: testInstanceName,
          exists: instanceExists,
          status: instanceStatus,
          totalInstances: instances.length
        }
      }
    } catch (error: any) {
      throw new Error(`Evolution API connection failed: ${error.message}`)
    }
  }

  /**
   * Processa webhook recebido da Evolution API
   */
  async processIncomingWebhook(payload: EvolutionWebhookPayload): Promise<void> {
    try {
      // Log do webhook recebido
      await this.logWebhookReceived(payload)

      switch (payload.event) {
        case 'messages.upsert':
          await this.processMessageReceived(payload.data)
          break
        case 'messages.update':
          await this.processMessageUpdate(payload.data)
          break
        case 'connection.update':
          await this.processConnectionUpdate(payload.data)
          break
        default:
          console.log(`📝 Unhandled Evolution API event: ${payload.event}`)
      }

    } catch (error: any) {
      console.error('❌ Error processing Evolution API webhook:', error.message)
      await this.logWebhookError(payload, error.message)
    }
  }

  /**
   * Processa mensagem recebida
   */
  private async processMessageReceived(messageData: EvolutionMessage): Promise<void> {
    try {
      // Ignora mensagens enviadas por nós
      if (messageData.key.fromMe) {
        return
      }

      const phoneNumber = this.extractPhoneNumber(messageData.key.remoteJid)
      const content = this.extractMessageContent(messageData.message)
      const messageType = this.getMessageType(messageData.message)

      // Busca psicólogo baseado no número (pode ser configurado)
      const psicologo = await this.findPsicologoByPhone(phoneNumber)
      if (!psicologo) {
        console.log(`📱 No psychologist found for phone: ${phoneNumber}`)
        return
      }

      // Busca ou cria conversa
      const conversation = await this.findOrCreateConversation(phoneNumber, psicologo.id)

      // Cria mensagem no banco
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          content: content,
          message_type: messageType,
          direction: 'inbound',
          status: 'delivered',
          external_id: messageData.key.id,
          metadata: {
            source: 'evolution_api',
            pushName: messageData.pushName,
            participant: messageData.participant,
            timestamp: messageData.messageTimestamp,
          },
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create message: ${error.message}`)
      }

      // Atualiza última mensagem da conversa
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversation.id)

      // Verifica automações
      await this.checkAutomations(conversation.id, message.id, content, psicologo.id)

      // Registra métrica
      await this.recordMetric(psicologo.id, 'message_received', 1, {
        conversationId: conversation.id,
        messageId: message.id,
        messageType,
      })

    } catch (error: any) {
      console.error('❌ Error processing received message:', error.message)
      throw error
    }
  }

  /**
   * Processa atualização de mensagem (status de entrega)
   */
  private async processMessageUpdate(updateData: any): Promise<void> {
    try {
      const messageId = updateData.key?.id
      if (!messageId) return

      const status = this.mapEvolutionStatus(updateData.update?.status)
      if (!status) return

      // Atualiza status da mensagem
      await supabase
        .from('messages')
        .update({ status })
        .eq('external_id', messageId)

    } catch (error: any) {
      console.error('❌ Error processing message update:', error.message)
    }
  }

  /**
   * Processa atualização de conexão
   */
  private async processConnectionUpdate(connectionData: any): Promise<void> {
    try {
      console.log(`🔗 Evolution API connection update:`, connectionData.state)
      
      // Log do status de conexão
      await supabase
        .from('webhook_logs')
        .insert({
          source: 'evolution_api',
          event_type: 'connection_update',
          payload: connectionData,
          processed_at: new Date().toISOString(),
        })

    } catch (error: any) {
      console.error('❌ Error processing connection update:', error.message)
    }
  }

  /**
   * Verifica automações para a mensagem recebida
   */
  private async checkAutomations(conversationId: string, messageId: string, content: string, psicologoId: string): Promise<void> {
    try {
      // Busca automações ativas por palavra-chave
      const { data: automations } = await supabase
        .from('automations')
        .select('*')
        .eq('psicologo_id', psicologoId)
        .eq('is_active', true)
        .eq('trigger_type', 'keyword')

      if (!automations || automations.length === 0) return

      for (const automation of automations) {
        const keywords = automation.trigger_config?.keywords || []
        const hasKeyword = keywords.some((keyword: string) => 
          content.toLowerCase().includes(keyword.toLowerCase())
        )

        if (hasKeyword) {
          // Cria registro de automação
          await supabase
            .from('automation_messages')
            .insert({
              automation_id: automation.id,
              conversation_id: conversationId,
              message_id: messageId,
              trigger_data: { keyword: keywords.find((k: string) => content.toLowerCase().includes(k.toLowerCase())) },
              execution_status: 'pending',
            })

          // Adiciona à fila de automação
          const { automationQueue } = await import('../lib/redis.js')
          await automationQueue.add('process-automation', {
            automationId: automation.id,
            conversationId,
            messageId,
            triggerData: { content, keyword: keywords.find((k: string) => content.toLowerCase().includes(k.toLowerCase())) },
            psicologoId,
          })
        }
      }

    } catch (error: any) {
      console.error('❌ Error checking automations:', error.message)
    }
  }

  /**
   * Utilitários
   */
  private extractPhoneNumber(remoteJid: string): string {
    return remoteJid.split('@')[0]
  }

  private extractMessageContent(message: any): string {
    if (message.conversation) return message.conversation
    if (message.imageMessage?.caption) return message.imageMessage.caption
    if (message.audioMessage) return '[Áudio]'
    if (message.documentMessage?.title) return `[Documento: ${message.documentMessage.title}]`
    return '[Mensagem não suportada]'
  }

  private getMessageType(message: any): string {
    if (message.conversation) return 'text'
    if (message.imageMessage) return 'image'
    if (message.audioMessage) return 'audio'
    if (message.documentMessage) return 'document'
    return 'text'
  }

  private getMediaEndpoint(mediaType: string): string {
    switch (mediaType) {
      case 'image': return 'sendMedia'
      case 'audio': return 'sendWhatsAppAudio'
      case 'document': return 'sendMedia'
      default: return 'sendMedia'
    }
  }

  private mapEvolutionStatus(status: number): string | null {
    switch (status) {
      case 1: return 'sent'
      case 2: return 'delivered'
      case 3: return 'read'
      default: return null
    }
  }

  private async findPsicologoByPhone(phoneNumber: string): Promise<any> {
    // Por enquanto, retorna o primeiro psicólogo ativo
    // TODO: Implementar mapeamento de números para psicólogos
    const { data } = await supabase
      .from('psicologos')
      .select('*')
      .eq('role', 'psicologo')
      .limit(1)
      .single()

    return data
  }

  private async findOrCreateConversation(phoneNumber: string, psicologoId: string) {
    // Busca conversa existente
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('psicologo_id', psicologoId)
      .single()

    if (existing) {
      return existing
    }

    // Cria nova conversa
    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert({
        psicologo_id: psicologoId,
        phone_number: phoneNumber,
        status: 'active',
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`)
    }

    return newConversation
  }

  private async recordMetric(psicologoId: string, metricType: string, value: number, metadata: any): Promise<void> {
    try {
      await supabase
        .from('automation_metrics')
        .insert({
          psicologo_id: psicologoId,
          metric_type: metricType,
          metric_value: value,
          metadata,
          date: new Date().toISOString().split('T')[0],
        })
    } catch (error: any) {
      console.error('❌ Failed to record metric:', error.message)
    }
  }

  private async logMessageSent(phoneNumber: string, content: string, type: string, psicologoId: string, response: any): Promise<void> {
    try {
      await supabase
        .from('webhook_logs')
        .insert({
          psicologo_id: psicologoId,
          source: 'evolution_api',
          event_type: 'message_sent',
          payload: { phoneNumber, content, type },
          response_status: 200,
          response_body: response,
          processed_at: new Date().toISOString(),
        })
    } catch (error: any) {
      console.error('❌ Failed to log message sent:', error.message)
    }
  }

  private async logMessageError(phoneNumber: string, content: string, type: string, psicologoId: string, error: string): Promise<void> {
    try {
      await supabase
        .from('webhook_logs')
        .insert({
          psicologo_id: psicologoId,
          source: 'evolution_api',
          event_type: 'message_error',
          payload: { phoneNumber, content, type },
          response_status: 500,
          error_message: error,
          processed_at: new Date().toISOString(),
        })
    } catch (error: any) {
      console.error('❌ Failed to log message error:', error.message)
    }
  }

  private async logWebhookReceived(payload: EvolutionWebhookPayload): Promise<void> {
    try {
      await supabase
        .from('webhook_logs')
        .insert({
          source: 'evolution_api',
          event_type: payload.event,
          payload: payload.data,
          response_status: 200,
          processed_at: new Date().toISOString(),
        })
    } catch (error: any) {
      console.error('❌ Failed to log webhook received:', error.message)
    }
  }

  private async logWebhookError(payload: EvolutionWebhookPayload, error: string): Promise<void> {
    try {
      await supabase
        .from('webhook_logs')
        .insert({
          source: 'evolution_api',
          event_type: payload.event,
          payload: payload.data,
          response_status: 500,
          error_message: error,
          processed_at: new Date().toISOString(),
        })
    } catch (error: any) {
      console.error('❌ Failed to log webhook error:', error.message)
    }
  }
}

export const evolutionApiService = new EvolutionApiService()