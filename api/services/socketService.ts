import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';

export interface SocketUser {
  id: string;
  psychologistId: string;
  socket: any;
}

class SocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, SocketUser> = new Map();

  initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));
  }

  private async authenticateSocket(socket: any, next: any): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.id;
      socket.psychologistId = decoded.id; // Assuming the user is a psychologist
      
      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  }

  private handleConnection(socket: any): void {
    console.log('User connected:', socket.userId);

    const user: SocketUser = {
      id: socket.userId,
      psychologistId: socket.psychologistId,
      socket
    };

    this.connectedUsers.set(socket.userId, user);

    // Join psychologist-specific room
    socket.join(`psychologist_${socket.psychologistId}`);

    // Handle chat events
    this.setupChatEventHandlers(socket);
    
    // Handle WhatsApp events
    this.setupWhatsAppEventHandlers(socket);

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.userId);
      this.connectedUsers.delete(socket.userId);
    });
  }

  private setupChatEventHandlers(socket: any): void {
    // Join conversation room
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`User ${socket.userId} joined conversation ${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);
    });

    // Handle typing indicators
    socket.on('typing_start', (data: { conversationId: string }) => {
      socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data: { conversationId: string }) => {
      socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
        userId: socket.userId,
        conversationId: data.conversationId,
        isTyping: false
      });
    });

    // Handle message read status
    socket.on('mark_messages_read', (data: { conversationId: string }) => {
      this.markMessagesAsRead(data.conversationId, socket.psychologistId);
    });
  }

  emitToPsychologist(psychologistId: string, event: string, data: any): void {
    this.io?.to(`psychologist_${psychologistId}`).emit(event, data);
  }

  emitToConversation(conversationId: string, event: string, data: any): void {
    this.io?.to(`conversation_${conversationId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: any): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      user.socket.emit(event, data);
    }
  }

  broadcastToAll(event: string, data: any): void {
    this.io?.emit(event, data);
  }

  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  getPsychologistConnections(psychologistId: string): SocketUser[] {
    return Array.from(this.connectedUsers.values())
      .filter(user => user.psychologistId === psychologistId);
  }

  private setupWhatsAppEventHandlers(socket: any): void {
    // Join WhatsApp session room
    socket.on('join_whatsapp_session', (sessionId: string) => {
      socket.join(`whatsapp_session_${sessionId}`);
      console.log(`User ${socket.userId} joined WhatsApp session ${sessionId}`);
    });

    // Leave WhatsApp session room
    socket.on('leave_whatsapp_session', (sessionId: string) => {
      socket.leave(`whatsapp_session_${sessionId}`);
      console.log(`User ${socket.userId} left WhatsApp session ${sessionId}`);
    });

    // Handle WhatsApp message sending
    socket.on('send_whatsapp_message', async (data: {
      sessionId: string;
      to: string;
      message: string;
      type?: 'text' | 'image' | 'document';
    }) => {
      try {
        // This will be handled by the WhatsApp service
        console.log(`WhatsApp message request from ${socket.userId}:`, data);
        
        // Emit acknowledgment
        socket.emit('whatsapp_message_sent', {
          success: true,
          sessionId: data.sessionId,
          to: data.to,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        socket.emit('whatsapp_error', {
          error: 'Failed to send message',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Handle WhatsApp typing indicators
    socket.on('whatsapp_typing_start', (data: { sessionId: string; to: string }) => {
      socket.to(`whatsapp_session_${data.sessionId}`).emit('whatsapp_user_typing', {
        userId: socket.userId,
        sessionId: data.sessionId,
        to: data.to,
        isTyping: true
      });
    });

    socket.on('whatsapp_typing_stop', (data: { sessionId: string; to: string }) => {
      socket.to(`whatsapp_session_${data.sessionId}`).emit('whatsapp_user_typing', {
        userId: socket.userId,
        sessionId: data.sessionId,
        to: data.to,
        isTyping: false
      });
    });
  }

  // WhatsApp-specific emit methods
  emitWhatsAppQRCode(psychologistId: string, qrCode: string, sessionId: string): void {
    this.emitToPsychologist(psychologistId, 'whatsapp_qr_code', {
      qrCode,
      sessionId,
      timestamp: new Date().toISOString()
    });
  }

  emitWhatsAppConnected(psychologistId: string, sessionId: string, clientInfo: any): void {
    this.emitToPsychologist(psychologistId, 'whatsapp_connected', {
      sessionId,
      clientInfo,
      timestamp: new Date().toISOString()
    });
  }

  emitWhatsAppDisconnected(psychologistId: string, sessionId: string, reason?: string): void {
    this.emitToPsychologist(psychologistId, 'whatsapp_disconnected', {
      sessionId,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  emitWhatsAppMessage(sessionId: string, message: any): void {
    this.io?.to(`whatsapp_session_${sessionId}`).emit('whatsapp_message_received', {
      message,
      timestamp: new Date().toISOString()
    });
  }

  emitWhatsAppStatusUpdate(psychologistId: string, status: string, sessionId: string): void {
    this.emitToPsychologist(psychologistId, 'whatsapp_status_update', {
      status,
      sessionId,
      timestamp: new Date().toISOString()
    });
  }

  emitWhatsAppError(psychologistId: string, error: string, sessionId?: string): void {
    this.emitToPsychologist(psychologistId, 'whatsapp_error', {
      error,
      sessionId,
      timestamp: new Date().toISOString()
    });
  }

  private async markMessagesAsRead(conversationId: string, psychologistId: string): Promise<void> {
    // Implementation for marking messages as read
    // This would typically update the database
    console.log(`Marking messages as read for conversation ${conversationId} by psychologist ${psychologistId}`);
  }
}

export const socketService = new SocketService();