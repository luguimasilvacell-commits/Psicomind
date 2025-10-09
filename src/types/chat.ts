/**
 * Tipos TypeScript para o Sistema de Chat WhatsApp
 * Baseado na arquitetura técnica definida na documentação
 */

// Tipos básicos para entidades do chat
export interface Conversa {
  id: string;
  psicologo_id: string;
  paciente_id: string;
  ultima_mensagem: string;
  ativa: boolean;
  mensagens_nao_lidas: number;
  created_at: string;
  updated_at: string;
  
  // Dados relacionados (joins)
  paciente?: {
    id: string;
    nome: string;
    telefone: string;
    email?: string;
  };
  preview_mensagem?: string;
}

export interface Mensagem {
  id: string;
  conversa_id: string;
  conteudo: string;
  tipo: 'texto' | 'imagem' | 'audio' | 'documento';
  direcao: 'enviada' | 'recebida';
  status_entrega: 'enviando' | 'entregue' | 'lida' | 'erro';
  metadata: Record<string, any>;
  created_at: string;
  whatsapp_message_id?: string;
  reply_to_message_id?: string;
  
  // Dados relacionados
  reply_to_message?: Mensagem;
}

export interface ConfiguracaoWhatsApp {
  id: string;
  psicologo_id: string;
  evolution_api_url: string;
  evolution_api_key: string;
  instance_name: string;
  numero_whatsapp?: string;
  ativo: boolean;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatAuditLog {
  id: string;
  psicologo_id?: string;
  paciente_id?: string;
  action_type: 'message_sent' | 'message_received' | 'message_read' | 'conversation_accessed' | 'data_exported' | 'config_changed';
  resource_type: 'message' | 'conversation' | 'configuration' | 'export';
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

export interface ChatConsentRecord {
  id: string;
  paciente_id: string;
  consent_type: 'whatsapp_communication' | 'data_processing' | 'data_retention' | 'data_sharing';
  consent_text: string;
  granted_at: string;
  ip_address?: string;
  evidence: Record<string, any>;
}

// Tipos para API requests/responses
export interface ListarConversasRequest {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface ListarConversasResponse {
  conversas: Conversa[];
  total: number;
  hasMore: boolean;
}

export interface BuscarMensagensRequest {
  pacienteId: string;
  limit?: number;
  before?: string;
}

export interface BuscarMensagensResponse {
  mensagens: Mensagem[];
  hasMore: boolean;
}

export interface EnviarMensagemRequest {
  pacienteId: string;
  conteudo: string;
  tipo?: 'texto' | 'imagem' | 'audio' | 'documento';
  replyToMessageId?: string;
}

export interface EnviarMensagemResponse {
  mensagemId: string;
  status: string;
  timestamp: string;
}

export interface ConfigurarEvolutionAPIRequest {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  numeroWhatsapp?: string;
}

// Tipos para WebSocket events
export interface WebSocketEvents {
  // Eventos do cliente para servidor
  join_chat: { conversaId: string };
  leave_chat: { conversaId: string };
  typing_start: { conversaId: string };
  typing_stop: { conversaId: string };
  
  // Eventos do servidor para cliente
  new_message: { mensagem: Mensagem };
  message_status: { mensagemId: string; status: string };
  user_typing: { conversaId: string; isTyping: boolean };
  conversation_updated: { conversa: Conversa };
}

// Tipos para Evolution API
export interface EvolutionAPIMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation?: string;
    imageMessage?: {
      url: string;
      mimetype: string;
      caption?: string;
    };
    audioMessage?: {
      url: string;
      mimetype: string;
    };
    documentMessage?: {
      url: string;
      mimetype: string;
      title: string;
    };
  };
  messageTimestamp: number;
  status: string;
}

export interface EvolutionAPIWebhookPayload {
  event: 'message' | 'status';
  instance: string;
  data: EvolutionAPIMessage;
}

export interface EvolutionAPIConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  webhookSecret: string;
  allowedIPs: string[];
  rateLimiting: {
    maxRequests: number;
    windowMs: number;
  };
}

