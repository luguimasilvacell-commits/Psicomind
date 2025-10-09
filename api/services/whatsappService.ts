import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

// Schema para configuração do WhatsApp
const WhatsAppConfigSchema = z.object({
  accessToken: z.string().min(1, 'Access Token é obrigatório'),
  phoneNumberId: z.string().min(1, 'Phone Number ID é obrigatório'),
  verifyToken: z.string().min(1, 'Verify Token é obrigatório'),
  webhookUrl: z.string().url().optional(),
  apiVersion: z.string().default('v18.0'),
});

export type WhatsAppConfig = z.infer<typeof WhatsAppConfigSchema>;

// Schema para mensagens do WhatsApp
const WhatsAppMessageSchema = z.object({
  to: z.string().min(1),
  type: z.enum(['text', 'template', 'interactive', 'image', 'document']),
  text: z.object({
    body: z.string(),
  }).optional(),
  template: z.object({
    name: z.string(),
    language: z.object({
      code: z.string(),
    }),
    components: z.array(z.any()).optional(),
  }).optional(),
  interactive: z.object({
    type: z.enum(['button', 'list']),
    body: z.object({
      text: z.string(),
    }),
    action: z.any(),
  }).optional(),
});

export type WhatsAppMessage = z.infer<typeof WhatsAppMessageSchema>;

// Schema para webhook do WhatsApp
const WebhookMessageSchema = z.object({
  object: z.string(),
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      value: z.object({
        messaging_product: z.string(),
        metadata: z.object({
          display_phone_number: z.string(),
          phone_number_id: z.string(),
        }),
        contacts: z.array(z.object({
          profile: z.object({
            name: z.string(),
          }),
          wa_id: z.string(),
        })).optional(),
        messages: z.array(z.object({
          from: z.string(),
          id: z.string(),
          timestamp: z.string(),
          text: z.object({
            body: z.string(),
          }).optional(),
          type: z.string(),
        })).optional(),
        statuses: z.array(z.object({
          id: z.string(),
          status: z.string(),
          timestamp: z.string(),
          recipient_id: z.string(),
        })).optional(),
      }),
      field: z.string(),
    })),
  })),
});

export type WebhookMessage = z.infer<typeof WebhookMessageSchema>;

// Schema para resposta do WhatsApp
const WhatsAppResponseSchema = z.object({
  messaging_product: z.string(),
  contacts: z.array(z.object({
    input: z.string(),
    wa_id: z.string(),
  })).optional(),
  messages: z.array(z.object({
    id: z.string(),
  })).optional(),
});

export type WhatsAppResponse = z.infer<typeof WhatsAppResponseSchema>;

// Schema para templates de mensagem
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

class WhatsAppService {
  private config: WhatsAppConfig | null = null;
  private apiClient: AxiosInstance | null = null;
  private isConnected = false;
  private templates: MessageTemplate[] = [];

  constructor() {
    this.initializeFromEnv();
    this.loadDefaultTemplates();
  }

  private initializeFromEnv(): void {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (accessToken && phoneNumberId && verifyToken) {
      try {
        this.configure({
          accessToken,
          phoneNumberId,
          verifyToken,
          webhookUrl: process.env.WHATSAPP_WEBHOOK_URL,
          apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
        });
      } catch (error) {
        console.error('Erro ao inicializar WhatsApp com variáveis de ambiente:', error);
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

  public configure(config: Partial<WhatsAppConfig>): void {
    try {
      this.config = WhatsAppConfigSchema.parse(config);
      
      this.apiClient = axios.create({
        baseURL: `https://graph.facebook.com/${this.config.apiVersion}`,
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      this.isConnected = true;
    } catch (error) {
      console.error('Erro ao configurar WhatsApp:', error);
      this.isConnected = false;
      throw new Error('Falha na configuração do WhatsApp API');
    }
  }

  public async checkConnection(): Promise<{ connected: boolean; error?: string }> {
    if (!this.apiClient || !this.config) {
      return { connected: false, error: 'WhatsApp não configurado' };
    }

    try {
      // Testar conexão verificando informações do número de telefone
      const response = await this.apiClient.get(`/${this.config.phoneNumberId}`);
      
      if (response.status === 200 && response.data) {
        this.isConnected = true;
        return { connected: true };
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
      type?: 'text' | 'template';
    }
  ): Promise<WhatsAppResponse> {
    if (!this.apiClient || !this.config || !this.isConnected) {
      throw new Error('WhatsApp não está conectado');
    }

    try {
      let messageData: any;

      if (options?.type === 'template' && options.templateId) {
        // Usar template
        const template = this.templates.find(t => t.id === options.templateId);
        if (!template) {
          throw new Error('Template não encontrado');
        }

        let processedContent = template.content;
        if (options.variables) {
          Object.entries(options.variables).forEach(([key, value]) => {
            processedContent = processedContent.replace(`{${key}}`, value);
          });
        }

        messageData = {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: {
            body: processedContent,
          },
        };
      } else {
        // Mensagem de texto simples
        messageData = {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: {
            body: message,
          },
        };
      }

      const response = await this.apiClient.post(
        `/${this.config.phoneNumberId}/messages`,
        messageData
      );

      return WhatsAppResponseSchema.parse(response.data);
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      throw new Error('Falha ao enviar mensagem via WhatsApp');
    }
  }

  public async sendInteractiveMessage(
    to: string,
    text: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<WhatsAppResponse> {
    if (!this.apiClient || !this.config || !this.isConnected) {
      throw new Error('WhatsApp não está conectado');
    }

    try {
      const messageData = {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text,
          },
          action: {
            buttons: buttons.map(button => ({
              type: 'reply',
              reply: {
                id: button.id,
                title: button.title,
              },
            })),
          },
        },
      };

      const response = await this.apiClient.post(
        `/${this.config.phoneNumberId}/messages`,
        messageData
      );

      return WhatsAppResponseSchema.parse(response.data);
    } catch (error) {
      console.error('Erro ao enviar mensagem interativa WhatsApp:', error);
      throw new Error('Falha ao enviar mensagem interativa via WhatsApp');
    }
  }

  public verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (!this.config) {
      return null;
    }

    if (mode === 'subscribe' && token === this.config.verifyToken) {
      return challenge;
    }

    return null;
  }

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
      const webhookData = WebhookMessageSchema.parse(body);
      const messages: any[] = [];
      const statuses: any[] = [];

      webhookData.entry.forEach(entry => {
        entry.changes.forEach(change => {
          // Processar mensagens recebidas
          if (change.value.messages) {
            change.value.messages.forEach(message => {
              if (message.text) {
                messages.push({
                  from: message.from,
                  text: message.text.body,
                  timestamp: new Date(parseInt(message.timestamp) * 1000),
                  messageId: message.id,
                });
              }
            });
          }

          // Processar status de mensagens enviadas
          if (change.value.statuses) {
            change.value.statuses.forEach(status => {
              statuses.push({
                messageId: status.id,
                status: status.status,
                timestamp: new Date(parseInt(status.timestamp) * 1000),
                recipientId: status.recipient_id,
              });
            });
          }
        });
      });

      return { messages, statuses };
    } catch (error) {
      console.error('Erro ao processar webhook WhatsApp:', error);
      return { messages: [], statuses: [] };
    }
  }

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

  public getConfig(): WhatsAppConfig | null {
    return this.config;
  }

  public isConfigured(): boolean {
    return this.config !== null && this.isConnected;
  }

  public disconnect(): void {
    this.apiClient = null;
    this.config = null;
    this.isConnected = false;
  }
}

// Instância singleton
export const whatsappService = new WhatsAppService();
export default whatsappService;