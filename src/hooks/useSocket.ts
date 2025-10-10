/**
 * Hook para gerenciar conexão WebSocket
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { UseSocketReturn } from '../types/chat';
import { useAuthStore } from '../stores/authStore';

export const useSocket = (): UseSocketReturn => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { token } = useAuthStore();

  // Connect to socket
  const connect = useCallback(() => {
    if (!token) {
      setError('Token de autenticação não encontrado');
      return;
    }

    if (socketRef.current?.connected) {
      return; // Already connected
    }

    try {
      const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      socketRef.current = io(socketUrl, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        retries: 3
      });

      // Connection events
      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
        setError(null);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setConnected(false);
        
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          setTimeout(() => {
            socketRef.current?.connect();
          }, 1000);
        }
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        setError(`Erro de conexão: ${err.message}`);
        setConnected(false);
      });

      socketRef.current.on('error', (err) => {
        console.error('Socket error:', err);
        setError(`Erro: ${err.message || err}`);
      });

      // Authentication events
      socketRef.current.on('auth_error', (err) => {
        console.error('Socket auth error:', err);
        setError('Erro de autenticação');
        setConnected(false);
      });

    } catch (err) {
      console.error('Error creating socket connection:', err);
      setError('Erro ao criar conexão');
    }
  }, [token]);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
      setError(null);
    }
  }, []);

  // Emit event
  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }, []);

  // Listen to event
  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  // Remove event listener
  const off = useCallback((event: string, callback?: (data: any) => void) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  // Auto-connect when token is available
  useEffect(() => {
    if (token && !socketRef.current?.connected) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connected,
    error,
    emit,
    on,
    off,
    connect,
    disconnect
  };
};