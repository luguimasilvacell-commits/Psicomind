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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useChat = (): UseChatReturn => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { token } = useAuthStore();
  const socket = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // API helper function
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }, [token]);

  // Load conversations
  const refreshConversations = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      
      const response: ApiResponse<Conversation[]> = await apiCall(
        `/chat/conversations?${params.toString()}`
      );

      if (response.success && response.data) {
        setConversations(response.data);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, [token, searchTerm, apiCall]);

  // Load messages for selected conversation
  const refreshMessages = useCallback(async () => {
    if (!selectedConversation || !token) return;

    try {
      setLoading(true);
      setError(null);

      const response: ApiResponse<Message[]> = await apiCall(
        `/chat/conversations/${selectedConversation.id}/messages`
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
  }, [selectedConversation, token, apiCall]);

  // Select conversation
  const selectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMessages([]); // Clear previous messages
  }, []);

  // Send message
  const sendMessage = useCallback(async (
    content: string, 
    type: MessageType = 'text', 
    file?: File
  ) => {
    if (!selectedConversation || !token) return;

    try {
      setError(null);

      const formData = new FormData();
      formData.append('content', content);
      formData.append('messageType', type);
      
      if (file) {
        formData.append('media', file);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/chat/conversations/${selectedConversation.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
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

        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
    }
  }, [selectedConversation, token]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!selectedConversation || !token) return;

    try {
      await apiCall(
        `/chat/conversations/${selectedConversation.id}/read`,
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
  }, [selectedConversation, token, apiCall]);

  // Socket event handlers
  useEffect(() => {
    if (!socket.connected) return;

    // Handle new messages
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
    refreshMessages
  };
};