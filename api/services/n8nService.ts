import axios, { AxiosResponse } from 'axios'
import { supabase } from '../lib/supabase.js'

export interface N8nWebhookPayload {
  workflowId: string
  executionId: string
  data: any
  timestamp: string
  psicologoId?: string
}

export interface N8nTriggerData {
  conversationId: string
  messageId: string
  content: string
  phoneNumber: string
  triggerType: string
  metadata?: any
}

class N8nService {
  private baseUrl: string
  private apiKey: string

  constructor() {
    this.baseUrl = process.env.N8N_BASE_URL || 'http://localhost:5678'
    this.apiKey = process.env.N8N_API_KEY || ''
  }

  /**
   * Envia dados para um webhook do n8n
   */
  async triggerWebhook(webhookUrl: string, data: N8nTriggerData): Promise<boolean> {
    try {
      const response: AxiosResponse = await axios.post(webhookUrl, data, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 10000,
      })

      // Log do webhook
      await this.logWebhookCall('outbound', webhookUrl, data, response.status, response.data)

      return response.status >= 200 && response.status < 300
    } catch (error: any) {
      console.error('❌ N8n webhook trigger failed:', error.message)
      
      // Log do erro
      await this.logWebhookCall('outbound', webhookUrl, data, error.response?.status || 0, null, error.message)
      
      return false
    }
  }

  /**
   * Executa um workflow específico do n8n
   */
  async executeWorkflow(workflowId: string, data: any, psicologoId: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/workflows/${workflowId}/execute`,
        { data },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      )

      // Log da execução
      await this.logWorkflowExecution(workflowId, data, psicologoId, 'success', response.data)

      return true
    } catch (error: any) {
      console.error(`❌ N8n workflow ${workflowId} execution failed:`, error.message)
      
      // Log do erro
      await this.logWorkflowExecution(workflowId, data, psicologoId, 'error', null, error.message)
      
      return false
    }
  }

  /**
   * Obtém lista de workflows ativos
   */
  async getActiveWorkflows(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/workflows`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        params: {
          active: true,
        },
      })

      return response.data.data || []
    } catch (error: any) {
      console.error('❌ Failed to get n8n workflows:', error.message)
      return []
    }
  }

  /**
   * Testa a conexão com o n8n
   */
  async testConnection(config?: any): Promise<any> {
    try {
      const testBaseUrl = config?.baseUrl || this.baseUrl
      const testApiKey = config?.apiKey || this.apiKey

      // Teste básico de conectividade
      const response = await axios.get(`${testBaseUrl}/healthz`, {
        headers: testApiKey ? {
          'Authorization': `Bearer ${testApiKey}`,
        } : {},
        timeout: 5000,
      })

      // Teste de autenticação se API key fornecida
      let authTest = null
      if (testApiKey) {
        try {
          const authResponse = await axios.get(`${testBaseUrl}/api/v1/workflows`, {
            headers: {
              'Authorization': `Bearer ${testApiKey}`,
            },
            timeout: 5000,
          })
          authTest = {
            success: true,
            workflowCount: authResponse.data?.length || 0
          }
        } catch (authError: any) {
          authTest = {
            success: false,
            error: authError.message
          }
        }
      }

      return {
        health: {
          status: response.status,
          data: response.data
        },
        authentication: authTest,
        baseUrl: testBaseUrl,
        hasApiKey: !!testApiKey
      }
    } catch (error: any) {
      throw new Error(`N8n connection failed: ${error.message}`)
    }
  }

  /**
   * Processa webhook recebido do n8n
   */
  async processIncomingWebhook(payload: N8nWebhookPayload): Promise<void> {
    try {
      // Log do webhook recebido
      await this.logWebhookCall('inbound', 'n8n-webhook', payload, 200, null)

      // Processa baseado no tipo de evento
      if (payload.data?.messageData) {
        await this.processMessageFromN8n(payload.data.messageData, payload.psicologoId)
      }

      if (payload.data?.automationResult) {
        await this.processAutomationResult(payload.data.automationResult, payload.psicologoId)
      }

    } catch (error: any) {
      console.error('❌ Error processing n8n webhook:', error.message)
      await this.logWebhookCall('inbound', 'n8n-webhook', payload, 500, null, error.message)
    }
  }

  /**
   * Processa mensagem vinda do n8n
   */
  private async processMessageFromN8n(messageData: any, psicologoId?: string): Promise<void> {
    try {
      // Busca ou cria conversa
      const conversation = await this.findOrCreateConversation(
        messageData.phoneNumber,
        psicologoId || messageData.psicologoId
      )

      // Cria mensagem
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          content: messageData.content,
          message_type: messageData.type || 'text',
          direction: 'outbound',
          status: 'sent',
          metadata: {
            source: 'n8n',
            workflowId: messageData.workflowId,
            ...messageData.metadata,
          },
        })

    } catch (error: any) {
      console.error('❌ Error processing message from n8n:', error.message)
      throw error
    }
  }

  /**
   * Processa resultado de automação
   */
  private async processAutomationResult(result: any, psicologoId?: string): Promise<void> {
    try {
      // Atualiza status da automação
      if (result.automationMessageId) {
        await supabase
          .from('automation_messages')
          .update({
            execution_status: result.success ? 'completed' : 'failed',
            error_message: result.error || null,
          })
          .eq('id', result.automationMessageId)
      }

      // Registra métrica
      await supabase
        .from('automation_metrics')
        .insert({
          psicologo_id: psicologoId || result.psicologoId,
          automation_id: result.automationId,
          metric_type: result.success ? 'automation_triggered' : 'error_occurred',
          metric_value: 1,
          metadata: result,
          date: new Date().toISOString().split('T')[0],
        })

    } catch (error: any) {
      console.error('❌ Error processing automation result:', error.message)
      throw error
    }
  }

  /**
   * Busca ou cria conversa
   */
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

  /**
   * Log de chamadas de webhook
   */
  private async logWebhookCall(
    direction: 'inbound' | 'outbound',
    url: string,
    payload: any,
    status: number,
    response: any,
    error?: string
  ): Promise<void> {
    try {
      await supabase
        .from('webhook_logs')
        .insert({
          source: 'n8n',
          event_type: `webhook_${direction}`,
          payload: {
            url,
            data: payload,
            direction,
          },
          response_status: status,
          response_body: response,
          error_message: error,
          processed_at: new Date().toISOString(),
        })
    } catch (logError: any) {
      console.error('❌ Failed to log webhook call:', logError.message)
    }
  }

  /**
   * Log de execução de workflow
   */
  private async logWorkflowExecution(
    workflowId: string,
    data: any,
    psicologoId: string,
    status: 'success' | 'error',
    response: any,
    error?: string
  ): Promise<void> {
    try {
      await supabase
        .from('webhook_logs')
        .insert({
          psicologo_id: psicologoId,
          source: 'n8n',
          event_type: 'workflow_execution',
          payload: {
            workflowId,
            data,
            status,
          },
          response_status: status === 'success' ? 200 : 500,
          response_body: response,
          error_message: error,
          processed_at: new Date().toISOString(),
        })
    } catch (logError: any) {
      console.error('❌ Failed to log workflow execution:', logError.message)
    }
  }
}

export const n8nService = new N8nService()