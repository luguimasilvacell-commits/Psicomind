/**
 * Serviço de integração que coordena n8n e Evolution API
 */
import { 
  N8nClient, 
  N8nConfig, 
  N8nWorkflow, 
  N8nExecution,
  createN8nClient,
  getN8nClient 
} from './n8nClient';
import { 
  EvolutionClient, 
  EvolutionConfig, 
  WhatsAppInstance, 
  WhatsAppMessage,
  SendMessageRequest,
  createEvolutionClient,
  getEvolutionClient 
} from './evolutionClient';
import { 
  RetryService, 
  FailoverService, 
  RetryConfig, 
  FailoverConfig,
  createFailoverService,
  getFailoverService 
} from './retryService';
import { Automation, AutomationMessage, WebhookLog } from '../types/chat';

export interface IntegrationConfig {
  n8n: N8nConfig;
  evolution: EvolutionConfig;
  retry: Partial<RetryConfig>;
  failover: FailoverConfig;
}

export interface MessageProcessingResult {
  success: boolean;
  messageId?: string;
  automationTriggered?: boolean;
  automationId?: string;
  error?: string;
}

export interface AutomationExecutionResult {
  success: boolean;
  executionId?: string;
  workflowId?: string;
  responseMessage?: string;
  error?: string;
}

export class IntegrationService {
  private n8nClient: N8nClient | null = null;
  private evolutionClient: EvolutionClient | null = null;
  private failoverService: FailoverService | null = null;
  private config: IntegrationConfig;
  private isInitialized = false;

  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  /**
   * Inicializa todos os serviços de integração
   */
  async initialize(): Promise<void> {
    try {
      console.log('[Integration] Inicializando serviços de integração...');

      // Inicializa clientes
      this.n8nClient = createN8nClient(this.config.n8n);
      this.evolutionClient = createEvolutionClient(this.config.evolution);
      this.failoverService = createFailoverService(this.config.failover);

      // Testa conexões
      await this.testConnections();

      // Configura webhooks
      await this.setupWebhooks();

      this.isInitialized = true;
      console.log('[Integration] Serviços inicializados com sucesso');

    } catch (error) {
      console.error('[Integration] Erro ao inicializar serviços:', error);
      throw new Error('Falha na inicialização dos serviços de integração');
    }
  }

  /**
   * Testa conexões com todos os serviços
   */
  async testConnections(): Promise<{ n8n: boolean; evolution: boolean }> {
    const results = { n8n: false, evolution: false };

    try {
      if (this.n8nClient) {
        results.n8n = await this.n8nClient.testConnection();
      }
    } catch (error) {
      console.error('[Integration] Erro ao testar n8n:', error);
    }

    try {
      if (this.evolutionClient) {
        results.evolution = await this.evolutionClient.testConnection();
      }
    } catch (error) {
      console.error('[Integration] Erro ao testar Evolution API:', error);
    }

    console.log('[Integration] Resultados dos testes de conexão:', results);
    return results;
  }

  /**
   * Configura webhooks necessários
   */
  private async setupWebhooks(): Promise<void> {
    try {
      if (this.evolutionClient) {
        const webhookUrl = `${process.env.VITE_API_URL}/webhooks/evolution`;
        await this.evolutionClient.setWebhook(webhookUrl);
        console.log('[Integration] Webhook Evolution configurado');
      }
    } catch (error) {
      console.error('[Integration] Erro ao configurar webhooks:', error);
    }
  }

