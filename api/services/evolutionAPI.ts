/**
 * Serviços de integração com Evolution API
 * Baseado na arquitetura técnica definida na documentação
 */

import axios, { AxiosInstance } from 'axios';
import { createClient } from '@supabase/supabase-js';
import { auditLogger } from '../middleware/auditLogger.js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

interface SendMessageRequest {
  number: string;
  text?: string;
  media?: {
    mediatype: 'image' | 'video' | 'audio' | 'document';
    media: string; // base64 ou URL
    fileName?: string;
    caption?: string;
  };
  options?: {
    delay?: number;
    presence?: 'composing' | 'recording';
    linkPreview?: boolean;
  };
}

interface SendMessageResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: any;
  messageTimestamp: number;
  status: string;
}

class EvolutionAPIService {
  private clients: Map<string, AxiosInstance> = new Map();

  /**
   * Obter cliente configurado para um psicólogo
   */
  private async getClient(psicologoId: string): Promise<AxiosInstance> {
    if (this.clients.has(psicologoId)) {
      return this.clients.get(psicologoId)!;
    }

    // Buscar configuração do psicólogo
    const { data: config, error } = await supabase
      .from('configuracoes_whatsapp')
      .select('*')
      .eq('psicologo_id', psicologoId)
      .eq('ativo', true)
      .single();

    if (error || !config) {
      throw new Error('Configuração da Evolution API não encontrada');
    }

    // Criar cliente axios
    const client = axios.create({
      baseURL: config.evolution_api_url,
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.evolution_api_key
      },
      timeout: 30000
    });

    // Interceptor para logs
    client.interceptors.request.use(
      (config) => {
        console.log('Evolution API Request:', {
          method: config.method,
          url: config.url,
          data: config.data
        });
        return config;
      },
      (error) => {
        console.error('Evolution API Request Error:', error);
        return Promise.reject(error);
      }
    );

    client.interceptors.response.use(
      (response) => {
        console.log('Evolution API Response:', {
          status: response.status,
          data: response.data
        });
        return response;
      },
      (error) => {
        console.error('Evolution API Response Error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        return Promise.reject(error);
      }
    );

    this.clients.set(psicologoId, client);
    return client;
  }