// Tipos para componentes React
export interface ChatListProps {
  conversas: Conversa[];
  onSelectConversa: (conversa: Conversa) => void;
  selectedConversaId?: string;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export interface ChatWindowProps {
  conversa: Conversa;
  mensagens: Mensagem[];
  onSendMessage: (conteudo: string) => void;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export interface MessageBubbleProps {
  mensagem: Mensagem;
  isOwn: boolean;
  showTimestamp?: boolean;
  onReply?: (mensagem: Mensagem) => void;
}

export interface ChatInputProps {
  onSendMessage: (conteudo: string) => void;
  disabled?: boolean;
  placeholder?: string;
  replyToMessage?: Mensagem;
  onCancelReply?: () => void;
}

export interface PatientInfoPanelProps {
  paciente: {
    id: string;
    nome: string;
    telefone: string;
    email?: string;
  };
  proximosAgendamentos?: Array<{
    id: string;
    data_hora: string;
    tipo: string;
    status: string;
  }>;
}

// Tipos para hooks
export interface UseChatReturn {
  conversas: Conversa[];
  selectedConversa: Conversa | null;
  mensagens: Mensagem[];
  loading: boolean;
  error: string | null;
  
  // Actions
  selectConversa: (conversa: Conversa) => void;
  sendMessage: (conteudo: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  markAsRead: (conversaId: string) => Promise<void>;
  searchConversations: (term: string) => Promise<void>;
}

export interface UseWebSocketReturn {
  connected: boolean;
  joinChat: (conversaId: string) => void;
  leaveChat: (conversaId: string) => void;
  startTyping: (conversaId: string) => void;
  stopTyping: (conversaId: string) => void;
}

export interface UseEvolutionAPIReturn {
  config: ConfiguracaoWhatsApp | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  updateConfig: (config: ConfigurarEvolutionAPIRequest) => Promise<void>;
  testConnection: () => Promise<boolean>;
  getInstanceStatus: () => Promise<string>;
}

// Tipos para estatísticas
export interface ChatStats {
  total_conversas: number;
  conversas_ativas: number;
  total_mensagens: number;
  mensagens_nao_lidas: number;
  ultima_atividade: string | null;
}

export interface SecurityMetrics {
  hour: string;
  action_type: string;
  action_count: number;
  unique_users: number;
  unique_ips: number;
}

// Tipos para filtros e busca
export interface ChatFilters {
  search?: string;
  status?: 'ativa' | 'inativa';
  dateRange?: {
    start: string;
    end: string;
  };
  pacienteId?: string;
}

export interface ConversationSearchResult {
  conversa_id: string;
  paciente_id: string;
  paciente_nome: string;
  paciente_telefone: string;
  ultima_mensagem: string;
  mensagens_nao_lidas: number;
  ativa: boolean;
  preview_mensagem: string;
}

// Tipos para notificações
export interface ChatNotification {
  id: string;
  type: 'new_message' | 'connection_status' | 'error';
  title: string;
  message: string;
  conversaId?: string;
  timestamp: string;
  read: boolean;
}

// Tipos para configurações de segurança
export interface SecurityConfig {
  requireMFA: boolean;
  mfaMethods: ('sms' | 'email' | 'authenticator')[];
  sessionTimeout: number;
  maxFailedAttempts: number;
  encryptionEnabled: boolean;
  auditLogRetention: number; // dias
}

// Tipos para exportação de dados
export interface ExportRequest {
  pacienteId?: string;
  dateRange: {
    start: string;
    end: string;
  };
  format: 'json' | 'csv' | 'pdf';
  includeMetadata: boolean;
}

export interface ExportedData {
  conversas: Conversa[];
  mensagens: Mensagem[];
  metadata: {
    exportedAt: string;
    exportedBy: string;
    totalConversas: number;
    totalMensagens: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}