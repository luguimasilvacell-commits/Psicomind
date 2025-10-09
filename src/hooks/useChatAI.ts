import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner'

// Função para log de interações de IA
const logAIInteraction = async (interaction: {
  userId?: string
  sessionId?: string
  model: string
  prompt: string
  response: string
  tokens: { input: number; output: number; total: number }
  duration: number
  success: boolean
  error?: string
  sentiment?: { score: number; label: string; confidence: number }
  riskLevel?: 'low' | 'medium' | 'high'
  templateUsed?: string
  metadata?: Record<string, any>
}) => {
  try {
    await fetch('/api/logs/ai-interaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interaction)
    })
  } catch (error) {
    console.warn('Erro ao registrar log de IA:', error)
  }
}

interface ChatAIConfig {
  geminiApiKey: string;
  // Evolution API fields
  evolutionServerUrl: string;
  evolutionApiKey: string;
  evolutionInstanceName: string;
  evolutionWebhookUrl?: string;
  // Legacy WhatsApp fields (for backward compatibility)
  whatsappToken: string;
  whatsappPhoneId: string;
  whatsappVerifyToken: string;
  aiModel: string;
  temperature: number;
  maxTokens: number;
  autoResponse: boolean;
  sentimentAnalysis: boolean;
}

interface ConnectionStatus {
  gemini: boolean;
  whatsapp: boolean;
  whatsappInstanceStatus?: string;
  lastChecked: Date | null;
  errors?: {
    gemini?: string;
    whatsapp?: string;
  };
}

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  sentiment?: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high';
    emotionalState: string;
    suggestedActions: string[];
  };
  metadata?: {
    model?: string;
    responseTime?: number;
    tokensUsed?: number;
  };
}

interface AIResponse {
  content: string;
  suggestions?: string[];
  sentiment?: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high';
    emotionalState: string;
    suggestedActions: string[];
  };
  metadata?: {
    model: string;
    timestamp: Date;
    responseTime: number;
    tokensUsed?: number;
  };
}

const API_BASE_URL = '/api';

