/**
 * Cliente para integração com Evolution API
 */
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
}

export interface WhatsAppInstance {
  instanceName: string;
  status: 'open' | 'close' | 'connecting';
  qrcode?: string;
  profilePictureUrl?: string;
  displayName?: string;
  phone?: string;
}

export interface WhatsAppMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
    imageMessage?: {
      url: string;
      caption?: string;
    };
    audioMessage?: {
      url: string;
    };
    documentMessage?: {
      url: string;
      fileName: string;
    };
  };
  messageTimestamp: number;
  pushName?: string;
}

export interface SendMessageRequest {
  number: string;
  text?: string;
  media?: {
    type: 'image' | 'audio' | 'document' | 'video';
    url?: string;
    base64?: string;
    fileName?: string;
    caption?: string;
  };
}

export interface WebhookEvent {
  event: string;
  instance: string;
  data: any;
  timestamp: number;
}

export class EvolutionClient {
  private client: AxiosInstance;
  private config: EvolutionConfig;

  constructor(config: EvolutionConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey
      }
    });

    // Interceptor para logs
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[Evolution] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Evolution] Request error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`[Evolution] Response ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('[Evolution] Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Testa a conexão com Evolution API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/instance/fetchInstances');
      return response.status === 200;
    } catch (error) {
      console.error('Erro ao testar conexão Evolution API:', error);
      return false;
    }
  }

  /**
   * Cria uma nova instância do WhatsApp
   */
  async createInstance(): Promise<WhatsAppInstance> {
    try {
      const response: AxiosResponse<WhatsAppInstance> = await this.client.post('/instance/create', {
        instanceName: this.config.instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar instância:', error);
      throw new Error('Falha ao criar instância do WhatsApp');
    }
  }

  /**
   * Busca informações da instância
   */
  async getInstance(): Promise<WhatsAppInstance> {
    try {
      const response: AxiosResponse<WhatsAppInstance> = await this.client.get(
        `/instance/connect/${this.config.instanceName}`
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar instância:', error);
      throw new Error('Falha ao buscar informações da instância');
    }
  }

  /**
   * Conecta a instância do WhatsApp
   */
  async connectInstance(): Promise<WhatsAppInstance> {
    try {
      const response: AxiosResponse<WhatsAppInstance> = await this.client.get(
        `/instance/connect/${this.config.instanceName}`
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao conectar instância:', error);
      throw new Error('Falha ao conectar instância do WhatsApp');
    }
  }

  /**
   * Desconecta a instância do WhatsApp
   */
  async disconnectInstance(): Promise<void> {
    try {
      await this.client.delete(`/instance/logout/${this.config.instanceName}`);
    } catch (error) {
      console.error('Erro ao desconectar instância:', error);
      throw new Error('Falha ao desconectar instância do WhatsApp');
    }
  }

  /**
   * Busca o QR Code para conexão
   */
  async getQRCode(): Promise<string> {
    try {
      const response: AxiosResponse<{ qrcode: string }> = await this.client.get(
        `/instance/qrcode/${this.config.instanceName}`
      );
      return response.data.qrcode;
    } catch (error) {
      console.error('Erro ao buscar QR Code:', error);
      throw new Error('Falha ao buscar QR Code');
    }
  }

  /**
   * Envia uma mensagem de texto
   */
  async sendTextMessage(number: string, text: string): Promise<any> {
    try {
      const response = await this.client.post(`/message/sendText/${this.config.instanceName}`, {
        number: this.formatPhoneNumber(number),
        text
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw new Error('Falha ao enviar mensagem de texto');
    }
  }

  /**
   * Envia uma mensagem com mídia
   */
  async sendMediaMessage(request: SendMessageRequest): Promise<any> {
    try {
      const endpoint = request.media?.type === 'image' ? 'sendMedia' : 'sendMedia';
      const response = await this.client.post(`/message/${endpoint}/${this.config.instanceName}`, {
        number: this.formatPhoneNumber(request.number),
        mediatype: request.media?.type,
        media: request.media?.url || request.media?.base64,
        fileName: request.media?.fileName,
        caption: request.media?.caption || request.text
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar mídia:', error);
      throw new Error('Falha ao enviar mensagem com mídia');
    }
  }

  /**
   * Busca mensagens de uma conversa
   */
  async getMessages(remoteJid: string, limit: number = 50): Promise<WhatsAppMessage[]> {
    try {
      const response: AxiosResponse<{ messages: WhatsAppMessage[] }> = await this.client.get(
        `/chat/findMessages/${this.config.instanceName}`,
        {
          params: {
            remoteJid,
            limit
          }
        }
      );
      return response.data.messages || [];
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      throw new Error('Falha ao buscar mensagens');
    }
  }

  /**
   * Busca conversas/chats
   */
  async getChats(): Promise<any[]> {
    try {
      const response: AxiosResponse<any[]> = await this.client.get(
        `/chat/findChats/${this.config.instanceName}`
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar chats:', error);
      throw new Error('Falha ao buscar conversas');
    }
  }

  /**
   * Marca mensagens como lidas
   */
  async markAsRead(remoteJid: string, messageIds: string[]): Promise<void> {
    try {
      await this.client.put(`/chat/markMessageAsRead/${this.config.instanceName}`, {
        remoteJid,
        messageIds
      });
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
      throw new Error('Falha ao marcar mensagens como lidas');
    }
  }

  /**
   * Configura webhook para receber eventos
   */
  async setWebhook(webhookUrl: string, events: string[] = []): Promise<void> {
    try {
      await this.client.post(`/webhook/set/${this.config.instanceName}`, {
        url: webhookUrl,
        events: events.length > 0 ? events : [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'MESSAGES_DELETE',
          'SEND_MESSAGE',
          'CONTACTS_UPDATE',
          'CONTACTS_UPSERT',
          'PRESENCE_UPDATE',
          'CHATS_UPDATE',
          'CHATS_UPSERT',
          'CHATS_DELETE',
          'GROUPS_UPSERT',
          'GROUP_UPDATE',
          'GROUP_PARTICIPANTS_UPDATE',
          'CONNECTION_UPDATE',
          'CALL',
          'NEW_JWT_TOKEN'
        ]
      });
    } catch (error) {
      console.error('Erro ao configurar webhook:', error);
      throw new Error('Falha ao configurar webhook');
    }
  }

  /**
   * Remove webhook
   */
  async removeWebhook(): Promise<void> {
    try {
      await this.client.delete(`/webhook/remove/${this.config.instanceName}`);
    } catch (error) {
      console.error('Erro ao remover webhook:', error);
      throw new Error('Falha ao remover webhook');
    }
  }

  /**
   * Busca informações de um contato
   */
  async getContact(number: string): Promise<any> {
    try {
      const response = await this.client.get(`/chat/whatsappNumbers/${this.config.instanceName}`, {
        params: {
          numbers: [this.formatPhoneNumber(number)]
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar contato:', error);
      throw new Error('Falha ao buscar informações do contato');
    }
  }

  /**
   * Formata número de telefone para o padrão brasileiro
   */
  private formatPhoneNumber(number: string): string {
    // Remove caracteres não numéricos
    const cleaned = number.replace(/\D/g, '');
    
    // Se não tem código do país, adiciona +55
    if (cleaned.length === 11 && cleaned.startsWith('11')) {
      return `55${cleaned}`;
    }
    
    if (cleaned.length === 10 || cleaned.length === 11) {
      return `55${cleaned}`;
    }
    
    return cleaned;
  }

  /**
   * Processa evento de webhook recebido
   */
  static processWebhookEvent(payload: any): WebhookEvent {
    return {
      event: payload.event,
      instance: payload.instance,
      data: payload.data,
      timestamp: payload.timestamp || Date.now()
    };
  }

  /**
   * Valida se o payload é de um webhook Evolution válido
   */
  static isValidWebhookEvent(payload: any): boolean {
    return (
      payload &&
      payload.event &&
      payload.instance &&
      payload.data
    );
  }

  /**
   * Extrai texto de uma mensagem WhatsApp
   */
  static extractMessageText(message: WhatsAppMessage): string {
    if (message.message.conversation) {
      return message.message.conversation;
    }
    
    if (message.message.extendedTextMessage?.text) {
      return message.message.extendedTextMessage.text;
    }
    
    if (message.message.imageMessage?.caption) {
      return message.message.imageMessage.caption;
    }
    
    return '';
  }

  /**
   * Verifica se a mensagem é de mídia
   */
  static isMediaMessage(message: WhatsAppMessage): boolean {
    return !!(
      message.message.imageMessage ||
      message.message.audioMessage ||
      message.message.documentMessage
    );
  }
}

// Instância singleton do cliente Evolution
let evolutionClientInstance: EvolutionClient | null = null;

export const createEvolutionClient = (config: EvolutionConfig): EvolutionClient => {
  evolutionClientInstance = new EvolutionClient(config);
  return evolutionClientInstance;
};

export const getEvolutionClient = (): EvolutionClient | null => {
  return evolutionClientInstance;
};