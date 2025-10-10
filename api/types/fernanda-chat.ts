// Tipos TypeScript para o Sistema de Chat WhatsApp da Fernanda
// Baseado no fluxo de atendimento analisado

// Tipos para mensagens WhatsApp
export interface ChatWhatsAppMessage {
  id: string;
  telefone: string;
  nome?: string;
  tipo_mensagem: 'texto' | 'audio' | 'imagem' | 'documento';
  conteudo: string;
  conteudo_original?: string; // Para áudios transcritos
  metadata: Record<string, any>;
  whatsapp_message_id?: string;
  timestamp_whatsapp?: string;
  direcao: 'entrada' | 'saida';
  processado: boolean;
  created_at: string;
  updated_at: string;
}

// Tipos para sessões de chat
export interface ChatSession {
  id: string;
  telefone: string;
  session_key: string;
  agente_bloqueado: boolean;
  motivo_bloqueio?: string;
  mensagem_concatenada: string;
  ultima_atividade: string;
  contexto_conversa: Record<string, any>;
  status: 'ativa' | 'pausada' | 'finalizada';
  created_at: string;
  updated_at: string;
}

// Tipos para configuração da IA
export interface AIConfig {
  id: string;
  nome: string;
  prompt_sistema: string;
  modelo_ia: string;
  temperatura: number;
  max_tokens: number;
  configuracoes_extras: Record<string, any>;
  ativo: boolean;
  versao: number;
  created_at: string;
  updated_at: string;
}

// Tipos para logs de processamento
export interface ChatProcessingLog {
  id: string;
  telefone: string;
  tipo_processamento: string;
  status: 'sucesso' | 'erro' | 'processando';
  detalhes: Record<string, any>;
  erro_mensagem?: string;
  tempo_processamento?: number;
  created_at: string;
}

// Tipos para controle de bloqueio
export interface AgentBlock {
  id: string;
  telefone: string;
  bloqueado: boolean;
  motivo?: string;
  bloqueado_em?: string;
  desbloqueado_em?: string;
  created_at: string;
  updated_at: string;
}

// Tipos para webhook do WhatsApp (Evolution API)
export interface WhatsAppWebhookData {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation?: string;
    audioMessage?: {
      url: string;
      mimetype: string;
      seconds: number;
    };
    imageMessage?: {
      url: string;
      mimetype: string;
      caption?: string;
    };
    documentMessage?: {
      url: string;
      mimetype: string;
      title: string;
    };
  };
  messageTimestamp: number;
  pushName?: string;
  participant?: string;
}

// Tipos para processamento de mensagens
export interface MessageProcessingContext {
  telefone: string;
  nome?: string;
  tipo_mensagem: 'texto' | 'audio' | 'imagem' | 'documento';
  conteudo: string;
  whatsapp_message_id: string;
  timestamp: Date;
  session?: ChatSession;
  agente_bloqueado?: boolean;
}

// Tipos para resposta da IA
export interface AIResponse {
  resposta: string;
  acao?: 'agendar' | 'remarcar' | 'cancelar' | 'informar' | 'encaminhar';
  parametros?: Record<string, any>;
  confianca: number;
  tempo_processamento: number;
}

// Tipos para configuração do Redis
export interface RedisSessionData {
  session_id?: string;
  telefone: string;
  nome?: string;
  iniciada_em?: string;
  mensagens_concatenadas: string;
  contexto?: Record<string, any>;
  ultima_atividade: string;
  agente_bloqueado: boolean;
  motivo_bloqueio?: string;
  metadata?: Record<string, any>;
}

// Tipos para transcrição de áudio
export interface AudioTranscription {
  texto: string;
  confianca: number;
  duracao: number;
  idioma: string;
  erro?: string;
}

// Tipos para integração com Google Calendar
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

// Tipos para confirmações automáticas
export interface ConfirmationJob {
  id: string;
  telefone: string;
  tipo: 'agendamento' | 'lembrete' | 'confirmacao';
  data_agendamento: string;
  mensagem: string;
  status: 'pendente' | 'enviado' | 'erro';
  tentativas: number;
  created_at: string;
}

// Tipos para estatísticas do chat
export interface ChatStats {
  total_mensagens: number;
  mensagens_hoje: number;
  sessoes_ativas: number;
  agentes_bloqueados: number;
  tempo_resposta_medio: number;
  taxa_resolucao: number;
}

