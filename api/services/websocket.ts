/**
 * Serviço WebSocket para comunicação em tempo real
 * Sistema de Chat WhatsApp
 */

import dotenv from 'dotenv';
dotenv.config();

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { auditLogger } from '../middleware/auditLogger.js';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AuthenticatedSocket extends Socket {
  userId?: string;
  psicologoId?: string;
}

interface ChatNotification {
  type: 'new_message' | 'message_read' | 'typing' | 'connection_status';
  data: any;
  conversaId?: string;
  pacienteId?: string;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  /**
   * Inicializar servidor WebSocket
   */
  initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Middleware de autenticação
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Token de autenticação necessário'));
        }

        // Verificar token com Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
          return next(new Error('Token inválido'));
        }

        // Buscar dados do psicólogo
        const { data: psicologo, error: psicologoError } = await supabase
          .from('psicologos')
          .select('id')
          .eq('id', user.id)
          .single();

        if (psicologoError || !psicologo) {
          return next(new Error('Psicólogo não encontrado'));
        }

        socket.userId = user.id;
        socket.psicologoId = psicologo.id;
        
        next();
      } catch (error) {
        console.error('Erro na autenticação WebSocket:', error);
        next(new Error('Erro na autenticação'));
      }
    });

    // Eventos de conexão
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    console.log('WebSocket server inicializado');
  }

  /**
   * Manipular nova conexão
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    const psicologoId = socket.psicologoId!;

    console.log(`Usuário conectado: ${userId}`);
    
    // Armazenar conexão
    this.connectedUsers.set(userId, socket.id);

    // Entrar na sala do psicólogo
    socket.join(`psicologo_${psicologoId}`);

    // Log da conexão
    auditLogger.log({
      userId,
      action: 'websocket_connected',
      resource: 'websocket',
      details: { socketId: socket.id }
    });

    // Eventos do socket
    socket.on('join_conversation', (conversaId: string) => {
      socket.join(`conversa_${conversaId}`);
      console.log(`Usuário ${userId} entrou na conversa ${conversaId}`);
    });

    socket.on('leave_conversation', (conversaId: string) => {
      socket.leave(`conversa_${conversaId}`);
      console.log(`Usuário ${userId} saiu da conversa ${conversaId}`);
    });

    socket.on('typing_start', (data: { conversaId: string; pacienteId: string }) => {
      socket.to(`conversa_${data.conversaId}`).emit('user_typing', {
        userId,
        typing: true,
        conversaId: data.conversaId
      });
    });

    socket.on('typing_stop', (data: { conversaId: string; pacienteId: string }) => {
      socket.to(`conversa_${data.conversaId}`).emit('user_typing', {
        userId,
        typing: false,
        conversaId: data.conversaId
      });
    });

    socket.on('mark_as_read', async (data: { conversaId: string }) => {
      try {
        // Marcar mensagens como lidas no banco
        await supabase.rpc('marcar_mensagens_como_lidas', {
          conversa_uuid: data.conversaId
        });

        // Notificar outros usuários
        socket.to(`conversa_${data.conversaId}`).emit('messages_read', {
          conversaId: data.conversaId,
          readBy: userId
        });

      } catch (error) {
        console.error('Erro ao marcar como lida:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Usuário desconectado: ${userId}`);
      this.connectedUsers.delete(userId);

      // Log da desconexão
      auditLogger.log({
        userId,
        action: 'websocket_disconnected',
        resource: 'websocket',
        details: { socketId: socket.id }
      });
    });

    // Enviar status de conexão
    socket.emit('connected', {
      userId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notificar nova mensagem
   */
  notifyNewMessage(psicologoId: string, notification: ChatNotification): void {
    if (!this.io) return;

    this.io.to(`psicologo_${psicologoId}`).emit('new_message', notification);
    
    if (notification.conversaId) {
      this.io.to(`conversa_${notification.conversaId}`).emit('conversation_updated', notification);
    }

    console.log('Notificação enviada:', { psicologoId, type: notification.type });
  }

  /**
   * Notificar atualização de status de mensagem
   */
  notifyMessageStatusUpdate(psicologoId: string, data: {
    messageId: string;
    status: string;
    conversaId: string;
  }): void {
    if (!this.io) return;

    const notification: ChatNotification = {
      type: 'message_read',
      data
    };

    this.io.to(`psicologo_${psicologoId}`).emit('message_status_updated', notification);
    this.io.to(`conversa_${data.conversaId}`).emit('message_status_updated', notification);
  }

  /**
   * Notificar mudança de status de conexão WhatsApp
   */
  notifyConnectionStatus(psicologoId: string, status: {
    instance: string;
    state: string;
    qrcode?: string;
  }): void {
    if (!this.io) return;

    const notification: ChatNotification = {
      type: 'connection_status',
      data: status
    };

    this.io.to(`psicologo_${psicologoId}`).emit('whatsapp_status_changed', notification);
  }

  /**
   * Broadcast para todos os usuários conectados
   */
  broadcast(event: string, data: any): void {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  /**
   * Enviar notificação para usuário específico
   */
  notifyUser(userId: string, event: string, data: any): void {
    if (!this.io) return;

    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * Obter usuários conectados
   */
  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Verificar se usuário está conectado
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Obter estatísticas de conexão
   */
  getConnectionStats(): {
    totalConnections: number;
    connectedUsers: string[];
  } {
    return {
      totalConnections: this.connectedUsers.size,
      connectedUsers: Array.from(this.connectedUsers.keys())
    };
  }

  /**
   * Fechar servidor WebSocket
   */
  close(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
      this.connectedUsers.clear();
      console.log('WebSocket server fechado');
    }
  }
}

// Instância singleton
export const webSocketService = new WebSocketService();

// Funções auxiliares para uso nas rotas
export function notifyNewChatMessage(psicologoId: string, mensagem: any, conversa: any): void {
  webSocketService.notifyNewMessage(psicologoId, {
    type: 'new_message',
    data: {
      mensagem,
      conversa,
      timestamp: new Date().toISOString()
    },
    conversaId: conversa.id,
    pacienteId: conversa.paciente_id
  });
}

export function notifyMessageRead(psicologoId: string, conversaId: string, messageIds: string[]): void {
  webSocketService.notifyMessageStatusUpdate(psicologoId, {
    messageId: messageIds.join(','),
    status: 'lida',
    conversaId
  });
}

export function notifyWhatsAppStatus(psicologoId: string, status: any): void {
  webSocketService.notifyConnectionStatus(psicologoId, status);
}

export function initializeWebSocket(server: HTTPServer): void {
  webSocketService.initialize(server);
}

export default webSocketService;