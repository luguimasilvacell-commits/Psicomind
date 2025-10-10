// WhatsApp Session Types
export interface WhatsAppSession {
  id: string;
  psychologist_id: string;
  status: 'disconnected' | 'connecting' | 'waiting_qr' | 'connected';
  qr_code?: string;
  client_info?: WhatsAppClientInfo;
  created_at: string;
  updated_at: string;
  connected_at?: string;
  disconnected_at?: string;
}

export interface WhatsAppClientInfo {
  user: {
    id: string;
    name: string;
    pushname?: string;
  };
  platform: string;
  battery?: number;
  plugged?: boolean;
}

// WhatsApp Conversation Types
export interface WhatsAppConversation {
  id: string;
  session_id: string;
  contact_id: string;
  contact_name: string;
  contact_number: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  is_group: boolean;
  group_info?: WhatsAppGroupInfo;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppGroupInfo {
  name: string;
  description?: string;
  participants: WhatsAppParticipant[];
  admin_ids: string[];
}

export interface WhatsAppParticipant {
  id: string;
  name: string;
  number: string;
  is_admin: boolean;
}

// WhatsApp Message Types
export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  message_id: string;
  from: string;
  to: string;
  body: string;
  type: WhatsAppMessageType;
  timestamp: number;
  is_from_me: boolean;
  status: WhatsAppMessageStatus;
  media_url?: string;
  media_type?: string;
  media_size?: number;
  reply_to?: string;
  forwarded?: boolean;
  created_at: string;
}

export type WhatsAppMessageType = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'document' 
  | 'sticker' 
  | 'location' 
  | 'contact' 
  | 'voice';

export type WhatsAppMessageStatus = 
  | 'pending' 
  | 'sent' 
  | 'delivered' 
  | 'read' 
  | 'failed';

// WhatsApp Message Template Types
export interface WhatsAppMessageTemplate {
  id: string;
  psychologist_id: string;
  name: string;
  content: string;
  category: WhatsAppTemplateCategory;
  variables?: WhatsAppTemplateVariable[];
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export type WhatsAppTemplateCategory = 
  | 'greeting' 
  | 'appointment' 
  | 'reminder' 
  | 'follow_up' 
  | 'emergency' 
  | 'general';

export interface WhatsAppTemplateVariable {
  name: string;
  placeholder: string;
  description?: string;
  required: boolean;
}

// WhatsApp API Request/Response Types
export interface SendMessageRequest {
  to: string;
  message: string;
  type?: WhatsAppMessageType;
  media?: File;
  replyTo?: string;
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppStatusResponse {
  sessionId: string;
  status: WhatsAppSession['status'];
  qrCode?: string;
  clientInfo?: WhatsAppClientInfo;
  error?: string;
}

// WhatsApp WebSocket Event Types
export interface WhatsAppWebSocketEvents {
  // Outgoing events (client to server)
  join_whatsapp_session: (sessionId: string) => void;
  leave_whatsapp_session: (sessionId: string) => void;
  send_whatsapp_message: (data: {
    sessionId: string;
    to: string;
    message: string;
    type?: WhatsAppMessageType;
  }) => void;
  whatsapp_typing_start: (data: { sessionId: string; to: string }) => void;
  whatsapp_typing_stop: (data: { sessionId: string; to: string }) => void;

