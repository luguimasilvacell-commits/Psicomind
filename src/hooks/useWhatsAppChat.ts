import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  WhatsAppConversation, 
  WhatsAppMessage, 
  WhatsAppContact,
  WhatsAppMessageType,
  WhatsAppMessageStatus,
  UseChatReturn 
} from '@/types/whatsapp';

export const useWhatsAppChat = (): UseChatReturn => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    socketRef.current = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    // WhatsApp message events
    socket.on('whatsapp:message', (data: { message: WhatsAppMessage; conversationId: string }) => {
      const { message, conversationId } = data;
      
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
                last_message: message,
                last_message_at: message.timestamp,
                unread_count: selectedConversation?.id === conversationId 
                  ? conv.unread_count 
                  : conv.unread_count + 1
              }
            : conv
        )
      );
    });

    // Message status updates
    socket.on('whatsapp:message_status', (data: { messageId: string; status: WhatsAppMessageStatus }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, status: data.status }
            : msg
        )
      );
    });

    // Typing indicators
    socket.on('whatsapp:typing_start', (data: { conversationId: string; contact: string }) => {
      if (selectedConversation?.id === data.conversationId) {
        setTypingUsers(prev => [...prev.filter(u => u !== data.contact), data.contact]);
      }
    });

    socket.on('whatsapp:typing_stop', (data: { conversationId: string; contact: string }) => {
      if (selectedConversation?.id === data.conversationId) {
        setTypingUsers(prev => prev.filter(u => u !== data.contact));
      }
    });

    return socket;
  }, [selectedConversation]);

  useEffect(() => {
    initializeSocket();
    loadConversations();
    loadContacts();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [initializeSocket]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/whatsapp/conversations?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      setError('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await fetch('/api/whatsapp/contacts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts);
      }
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/whatsapp/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      setError('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = useCallback((conversation: WhatsAppConversation) => {
    // Leave previous conversation room
    if (selectedConversation && socketRef.current) {
      socketRef.current.emit('leave_whatsapp_session', { 
        conversationId: selectedConversation.id 
      });
    }

    setSelectedConversation(conversation);
    setMessages([]);
    setTypingUsers([]);
    loadMessages(conversation.id);

    // Join new conversation room
    if (socketRef.current) {
      socketRef.current.emit('join_whatsapp_session', { 
        conversationId: conversation.id 
      });
    }

    // Mark as read
    markAsRead(conversation.id);
  }, [selectedConversation]);

  const sendMessage = async (
    content: string, 
    type: WhatsAppMessageType = 'text',
    file?: File
  ) => {
    if (!selectedConversation) return;

    try {
      setError(null);

      const formData = new FormData();
      formData.append('content', content);
      formData.append('type', type);
      formData.append('to', selectedConversation.contact.phone);
      
      if (file) {
        formData.append('media', file);
      }

      const response = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao enviar mensagem');
      }

      const result = await response.json();
      
      if (result.success && result.message) {
        // Add message to local state immediately for better UX
        setMessages(prev => [...prev, result.message]);
        
        // Update conversation's last message
        setConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversation.id 
              ? {
                  ...conv,
                  last_message: result.message,
                  last_message_at: result.message.timestamp
                }
              : conv
          )
        );

        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao enviar mensagem');
    }
  };

  const sendTypingIndicator = (isTyping: boolean) => {
    if (!selectedConversation || !socketRef.current) return;

    if (isTyping) {
      socketRef.current.emit('whatsapp_typing_start', {
        conversationId: selectedConversation.id
      });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('whatsapp_typing_stop', {
          conversationId: selectedConversation.id
        });
      }, 3000);
    } else {
      socketRef.current.emit('whatsapp_typing_stop', {
        conversationId: selectedConversation.id
      });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      await fetch(`/api/whatsapp/conversations/${conversationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const searchConversations = (term: string) => {
    setSearchTerm(term);
  };

  const createConversation = async (phone: string) => {
    try {
      const response = await fetch('/api/whatsapp/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ phone })
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(prev => [data.conversation, ...prev]);
        return data.conversation;
      }
    } catch (error) {
      setError('Erro ao criar conversa');
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/whatsapp/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(null);
          setMessages([]);
        }
      }
    } catch (error) {
      setError('Erro ao excluir conversa');
    }
  };

  const getContactInfo = (phone: string) => {
    return contacts.find(contact => contact.phone === phone);
  };

  const refreshData = () => {
    loadConversations();
    loadContacts();
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  };

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      conv.contact.name?.toLowerCase().includes(searchLower) ||
      conv.contact.phone.includes(searchTerm) ||
      conv.last_message?.content.toLowerCase().includes(searchLower)
    );
  });

  // Load conversations when search term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadConversations();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  return {
    // State
    conversations: filteredConversations,
    selectedConversation,
    messages,
    contacts,
    loading,
    error,
    searchTerm,
    isTyping,
    typingUsers,
    
    // Actions
    selectConversation,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    searchConversations,
    createConversation,
    deleteConversation,
    refreshData,
    
    // Utils
    getContactInfo,
    messagesEndRef,
    
    // Setters
    setSearchTerm,
    clearError: () => setError(null)
  };
};