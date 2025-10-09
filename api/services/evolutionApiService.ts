import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

// Schema para configuração da Evolution API <mcreference link="https://doc.evolution-api.com/v1/api-reference/instance-controller/create-instance-basic" index="1">1</mcreference>
const EvolutionApiConfigSchema = z.object({
  serverUrl: z.string().url('URL do servidor é obrigatória'),
  apiKey: z.string().min(1, 'API Key é obrigatória'),
  instanceName: z.string().min(1, 'Nome da instância é obrigatório'),
  webhookUrl: z.string().url().optional(),
  webhookEvents: z.array(z.string()).default([
    'MESSAGES_UPSERT',
    'MESSAGES_UPDATE',
    'SEND_MESSAGE',
    'CONNECTION_UPDATE'
  ]),
});

export type EvolutionApiConfig = z.infer<typeof EvolutionApiConfigSchema>;

// Schema para mensagens da Evolution API <mcreference link="https://doc.evolution-api.com/v1/api-reference/message-controller/send-text" index="2">2</mcreference>
const EvolutionMessageSchema = z.object({
  number: z.string().min(1, 'Número é obrigatório'),
  textMessage: z.object({
    text: z.string().min(1, 'Texto é obrigatório'),
  }),
  options: z.object({
    delay: z.number().optional(),
    presence: z.enum(['composing', 'recording', 'paused']).optional(),
    linkPreview: z.boolean().optional(),
    quoted: z.object({
      key: z.object({
        remoteJid: z.string(),
        fromMe: z.boolean(),
        id: z.string(),
        participant: z.string().optional(),
      }),
      message: z.object({
        conversation: z.string(),
      }),
    }).optional(),
    mentions: z.object({
      everyOne: z.boolean().optional(),
      mentioned: z.array(z.string()).optional(),
    }).optional(),
  }).optional(),
});

export type EvolutionMessage = z.infer<typeof EvolutionMessageSchema>;

// Schema para resposta da Evolution API
const EvolutionResponseSchema = z.object({
  message: z.object({
    key: z.object({
      remoteJid: z.string(),
      fromMe: z.boolean(),
      id: z.string(),
    }),
    messageTimestamp: z.string(),
    status: z.string(),
  }),
});

export type EvolutionResponse = z.infer<typeof EvolutionResponseSchema>;

// Schema para status da instância
const InstanceStatusSchema = z.object({
  instance: z.object({
    instanceName: z.string(),
    instanceId: z.string(),
    status: z.enum(['created', 'connecting', 'open', 'close']),
  }),
  connectionStatus: z.object({
    state: z.string(),
    statusReason: z.number().optional(),
  }).optional(),
});

export type InstanceStatus = z.infer<typeof InstanceStatusSchema>;

// Schema para templates de mensagem (mantendo compatibilidade)
const MessageTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['appointment', 'reminder', 'welcome', 'followup', 'emergency']),
  content: z.string(),
  variables: z.array(z.string()).default([]),
  language: z.string().default('pt_BR'),
  isActive: z.boolean().default(true),
});

export type MessageTemplate = z.infer<typeof MessageTemplateSchema>;

class EvolutionApiService {
  private config: EvolutionApiConfig | null = null;
  private apiClient: AxiosInstance | null = null;
  private isConnected = false;
  private instanceStatus: 'created' | 'connecting' | 'open' | 'close' = 'close';
  private templates: MessageTemplate[] = [];

  constructor() {
    this.initializeFromEnv();
    this.loadDefaultTemplates();
  }

  private initializeFromEnv(): void {
    const serverUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME;

    if (serverUrl && apiKey && instanceName) {
      try {
        this.configure({
          serverUrl,
          apiKey,
          instanceName,
          webhookUrl: process.env.EVOLUTION_WEBHOOK_URL,
        });
      } catch (error) {
        console.error('Erro ao inicializar Evolution API com variáveis de ambiente:', error);
      }
    }
  }

  private loadDefaultTemplates(): void {
    this.templates = [
      {
        id: 'welcome',
        name: 'Mensagem de Boas-vindas',
        category: 'welcome',
        content: 'Olá {name}! Bem-vindo(a) ao Psicomind. Estou aqui para ajudá-lo(a) em sua jornada de bem-estar mental. Como posso ajudá-lo(a) hoje?',
        variables: ['name'],
        language: 'pt_BR',
        isActive: true,
      },
      {
        id: 'appointment_reminder',
        name: 'Lembrete de Consulta',
        category: 'reminder',
        content: 'Olá {name}! Este é um lembrete de sua consulta agendada para {date} às {time}. Confirme sua presença respondendo SIM.',
        variables: ['name', 'date', 'time'],
        language: 'pt_BR',
        isActive: true,
      },
      {
        id: 'appointment_confirmation',
        name: 'Confirmação de Agendamento',
        category: 'appointment',
        content: 'Consulta confirmada! {name}, sua sessão está agendada para {date} às {time}. Local: {location}',
        variables: ['name', 'date', 'time', 'location'],
        language: 'pt_BR',
        isActive: true,
      },
      {
        id: 'followup',
        name: 'Acompanhamento Pós-Sessão',
        category: 'followup',
        content: 'Olá {name}! Como você está se sentindo após nossa última sessão? Lembre-se de que estou aqui se precisar de apoio.',
        variables: ['name'],
        language: 'pt_BR',
        isActive: true,
      },
      {
        id: 'emergency_support',
        name: 'Suporte de Emergência',
        category: 'emergency',
        content: 'Percebo que você pode estar passando por um momento difícil. Se for uma emergência, procure ajuda imediata: CVV 188, SAMU 192. Estou aqui para apoiá-lo(a).',
        variables: [],
        language: 'pt_BR',
        isActive: true,
      },
    ];
  }