  /**
   * Processa mensagem recebida do WhatsApp
   */
  async processIncomingMessage(message: WhatsAppMessage): Promise<MessageProcessingResult> {
    if (!this.isInitialized) {
      throw new Error('Serviço de integração não inicializado');
    }

    try {
      const messageText = EvolutionClient.extractMessageText(message);
      const fromNumber = message.key.remoteJid.replace('@s.whatsapp.net', '');

      console.log(`[Integration] Processando mensagem de ${fromNumber}: ${messageText}`);

      // Verifica se há automações que devem ser disparadas
      const automation = await this.findMatchingAutomation(messageText, fromNumber);
      
      if (automation) {
        console.log(`[Integration] Automação encontrada: ${automation.name}`);
        
        const result = await this.executeAutomation(automation, {
          messageText,
          fromNumber,
          messageId: message.key.id,
          timestamp: message.messageTimestamp
        });

        return {
          success: true,
          messageId: message.key.id,
          automationTriggered: true,
          automationId: automation.id,
          ...result
        };
      }

      return {
        success: true,
        messageId: message.key.id,
        automationTriggered: false
      };

    } catch (error) {
      console.error('[Integration] Erro ao processar mensagem:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Encontra automação que corresponde à mensagem
   */
  private async findMatchingAutomation(messageText: string, fromNumber: string): Promise<Automation | null> {
    // Aqui você implementaria a lógica para buscar automações no banco de dados
    // Por enquanto, retorna null como placeholder
    
    // Exemplo de implementação:
    // 1. Buscar automações ativas
    // 2. Verificar se alguma palavra-chave corresponde
    // 3. Verificar regras de horário/contexto
    // 4. Retornar a automação mais específica
    
    return null;
  }

  /**
   * Executa uma automação
   */
  async executeAutomation(
    automation: Automation, 
    context: {
      messageText: string;
      fromNumber: string;
      messageId: string;
      timestamp: number;
    }
  ): Promise<AutomationExecutionResult> {
    try {
      console.log(`[Integration] Executando automação: ${automation.name}`);

      // Se tem workflow n8n configurado
      if (automation.config.n8n_workflow_id && this.n8nClient) {
        const n8nResult = await this.executeN8nWorkflow(
          automation.config.n8n_workflow_id,
          {
            automation,
            context,
            trigger: 'message_received'
          }
        );

        if (n8nResult.success) {
          return n8nResult;
        }
      }

      // Fallback: resposta direta
      if (automation.config.response_message) {
        await this.sendDirectResponse(context.fromNumber, automation.config.response_message);
        
        return {
          success: true,
          responseMessage: automation.config.response_message
        };
      }

      return {
        success: false,
        error: 'Nenhuma ação configurada para a automação'
      };

    } catch (error) {
      console.error('[Integration] Erro ao executar automação:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na execução'
      };
    }
  }

  /**
   * Executa workflow n8n
   */
  private async executeN8nWorkflow(
    workflowId: string, 
    data: any
  ): Promise<AutomationExecutionResult> {
    if (!this.n8nClient) {
      throw new Error('Cliente n8n não inicializado');
    }

    try {
      const execution = await RetryService.withRetry(
        () => this.n8nClient!.executeWorkflow(workflowId, data),
        this.config.retry
      );

      if (execution.success && execution.data) {
        return {
          success: true,
          executionId: execution.data.id,
          workflowId: workflowId
        };
      } else {
        return {
          success: false,
          error: execution.error?.message || 'Falha na execução do workflow'
        };
      }

    } catch (error) {
      console.error('[Integration] Erro ao executar workflow n8n:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no workflow'
      };
    }
  }

  /**
   * Envia resposta direta via WhatsApp
   */
  async sendDirectResponse(toNumber: string, message: string): Promise<boolean> {
    if (!this.evolutionClient) {
      throw new Error('Cliente Evolution não inicializado');
    }

    try {
      const result = await RetryService.withRetry(
        () => this.evolutionClient!.sendTextMessage(toNumber, message),
        this.config.retry
      );

      return result.success;

    } catch (error) {
      console.error('[Integration] Erro ao enviar resposta:', error);
      return false;
    }
  }

  /**
   * Envia mensagem via WhatsApp com failover
   */
  async sendMessage(request: SendMessageRequest): Promise<MessageProcessingResult> {
    if (!this.evolutionClient || !this.failoverService) {
      throw new Error('Serviços não inicializados');
    }

    try {
      const operations = new Map([
        ['evolution', () => {
          if (request.text) {
            return this.evolutionClient!.sendTextMessage(request.number, request.text);
          } else if (request.media) {
            return this.evolutionClient!.sendMediaMessage(request);
          } else {
            throw new Error('Mensagem sem conteúdo');
          }
        }]
      ]);

      const result = await this.failoverService.withFailover(operations, this.config.retry);

      return {
        success: result.success,
        messageId: result.data?.key?.id,
        error: result.error?.message
      };

    } catch (error) {
      console.error('[Integration] Erro ao enviar mensagem:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Processa webhook do n8n
   */
  async processN8nWebhook(payload: any): Promise<void> {
    try {
      console.log('[Integration] Processando webhook n8n:', payload);

      // Processa dados do webhook
      const webhookData = N8nClient.processWebhookPayload(payload);

      // Se o workflow retornou uma mensagem para enviar
      if (webhookData.data.sendMessage) {
        const { number, text, media } = webhookData.data.sendMessage;
        
        await this.sendMessage({
          number,
          text,
          media
        });
      }

      // Log do webhook
      await this.logWebhook('n8n', payload, true);

    } catch (error) {
      console.error('[Integration] Erro ao processar webhook n8n:', error);
      await this.logWebhook('n8n', payload, false, error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }

  /**
   * Processa webhook da Evolution API
   */
  async processEvolutionWebhook(payload: any): Promise<void> {
    try {
      console.log('[Integration] Processando webhook Evolution:', payload);

      const event = EvolutionClient.processWebhookEvent(payload);

      // Processa diferentes tipos de eventos
      switch (event.event) {
        case 'MESSAGES_UPSERT':
          if (event.data.messages) {
            for (const message of event.data.messages) {
              if (!message.key.fromMe) { // Apenas mensagens recebidas
                await this.processIncomingMessage(message);
              }
            }
          }
          break;

        case 'CONNECTION_UPDATE':
          console.log('[Integration] Status de conexão atualizado:', event.data);
          break;

        default:
          console.log(`[Integration] Evento não processado: ${event.event}`);
      }

      // Log do webhook
      await this.logWebhook('evolution', payload, true);

    } catch (error) {
      console.error('[Integration] Erro ao processar webhook Evolution:', error);
      await this.logWebhook('evolution', payload, false, error instanceof Error ? error.message : 'Erro desconhecido');
    }
  }

  /**
   * Registra log de webhook
   */
  private async logWebhook(
    source: string, 
    payload: any, 
    success: boolean, 
    error?: string
  ): Promise<void> {
    try {
      // Aqui você implementaria o salvamento no banco de dados
      const log: Partial<WebhookLog> = {
        source,
        payload,
        success,
        error,
        timestamp: new Date(),
        processed_at: new Date()
      };

      console.log('[Integration] Log webhook:', log);
      // await supabase.from('webhook_logs').insert(log);

    } catch (logError) {
      console.error('[Integration] Erro ao salvar log de webhook:', logError);
    }
  }

  /**
   * Obtém status dos serviços
   */
  getServicesStatus(): any {
    return {
      initialized: this.isInitialized,
      n8n: {
        connected: this.n8nClient !== null,
        config: this.config.n8n
      },
      evolution: {
        connected: this.evolutionClient !== null,
        config: this.config.evolution
      },
      failover: this.failoverService?.getServicesHealth() || []
    };
  }

  /**
   * Reconecta todos os serviços
   */
  async reconnect(): Promise<void> {
    console.log('[Integration] Reconectando serviços...');
    
    this.isInitialized = false;
    await this.initialize();
  }

  /**
   * Finaliza todos os serviços
   */
  async shutdown(): Promise<void> {
    console.log('[Integration] Finalizando serviços de integração...');
    
    if (this.failoverService) {
      this.failoverService.stopHealthChecks();
    }

    this.isInitialized = false;
    this.n8nClient = null;
    this.evolutionClient = null;
    this.failoverService = null;
  }
}

// Instância singleton do serviço de integração
let integrationServiceInstance: IntegrationService | null = null;

export const createIntegrationService = (config: IntegrationConfig): IntegrationService => {
  integrationServiceInstance = new IntegrationService(config);
  return integrationServiceInstance;
};

export const getIntegrationService = (): IntegrationService | null => {
  return integrationServiceInstance;
};