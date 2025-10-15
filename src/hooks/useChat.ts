/**
 * Hook principal para gerenciar funcionalidades de chat
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  UseChatReturn, 
  Conversation, 
  Message, 
  MessageType,
  ApiResponse 
} from '../types/chat';
import { useSocket } from './useSocket';
import { useAuthStore } from '../stores/authStore';
import { 
  initializeMessageWebhookService, 
  getMessageWebhookService,
  WebhookStatus 
} from '../services/messageWebhookService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useChat = (): UseChatReturn => {
  console.log('🎯 [useChat] Hook inicializado');
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [webhookStatuses, setWebhookStatuses] = useState<Map<string, WebhookStatus>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const socket = useSocket();

  // Initialize webhook service
  useEffect(() => {
    initializeMessageWebhookService();
  }, []);

  // Get JWT token from local API
  const getJwtToken = useCallback(async () => {
    if (!user?.email) return null;
    
    console.log('🔑 [useChat] Obtendo JWT token para:', user.email);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: 'admin123' // This should be handled more securely
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [useChat] JWT token obtido com sucesso');
        console.log('📋 [useChat] Dados retornados pela API:', data);
        const token = data.data?.token || data.token; // Tentar ambos os caminhos
        console.log('🔄 [useChat] Atualizando estado jwtToken:', token ? 'token válido' : 'token inválido');
        setJwtToken(token);
        return token;
      } else {
        console.error('❌ [useChat] Erro ao obter JWT token:', response.status);
      }
    } catch (error) {
      console.error('❌ [useChat] Erro ao obter JWT token:', error);
    }
    return null;
  }, [user?.email]);

  // Get JWT token when user changes
  useEffect(() => {
    if (user?.email) {
      getJwtToken();
    }
  }, [user?.email, getJwtToken]);

  // API helper function
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
        'User-Agent': 'PsicoMind-Frontend/1.0',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }, [jwtToken]);

  // Load conversations
  const refreshConversations = useCallback(async () => {
    console.log('💬 [useChat] refreshConversations chamado, jwtToken:', !!jwtToken);
    
    if (!jwtToken) {
      console.log('⚠️ [useChat] JWT token não disponível, aguardando...');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      
      console.log('🔄 [useChat] Carregando conversas da API...');
      
      const response: any = await apiCall(
        `/conversations?${params.toString()}`
      );

      console.log('📋 [useChat] Resposta da API:', response);

      if (response.success && response.conversations) {
        console.log('✅ [useChat] Conversas carregadas:', response.conversations.length);
        setConversations(response.conversations);
      } else {
        console.error('❌ [useChat] Erro na resposta da API:', response);
      }
    } catch (err) {
      console.error('❌ [useChat] Erro ao carregar conversas:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, [jwtToken, searchTerm, apiCall]);

  // Load conversations when JWT token is available
  useEffect(() => {
    console.log('🔄 [useChat] useEffect disparado - jwtToken:', !!jwtToken);
    if (jwtToken) {
      console.log('🚀 [useChat] JWT token disponível, carregando conversas...');
      refreshConversations();
    }
  }, [jwtToken]); // Removido refreshConversations das dependências para evitar loop

  // Load messages for selected conversation
  const refreshMessages = useCallback(async () => {
    if (!selectedConversation || !jwtToken) return;

    try {
      setLoading(true);
      setError(null);

      const response: ApiResponse<Message[]> = await apiCall(
        `/conversations/${selectedConversation.id}/messages`
      );

      if (response.success && response.data) {
        setMessages(response.data);
        
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  }, [selectedConversation, jwtToken, apiCall]);

  // Select conversation
  const selectConversation = useCallback((conversation: Conversation) => {
    console.log('🎯 [useChat] selectConversation chamado', {
      conversationId: conversation.id,
      patientName: conversation.patient?.nome
    });
    setSelectedConversation(conversation);
    setMessages([]); // Clear previous messages
  }, []);

  // Send message
  const sendMessage = useCallback(async (
    content: string, 
    type: MessageType = 'text', 
    file?: File
  ) => {
    if (!selectedConversation || !jwtToken) return;

    try {
      setError(null);

      const formData = new FormData();
      formData.append('content', content);
      formData.append('messageType', type);
      
      if (file) {
        formData.append('media', file);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/conversations/${selectedConversation.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'User-Agent': 'PsicoMind-Frontend/1.0',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao enviar mensagem');
      }

      const result: ApiResponse<Message> = await response.json();
      
      if (result.success && result.data) {
        // Add message to local state immediately for better UX
        setMessages(prev => [...prev, result.data!]);
        
        // Update conversation's last message
        setConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversation.id 
              ? {
                  ...conv,
                  last_message: {
                    content: result.data!.content,
                    message_type: result.data!.message_type,
                    sender_type: result.data!.sender_type,
                    timestamp: result.data!.timestamp
                  },
                  last_message_at: result.data!.timestamp
                }
              : conv
          )
        );

        // Send to Trae AI webhook
        const webhookService = getMessageWebhookService();
        if (webhookService) {
          // Register status callback
          webhookService.onStatusUpdate(result.data.id, (status: WebhookStatus) => {
            setWebhookStatuses(prev => new Map(prev.set(result.data!.id, status)));
          });

          // Send to webhook (async, don't wait)
          webhookService.sendMessageToWebhook(result.data, selectedConversation)
            .catch(error => {
              console.error('Webhook error (non-blocking):', error);
            });
        }

        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
    }
  }, [selectedConversation, jwtToken]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!selectedConversation || !jwtToken) return;

    try {
      await apiCall(
        `/conversations/${selectedConversation.id}/read`,
        { method: 'PUT' }
      );

      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.sender_type === 'patient' && msg.status !== 'read'
            ? { ...msg, status: 'read' }
            : msg
        )
      );

      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [selectedConversation, jwtToken, apiCall]);

  // Socket event handlers
  useEffect(() => {
    if (!socket.connected) return;

    // Handle new messages from socket
    const handleNewMessage = (data: { conversationId: string; message: Message }) => {
      const { conversationId, message } = data;

      // Add message to current conversation if it's selected
      if (selectedConversation?.id === conversationId) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });

        // Auto-scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }

      // Update conversation list
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? {
                ...conv,
                last_message: {
                  content: message.content,
                  message_type: message.message_type,
                  sender_type: message.sender_type,
                  timestamp: message.timestamp
                },
                last_message_at: message.timestamp,
                unread_count: selectedConversation?.id === conversationId 
                  ? conv.unread_count 
                  : conv.unread_count + 1
              }
            : conv
        )
      );

      // Send received message to n8n webhook (only for patient messages)
      if (message.sender_type === 'patient') {
        const conversation = conversations.find(c => c.id === conversationId) || selectedConversation;
        if (conversation) {
          const webhookService = getMessageWebhookService();
          if (webhookService) {
            // Register status callback
            webhookService.onStatusUpdate(message.id, (status: WebhookStatus) => {
              setWebhookStatuses(prev => new Map(prev.set(message.id, status)));
            });

            // Send to webhook (async, don't wait)
            webhookService.sendMessageToWebhook(message, conversation)
              .catch(error => {
                console.error('Webhook error for received message (non-blocking):', error);
              });
          }
        }
      }
    };

    // Handle message status updates
    const handleMessageStatusUpdate = (data: { messageId: string; status: string }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, status: data.status as any }
            : msg
        )
      );
    };

    // Handle messages marked as read
    const handleMessagesMarkedRead = (data: { conversationId: string }) => {
      if (selectedConversation?.id === data.conversationId) {
        setMessages(prev => 
          prev.map(msg => 
            msg.sender_type === 'psychologist' && msg.status !== 'read'
              ? { ...msg, status: 'read' }
              : msg
          )
        );
      }
    };

    // Register event listeners
    socket.on('new_message', handleNewMessage);
    socket.on('message_status_update', handleMessageStatusUpdate);
    socket.on('messages_marked_read', handleMessagesMarkedRead);

    // Join conversation room when selected
    if (selectedConversation) {
      socket.emit('join_conversation', { conversationId: selectedConversation.id });
    }

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_status_update', handleMessageStatusUpdate);
      socket.off('messages_marked_read', handleMessagesMarkedRead);
      
      if (selectedConversation) {
        socket.emit('leave_conversation', { conversationId: selectedConversation.id });
      }
    };
  }, [socket, selectedConversation]);

  // Load conversations on mount and when search changes
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      refreshMessages();
    }
  }, [selectedConversation, refreshMessages]);

  // Auto-mark as read when conversation is selected and has unread messages
  useEffect(() => {
    if (selectedConversation && selectedConversation.unread_count > 0) {
      const timer = setTimeout(() => {
        markAsRead();
      }, 1000); // Mark as read after 1 second

      return () => clearTimeout(timer);
    }
  }, [selectedConversation, markAsRead]);

  // Get webhook status for a message
  const getWebhookStatus = useCallback((messageId: string): WebhookStatus | null => {
    return webhookStatuses.get(messageId) || null;
  }, [webhookStatuses]);

  // Test webhook connection
  const testWebhook = useCallback(async (): Promise<boolean> => {
    const webhookService = getMessageWebhookService();
    if (webhookService) {
      return await webhookService.testWebhook();
    }
    return false;
  }, []);

  return {
    conversations,
    selectedConversation,
    messages,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectConversation,
    sendMessage,
    markAsRead,
    refreshConversations,
    refreshMessages,
    getWebhookStatus,
    testWebhook
  };
};