  public configure(config: Partial<EvolutionApiConfig>): void {
    try {
      this.config = EvolutionApiConfigSchema.parse(config);
      
      this.apiClient = axios.create({
        baseURL: this.config.serverUrl,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      console.log('Evolution API configurada com sucesso');
    } catch (error) {
      console.error('Erro ao configurar Evolution API:', error);
      this.isConnected = false;
      throw new Error('Falha na configuração da Evolution API');
    }
  }

  public async createInstance(): Promise<{ success: boolean; instanceId?: string; error?: string }> {
    if (!this.apiClient || !this.config) {
      return { success: false, error: 'Evolution API não configurada' };
    }

    try {
      const instanceData = {
        instanceName: this.config.instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: this.config.webhookUrl || `http://localhost:3001/api/webhook/whatsapp`,
        webhook_by_events: true,
        events: this.config.webhookEvents,
        reject_call: false,
        groups_ignore: false,
        always_online: true,
        read_messages: true,
        read_status: true,
      };

      const response = await this.apiClient.post('/instance/create', instanceData);
      
      if (response.status === 201 && response.data.instance) {
        this.instanceStatus = 'created';
        return { 
          success: true, 
          instanceId: response.data.instance.instanceId 
        };
      } else {
        return { success: false, error: 'Resposta inválida da API' };
      }
    } catch (error) {
      console.error('Erro ao criar instância:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: errorMessage };
    }
  }

  public async connectInstance(): Promise<{ success: boolean; qrCode?: string; error?: string }> {
    if (!this.apiClient || !this.config) {
      return { success: false, error: 'Evolution API não configurada' };
    }

    try {
      const response = await this.apiClient.get(`/instance/connect/${this.config.instanceName}`);
      
      if (response.status === 200) {
        this.instanceStatus = 'connecting';
        return { 
          success: true, 
          qrCode: response.data.base64 || response.data.qrcode 
        };
      } else {
        return { success: false, error: 'Falha ao conectar instância' };
      }
    } catch (error) {
      console.error('Erro ao conectar instância:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: errorMessage };
    }
  }

  public async checkConnection(): Promise<{ connected: boolean; status?: string; error?: string }> {
    if (!this.apiClient || !this.config) {
      return { connected: false, error: 'Evolution API não configurada' };
    }

    try {
      const response = await this.apiClient.get(`/instance/connectionState/${this.config.instanceName}`);
      
      if (response.status === 200 && response.data) {
        const state = response.data.instance?.state || response.data.state;
        this.isConnected = state === 'open';
        this.instanceStatus = state;
        
        return { 
          connected: this.isConnected, 
          status: state 
        };
      } else {
        this.isConnected = false;
        return { connected: false, error: 'Resposta inválida da API' };
      }
    } catch (error) {
      this.isConnected = false;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { connected: false, error: errorMessage };
    }
  }

  public async sendMessage(
    to: string,
    message: string,
    options?: {
      templateId?: string;
      variables?: Record<string, string>;
      delay?: number;
      presence?: 'composing' | 'recording' | 'paused';
    }
  ): Promise<EvolutionResponse> {
    if (!this.apiClient || !this.config || !this.isConnected) {
      throw new Error('Evolution API não está conectada');
    }

    try {
      let finalMessage = message;

      // Processar template se especificado
      if (options?.templateId) {
        const template = this.templates.find(t => t.id === options.templateId);
        if (template) {
          finalMessage = template.content;
          if (options.variables) {
            Object.entries(options.variables).forEach(([key, value]) => {
              finalMessage = finalMessage.replace(`{${key}}`, value);
            });
          }
        }
      }

      const messageData: EvolutionMessage = {
        number: to,
        textMessage: {
          text: finalMessage,
        },
        options: {
          delay: options?.delay,
          presence: options?.presence,
          linkPreview: true,
        },
      };

      const response = await this.apiClient.post(
        `/message/sendText/${this.config.instanceName}`,
        messageData
      );

      return EvolutionResponseSchema.parse(response.data);
    } catch (error) {
      console.error('Erro ao enviar mensagem Evolution API:', error);
      throw new Error('Falha ao enviar mensagem via Evolution API');
    }
  }

  public async sendInteractiveMessage(
    to: string,
    text: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<EvolutionResponse> {
    if (!this.apiClient || !this.config || !this.isConnected) {
      throw new Error('Evolution API não está conectada');
    }

    try {
      const messageData = {
        number: to,
        options: {
          delay: 1200,
          presence: 'composing',
        },
        buttonMessage: {
          text,
          buttons: buttons.map(button => ({
            buttonId: button.id,
            buttonText: {
              displayText: button.title,
            },
            type: 1,
          })),
          headerType: 1,
        },
      };

      const response = await this.apiClient.post(
        `/message/sendButtons/${this.config.instanceName}`,
        messageData
      );

      return EvolutionResponseSchema.parse(response.data);
    } catch (error) {
      console.error('Erro ao enviar mensagem interativa Evolution API:', error);
      throw new Error('Falha ao enviar mensagem interativa via Evolution API');
    }
  }

  public async sendListMessage(
    to: string,
    text: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>
  ): Promise<EvolutionResponse> {
    if (!this.apiClient || !this.config || !this.isConnected) {
      throw new Error('Evolution API não está conectada');
    }

    try {
      const messageData = {
        number: to,
        options: {
          delay: 1200,
          presence: 'composing',
        },
        listMessage: {
          title: text,
          description: text,
          buttonText,
          footerText: '',
          sections,
        },
      };

      const response = await this.apiClient.post(
        `/message/sendList/${this.config.instanceName}`,
        messageData
      );

      return EvolutionResponseSchema.parse(response.data);
    } catch (error) {
      console.error('Erro ao enviar lista Evolution API:', error);
      throw new Error('Falha ao enviar lista via Evolution API');
    }
  }

  // Métodos de compatibilidade com o serviço anterior
  public getTemplates(): MessageTemplate[] {
    return this.templates.filter(t => t.isActive);
  }

  public getTemplate(id: string): MessageTemplate | undefined {
    return this.templates.find(t => t.id === id && t.isActive);
  }

  public addTemplate(template: Omit<MessageTemplate, 'id'>): MessageTemplate {
    const newTemplate: MessageTemplate = {
      ...template,
      id: `custom_${Date.now()}`,
    };
    
    this.templates.push(newTemplate);
    return newTemplate;
  }

  public updateTemplate(id: string, updates: Partial<MessageTemplate>): MessageTemplate | null {
    const templateIndex = this.templates.findIndex(t => t.id === id);
    if (templateIndex === -1) {
      return null;
    }

    this.templates[templateIndex] = { ...this.templates[templateIndex], ...updates };
    return this.templates[templateIndex];
  }

  public deleteTemplate(id: string): boolean {
    const templateIndex = this.templates.findIndex(t => t.id === id);
    if (templateIndex === -1) {
      return false;
    }

    this.templates[templateIndex].isActive = false;
    return true;
  }

  public getConfig(): EvolutionApiConfig | null {
    return this.config;
  }

  public isConfigured(): boolean {
    return this.config !== null;
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public getInstanceStatus(): string {
    return this.instanceStatus;
  }

  public disconnect(): void {
    this.apiClient = null;
    this.config = null;
    this.isConnected = false;
    this.instanceStatus = 'close';
  }

  // Método para processar webhooks (mantendo compatibilidade)
  public processWebhookMessage(body: any): {
    messages: Array<{
      from: string;
      text: string;
      timestamp: Date;
      messageId: string;
    }>;
    statuses: Array<{
      messageId: string;
      status: string;
      timestamp: Date;
      recipientId: string;
    }>;
  } {
    try {
      const messages: any[] = [];
      const statuses: any[] = [];

      // Processar eventos da Evolution API
      if (body.event === 'messages.upsert' && body.data?.messages) {
        body.data.messages.forEach((message: any) => {
          if (message.message?.conversation || message.message?.extendedTextMessage?.text) {
            messages.push({
              from: message.key.remoteJid.replace('@s.whatsapp.net', ''),
              text: message.message?.conversation || message.message?.extendedTextMessage?.text,
              timestamp: new Date(parseInt(message.messageTimestamp) * 1000),
              messageId: message.key.id,
            });
          }
        });
      }

      if (body.event === 'messages.update' && body.data?.messages) {
        body.data.messages.forEach((message: any) => {
          if (message.update?.status) {
            statuses.push({
              messageId: message.key.id,
              status: message.update.status,
              timestamp: new Date(),
              recipientId: message.key.remoteJid.replace('@s.whatsapp.net', ''),
            });
          }
        });
      }

      return { messages, statuses };
    } catch (error) {
      console.error('Erro ao processar webhook Evolution API:', error);
      return { messages: [], statuses: [] };
    }
  }
}

// Instância singleton
export const evolutionApiService = new EvolutionApiService();
export default evolutionApiService;