  // Incoming events (server to client)
  whatsapp_qr_code: (data: {
    qrCode: string;
    sessionId: string;
    timestamp: string;
  }) => void;
  whatsapp_connected: (data: {
    sessionId: string;
    clientInfo: WhatsAppClientInfo;
    timestamp: string;
  }) => void;
  whatsapp_disconnected: (data: {
    sessionId: string;
    reason?: string;
    timestamp: string;
  }) => void;
  whatsapp_message_received: (data: {
    message: WhatsAppMessage;
    timestamp: string;
  }) => void;
  whatsapp_message_sent: (data: {
    success: boolean;
    sessionId: string;
    to: string;
    timestamp: string;
  }) => void;
  whatsapp_status_update: (data: {
    status: string;
    sessionId: string;
    timestamp: string;
  }) => void;
  whatsapp_error: (data: {
    error: string;
    sessionId?: string;
    timestamp: string;
  }) => void;
  whatsapp_user_typing: (data: {
    userId: string;
    sessionId: string;
    to: string;
    isTyping: boolean;
  }) => void;
}

// WhatsApp Hook Types
export interface UseWhatsAppReturn {
  session: WhatsAppSession | null;
  isConnecting: boolean;
  isConnected: boolean;
  qrCode: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendMessage: (data: SendMessageRequest) => Promise<SendMessageResponse>;
  getStatus: () => Promise<WhatsAppStatusResponse>;
}

export interface UseChatReturn {
  conversations: WhatsAppConversation[];
  messages: WhatsAppMessage[];
  selectedConversation: WhatsAppConversation | null;
  isLoading: boolean;
  error: string | null;
  selectConversation: (conversation: WhatsAppConversation) => void;
  sendMessage: (message: string, type?: WhatsAppMessageType) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
}

export interface UseTemplatesReturn {
  // State
  templates: WhatsAppMessageTemplate[];
  categories: { value: WhatsAppTemplateCategory; label: string }[];
  loading: boolean;
  error: string | null;
  selectedCategory: WhatsAppTemplateCategory | 'all';
  
  // Actions
  loadTemplates: () => Promise<void>;
  createTemplate: (templateData: {
    name: string;
    content: string;
    category: WhatsAppTemplateCategory;
    variables?: WhatsAppTemplateVariable[];
  }) => Promise<WhatsAppMessageTemplate | null>;
  updateTemplate: (id: string, templateData: Partial<WhatsAppMessageTemplate>) => Promise<WhatsAppMessageTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
  duplicateTemplate: (template: WhatsAppMessageTemplate) => Promise<WhatsAppMessageTemplate | null>;
  useTemplate: (id: string) => Promise<void>;
  
  // Utils
  extractVariables: (content: string) => WhatsAppTemplateVariable[];
  replaceVariables: (content: string, variables: Record<string, string>) => string;
  previewTemplate: (template: WhatsAppMessageTemplate, variables?: Record<string, string>) => string;
  getTemplate: (id: string) => WhatsAppMessageTemplate | null;
  searchTemplates: (searchTerm: string) => WhatsAppMessageTemplate[];
  getTemplatesByCategory: (category: WhatsAppTemplateCategory | 'all') => WhatsAppMessageTemplate[];
  getTemplateStats: () => {
    total: number;
    byCategory: Record<WhatsAppTemplateCategory, number>;
    mostUsed: WhatsAppMessageTemplate[];
    totalUsage: number;
  };
  validateTemplate: (template: Partial<WhatsAppMessageTemplate>) => string[];
  clearError: () => void;
  
  // Setters
  setSelectedCategory: (category: WhatsAppTemplateCategory | 'all') => void;
}

// WhatsApp Configuration Types
export interface WhatsAppConfig {
  autoReply: boolean;
  autoReplyMessage: string;
  businessHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
    days: number[]; // 0-6, Sunday to Saturday
  };
  notifications: {
    newMessage: boolean;
    connectionStatus: boolean;
    sound: boolean;
  };
  privacy: {
    readReceipts: boolean;
    lastSeen: boolean;
    profilePhoto: boolean;
  };
}

// WhatsApp Statistics Types
export interface WhatsAppStats {
  totalMessages: number;
  messagesThisWeek: number;
  messagesThisMonth: number;
  activeConversations: number;
  responseTime: {
    average: number;
    median: number;
  };
  popularTemplates: Array<{
    template: WhatsAppMessageTemplate;
    usageCount: number;
  }>;
}

// WhatsApp Contact Types
export interface WhatsAppContact {
  id: string;
  name: string;
  number: string;
  profilePicture?: string;
  isBlocked: boolean;
  isBusiness: boolean;
  lastSeen?: string;
  status?: string;
}

// WhatsApp Media Types
export interface WhatsAppMedia {
  id: string;
  messageId: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  filename?: string;
  size: number;
  mimeType: string;
  thumbnail?: string;
}

// WhatsApp Error Types
export interface WhatsAppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// WhatsApp Backup Types
export interface WhatsAppBackup {
  id: string;
  sessionId: string;
  type: 'full' | 'messages' | 'media';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  size: number;
  url?: string;
  createdAt: string;
  completedAt?: string;
}