// Funções de API
const apiClient = {
  // Gemini APIs
  configureGemini: async (config: { apiKey: string; model?: string; temperature?: number; maxTokens?: number }) => {
    const response = await fetch(`${API_BASE_URL}/ai/gemini/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return response.json();
  },

  getGeminiStatus: async () => {
    const response = await fetch(`${API_BASE_URL}/ai/gemini/status`);
    return response.json();
  },

  sendGeminiMessage: async (message: string, context?: any) => {
    const response = await fetch(`${API_BASE_URL}/ai/gemini/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, ...context }),
    });
    return response.json();
  },

  // WhatsApp APIs (Evolution API)
  configureWhatsApp: async (config: { serverUrl: string; apiKey: string; instanceName: string; webhookUrl?: string }) => {
    const response = await fetch(`${API_BASE_URL}/ai/whatsapp/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return response.json();
  },

  getWhatsAppStatus: async () => {
    const response = await fetch(`${API_BASE_URL}/ai/whatsapp/status`);
    return response.json();
  },

  connectWhatsAppInstance: async () => {
    const response = await fetch(`${API_BASE_URL}/ai/whatsapp/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
  },

  sendWhatsAppMessage: async (to: string, message: string, options?: any) => {
    const response = await fetch(`${API_BASE_URL}/ai/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message, ...options }),
    });
    return response.json();
  },

  // Sentiment Analysis APIs
  analyzeSentiment: async (text: string, context?: any) => {
    const response = await fetch(`${API_BASE_URL}/ai/sentiment/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, ...context }),
    });
    return response.json();
  },

  // Combined AI Processing
  processMessage: async (message: string, options?: any) => {
    const response = await fetch(`${API_BASE_URL}/ai/process-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, ...options }),
    });
    return response.json();
  },
};

export function useChatAI() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<ChatAIConfig>({
    geminiApiKey: '',
    // Evolution API fields
    evolutionServerUrl: '',
    evolutionApiKey: '',
    evolutionInstanceName: '',
    evolutionWebhookUrl: '',
    // Legacy WhatsApp fields
    whatsappToken: '',
    whatsappPhoneId: '',
    whatsappVerifyToken: '',
    aiModel: 'gemini-pro',
    temperature: 0.7,
    maxTokens: 2048,
    autoResponse: true,
    sentimentAnalysis: true,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar configurações do localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('chatAI-config');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    }
  }, []);

  // Salvar configurações no localStorage
  const saveConfig = useCallback((newConfig: ChatAIConfig) => {
    setConfig(newConfig);
    localStorage.setItem('chatAI-config', JSON.stringify(newConfig));
  }, []);

  // Query para status do Gemini
  const { data: geminiStatus, refetch: refetchGeminiStatus } = useQuery({
    queryKey: ['gemini-status'],
    queryFn: apiClient.getGeminiStatus,
    refetchInterval: 30000, // Refetch a cada 30 segundos
    retry: 2,
  });

  // Query para status do WhatsApp
  const { data: whatsappStatus, refetch: refetchWhatsAppStatus } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: apiClient.getWhatsAppStatus,
    refetchInterval: 30000,
    retry: 2,
  });

  // Mutation para configurar Gemini
  const configureGeminiMutation = useMutation({
    mutationFn: apiClient.configureGemini,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gemini-status'] });
    },
  });

  // Mutation para configurar WhatsApp
  const configureWhatsAppMutation = useMutation({
    mutationFn: apiClient.configureWhatsApp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });

  // Mutation para conectar instância WhatsApp
  const connectWhatsAppInstanceMutation = useMutation({
    mutationFn: apiClient.connectWhatsAppInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });

  // Mutation para enviar mensagem via Gemini
  const sendGeminiMessageMutation = useMutation({
    mutationFn: async ({ message, context }: { message: string; context?: any }) => {
      const startTime = Date.now()
      
      try {
        const result = await apiClient.sendGeminiMessage(message, context)
        const duration = Date.now() - startTime

        // Log de sucesso
        await logAIInteraction({
          model: result.metadata?.model || 'gemini-pro',
          prompt: message,
          response: result.content || '',
          tokens: {
            input: message.length,
            output: result.content?.length || 0,
            total: message.length + (result.content?.length || 0)
          },
          duration,
          success: true,
          sentiment: result.sentiment,
          riskLevel: result.sentiment?.riskLevel,
          metadata: {
            model: result.metadata?.model,
            responseTime: result.metadata?.responseTime
          }
        })

        return result
      } catch (error) {
        const duration = Date.now() - startTime
        
        // Log de erro
        await logAIInteraction({
          model: 'gemini-pro',
          prompt: message,
          response: '',
          tokens: { input: 0, output: 0, total: 0 },
          duration,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          metadata: { errorType: 'api_error' }
        })
        
        throw error
      }
    },
  });

  // Mutation para enviar mensagem via WhatsApp
  const sendWhatsAppMessageMutation = useMutation({
    mutationFn: ({ to, message, options }: { to: string; message: string; options?: any }) =>
      apiClient.sendWhatsAppMessage(to, message, options),
  });

  // Mutation para análise de sentimentos
  const analyzeSentimentMutation = useMutation({
    mutationFn: ({ text, context }: { text: string; context?: any }) =>
      apiClient.analyzeSentiment(text, context),
  });

  // Mutation para processamento completo de mensagem
  const processMessageMutation = useMutation({
    mutationFn: async ({ message, options }: { message: string; options?: any }) => {
      const startTime = Date.now()
      
      try {
        const result = await apiClient.processMessage(message, options)
        const duration = Date.now() - startTime

        // Log de sucesso
        await logAIInteraction({
          model: result.aiResponse?.metadata?.model || 'gemini-pro',
          prompt: message,
          response: result.aiResponse?.response || '',
          tokens: {
            input: message.length,
            output: result.aiResponse?.response?.length || 0,
            total: message.length + (result.aiResponse?.response?.length || 0)
          },
          duration,
          success: true,
          sentiment: result.sentiment,
          riskLevel: result.sentiment?.riskLevel,
          metadata: {
            model: result.aiResponse?.metadata?.model,
            responseTime: result.aiResponse?.metadata?.responseTime,
            sentimentAnalysis: !!result.sentiment
          }
        })

        return result
      } catch (error) {
        const duration = Date.now() - startTime
        
        // Log de erro
        await logAIInteraction({
          model: 'gemini-pro',
          prompt: message,
          response: '',
          tokens: { input: 0, output: 0, total: 0 },
          duration,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          metadata: { errorType: 'processing_error' }
        })
        
        throw error
      }
    },
  });

  // Função para sugerir resposta usando templates
  const suggestTemplateResponse = useMutation({
    mutationFn: async (context: {
      message: string
      sentiment?: 'positive' | 'negative' | 'neutral'
      riskLevel?: 'low' | 'medium' | 'high'
      variables?: Record<string, string>
    }) => {
      const response = await fetch('/api/templates/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      })
      if (!response.ok) throw new Error('Erro ao sugerir resposta')
      return response.json()
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        toast.success(`Sugestão de template: ${data.data.template.name} (${Math.round(data.data.confidence * 100)}% confiança)`)
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sugerir template: ${error.message}`)
    }
  })

  // Funções de configuração
  const configureGemini = async (apiKey: string, model?: string, temperature?: number, maxTokens?: number) => {
    try {
      const result = await configureGeminiMutation.mutateAsync({
        apiKey,
        model: model || config.aiModel,
        temperature: temperature || config.temperature,
        maxTokens: maxTokens || config.maxTokens,
      });
      
      if (result.success) {
        // Salvar configuração independentemente do status da conexão
        saveConfig({ ...config, geminiApiKey: apiKey });
        
        if (result.connected) {
          toast.success('Gemini configurado e conectado com sucesso!');
        } else {
          toast.warning(`Gemini configurado, mas conexão falhou: ${result.error || 'Verifique sua API key'}`);
        }
        return true;
      } else {
        toast.error(result.error || 'Erro ao configurar Gemini');
        return false;
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao configurar Gemini');
      return false;
    }
  };

  const configureWhatsApp = async (serverUrl: string, apiKey: string, instanceName: string, webhookUrl?: string) => {
    try {
      const result = await configureWhatsAppMutation.mutateAsync({
        serverUrl,
        apiKey,
        instanceName,
        webhookUrl,
      });
      
      if (result.success) {
        saveConfig({ 
          ...config, 
          evolutionServerUrl: serverUrl,
          evolutionApiKey: apiKey,
          evolutionInstanceName: instanceName,
          evolutionWebhookUrl: webhookUrl || ''
        });
        toast.success('WhatsApp (Evolution API) configurado com sucesso!');
        return true;
      } else {
        toast.error(result.error || 'Erro ao configurar WhatsApp');
        return false;
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao configurar WhatsApp');
      return false;
    }
  };

  const connectWhatsAppInstance = async (): Promise<{ success: boolean; qrCode?: string; error?: string }> => {
    try {
      const result = await connectWhatsAppInstanceMutation.mutateAsync();
      
      if (result.success) {
        toast.success('Conectando instância WhatsApp...');
        return result;
      } else {
        toast.error(result.error || 'Erro ao conectar instância WhatsApp');
        return result;
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao conectar instância WhatsApp');
      return { success: false, error: error.message };
    }
  };

  // Funções de envio de mensagens
  const sendMessageToGemini = async (message: string, context?: any): Promise<AIResponse> => {
    try {
      const result = await sendGeminiMessageMutation.mutateAsync({ message, context });
      
      if (result.success) {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          content: message,
          role: 'user',
          timestamp: new Date(),
        };
        
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: result.response,
          role: 'assistant',
          timestamp: new Date(),
          sentiment: result.sentiment,
          metadata: result.metadata,
        };
        
        setMessages(prev => [...prev, newMessage, aiMessage]);
        
        // Sugerir template se aplicável
        if (result.sentiment && config.sentimentAnalysis) {
          suggestTemplateResponse.mutate({
            message,
            sentiment: result.sentiment.label,
            riskLevel: result.sentiment.riskLevel
          })
        }
        
        return result;
      } else {
        throw new Error(result.error || 'Erro ao enviar mensagem para Gemini');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao enviar mensagem para Gemini');
    }
  };

  const sendWhatsAppMessage = async (to: string, message: string, options?: any): Promise<boolean> => {
    try {
      const result = await sendWhatsAppMessageMutation.mutateAsync({ to, message, options });
      
      if (result.success) {
        toast.success('Mensagem enviada via WhatsApp!');
        return true;
      } else {
        toast.error(result.error || 'Erro ao enviar mensagem via WhatsApp');
        return false;
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar mensagem via WhatsApp');
      return false;
    }
  };

  // Função para análise de sentimentos
  const analyzeSentiment = async (text: string, context?: any) => {
    try {
      const result = await analyzeSentimentMutation.mutateAsync({ text, context });
      return result;
    } catch (error: any) {
      console.error('Erro na análise de sentimentos:', error);
      return null;
    }
  };

  // Função para processamento completo de mensagem
  const processMessage = async (message: string, options?: any) => {
    try {
      const result = await processMessageMutation.mutateAsync({ message, options });
      
      if (result.success) {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          content: message,
          role: 'user',
          timestamp: new Date(),
        };
        
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: result.aiResponse.response,
          role: 'assistant',
          timestamp: new Date(),
          sentiment: result.sentiment,
          metadata: result.aiResponse.metadata,
        };
        
        setMessages(prev => [...prev, newMessage, aiMessage]);
        
        // Sugerir template se aplicável
        if (result.sentiment && config.sentimentAnalysis) {
          suggestTemplateResponse.mutate({
            message,
            sentiment: result.sentiment.label,
            riskLevel: result.sentiment.riskLevel
          })
        }
        
        return result;
      } else {
        throw new Error(result.error || 'Erro ao processar mensagem');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao processar mensagem');
    }
  };

  // Função para limpar histórico de mensagens
  const clearMessages = () => {
    setMessages([]);
  };

  // Função para adicionar mensagem manualmente
  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const getIntelligentResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase()

    // Respostas mais elaboradas e contextuais
    if (lowerMessage.includes('ansiedade') || lowerMessage.includes('ansioso')) {
      return `**Manejo da Ansiedade em Terapia**

A ansiedade é uma das queixas mais comuns na prática clínica. Aqui estão algumas abordagens eficazes:

**Técnicas Imediatas:**
• Respiração diafragmática (4-7-8)
• Grounding (técnica 5-4-3-2-1)
• Relaxamento muscular progressivo

**Intervenções Cognitivas:**
• Identificação de pensamentos catastróficos
• Reestruturação cognitiva
• Registro de pensamentos automáticos

**Estratégias Comportamentais:**
• Exposição gradual aos medos
• Agenda de atividades prazerosas
• Técnicas de mindfulness

**Avaliação Importante:**
• Intensidade e frequência dos sintomas
• Impacto no funcionamento diário
• Presença de ataques de pânico
• Histórico familiar

Recomendo sempre uma avaliação completa antes de definir o plano terapêutico.`
    }

    if (lowerMessage.includes('depressão') || lowerMessage.includes('deprimido')) {
      return `**Abordagem Terapêutica para Depressão**

A depressão requer uma avaliação cuidadosa e abordagem multifacetada:

**Avaliação de Risco:**
• Ideação suicida (escala de Columbia)
• Histórico de tentativas anteriores
• Fatores de proteção e risco
• Rede de apoio social

**Intervenções Terapêuticas:**
• Terapia Cognitivo-Comportamental
• Ativação comportamental
• Terapia interpessoal
• Mindfulness-based interventions

**Sinais de Alerta:**
• Isolamento social extremo
• Perda significativa de peso
• Insônia ou hipersonia
• Sentimentos de desesperança

**Encaminhamentos:**
• Avaliação psiquiátrica se necessário
• Grupos de apoio
• Atividades físicas supervisionadas

Lembre-se: sempre documente adequadamente e mantenha contato regular com pacientes em risco.`
    }

    if (lowerMessage.includes('primeira sessão') || lowerMessage.includes('inicial')) {
      return `**Estrutura para Primeira Sessão**

A primeira sessão é crucial para estabelecer o vínculo terapêutico:

**Preparação (5-10 min):**
• Ambiente acolhedor e privativo
• Documentos e materiais organizados
• Revisão prévia de informações disponíveis

**Rapport e Apresentação (10-15 min):**
• Apresentação pessoal e profissional
• Explicação sobre sigilo e ética
• Esclarecimento sobre o processo terapêutico

**Anamnese (25-30 min):**
• Motivo da busca por terapia
• Histórico pessoal e familiar
• Sintomas atuais e duração
• Expectativas sobre o tratamento

**Fechamento (5-10 min):**
• Resumo da sessão
• Definição de objetivos iniciais
• Agendamento da próxima sessão
• Orientações entre sessões

**Documentação:**
• Prontuário detalhado
• Impressões clínicas iniciais
• Plano terapêutico preliminar`
    }

    if (lowerMessage.includes('prontuário') || lowerMessage.includes('documentação')) {
      return `**Documentação Clínica Adequada**

A documentação é fundamental para a prática ética e eficaz:

**Elementos Essenciais:**
• Data, horário e duração da sessão
• Objetivos trabalhados
• Técnicas utilizadas
• Observações comportamentais
• Progresso ou retrocessos
• Plano para próxima sessão

**Aspectos Legais:**
• Linguagem técnica e objetiva
• Sem julgamentos pessoais
• Proteção da privacidade
• Assinatura e CRP

**Organização:**
• Cronológica e sistemática
• Fácil localização de informações
• Backup seguro dos dados
• Acesso restrito

**Dicas Práticas:**
• Anote imediatamente após a sessão
• Use abreviações padronizadas
• Mantenha confidencialidade absoluta
• Revise periodicamente

Lembre-se: o prontuário pode ser solicitado pelo CFP ou em processos legais.`
    }

    if (lowerMessage.includes('técnica') || lowerMessage.includes('intervenção')) {
      return `**Técnicas Terapêuticas por Abordagem**

**Cognitivo-Comportamental:**
• Reestruturação cognitiva
• Exposição e prevenção de resposta
• Treino de habilidades sociais
• Registro de pensamentos
• Experimentos comportamentais

**Humanística/Gestalt:**
• Escuta ativa e empática
• Reflexão de sentimentos
• Técnica da cadeira vazia
• Aqui e agora
• Awareness corporal

**Psicodinâmica:**
• Interpretação de transferência
• Análise de sonhos
• Associação livre
• Insight sobre padrões

**Sistêmica:**
• Genograma familiar
• Reestruturação familiar
• Técnicas de comunicação
• Intervenções paradoxais

**Terceira Onda:**
• Mindfulness
• Aceitação e compromisso (ACT)
• Terapia dialético-comportamental (DBT)
• Compaixão focada

Escolha sempre baseada no caso específico e sua formação teórica.`
    }

    // Resposta padrão mais elaborada
    return `**Assistente IA para Psicólogos**

Olá! Sou seu assistente especializado em prática clínica. Posso ajudar com:

**📋 Gestão Clínica:**
• Orientações sobre documentação
• Estruturação de sessões
• Planos terapêuticos

**🧠 Conhecimento Técnico:**
• Técnicas por abordagem teórica
• Manejo de transtornos específicos
• Protocolos de avaliação

**⚖️ Aspectos Éticos:**
• Código de ética profissional
• Situações de sigilo
• Encaminhamentos necessários

**📊 Desenvolvimento:**
• Supervisão e casos clínicos
• Educação continuada
• Pesquisa em psicologia

**Como posso ajudar especificamente hoje?** 

Seja mais específico sobre sua dúvida para que eu possa fornecer orientações mais direcionadas e úteis para sua prática clínica.`
  }

  // Status de conexão
  const status: ConnectionStatus = {
    gemini: geminiStatus?.connected || false,
    whatsapp: whatsappStatus?.connected || false,
    whatsappInstanceStatus: whatsappStatus?.instanceStatus,
    lastChecked: new Date(),
    errors: {
      gemini: geminiStatus?.error,
      whatsapp: whatsappStatus?.error,
    },
  };

  return {
    config,
    messages,
    status,
    loading: sendGeminiMessageMutation.isPending || 
             sendWhatsAppMessageMutation.isPending || 
             analyzeSentimentMutation.isPending || 
             processMessageMutation.isPending ||
             configureGeminiMutation.isPending ||
             configureWhatsAppMutation.isPending ||
             connectWhatsAppInstanceMutation.isPending ||
             suggestTemplateResponse.isPending,
    saveConfig,
    configureGemini,
    configureWhatsApp,
    connectWhatsAppInstance,
    sendMessageToGemini,
    sendWhatsAppMessage,
    analyzeSentiment,
    processMessage,
    suggestTemplateResponse,
    clearMessages,
    addMessage,
    getIntelligentResponse,
    refetchGeminiStatus,
    refetchWhatsAppStatus,
  }
}