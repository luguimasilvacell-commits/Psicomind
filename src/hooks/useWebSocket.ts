/**
 * Hook para gerenciar conexão WebSocket
 * Sistema de Chat WhatsApp
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';

interface WebSocketEvents {
  // Eventos de mensagens
  new_message: (data: any) => void;
  message_status_updated: (data: any) => void;
  messages_read: (data: any) => void;
  conversation_updated: (data: any) => void;
  
  // Eventos de typing
  user_typing: (data: { userId: string; typing: boolean; conversaId: string }) => void;
  
  // Eventos de conexão WhatsApp
  whatsapp_status_changed: (data: any) => void;
  
  // Eventos de sistema
  connected: (data: { userId: string; timestamp: string }) => void;
  disconnect: () => void;
  error: (error: any) => void;
}

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onNewMessage?: (data: any) => void;
  onMessageStatusUpdate?: (data: any) => void;
  onWhatsAppStatusChange?: (data: any) => void;
  onUserTyping?: (data: { userId: string; typing: boolean; conversaId: string }) => void;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  joinConversation: (conversaId: string) => void;
  leaveConversation: (conversaId: string) => void;
  startTyping: (conversaId: string, pacienteId: string) => void;
  stopTyping: (conversaId: string, pacienteId: string) => void;
  markAsRead: (conversaId: string) => void;
  emit: (event: string, data?: any) => void;
  on: <K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]) => void;
  off: <K extends keyof WebSocketEvents>(event: K, callback?: WebSocketEvents[K]) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    onNewMessage,
    onMessageStatusUpdate,
    onWhatsAppStatusChange,
    onUserTyping
  } = options;

  const { user, token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Função para conectar
  const connect = useCallback(() => {
    if (!user || !token) {
      console.warn('Usuário não autenticado para WebSocket');
      return;
    }

    if (socketRef.current?.connected) {
      console.log('WebSocket já conectado');
      return;
    }

    try {
      const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      socketRef.current = io(serverUrl, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });

      const socket = socketRef.current;

      // Eventos de conexão
      socket.on('connect', () => {
        console.log('WebSocket conectado:', socket.id);
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        toast.success('Conectado ao chat em tempo real');
      });

      socket.on('connected', (data) => {
        console.log('Confirmação de conexão recebida:', data);
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket desconectado:', reason);
        setIsConnected(false);
        
        if (reason === 'io server disconnect') {
          // Desconexão forçada pelo servidor
          toast.error('Conexão perdida com o servidor');
        }
      });

      socket.on('connect_error', (error) => {
        console.error('Erro de conexão WebSocket:', error);
        setConnectionError(error.message);
        setIsConnected(false);
        
        // Tentar reconectar
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Tentativa de reconexão ${reconnectAttempts.current}/${maxReconnectAttempts}`);
            connect();
          }, delay);
        } else {
          toast.error('Não foi possível conectar ao chat em tempo real');
        }
      });

      // Eventos de mensagens
      socket.on('new_message', (data) => {
        console.log('Nova mensagem recebida:', data);
        onNewMessage?.(data);
        
        // Mostrar notificação
        if (data.data?.mensagem?.tipo === 'recebida') {
          toast.info('Nova mensagem recebida', {
            description: `De: ${data.data?.conversa?.paciente_nome || 'Paciente'}`
          });
        }
      });

      socket.on('message_status_updated', (data) => {
        console.log('Status de mensagem atualizado:', data);
        onMessageStatusUpdate?.(data);
      });

      socket.on('messages_read', (data) => {
        console.log('Mensagens marcadas como lidas:', data);
        onMessageStatusUpdate?.(data);
      });

      socket.on('conversation_updated', (data) => {
        console.log('Conversa atualizada:', data);
        onNewMessage?.(data); // Reutilizar handler para atualizar lista
      });

      // Eventos de typing
      socket.on('user_typing', (data) => {
        console.log('Usuário digitando:', data);
        onUserTyping?.(data);
      });

      // Eventos de WhatsApp
      socket.on('whatsapp_status_changed', (data) => {
        console.log('Status WhatsApp alterado:', data);
        onWhatsAppStatusChange?.(data);
        
        // Mostrar notificação baseada no status
        if (data.data?.state === 'open') {
          toast.success('WhatsApp conectado');
        } else if (data.data?.state === 'close') {
          toast.warning('WhatsApp desconectado');
        }
      });

      // Eventos de erro
      socket.on('error', (error) => {
        console.error('Erro WebSocket:', error);
        toast.error('Erro na conexão do chat');
      });

    } catch (error) {
      console.error('Erro ao criar conexão WebSocket:', error);
      setConnectionError('Erro ao conectar');
    }
  }, [user, token, onNewMessage, onMessageStatusUpdate, onWhatsAppStatusChange, onUserTyping]);

  // Função para desconectar
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionError(null);
    reconnectAttempts.current = 0;
  }, []);

  // Funções de controle de conversa
  const joinConversation = useCallback((conversaId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_conversation', conversaId);
      console.log('Entrou na conversa:', conversaId);
    }
  }, []);

  const leaveConversation = useCallback((conversaId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_conversation', conversaId);
      console.log('Saiu da conversa:', conversaId);
    }
  }, []);

  // Funções de typing
  const startTyping = useCallback((conversaId: string, pacienteId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_start', { conversaId, pacienteId });
    }
  }, []);

  const stopTyping = useCallback((conversaId: string, pacienteId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_stop', { conversaId, pacienteId });
    }
  }, []);

  // Função para marcar como lida
  const markAsRead = useCallback((conversaId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('mark_as_read', { conversaId });
    }
  }, []);

  // Função genérica para emitir eventos
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Função para adicionar listeners
  const on = useCallback(<K extends keyof WebSocketEvents>(
    event: K, 
    callback: WebSocketEvents[K]
  ) => {
    if (socketRef.current) {
      socketRef.current.on(event as string, callback as any);
    }
  }, []);

  // Função para remover listeners
  const off = useCallback(<K extends keyof WebSocketEvents>(
    event: K, 
    callback?: WebSocketEvents[K]
  ) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event as string, callback as any);
      } else {
        socketRef.current.off(event as string);
      }
    }
  }, []);

  // Efeito para conectar automaticamente
  useEffect(() => {
    if (autoConnect && user && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, user, token, connect, disconnect]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    connect,
    disconnect,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    markAsRead,
    emit,
    on,
    off
  };
}

export default useWebSocket;