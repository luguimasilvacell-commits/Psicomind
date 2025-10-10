import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  WhatsAppSession, 
  WhatsAppClientInfo, 
  WhatsAppConfig, 
  WhatsAppError,
  WhatsAppSocketEvents,
  UseWhatsAppReturn 
} from '@/types/whatsapp';

export const useWhatsApp = (): UseWhatsAppReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState<WhatsAppClientInfo | null>(null);
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [error, setError] = useState<WhatsAppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const reconnectAttempts = useRef(0);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError({ code: 'AUTH_ERROR', message: 'Token de autenticação não encontrado' });
      return;
    }

    socketRef.current = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Socket conectado ao servidor');
      reconnectAttempts.current = 0;
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('Socket desconectado do servidor');
      setIsConnected(false);
      setQrCode(null);
    });

    socket.on('connect_error', (error) => {
      console.error('Erro de conexão do socket:', error);
      setError({ code: 'CONNECTION_ERROR', message: 'Erro de conexão com o servidor' });
      
      // Auto-reconnect logic
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          socket.connect();
        }, Math.pow(2, reconnectAttempts.current) * 1000); // Exponential backoff
      }
    });

    // WhatsApp specific events
    socket.on('whatsapp:qr_code', (data: { qrCode: string; sessionId: string }) => {
      console.log('QR Code recebido');
      setQrCode(data.qrCode);
      setIsConnecting(true);
      setIsConnected(false);
    });

    socket.on('whatsapp:connected', (data: { clientInfo: WhatsAppClientInfo; sessionId: string }) => {
      console.log('WhatsApp conectado:', data.clientInfo);
      setIsConnected(true);
      setIsConnecting(false);
      setQrCode(null);
      setClientInfo(data.clientInfo);
      setError(null);
    });

    socket.on('whatsapp:disconnected', (data: { reason?: string }) => {
      console.log('WhatsApp desconectado:', data.reason);
      setIsConnected(false);
      setIsConnecting(false);
      setQrCode(null);
      setClientInfo(null);
      setSession(null);
    });

    socket.on('whatsapp:error', (data: WhatsAppError) => {
      console.error('Erro do WhatsApp:', data);
      setError(data);
      setIsConnecting(false);
      setQrCode(null);
    });

    socket.on('whatsapp:status_update', (data: { status: string; message?: string }) => {
      console.log('Status atualizado:', data);
      // Handle status updates if needed
    });

    return socket;
  }, []);

  // Load initial data
  useEffect(() => {
    loadStatus();
    loadConfig();
    initializeSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [initializeSocket]);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.connected);
        setClientInfo(data.clientInfo);
        setSession(data.session);
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/whatsapp/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const connect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao conectar');
      }

      setIsConnecting(true);
    } catch (error) {
      setError({
        code: 'CONNECTION_ERROR',
        message: error instanceof Error ? error.message : 'Erro ao conectar'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao desconectar');
      }

      setIsConnected(false);
      setIsConnecting(false);
      setQrCode(null);
      setClientInfo(null);
      setSession(null);
    } catch (error) {
      setError({
        code: 'DISCONNECTION_ERROR',
        message: error instanceof Error ? error.message : 'Erro ao desconectar'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<WhatsAppConfig>) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/whatsapp/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newConfig)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar configuração');
      }

      const data = await response.json();
      setConfig(data.config);
      return data.config;
    } catch (error) {
      setError({
        code: 'CONFIG_ERROR',
        message: error instanceof Error ? error.message : 'Erro ao atualizar configuração'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshQRCode = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/whatsapp/qr-code', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao gerar QR Code');
      }

      // QR Code will be received via socket
    } catch (error) {
      setError({
        code: 'QR_ERROR',
        message: error instanceof Error ? error.message : 'Erro ao gerar QR Code'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const getConnectionStatus = () => {
    if (isConnected) return 'connected';
    if (isConnecting) return 'connecting';
    if (qrCode) return 'qr_code';
    return 'disconnected';
  };

  return {
    // State
    isConnected,
    isConnecting,
    qrCode,
    clientInfo,
    session,
    config,
    error,
    isLoading,
    
    // Actions
    connect,
    disconnect,
    updateConfig,
    refreshQRCode,
    clearError,
    
    // Computed
    connectionStatus: getConnectionStatus(),
    
    // Utils
    reload: () => {
      loadStatus();
      loadConfig();
    }
  };
};