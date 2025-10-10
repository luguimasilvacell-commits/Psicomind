/**
 * Tipos TypeScript para o sistema de chat WhatsApp Web
 */

// Tipos básicos
export type MessageType = 'text' | 'image' | 'document' | 'audio' | 'video';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';
export type SenderType = 'patient' | 'psychologist';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'qr' | 'connected' | 'error';

// Interface para Paciente (simplificada para o chat)
export interface ChatPatient {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
}

// Interface para Mensagem
export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  message_type: MessageType;
  sender_type: SenderType;
  whatsapp_message_id?: string;
  media_url?: string;
  media_type?: string;
  status: MessageStatus;
  timestamp: string;
  created_at: string;
}

// Interface para Conversa
export interface Conversation {
  id: string;
  patient_id: string;
  psychologist_id: string;
  whatsapp_chat_id: string;
  last_message_at: string | null;
  unread_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  patient?: ChatPatient;
  last_message?: {
    content: string;
    message_type: MessageType;
    sender_type: SenderType;
    timestamp: string;
  };
}

// Interface para Template de Mensagem
export interface MessageTemplate {
  id: string;
  psychologist_id: string;
  name: string;
  content: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Interface para Configuração do WhatsApp
export interface WhatsAppConfig {
  id: string;
  psychologist_id: string;
  auto_reply_enabled: boolean;
  auto_reply_message?: string;
  business_hours_enabled: boolean;
  business_hours_start?: string;
  business_hours_end?: string;
  away_message?: string;
  webhook_url?: string;
  is_connected: boolean;
  last_connection: string | null;
  created_at: string;
  updated_at: string;
}

// Interface para Estatísticas de Conversa
export interface ConversationStats {
  total_conversations: number;
  active_conversations: number;
  total_messages: number;
  unread_messages: number;
  last_activity: string | null;
}

// Tipos para WebSocket
export interface SocketMessage {
  type: 'new_message' | 'message_status_update' | 'typing_indicator' | 'connection_status' | 'qr_code';
  data: any;
  conversationId?: string;
  timestamp: string;
}

export interface TypingIndicator {
  conversationId: string;
  isTyping: boolean;
  userId: string;
}

// Props para componentes
export interface ChatMainProps {
  className?: string;
}

export interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId?: string;
  onSelectConversation: (conversation: Conversation) => void;
  onSearchChange: (search: string) => void;
  searchTerm: string;
  loading?: boolean;
}

export interface MessageAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  onSendMessage: (content: string, type?: MessageType, file?: File) => void;
  onMarkAsRead: () => void;
  loading?: boolean;
  typing?: boolean;
}

export interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
}

export interface MessageInputProps {
  onSendMessage: (content: string, type?: MessageType, file?: File) => void;
  disabled?: boolean;
  placeholder?: string;
  onTyping?: (isTyping: boolean) => void;
}

export interface WhatsAppConnectionProps {
  status: ConnectionStatus;
  qrCode?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onRestart: () => void;
  loading?: boolean;
}

export interface TemplateManagerProps {
  templates: MessageTemplate[];
  onCreateTemplate: (template: Omit<MessageTemplate, 'id' | 'psychologist_id' | 'created_at' | 'updated_at'>) => void;
  onUpdateTemplate: (id: string, updates: Partial<MessageTemplate>) => void;
  onDeleteTemplate: (id: string) => void;
  onUseTemplate: (template: MessageTemplate) => void;
  loading?: boolean;
}

export interface TemplateFormProps {
  template?: MessageTemplate;
  onSubmit: (template: Omit<MessageTemplate, 'id' | 'psychologist_id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

// Tipos para hooks
export interface UseChatReturn {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectConversation: (conversation: Conversation) => void;
  sendMessage: (content: string, type?: MessageType, file?: File) => Promise<void>;
  markAsRead: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  refreshMessages: () => Promise<void>;
}

export interface UseWhatsAppReturn {
  status: ConnectionStatus;
  qrCode: string | null;
  config: WhatsAppConfig | null;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  restart: () => Promise<void>;
  updateConfig: (updates: Partial<WhatsAppConfig>) => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export interface UseTemplatesReturn {
  templates: MessageTemplate[];
  categories: string[];
  loading: boolean;
  error: string | null;
  createTemplate: (template: Omit<MessageTemplate, 'id' | 'psychologist_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTemplate: (id: string, updates: Partial<MessageTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (id: string, name?: string) => Promise<void>;
  refreshTemplates: () => Promise<void>;
}

export interface UseSocketReturn {
  connected: boolean;
  error: string | null;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
  connect: () => void;
  disconnect: () => void;
}

// Tipos para API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Tipos para formulários
export interface SendMessageForm {
  content: string;
  type: MessageType;
  file?: File;
}

export interface TemplateForm {
  name: string;
  content: string;
  category: string;
  is_active: boolean;
}

export interface WhatsAppConfigForm {
  auto_reply_enabled: boolean;
  auto_reply_message: string;
  business_hours_enabled: boolean;
  business_hours_start: string;
  business_hours_end: string;
  away_message: string;
  webhook_url: string;
}

// Tipos para filtros e busca
export interface ConversationFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  dateFrom?: string;
  dateTo?: string;
  hasUnread?: boolean;
}

export interface MessageFilters {
  type?: MessageType;
  sender?: SenderType;
  status?: MessageStatus;
  dateFrom?: string;
  dateTo?: string;
}

// Tipos para exportação
export interface ExportOptions {
  format: 'json' | 'csv';
  includeMedia: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface ExportData {
  conversation: {
    id: string;
    patient_name: string;
    patient_phone: string;
    created_at: string;
    exported_at: string;
  };
  messages: Message[];
}

// Tipos para notificações
export interface ChatNotification {
  id: string;
  type: 'new_message' | 'connection_lost' | 'connection_restored' | 'error';
  title: string;
  message: string;
  conversationId?: string;
  timestamp: string;
  read: boolean;
}

// Tipos para métricas e analytics
export interface ChatMetrics {
  daily_messages: number;
  weekly_messages: number;
  monthly_messages: number;
  response_time_avg: number;
  active_conversations: number;
  patient_satisfaction?: number;
}

// Constantes
export const MESSAGE_TYPES: MessageType[] = ['text', 'image', 'document', 'audio', 'video'];
export const MESSAGE_STATUSES: MessageStatus[] = ['sent', 'delivered', 'read', 'failed'];
export const CONNECTION_STATUSES: ConnectionStatus[] = ['disconnected', 'connecting', 'qr', 'connected', 'error'];

export const DEFAULT_TEMPLATE_CATEGORIES = [
  'Saudação',
  'Agendamento',
  'Confirmação',
  'Cancelamento',
  'Reagendamento',
  'Lembrete',
  'Informações',
  'Despedida',
  'Emergência',
  'Outros'
] as const;

export type TemplateCategory = typeof DEFAULT_TEMPLATE_CATEGORIES[number];