import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, Message, MessageMedia } = pkg;
import QRCode from 'qrcode';
import { EventEmitter } from 'events';
import { supabase } from '../lib/supabase.js';
import { logService } from './logService.js';
import { socketService } from './socketService.js';

interface WhatsAppSession {
  id: string;
  psychologist_id: string;
  is_connected: boolean;
  session_data?: string;
  client_info?: any;
  webhook_url?: string;
  auto_reply_enabled: boolean;
  auto_reply_message?: string;
  business_hours_enabled: boolean;
  business_hours_start: string;
  business_hours_end: string;
  away_message?: string;
}

interface WhatsAppConversation {
  id: string;
  psychologist_id: string;
  patient_id?: string;
  patient_name: string;
  patient_phone: string;
  last_message_time: string;
  unread_count: number;
  status: 'active' | 'archived' | 'blocked';
}

interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  content: string;
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video';
  sender_type: 'patient' | 'psychologist';
  whatsapp_message_id?: string;
  media_url?: string;
  media_type?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
}

class WhatsAppService extends EventEmitter {
  private clients: Map<string, Client> = new Map();
  private qrCodes: Map<string, string> = new Map();
  private connectionStatus: Map<string, string> = new Map();

  constructor() {
    super();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.on('qr', (psychologistId: string, qr: string) => {
      logService.log('info', `QR Code gerado para psicólogo ${psychologistId}`);
    });

    this.on('ready', (psychologistId: string) => {
      logService.log('info', `WhatsApp conectado para psicólogo ${psychologistId}`);
    });

    this.on('disconnected', (psychologistId: string) => {
      logService.log('info', `WhatsApp desconectado para psicólogo ${psychologistId}`);
    });
  }

