import { supabase } from '../lib/supabase.js';
import { socketService } from './socketService.js';

export interface Conversation {
  id: string;
  patient_id: string;
  psychologist_id: string;
  whatsapp_chat_id: string;
  last_message_at: string | null;
  unread_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    nome: string;
    telefone: string;
    email?: string;
  };
  last_message?: {
    content: string;
    message_type: string;
    sender_type: string;
    timestamp: string;
  };
}

export interface Message {
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
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  psychologist_id: string;
  name: string;
  content: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class ChatService {
  // Get conversations for a psychologist
  async getConversations(
    psychologistId: string,
    searchTerm?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Conversation[]> {
    try {
      let query = supabase
        .from('conversations')
        .select(`
          *,
          patient:pacientes!conversations_patient_id_fkey (
            id,
            nome,
            telefone,
            email
          )
        `)
        .eq('psychologist_id', psychologistId)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (searchTerm) {
        query = query.or(`
          patient.nome.ilike.%${searchTerm}%,
          patient.telefone.ilike.%${searchTerm}%
        `);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get last message for each conversation
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conversation) => {
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, message_type, sender_type, timestamp')
            .eq('conversation_id', conversation.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

          return {
            ...conversation,
            last_message: lastMessage
          };
        })
      );

      return conversationsWithLastMessage;
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  }

  // Get messages for a conversation
  async getMessages(
    conversationId: string,
    psychologistId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      // Verify psychologist has access to this conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('psychologist_id', psychologistId)
        .single();

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  // Send a message
  async sendMessage(
    psychologistId: string,
    conversationId: string,
    content: string,
    messageType: 'text' | 'image' | 'document' | 'audio' | 'video' = 'text',
    mediaData?: Buffer
  ): Promise<Message> {
    try {
      // Get conversation details
      const { data: conversation } = await supabase
        .from('conversations')
        .select(`
          *,
          patient:pacientes!conversations_patient_id_fkey (
            telefone
          )
        `)
        .eq('id', conversationId)
        .eq('psychologist_id', psychologistId)
        .single();

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Save to database (WhatsApp integration removed)
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content,
          message_type: messageType,
          sender_type: 'psychologist',
          status: 'sent',
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Emit real-time event
      socketService.emitToConversation(conversationId, 'new_message', {
        conversationId,
        message
      });

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: string, psychologistId: string): Promise<void> {
    try {
      // Verify access
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('psychologist_id', psychologistId)
        .single();

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Update messages status
      await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'patient')
        .neq('status', 'read');

      // Reset unread count
      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      // Emit real-time event
      socketService.emitToConversation(conversationId, 'messages_marked_read', {
        conversationId,
        psychologistId
      });

    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Get or create conversation
  async getOrCreateConversation(
    psychologistId: string,
    patientId: string,
    whatsappChatId: string
  ): Promise<string> {
    try {
      // Check if conversation exists
      let { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('patient_id', patientId)
        .eq('psychologist_id', psychologistId)
        .single();

      if (!conversation) {
        // Create new conversation
        const { data: newConversation, error } = await supabase
          .from('conversations')
          .insert({
            patient_id: patientId,
            psychologist_id: psychologistId,
            whatsapp_chat_id: whatsappChatId,
            is_active: true
          })
          .select('id')
          .single();

        if (error) throw error;
        conversation = newConversation;
      }

      return conversation!.id;
    } catch (error) {
      console.error('Error getting or creating conversation:', error);
      throw error;
    }
  }

  // Get message templates
  async getMessageTemplates(
    psychologistId: string,
    category?: string
  ): Promise<MessageTemplate[]> {
    try {
      let query = supabase
        .from('message_templates')
        .select('*')
        .eq('psychologist_id', psychologistId)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting message templates:', error);
      throw error;
    }
  }

  // Create message template
  async createMessageTemplate(
    psychologistId: string,
    name: string,
    content: string,
    category: string
  ): Promise<MessageTemplate> {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .insert({
          psychologist_id: psychologistId,
          name,
          content,
          category,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error creating message template:', error);
      throw error;
    }
  }

  // Update message template
  async updateMessageTemplate(
    templateId: string,
    psychologistId: string,
    updates: Partial<Pick<MessageTemplate, 'name' | 'content' | 'category' | 'is_active'>>
  ): Promise<MessageTemplate> {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .eq('psychologist_id', psychologistId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating message template:', error);
      throw error;
    }
  }

  // Delete message template
  async deleteMessageTemplate(templateId: string, psychologistId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', templateId)
        .eq('psychologist_id', psychologistId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message template:', error);
      throw error;
    }
  }

  // Get conversation statistics
  async getConversationStats(psychologistId: string): Promise<{
    total_conversations: number;
    active_conversations: number;
    total_messages: number;
    unread_messages: number;
    last_activity: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('get_conversation_stats', { p_psicologo_id: psychologistId });

      if (error) throw error;

      return data[0] || {
        total_conversations: 0,
        active_conversations: 0,
        total_messages: 0,
        unread_messages: 0,
        last_activity: null
      };
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      throw error;
    }
  }

  // Search conversations and messages
  async searchConversations(
    psychologistId: string,
    searchTerm: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase
        .rpc('search_conversations', {
          p_psicologo_id: psychologistId,
          p_search_term: searchTerm,
          p_limit: limit,
          p_offset: offset
        });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching conversations:', error);
      throw error;
    }
  }

  // Export conversation data
  async exportConversation(
    conversationId: string,
    psychologistId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<any> {
    try {
      // Verify access
      const { data: conversation } = await supabase
        .from('conversations')
        .select(`
          *,
          patient:pacientes!conversations_patient_id_fkey (
            nome,
            telefone
          )
        `)
        .eq('id', conversationId)
        .eq('psychologist_id', psychologistId)
        .single();

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Get all messages
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      const exportData = {
        conversation: {
          id: conversation.id,
          patient_name: conversation.patient?.nome,
          patient_phone: conversation.patient?.telefone,
          created_at: conversation.created_at,
          exported_at: new Date().toISOString()
        },
        messages: messages || []
      };

      if (format === 'csv') {
        // Convert to CSV format (implement CSV conversion logic)
        return this.convertToCSV(exportData);
      }

      return exportData;
    } catch (error) {
      console.error('Error exporting conversation:', error);
      throw error;
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - implement more sophisticated logic as needed
    const headers = ['timestamp', 'sender_type', 'message_type', 'content'];
    const rows = data.messages.map((msg: any) => [
      msg.timestamp,
      msg.sender_type,
      msg.message_type,
      msg.content.replace(/"/g, '""') // Escape quotes
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}

export const chatService = new ChatService();