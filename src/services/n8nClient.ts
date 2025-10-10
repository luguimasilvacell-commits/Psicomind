/**
 * Cliente para integração com n8n
 */
import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface N8nConfig {
  baseUrl: string;
  apiKey?: string;
  webhookUrl?: string;
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  finished: boolean;
  data: any;
}

export interface N8nWebhookPayload {
  workflowId: string;
  executionId: string;
  data: any;
  timestamp: string;
}

export class N8nClient {
  private client: AxiosInstance;
  private config: N8nConfig;

  constructor(config: N8nConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'X-N8N-API-KEY': config.apiKey })
      }
    });

    // Interceptor para logs
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[N8N] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[N8N] Request error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`[N8N] Response ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('[N8N] Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Testa a conexão com n8n
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Erro ao testar conexão n8n:', error);
      return false;
    }
  }

  /**
   * Lista workflows disponíveis
   */
  async getWorkflows(): Promise<N8nWorkflow[]> {
    try {
      const response: AxiosResponse<N8nWorkflow[]> = await this.client.get('/workflows');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar workflows:', error);
      throw new Error('Falha ao buscar workflows do n8n');
    }
  }

  /**
   * Busca um workflow específico
   */
  async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
    try {
      const response: AxiosResponse<N8nWorkflow> = await this.client.get(`/workflows/${workflowId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar workflow:', error);
      throw new Error(`Falha ao buscar workflow ${workflowId}`);
    }
  }

  /**
   * Executa um workflow
   */
  async executeWorkflow(workflowId: string, data: any = {}): Promise<N8nExecution> {
    try {
      const response: AxiosResponse<N8nExecution> = await this.client.post(
        `/workflows/${workflowId}/execute`,
        { data }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao executar workflow:', error);
      throw new Error(`Falha ao executar workflow ${workflowId}`);
    }
  }

  /**
   * Busca execuções de um workflow
   */
  async getExecutions(workflowId: string, limit: number = 10): Promise<N8nExecution[]> {
    try {
      const response: AxiosResponse<N8nExecution[]> = await this.client.get(
        `/executions?workflowId=${workflowId}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar execuções:', error);
      throw new Error(`Falha ao buscar execuções do workflow ${workflowId}`);
    }
  }

  /**
   * Busca uma execução específica
   */
  async getExecution(executionId: string): Promise<N8nExecution> {
    try {
      const response: AxiosResponse<N8nExecution> = await this.client.get(`/executions/${executionId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar execução:', error);
      throw new Error(`Falha ao buscar execução ${executionId}`);
    }
  }

  /**
   * Envia dados para um webhook n8n
   */
  async sendWebhook(webhookUrl: string, data: any): Promise<any> {
    try {
      const response = await axios.post(webhookUrl, data, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
      throw new Error('Falha ao enviar webhook para n8n');
    }
  }

  /**
   * Ativa/desativa um workflow
   */
  async toggleWorkflow(workflowId: string, active: boolean): Promise<N8nWorkflow> {
    try {
      const response: AxiosResponse<N8nWorkflow> = await this.client.patch(
        `/workflows/${workflowId}`,
        { active }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao alterar status do workflow:', error);
      throw new Error(`Falha ao ${active ? 'ativar' : 'desativar'} workflow ${workflowId}`);
    }
  }

  /**
   * Cria um novo workflow
   */
  async createWorkflow(workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    try {
      const response: AxiosResponse<N8nWorkflow> = await this.client.post('/workflows', workflow);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar workflow:', error);
      throw new Error('Falha ao criar workflow no n8n');
    }
  }

  /**
   * Atualiza um workflow existente
   */
  async updateWorkflow(workflowId: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    try {
      const response: AxiosResponse<N8nWorkflow> = await this.client.put(
        `/workflows/${workflowId}`,
        workflow
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar workflow:', error);
      throw new Error(`Falha ao atualizar workflow ${workflowId}`);
    }
  }

  /**
   * Deleta um workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      await this.client.delete(`/workflows/${workflowId}`);
    } catch (error) {
      console.error('Erro ao deletar workflow:', error);
      throw new Error(`Falha ao deletar workflow ${workflowId}`);
    }
  }

  /**
   * Processa payload de webhook recebido
   */
  static processWebhookPayload(payload: any): N8nWebhookPayload {
    return {
      workflowId: payload.workflowId || payload.workflow_id,
      executionId: payload.executionId || payload.execution_id,
      data: payload.data || payload,
      timestamp: payload.timestamp || new Date().toISOString()
    };
  }

  /**
   * Valida se o payload é de um webhook n8n válido
   */
  static isValidWebhookPayload(payload: any): boolean {
    return (
      payload &&
      (payload.workflowId || payload.workflow_id) &&
      (payload.executionId || payload.execution_id)
    );
  }
}

// Instância singleton do cliente n8n
let n8nClientInstance: N8nClient | null = null;

export const createN8nClient = (config: N8nConfig): N8nClient => {
  n8nClientInstance = new N8nClient(config);
  return n8nClientInstance;
};

export const getN8nClient = (): N8nClient | null => {
  return n8nClientInstance;
};