// Tipos para configuração do sistema
export interface SystemConfig {
  evolution_api_url: string;
  evolution_api_key: string;
  instance_name: string;
  webhook_url: string;
  redis_url: string;
  openai_api_key: string;
  google_calendar_credentials: Record<string, any>;
  gemini_api_key?: string;
}

// Tipos para erros do sistema
export interface ChatError {
  codigo: string;
  mensagem: string;
  detalhes?: Record<string, any>;
  timestamp: string;
  telefone?: string;
  contexto?: string;
}

// Tipos para validação de entrada
export interface MessageValidation {
  valido: boolean;
  erros: string[];
  dados_limpos?: Partial<ChatWhatsAppMessage>;
}

// Tipos para métricas de performance
export interface PerformanceMetrics {
  sessoes_ativas: number;
  sessoes_ultima_hora: number;
  sessoes_ultimo_dia: number;
  tempo_medio_resposta: number;
  memoria_redis_mb: number;
  uptime_segundos: number;
}

// Tipos para backup e recuperação
export interface BackupData {
  mensagens: ChatWhatsAppMessage[];
  sessoes: ChatSession[];
  configuracoes: AIConfig[];
  logs: ChatProcessingLog[];
  timestamp_backup: string;
  versao: string;
}

// Tipos para webhooks de saída
export interface OutgoingWebhook {
  url: string;
  evento: string;
  dados: Record<string, any>;
  headers?: Record<string, string>;
  retry_count: number;
  max_retries: number;
}

// Tipos para rate limiting
export interface RateLimit {
  telefone: string;
  contador: number;
  janela_tempo: string;
  limite_maximo: number;
  bloqueado_ate?: string;
}

// Tipos para cache do Redis
export interface CacheEntry<T = any> {
  chave: string;
  valor: T;
  ttl: number;
  timestamp: string;
}

// Tipos para monitoramento
export interface HealthCheck {
  servico: string;
  status: 'saudavel' | 'degradado' | 'indisponivel';
  latencia: number;
  ultima_verificacao: string;
  detalhes?: Record<string, any>;
}

// Tipos para auditoria
export interface AuditLog {
  id: string;
  usuario?: string;
  acao: string;
  recurso: string;
  dados_anteriores?: Record<string, any>;
  dados_novos?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

// Tipos para notificações
export interface Notification {
  id: string;
  tipo: 'info' | 'warning' | 'error' | 'success';
  titulo: string;
  mensagem: string;
  destinatario: string;
  canal: 'whatsapp' | 'email' | 'sms' | 'push';
  status: 'pendente' | 'enviado' | 'entregue' | 'erro';
  created_at: string;
}

// Tipos para integração com n8n
export interface N8nWorkflowTrigger {
  workflow_id: string;
  dados_entrada: Record<string, any>;
  callback_url?: string;
  prioridade: 'baixa' | 'normal' | 'alta' | 'critica';
}

// Tipos para análise de sentimento
export interface SentimentAnalysis {
  score: number; // -1 a 1
  magnitude: number; // 0 a 1
  classificacao: 'muito_negativo' | 'negativo' | 'neutro' | 'positivo' | 'muito_positivo';
  confianca: number;
  emocoes_detectadas: string[];
}

// Tipos para templates de mensagem
export interface MessageTemplate {
  id: string;
  nome: string;
  categoria: string;
  template: string;
  variaveis: string[];
  ativo: boolean;
  uso_count: number;
  created_at: string;
}

// Tipos para agendamentos
export interface Appointment {
  id: string;
  paciente_telefone: string;
  paciente_nome: string;
  data_hora: string;
  duracao_minutos: number;
  tipo_consulta: string;
  status: 'agendado' | 'confirmado' | 'cancelado' | 'realizado';
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

// Tipos para relatórios
export interface ChatReport {
  periodo: {
    inicio: string;
    fim: string;
  };
  metricas: {
    total_conversas: number;
    total_mensagens: number;
    tempo_resposta_medio: number;
    satisfacao_media: number;
    agendamentos_realizados: number;
  };
  graficos: {
    mensagens_por_dia: Array<{ data: string; quantidade: number }>;
    tipos_mensagem: Array<{ tipo: string; quantidade: number }>;
    horarios_pico: Array<{ hora: number; quantidade: number }>;
  };
  insights: string[];
}