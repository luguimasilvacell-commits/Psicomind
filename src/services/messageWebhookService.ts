/**
 * Serviço para integração de mensagens com webhook da API Trae AI
 */
import { Message, Conversation } from '../types/chat';
import { N8nClient } from './n8nClient';

export interface WebhookStatus {
  status: 'pending' | 'success' | 'error';
  timestamp: string;
  error?: string;
  response?: any;
}

export interface MessageWebhookPayload {
  messageId: string;
  conversationId: string;
  content: string;
  messageType: string;
  senderType: string;
  timestamp: string;
  patient: {
    id: string;
    name: string;
    phone: string;
  };
  psychologist: {
    id: string;
  };
  metadata?: any;
}

export class MessageWebhookService {
  private webhookUrl: string;
  private n8nClient: N8nClient;
  private statusCallbacks: Map<string, (status: WebhookStatus) => void> = new Map();

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
    this.n8nClient = new N8nClient({ 
      baseUrl: '', // Não precisamos da API do n8n, apenas webhook
      webhookUrl 
    });
  }

  /**
   * Envia mensagem para o webhook da API Trae AI
   */
  async sendMessageToWebhook(
    message: Message, 
    conversation: Conversation
  ): Promise<WebhookStatus> {
    const messageId = message.id;
    const timestamp = new Date().toISOString();

    // Notifica status pendente
    this.notifyStatus(messageId, {
      status: 'pending',
      timestamp
    });

    try {
      const payload: MessageWebhookPayload = {
        messageId: message.id,
        conversationId: message.conversation_id,
        content: message.content,
        messageType: message.message_type,
        senderType: message.sender_type,
        timestamp: message.timestamp,
        patient: {
          id: conversation.patient_id,
          name: conversation.patient?.nome || 'Paciente',
          phone: conversation.patient?.telefone || ''
        },
        psychologist: {
          id: conversation.psychologist_id
        },
        metadata: {
          whatsappMessageId: message.whatsapp_message_id,
          mediaUrl: message.media_url,
          mediaType: message.media_type,
          status: message.status
        }
      };

      console.log('[MessageWebhook] Enviando para API Trae AI:', payload);

      let response;
      let webhookUrl = this.webhookUrl;

      try {
        // Tenta primeiro a API Trae AI
        response = await this.n8nClient.sendWebhook(webhookUrl, payload);
      } catch (traeError) {
        console.warn('[MessageWebhook] API Trae AI não disponível, usando endpoint local de fallback');
        
        // Fallback para endpoint local de teste
        const fallbackUrl = '/api/webhooks/message';
        webhookUrl = fallbackUrl;
        response = await this.n8nClient.sendWebhook(fallbackUrl, payload);
      }

      const successStatus: WebhookStatus = {
        status: 'success',
        timestamp: new Date().toISOString(),
        response: {
          ...response,
          webhookUrl: webhookUrl
        }
      };

      // Notifica sucesso
      this.notifyStatus(messageId, successStatus);

      return successStatus;

    } catch (error) {
      console.error('[MessageWebhook] Erro ao enviar para webhook:', error);

      const errorStatus: WebhookStatus = {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };

      // Notifica erro
      this.notifyStatus(messageId, errorStatus);

      return errorStatus;
    }
  }

  /**
   * Registra callback para receber atualizações de status
   */
  onStatusUpdate(messageId: string, callback: (status: WebhookStatus) => void): void {
    this.statusCallbacks.set(messageId, callback);
  }

  /**
   * Remove callback de status
   */
  removeStatusCallback(messageId: string): void {
    this.statusCallbacks.delete(messageId);
  }

  /**
   * Notifica status para callbacks registrados
   */
  private notifyStatus(messageId: string, status: WebhookStatus): void {
    const callback = this.statusCallbacks.get(messageId);
    if (callback) {
      callback(status);
    }
  }

  /**
   * Testa o webhook
   */
  async testWebhook(): Promise<boolean> {
    try {
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Teste de conexão do Psicomind'
      };

      const response = await this.n8nClient.sendWebhook(this.webhookUrl, testPayload);
      console.log('[MessageWebhook] Teste bem-sucedido:', response);
      return true;
    } catch (error) {
      console.error('[MessageWebhook] Erro no teste:', error);
      return false;
    }
  }

  /**
   * Atualiza URL do webhook
   */
  updateWebhookUrl(newUrl: string): void {
    this.webhookUrl = newUrl;
    this.n8nClient = new N8nClient({ 
      baseUrl: '', 
      webhookUrl: newUrl 
    });
  }

  /**
   * Obtém URL atual do webhook
   */
  getWebhookUrl(): string {
    return this.webhookUrl;
  }
}

// Instância singleton do serviço
let messageWebhookServiceInstance: MessageWebhookService | null = null;

/**
 * Cria ou atualiza a instância do serviço de webhook
 */
export const createMessageWebhookService = (webhookUrl: string): MessageWebhookService => {
  messageWebhookServiceInstance = new MessageWebhookService(webhookUrl);
  return messageWebhookServiceInstance;
};

/**
 * Obtém a instância atual do serviço de webhook
 */
export const getMessageWebhookService = (): MessageWebhookService | null => {
  return messageWebhookServiceInstance;
};

/**
 * Inicializa o serviço com a URL do webhook da API Trae AI
 */
export const initializeMessageWebhookService = (): MessageWebhookService => {
  const webhookUrl = import.meta.env.VITE_TRAE_AI_WEBHOOK_URL || 'https://api.trae.ai/v1/chat/sendMessage';
  return createMessageWebhookService(webhookUrl);
};