  /**
   * Enviar mensagem de texto
   */
  async sendTextMessage(
    psicologoId: string,
    numero: string,
    texto: string,
    options?: { delay?: number; linkPreview?: boolean }
  ): Promise<SendMessageResponse> {
    try {
      const client = await this.getClient(psicologoId);
      const config = await this.getConfig(psicologoId);

      const payload: SendMessageRequest = {
        number: this.formatNumber(numero),
        text: texto,
        options: {
          delay: options?.delay || 1000,
          presence: 'composing',
          linkPreview: options?.linkPreview ?? true
        }
      };

      const response = await client.post(
        `/message/sendText/${config.instanceName}`,
        payload
      );

      // Log da ação
      await auditLogger.log({
        userId: psicologoId,
        action: 'message_sent_whatsapp',
        resource: 'message',
        details: { 
          numero,
          tipo: 'texto',
          instanceName: config.instanceName
        }
      });

      return response.data;

    } catch (error) {
      console.error('Erro ao enviar mensagem de texto:', error);
      
      await auditLogger.log({
        userId: psicologoId,
        action: 'message_send_failed',
        resource: 'message',
        details: { 
          numero,
          tipo: 'texto',
          error: error.message
        }
      });

      throw new Error(`Falha ao enviar mensagem: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Enviar mídia (imagem, áudio, documento)
   */
  async sendMediaMessage(
    psicologoId: string,
    numero: string,
    media: {
      type: 'image' | 'video' | 'audio' | 'document';
      data: string; // base64 ou URL
      filename?: string;
      caption?: string;
    }
  ): Promise<SendMessageResponse> {
    try {
      const client = await this.getClient(psicologoId);
      const config = await this.getConfig(psicologoId);

      const payload: SendMessageRequest = {
        number: this.formatNumber(numero),
        media: {
          mediatype: media.type,
          media: media.data,
          fileName: media.filename,
          caption: media.caption
        },
        options: {
          delay: 1000,
          presence: 'composing'
        }
      };

      const response = await client.post(
        `/message/sendMedia/${config.instanceName}`,
        payload
      );

      // Log da ação
      await auditLogger.log({
        userId: psicologoId,
        action: 'message_sent_whatsapp',
        resource: 'message',
        details: { 
          numero,
          tipo: media.type,
          instanceName: config.instanceName,
          hasCaption: !!media.caption
        }
      });

      return response.data;

    } catch (error) {
      console.error('Erro ao enviar mídia:', error);
      
      await auditLogger.log({
        userId: psicologoId,
        action: 'message_send_failed',
        resource: 'message',
        details: { 
          numero,
          tipo: media.type,
          error: error.message
        }
      });

      throw new Error(`Falha ao enviar mídia: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verificar status da instância
   */
  async getInstanceStatus(psicologoId: string): Promise<any> {
    try {
      const client = await this.getClient(psicologoId);
      const config = await this.getConfig(psicologoId);

      const response = await client.get(`/instance/connectionState/${config.instanceName}`);
      
      return {
        instance: config.instanceName,
        state: response.data.instance?.state || 'close',
        qrcode: response.data.base64 || null,
        phone: response.data.instance?.wuid || null
      };

    } catch (error) {
      console.error('Erro ao verificar status da instância:', error);
      throw new Error(`Falha ao verificar status: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Criar instância
   */
  async createInstance(psicologoId: string): Promise<any> {
    try {
      const client = await this.getClient(psicologoId);
      const config = await this.getConfig(psicologoId);

      const payload = {
        instanceName: config.instanceName,
        token: config.evolution_api_key,
        qrcode: true,
        webhook: config.webhook_url || `${process.env.API_BASE_URL}/api/webhook/evolution`,
        webhook_by_events: false,
        events: [
          'APPLICATION_STARTUP',
          'QRCODE_UPDATED',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE'
        ]
      };

      const response = await client.post('/instance/create', payload);

      // Log da ação
      await auditLogger.log({
        userId: psicologoId,
        action: 'instance_created',
        resource: 'configuration',
        details: { 
          instanceName: config.instanceName
        }
      });

      return response.data;

    } catch (error) {
      console.error('Erro ao criar instância:', error);
      throw new Error(`Falha ao criar instância: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Conectar instância
   */
  async connectInstance(psicologoId: string): Promise<any> {
    try {
      const client = await this.getClient(psicologoId);
      const config = await this.getConfig(psicologoId);

      const response = await client.get(`/instance/connect/${config.instanceName}`);

      // Log da ação
      await auditLogger.log({
        userId: psicologoId,
        action: 'instance_connected',
        resource: 'configuration',
        details: { 
          instanceName: config.instanceName
        }
      });

      return response.data;

    } catch (error) {
      console.error('Erro ao conectar instância:', error);
      throw new Error(`Falha ao conectar instância: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Desconectar instância
   */
  async disconnectInstance(psicologoId: string): Promise<any> {
    try {
      const client = await this.getClient(psicologoId);
      const config = await this.getConfig(psicologoId);

      const response = await client.delete(`/instance/logout/${config.instanceName}`);

      // Log da ação
      await auditLogger.log({
        userId: psicologoId,
        action: 'instance_disconnected',
        resource: 'configuration',
        details: { 
          instanceName: config.instanceName
        }
      });

      return response.data;

    } catch (error) {
      console.error('Erro ao desconectar instância:', error);
      throw new Error(`Falha ao desconectar instância: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verificar se número existe no WhatsApp
   */
  async checkNumberExists(psicologoId: string, numero: string): Promise<boolean> {
    try {
      const client = await this.getClient(psicologoId);
      const config = await this.getConfig(psicologoId);

      const response = await client.post(
        `/chat/whatsappNumbers/${config.instanceName}`,
        {
          numbers: [this.formatNumber(numero)]
        }
      );

      return response.data?.[0]?.exists || false;

    } catch (error) {
      console.error('Erro ao verificar número:', error);
      return false;
    }
  }

  /**
   * Obter configuração do psicólogo
   */
  private async getConfig(psicologoId: string): Promise<any> {
    const { data: config, error } = await supabase
      .from('configuracoes_whatsapp')
      .select('*')
      .eq('psicologo_id', psicologoId)
      .eq('ativo', true)
      .single();

    if (error || !config) {
      throw new Error('Configuração da Evolution API não encontrada');
    }

    return config;
  }

  /**
   * Formatar número para padrão internacional
   */
  private formatNumber(numero: string): string {
    // Remove caracteres não numéricos
    const cleaned = numero.replace(/\D/g, '');
    
    // Se não tem código do país, adiciona +55 (Brasil)
    if (cleaned.length === 11 && cleaned.startsWith('11')) {
      return `55${cleaned}`;
    } else if (cleaned.length === 10) {
      return `5511${cleaned}`;
    } else if (cleaned.length === 13 && cleaned.startsWith('55')) {
      return cleaned;
    }
    
    return cleaned;
  }

  /**
   * Limpar cache de cliente
   */
  clearClientCache(psicologoId: string): void {
    this.clients.delete(psicologoId);
  }

  /**
   * Testar conexão com a API
   */
  async testConnection(psicologoId: string): Promise<boolean> {
    try {
      const client = await this.getClient(psicologoId);
      const response = await client.get('/instance/fetchInstances');
      return response.status === 200;
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      return false;
    }
  }

  /**
   * Obter QR Code da instância
   */
  async getQRCode(psicologoId: string): Promise<string | null> {
    try {
      const client = await this.getClient(psicologoId);
      const config = await this.getConfig(psicologoId);

      const response = await client.get(`/instance/connect/${config.instanceName}`);
      
      return response.data.base64 || null;

    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      return null;
    }
  }

  /**
   * Verificar se instância existe
   */
  async instanceExists(psicologoId: string): Promise<boolean> {
    try {
      const client = await this.getClient(psicologoId);
      const config = await this.getConfig(psicologoId);

      const response = await client.get('/instance/fetchInstances');
      const instances = response.data || [];
      
      return instances.some((instance: any) => instance.instanceName === config.instanceName);

    } catch (error) {
      console.error('Erro ao verificar se instância existe:', error);
      return false;
    }
  }
}

// Instância singleton
export const evolutionAPIService = new EvolutionAPIService();

// Funções auxiliares para uso nas rotas
export async function sendWhatsAppMessage(
  psicologoId: string,
  numero: string,
  conteudo: string,
  tipo: 'texto' | 'imagem' | 'audio' | 'documento' = 'texto',
  metadata?: any
): Promise<SendMessageResponse> {
  if (tipo === 'texto') {
    return evolutionAPIService.sendTextMessage(psicologoId, numero, conteudo);
  } else {
    return evolutionAPIService.sendMediaMessage(psicologoId, numero, {
      type: tipo as any,
      data: conteudo,
      filename: metadata?.filename,
      caption: metadata?.caption
    });
  }
}

export async function checkWhatsAppConnection(psicologoId: string): Promise<any> {
  return evolutionAPIService.getInstanceStatus(psicologoId);
}

export async function initializeWhatsAppInstance(psicologoId: string): Promise<any> {
  try {
    // Primeiro tenta conectar instância existente
    const status = await evolutionAPIService.getInstanceStatus(psicologoId);
    
    if (status.state === 'close') {
      // Se fechada, tenta conectar
      return evolutionAPIService.connectInstance(psicologoId);
    } else if (status.state === 'open') {
      // Já conectada
      return { success: true, message: 'Instância já conectada' };
    } else {
      // Criar nova instância
      return evolutionAPIService.createInstance(psicologoId);
    }
  } catch (error) {
    // Se instância não existe, criar nova
    return evolutionAPIService.createInstance(psicologoId);
  }
}