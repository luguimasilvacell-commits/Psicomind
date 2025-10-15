import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  psicologoId?: string;
}

interface SocketData {
  userId: string;
  psicologoId: string;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [
          'http://localhost:5173',
          'http://localhost:3000',
          process.env.FRONTEND_URL
        ].filter(Boolean),
        credentials: true
      }
    });

    // Middleware de autenticação
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        // Verificar token usando Supabase auth
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
          console.log('❌ [WebSocket] Token inválido:', authError?.message);
          return next(new Error('Authentication error: Invalid token'));
        }

        // Verificar se o usuário existe na tabela psicologos
        const { data: psicologo, error: psicologoError } = await supabase
          .from('psicologos')
          .select('id')
          .eq('id', user.id)
          .single();

        if (psicologoError || !psicologo) {
          console.log('❌ [WebSocket] Psicólogo não encontrado:', psicologoError?.message);
          return next(new Error('Authentication error: User not found'));
        }

        console.log('✅ [WebSocket] Usuário autenticado:', user.email);
        socket.userId = user.id;
        socket.psicologoId = user.id;
        next();
      } catch (error) {
        console.error('❌ [WebSocket] Erro na autenticação:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userId} connected`);
      
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket.id);
        
        // Entrar na sala do psicólogo
        socket.join(`psicologo_${socket.psicologoId}`);
      }

      // Eventos de conversa
      socket.on('join_conversation', (conversationId: string) => {
        socket.join(`conversation_${conversationId}`);
        console.log(`User ${socket.userId} joined conversation ${conversationId}`);
      });

      socket.on('leave_conversation', (conversationId: string) => {
        socket.leave(`conversation_${conversationId}`);
        console.log(`User ${socket.userId} left conversation ${conversationId}`);
      });

      // Evento de digitação
      socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
        socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
          userId: socket.userId,
          isTyping: data.isTyping
        });
      });

      // Marcar mensagens como lidas
      socket.on('mark_as_read', async (data: { conversationId: string; messageIds: string[] }) => {
        try {
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', data.messageIds)
            .eq('conversation_id', data.conversationId);

          // Notificar outros usuários na conversa
          socket.to(`conversation_${data.conversationId}`).emit('messages_read', {
            conversationId: data.conversationId,
            messageIds: data.messageIds,
            readBy: socket.userId
          });
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      });

      // Desconexão
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
        }
      });
    });

    console.log('WebSocket service initialized');
  }

  // Enviar nova mensagem para uma conversa
  emitNewMessage(conversationId: string, message: any) {
    if (this.io) {
      this.io.to(`conversation_${conversationId}`).emit('new_message', message);
    }
  }

  // Atualizar status de mensagem
  emitMessageStatusUpdate(conversationId: string, messageId: string, status: string) {
    if (this.io) {
      this.io.to(`conversation_${conversationId}`).emit('message_status_update', {
        messageId,
        status,
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Notificar sobre nova conversa
  emitNewConversation(psicologoId: string, conversation: any) {
    if (this.io) {
      this.io.to(`psicologo_${psicologoId}`).emit('new_conversation', conversation);
    }
  }

  // Atualizar status de conversa
  emitConversationUpdate(conversationId: string, updates: any) {
    if (this.io) {
      this.io.to(`conversation_${conversationId}`).emit('conversation_update', {
        conversationId,
        updates,
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Notificar sobre execução de automação
  emitAutomationExecution(psicologoId: string, execution: any) {
    if (this.io) {
      this.io.to(`psicologo_${psicologoId}`).emit('automation_execution', execution);
    }
  }

  // Notificar sobre erro de webhook
  emitWebhookError(psicologoId: string, error: any) {
    if (this.io) {
      this.io.to(`psicologo_${psicologoId}`).emit('webhook_error', error);
    }
  }

  // Enviar notificação geral
  emitNotification(userId: string, notification: any) {
    if (this.io) {
      const socketId = this.connectedUsers.get(userId);
      if (socketId) {
        this.io.to(socketId).emit('notification', notification);
      }
    }
  }

  // Broadcast para todos os usuários conectados
  broadcast(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  // Verificar se um usuário está online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Obter usuários online
  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  // Obter estatísticas de conexão
  getConnectionStats() {
    return {
      totalConnections: this.connectedUsers.size,
      connectedUsers: Array.from(this.connectedUsers.keys())
    };
  }
}

export const websocketService = new WebSocketService();