  async initializeClient(psychologistId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar se já existe um cliente ativo
      if (this.clients.has(psychologistId)) {
        const client = this.clients.get(psychologistId);
        if (client && await this.isClientReady(client)) {
          return { success: true, message: 'Cliente já conectado' };
        }
      }

      // Criar novo cliente
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: `psychologist_${psychologistId}`
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      });

      // Configurar eventos do cliente
      this.setupClientEvents(client, psychologistId);

      // Armazenar cliente
      this.clients.set(psychologistId, client);
      this.connectionStatus.set(psychologistId, 'initializing');

      // Inicializar cliente
      await client.initialize();

      logService.log('info', `Cliente WhatsApp inicializado para psicólogo ${psychologistId}`);
      return { success: true, message: 'Cliente inicializado com sucesso' };

    } catch (error) {
      logService.log('error', `Erro ao inicializar cliente WhatsApp: ${error}`);
      this.connectionStatus.set(psychologistId, 'error');
      return { success: false, message: `Erro ao inicializar: ${error}` };
    }
  }

  private setupClientEvents(client: Client, psychologistId: string) {
    client.on('qr', async (qr) => {
      try {
        const qrCodeDataURL = await QRCode.toDataURL(qr);
        this.qrCodes.set(psychologistId, qrCodeDataURL);
        this.connectionStatus.set(psychologistId, 'qr_code');
        this.emit('qr', psychologistId, qrCodeDataURL);
        
        // Emit QR code via WebSocket
        socketService.emitWhatsAppQRCode(psychologistId, qrCodeDataURL, psychologistId);
        
        // Atualizar status no banco
        await this.updateSessionStatus(psychologistId, false);
      } catch (error) {
        logService.log('error', `Erro ao gerar QR Code: ${error}`);
        socketService.emitWhatsAppError(psychologistId, 'Failed to generate QR code', psychologistId);
      }
    });

    client.on('ready', async () => {
      try {
        this.connectionStatus.set(psychologistId, 'connected');
        this.emit('ready', psychologistId);

        // Obter informações do cliente
        const clientInfo = await client.info;
        
        // Atualizar status no banco
        await this.updateSessionStatus(psychologistId, true, clientInfo);
        
        // Emit connected status via WebSocket
        socketService.emitWhatsAppConnected(psychologistId, psychologistId, clientInfo);
        
        logService.log('info', `Cliente conectado: ${clientInfo.wid.user}`);
      } catch (error) {
        logService.log('error', `Erro ao processar conexão: ${error}`);
      }
    });

    client.on('authenticated', () => {
      this.connectionStatus.set(psychologistId, 'authenticated');
      logService.log('info', `Cliente autenticado para psicólogo ${psychologistId}`);
    });

    client.on('auth_failure', (msg) => {
      this.connectionStatus.set(psychologistId, 'auth_failure');
      logService.log('error', `Falha na autenticação: ${msg}`);
    });

    client.on('disconnected', async (reason) => {
      this.connectionStatus.set(psychologistId, 'disconnected');
      this.emit('disconnected', psychologistId);
      
      // Atualizar status no banco
      await this.updateSessionStatus(psychologistId, false);
      
      // Emit disconnected status via WebSocket
      socketService.emitWhatsAppDisconnected(psychologistId, psychologistId, reason);
      
      logService.log('info', `Cliente desconectado: ${reason}`);
    });

    client.on('message', async (message) => {
      try {
        await this.handleIncomingMessage(message, psychologistId);
        
        // Emit message via WebSocket
        socketService.emitWhatsAppMessage(psychologistId, {
          id: message.id.id,
          from: message.from,
          to: message.to,
          body: message.body,
          type: message.type,
          timestamp: message.timestamp,
          hasMedia: message.hasMedia
        });
      } catch (error) {
        console.error('Error handling incoming message:', error);
        socketService.emitWhatsAppError(psychologistId, 'Failed to handle incoming message', psychologistId);
      }
    });

    client.on('message_ack', async (message, ack) => {
      await this.handleMessageAck(message, ack, psychologistId);
    });
  }

  private async handleIncomingMessage(message: Message, psychologistId: string) {
    try {
      // Verificar se é mensagem de grupo (ignorar)
      if (message.from.includes('@g.us')) {
        return;
      }

      // Extrair informações da mensagem
      const contact = await message.getContact();
      const patientPhone = message.from.replace('@c.us', '');
      const patientName = contact.pushname || contact.name || patientPhone;

      // Buscar ou criar conversa
      const conversation = await this.findOrCreateConversation(
        psychologistId,
        patientName,
        patientPhone
      );

      // Salvar mensagem
      await this.saveMessage({
        conversation_id: conversation.id,
        content: message.body,
        message_type: this.getMessageType(message),
        sender_type: 'patient',
        whatsapp_message_id: message.id._serialized,
        status: 'delivered',
        timestamp: new Date(message.timestamp * 1000).toISOString()
      });

      // Atualizar conversa
      await this.updateConversation(conversation.id, {
        last_message_time: new Date().toISOString(),
        unread_count: conversation.unread_count + 1
      });

      // Verificar auto-resposta
      await this.checkAutoReply(psychologistId, message.from);

      // Emitir evento para WebSocket
      this.emit('new_message', {
        psychologistId,
        conversationId: conversation.id,
        message: {
          content: message.body,
          sender_type: 'patient',
          timestamp: new Date(message.timestamp * 1000).toISOString()
        }
      });

    } catch (error) {
      logService.log('error', `Erro ao processar mensagem recebida: ${error}`);
    }
  }

  private async handleMessageAck(message: Message, ack: any, psychologistId: string) {
    try {
      let status = 'sent';
      
      switch (ack) {
        case 1:
          status = 'sent';
          break;
        case 2:
          status = 'delivered';
          break;
        case 3:
          status = 'read';
          break;
        default:
          status = 'failed';
      }

      // Atualizar status da mensagem no banco
      await supabase
        .from('whatsapp_messages')
        .update({ status })
        .eq('whatsapp_message_id', message.id._serialized);

      // Emitir evento para WebSocket
      this.emit('message_status_update', {
        psychologistId,
        messageId: message.id._serialized,
        status
      });

    } catch (error) {
      logService.log('error', `Erro ao atualizar status da mensagem: ${error}`);
    }
  }

  async sendMessage(psychologistId: string, to: string, content: string, type: string = 'text'): Promise<{ success: boolean; message?: string; messageId?: string }> {
    try {
      const client = this.clients.get(psychologistId);
      
      if (!client || !await this.isClientReady(client)) {
        return { success: false, message: 'Cliente não conectado' };
      }

      // Formatar número de telefone
      const chatId = to.includes('@c.us') ? to : `${to}@c.us`;

      let sentMessage;
      
      if (type === 'text') {
        sentMessage = await client.sendMessage(chatId, content);
      } else {
        // Para outros tipos de mídia (implementar conforme necessário)
        sentMessage = await client.sendMessage(chatId, content);
      }

      // Buscar ou criar conversa
      const conversation = await this.findOrCreateConversation(
        psychologistId,
        to,
        to.replace('@c.us', '')
      );

      // Salvar mensagem no banco
      await this.saveMessage({
        conversation_id: conversation.id,
        content,
        message_type: type as any,
        sender_type: 'psychologist',
        whatsapp_message_id: sentMessage.id._serialized,
        status: 'sent',
        timestamp: new Date().toISOString()
      });

      // Atualizar conversa
      await this.updateConversation(conversation.id, {
        last_message_time: new Date().toISOString(),
        unread_count: 0
      });

      return { 
        success: true, 
        message: 'Mensagem enviada com sucesso',
        messageId: sentMessage.id._serialized
      };

    } catch (error) {
      logService.log('error', `Erro ao enviar mensagem: ${error}`);
      return { success: false, message: `Erro ao enviar: ${error}` };
    }
  }

  async getQRCode(psychologistId: string): Promise<string | null> {
    return this.qrCodes.get(psychologistId) || null;
  }

  async getConnectionStatus(psychologistId: string): Promise<string> {
    return this.connectionStatus.get(psychologistId) || 'disconnected';
  }

  async disconnectClient(psychologistId: string): Promise<{ success: boolean; message: string }> {
    try {
      const client = this.clients.get(psychologistId);
      
      if (client) {
        await client.destroy();
        this.clients.delete(psychologistId);
        this.qrCodes.delete(psychologistId);
        this.connectionStatus.set(psychologistId, 'disconnected');
        
        // Atualizar status no banco
        await this.updateSessionStatus(psychologistId, false);
      }

      return { success: true, message: 'Cliente desconectado com sucesso' };
    } catch (error) {
      logService.log('error', `Erro ao desconectar cliente: ${error}`);
      return { success: false, message: `Erro ao desconectar: ${error}` };
    }
  }

  async getConversations(psychologistId: string): Promise<WhatsAppConversation[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('psychologist_id', psychologistId)
        .order('last_message_time', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logService.log('error', `Erro ao buscar conversas: ${error}`);
      return [];
    }
  }

  async getMessages(conversationId: string): Promise<WhatsAppMessage[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logService.log('error', `Erro ao buscar mensagens: ${error}`);
      return [];
    }
  }

  private async isClientReady(client: Client): Promise<boolean> {
    try {
      const state = await client.getState();
      return state === 'CONNECTED';
    } catch {
      return false;
    }
  }

  private async updateSessionStatus(psychologistId: string, isConnected: boolean, clientInfo?: any) {
    try {
      const { error } = await supabase
        .from('whatsapp_sessions')
        .upsert({
          psychologist_id: psychologistId,
          is_connected: isConnected,
          client_info: clientInfo,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      logService.log('error', `Erro ao atualizar status da sessão: ${error}`);
    }
  }

  private async findOrCreateConversation(psychologistId: string, patientName: string, patientPhone: string): Promise<WhatsAppConversation> {
    try {
      // Buscar conversa existente
      const { data: existing } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('psychologist_id', psychologistId)
        .eq('patient_phone', patientPhone)
        .single();

      if (existing) {
        return existing;
      }

      // Criar nova conversa
      const { data: newConversation, error } = await supabase
        .from('whatsapp_conversations')
        .insert({
          psychologist_id: psychologistId,
          patient_name: patientName,
          patient_phone: patientPhone,
          last_message_time: new Date().toISOString(),
          unread_count: 0,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      return newConversation;
    } catch (error) {
      logService.log('error', `Erro ao buscar/criar conversa: ${error}`);
      throw error;
    }
  }

  private async saveMessage(message: Omit<WhatsAppMessage, 'id'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .insert(message);

      if (error) throw error;
    } catch (error) {
      logService.log('error', `Erro ao salvar mensagem: ${error}`);
      throw error;
    }
  }

  private async updateConversation(conversationId: string, updates: Partial<WhatsAppConversation>): Promise<void> {
    try {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) throw error;
    } catch (error) {
      logService.log('error', `Erro ao atualizar conversa: ${error}`);
    }
  }

  private getMessageType(message: Message): 'text' | 'image' | 'document' | 'audio' | 'video' {
    if (message.hasMedia) {
      const media = message.type;
      switch (media) {
        case 'image':
          return 'image';
        case 'document':
          return 'document';
        case 'audio':
        case 'ptt':
          return 'audio';
        case 'video':
          return 'video';
        default:
          return 'text';
      }
    }
    return 'text';
  }

  private async checkAutoReply(psychologistId: string, chatId: string): Promise<void> {
    try {
      // Buscar configurações de auto-resposta
      const { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('psychologist_id', psychologistId)
        .single();

      if (!session || !session.auto_reply_enabled) {
        return;
      }

      // Verificar horário comercial
      if (session.business_hours_enabled) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        
        if (currentTime < session.business_hours_start || currentTime > session.business_hours_end) {
          // Fora do horário comercial - enviar mensagem de ausência
          if (session.away_message) {
            await this.sendMessage(psychologistId, chatId, session.away_message);
          }
          return;
        }
      }

      // Enviar auto-resposta
      if (session.auto_reply_message) {
        await this.sendMessage(psychologistId, chatId, session.auto_reply_message);
      }

    } catch (error) {
      logService.log('error', `Erro ao verificar auto-resposta: ${error}`);
    }
  }
}

export const whatsappService = new WhatsAppService();