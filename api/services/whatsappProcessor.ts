// WhatsAppProcessor para Sistema de Chat da Fernanda
// Processamento de mensagens, extração de dados e controle de bloqueio

import { 
  WhatsAppWebhookData, 
  MessageProcessingContext, 
  ChatWhatsAppMessage,
  AudioTranscription,
  ChatProcessingLog 
} from '../types/fernanda-chat';
import { supabase } from '../lib/supabase';
import { redisService } from './redisService';
import { aiService } from './aiService';
import axios from 'axios';

export class WhatsAppProcessor {
  private readonly AUDIO_DOWNLOAD_TIMEOUT = 30000; // 30 segundos
  private readonly MAX_MESSAGE_LENGTH = 4000;
  private readonly BLOCK_KEYWORDS = ['bloquear', 'parar', 'stop', 'cancelar atendimento'];

  constructor() {}

  // Processar webhook do WhatsApp
  async processWebhook(webhookData: WhatsAppWebhookData): Promise<void> {
    const startTime = Date.now();
    let telefone = '';
    
    try {
      // Extrair dados básicos da mensagem
      const extractedData = this.extractMessageData(webhookData);
      telefone = extractedData.telefone;
      
      console.log(`Processando mensagem de ${telefone}:`, extractedData);

      // Verificar rate limiting
      const rateLimit = await redisService.checkRateLimit(telefone, 20, 60); // 20 mensagens por minuto
      if (rateLimit.bloqueado_ate) {
        console.log(`Rate limit atingido para ${telefone}`);
        await this.logProcessing(telefone, 'rate_limit', 'erro', {
          limite: rateLimit.limite_maximo,
          contador: rateLimit.contador,
        });
        return;
      }

      // Verificar se agente está bloqueado
      const agenteBloquado = await redisService.isAgentBlocked(telefone);
      
      // Verificar se mensagem contém comando de bloqueio
      if (this.containsBlockCommand(extractedData.conteudo)) {
        await this.handleBlockCommand(telefone, extractedData.conteudo);
        return;
      }

      // Salvar mensagem no banco de dados
      const mensagemSalva = await this.saveMessage(extractedData);
      
      // Processar áudio se necessário
      if (extractedData.tipo_mensagem === 'audio' && webhookData.message.audioMessage?.url) {
        await this.processAudioMessage(mensagemSalva, webhookData.message.audioMessage.url);
      }

      // Concatenar mensagem se agente não estiver bloqueado
      if (!agenteBloquado) {
        await this.concatenateMessage(telefone, extractedData.conteudo);
      }

      // Atualizar atividade da sessão
      await redisService.updateSessionActivity(telefone);

      // Processar com IA se agente não estiver bloqueado
      if (!agenteBloquado) {
        await this.processWithAI(extractedData);
      }

      // Log de sucesso
      await this.logProcessing(telefone, 'message_processing', 'sucesso', {
        tipo_mensagem: extractedData.tipo_mensagem,
        agente_bloqueado: agenteBloquado,
      }, Date.now() - startTime);

    } catch (error) {
      console.error('Erro no processamento do webhook:', error);
      
      await this.logProcessing(telefone, 'message_processing', 'erro', {
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      }, Date.now() - startTime);
    }
  }

  // Extrair dados da mensagem do webhook
  private extractMessageData(webhookData: WhatsAppWebhookData): MessageProcessingContext {
    const telefone = this.extractPhoneNumber(webhookData.key.remoteJid);
    const nome = webhookData.pushName || undefined;
    const whatsappMessageId = webhookData.key.id;
    const timestamp = new Date(webhookData.messageTimestamp * 1000);

    let tipo_mensagem: 'texto' | 'audio' | 'imagem' | 'documento' = 'texto';
    let conteudo = '';

    // Extrair conteúdo baseado no tipo de mensagem
    if (webhookData.message.conversation) {
      tipo_mensagem = 'texto';
      conteudo = webhookData.message.conversation;
    } else if (webhookData.message.audioMessage) {
      tipo_mensagem = 'audio';
      conteudo = '[Mensagem de áudio]';
    } else if (webhookData.message.imageMessage) {
      tipo_mensagem = 'imagem';
      conteudo = webhookData.message.imageMessage.caption || '[Imagem]';
    } else if (webhookData.message.documentMessage) {
      tipo_mensagem = 'documento';
      conteudo = webhookData.message.documentMessage.title || '[Documento]';
    }

    return {
      telefone,
      nome,
      tipo_mensagem,
      conteudo: this.sanitizeContent(conteudo),
      whatsapp_message_id: whatsappMessageId,
      timestamp,
    };
  }

  // Extrair número de telefone limpo
  private extractPhoneNumber(remoteJid: string): string {
    // Remove @s.whatsapp.net e outros sufixos
    return remoteJid.replace(/@.*$/, '').replace(/\D/g, '');
  }

  // Sanitizar conteúdo da mensagem
  private sanitizeContent(content: string): string {
    if (!content) return '';
    
    // Limitar tamanho
    if (content.length > this.MAX_MESSAGE_LENGTH) {
      content = content.substring(0, this.MAX_MESSAGE_LENGTH) + '...';
    }
    
    // Remover caracteres especiais perigosos
    return content
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Caracteres de controle
      .trim();
  }

  // Verificar se mensagem contém comando de bloqueio
  private containsBlockCommand(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return this.BLOCK_KEYWORDS.some(keyword => lowerContent.includes(keyword));
  }

  // Processar comando de bloqueio
  private async handleBlockCommand(telefone: string, content: string): Promise<void> {
    const motivo = `Comando de bloqueio detectado: "${content}"`;
    
    await redisService.blockAgent(telefone, motivo, 3600); // Bloquear por 1 hora
    
    // Salvar no banco de dados
    await supabase
      .from('agent_blocks')
      .upsert({
        telefone,
        bloqueado: true,
        motivo,
        bloqueado_em: new Date().toISOString(),
      });

    await this.logProcessing(telefone, 'agent_block', 'sucesso', { motivo });
    
    console.log(`Agente bloqueado para ${telefone}: ${motivo}`);
  }

  // Salvar mensagem no banco de dados
  private async saveMessage(context: MessageProcessingContext): Promise<ChatWhatsAppMessage> {
    const { data, error } = await supabase
      .from('chat_whatsapp')
      .insert({
        telefone: context.telefone,
        nome: context.nome,
        tipo_mensagem: context.tipo_mensagem,
        conteudo: context.conteudo,
        whatsapp_message_id: context.whatsapp_message_id,
        timestamp_whatsapp: context.timestamp.toISOString(),
        direcao: 'entrada',
        processado: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao salvar mensagem: ${error.message}`);
    }

    return data;
  }

  // Processar mensagem de áudio
  private async processAudioMessage(mensagem: ChatWhatsAppMessage, audioUrl: string): Promise<void> {
    try {
      console.log(`Processando áudio para ${mensagem.telefone}`);
      
      // Download do áudio
      const audioBuffer = await this.downloadAudio(audioUrl);
      
      // Transcrever áudio
      const transcription = await aiService.transcribeAudio(audioBuffer, 'audio/ogg');
      
      if (transcription.texto && transcription.texto !== '[Erro na transcrição do áudio]') {
        // Atualizar mensagem com transcrição
        await supabase
          .from('chat_whatsapp')
          .update({
            conteudo: transcription.texto,
            conteudo_original: mensagem.conteudo,
            metadata: {
              transcricao: transcription,
              audio_url: audioUrl,
            },
          })
          .eq('id', mensagem.id);

        await this.logProcessing(mensagem.telefone, 'audio_transcription', 'sucesso', {
          duracao: transcription.duracao,
          confianca: transcription.confianca,
        });
      } else {
        await this.logProcessing(mensagem.telefone, 'audio_transcription', 'erro', {
          erro: transcription.erro || 'Falha na transcrição',
        });
      }
    } catch (error) {
      console.error('Erro no processamento de áudio:', error);
      
      await this.logProcessing(mensagem.telefone, 'audio_transcription', 'erro', {
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // Download de áudio
  private async downloadAudio(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: this.AUDIO_DOWNLOAD_TIMEOUT,
      headers: {
        'User-Agent': 'WhatsApp-Processor/1.0',
      },
    });

    return Buffer.from(response.data);
  }

  // Concatenar mensagem no Redis
  private async concatenateMessage(telefone: string, conteudo: string): Promise<void> {
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const mensagemComTimestamp = `[${timestamp}] ${conteudo}`;
    
    await redisService.appendMessage(telefone, mensagemComTimestamp, 3600); // TTL de 1 hora
  }

  // Processar com IA
  private async processWithAI(context: MessageProcessingContext): Promise<void> {
    try {
      console.log(`Processando com IA para ${context.telefone}`);
      
      // Verificar se agente está bloqueado (dupla verificação)
      const agenteBloquado = await redisService.isAgentBlocked(context.telefone);
      if (agenteBloquado) {
        console.log(`Agente bloqueado para ${context.telefone}, pulando processamento IA`);
        return;
      }

      // Processar com IA
      const aiResponse = await aiService.processMessage({
        ...context,
        agente_bloqueado: agenteBloquado,
      });

      // Enviar resposta se houver
      if (aiResponse.resposta) {
        await this.sendResponse(context.telefone, aiResponse.resposta);
      }

      // Processar ações específicas
      if (aiResponse.acao) {
        await this.handleAIAction(context.telefone, aiResponse.acao, aiResponse.parametros);
      }

      await this.logProcessing(context.telefone, 'ai_processing', 'sucesso', {
        acao: aiResponse.acao,
        confianca: aiResponse.confianca,
        tempo_processamento: aiResponse.tempo_processamento,
      });

    } catch (error) {
      console.error('Erro no processamento com IA:', error);
      
      await this.logProcessing(context.telefone, 'ai_processing', 'erro', {
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  // Enviar resposta via WhatsApp
  private async sendResponse(telefone: string, mensagem: string): Promise<void> {
    try {
      const evolutionApiUrl = process.env.EVOLUTION_API_URL;
      const evolutionApiKey = process.env.EVOLUTION_API_KEY;
      const instanceName = process.env.EVOLUTION_INSTANCE_NAME;

      if (!evolutionApiUrl || !evolutionApiKey || !instanceName) {
        throw new Error('Configurações da Evolution API não encontradas');
      }

      const response = await axios.post(
        `${evolutionApiUrl}/message/sendText/${instanceName}`,
        {
          number: telefone,
          text: mensagem,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey,
          },
          timeout: 10000,
        }
      );

      // Salvar mensagem enviada no banco
      await supabase
        .from('chat_whatsapp')
        .insert({
          telefone,
          tipo_mensagem: 'texto',
          conteudo: mensagem,
          direcao: 'saida',
          processado: true,
          metadata: {
            evolution_response: response.data,
          },
        });

      console.log(`Resposta enviada para ${telefone}: ${mensagem.substring(0, 100)}...`);

    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
      throw error;
    }
  }

  // Processar ações da IA
  private async handleAIAction(
    telefone: string, 
    acao: string, 
    parametros?: Record<string, any>
  ): Promise<void> {
    try {
      switch (acao) {
        case 'agendar':
          await this.handleScheduleAction(telefone, parametros);
          break;
        case 'remarcar':
          await this.handleRescheduleAction(telefone, parametros);
          break;
        case 'cancelar':
          await this.handleCancelAction(telefone, parametros);
          break;
        case 'encaminhar':
          await this.handleForwardAction(telefone, parametros);
          break;
        default:
          console.log(`Ação não implementada: ${acao}`);
      }
    } catch (error) {
      console.error(`Erro ao processar ação ${acao}:`, error);
    }
  }

  // Processar agendamento
  private async handleScheduleAction(telefone: string, parametros?: Record<string, any>): Promise<void> {
    // Implementar lógica de agendamento
    console.log(`Processando agendamento para ${telefone}:`, parametros);
    
    // Aqui seria integrado com Google Calendar ou sistema de agendamentos
    await this.logProcessing(telefone, 'schedule_action', 'sucesso', parametros);
  }

  // Processar reagendamento
  private async handleRescheduleAction(telefone: string, parametros?: Record<string, any>): Promise<void> {
    console.log(`Processando reagendamento para ${telefone}:`, parametros);
    await this.logProcessing(telefone, 'reschedule_action', 'sucesso', parametros);
  }

  // Processar cancelamento
  private async handleCancelAction(telefone: string, parametros?: Record<string, any>): Promise<void> {
    console.log(`Processando cancelamento para ${telefone}:`, parametros);
    await this.logProcessing(telefone, 'cancel_action', 'sucesso', parametros);
  }

  // Processar encaminhamento
  private async handleForwardAction(telefone: string, parametros?: Record<string, any>): Promise<void> {
    console.log(`Processando encaminhamento para ${telefone}:`, parametros);
    
    // Bloquear agente temporariamente para encaminhamento manual
    await redisService.blockAgent(telefone, 'Encaminhamento solicitado pelo paciente', 7200); // 2 horas
    
    await this.logProcessing(telefone, 'forward_action', 'sucesso', parametros);
  }

  // Log de processamento
  private async logProcessing(
    telefone: string,
    tipo: string,
    status: 'sucesso' | 'erro' | 'processando',
    detalhes?: Record<string, any>,
    tempoProcessamento?: number
  ): Promise<void> {
    try {
      await supabase
        .from('chat_processing_logs')
        .insert({
          telefone,
          tipo_processamento: tipo,
          status,
          detalhes: detalhes || {},
          tempo_processamento: tempoProcessamento,
        });
    } catch (error) {
      console.error('Erro ao salvar log:', error);
    }
  }

  // Marcar mensagem como processada
  async markMessageAsProcessed(messageId: string): Promise<void> {
    await supabase
      .from('chat_whatsapp')
      .update({ processado: true })
      .eq('id', messageId);
  }

  // Obter estatísticas de processamento
  async getProcessingStats(telefone?: string): Promise<{
    total_mensagens: number;
    mensagens_processadas: number;
    mensagens_pendentes: number;
    tempo_medio_processamento: number;
    taxa_sucesso: number;
  }> {
    let query = supabase
      .from('chat_processing_logs')
      .select('*');

    if (telefone) {
      query = query.eq('telefone', telefone);
    }

    const { data: logs } = await query;

    if (!logs || logs.length === 0) {
      return {
        total_mensagens: 0,
        mensagens_processadas: 0,
        mensagens_pendentes: 0,
        tempo_medio_processamento: 0,
        taxa_sucesso: 0,
      };
    }

    const sucessos = logs.filter(log => log.status === 'sucesso');
    const tempos = logs
      .filter(log => log.tempo_processamento)
      .map(log => log.tempo_processamento);

    return {
      total_mensagens: logs.length,
      mensagens_processadas: sucessos.length,
      mensagens_pendentes: logs.filter(log => log.status === 'processando').length,
      tempo_medio_processamento: tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0,
      taxa_sucesso: sucessos.length / logs.length,
    };
  }

  // Reprocessar mensagens pendentes
  async reprocessPendingMessages(): Promise<number> {
    const { data: mensagens } = await supabase
      .from('chat_whatsapp')
      .select('*')
      .eq('processado', false)
      .eq('direcao', 'entrada')
      .order('created_at', { ascending: true })
      .limit(50);

    if (!mensagens || mensagens.length === 0) {
      return 0;
    }

    let processadas = 0;

    for (const mensagem of mensagens) {
      try {
        const context: MessageProcessingContext = {
          telefone: mensagem.telefone,
          nome: mensagem.nome,
          tipo_mensagem: mensagem.tipo_mensagem,
          conteudo: mensagem.conteudo,
          whatsapp_message_id: mensagem.whatsapp_message_id,
          timestamp: new Date(mensagem.timestamp_whatsapp || mensagem.created_at),
        };

        await this.processWithAI(context);
        await this.markMessageAsProcessed(mensagem.id);
        processadas++;

      } catch (error) {
        console.error(`Erro ao reprocessar mensagem ${mensagem.id}:`, error);
      }
    }

    return processadas;
  }

  // Limpar dados antigos
  async cleanupOldData(diasParaManter: number = 30): Promise<{
    mensagens_removidas: number;
    logs_removidos: number;
  }> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasParaManter);

    // Remover mensagens antigas
    const { count: mensagensRemovidas } = await supabase
      .from('chat_whatsapp')
      .delete()
      .lt('created_at', dataLimite.toISOString());

    // Remover logs antigos
    const { count: logsRemovidos } = await supabase
      .from('chat_processing_logs')
      .delete()
      .lt('created_at', dataLimite.toISOString());

    return {
      mensagens_removidas: mensagensRemovidas || 0,
      logs_removidos: logsRemovidos || 0,
    };
  }
}

// Instância singleton do WhatsAppProcessor
export const whatsappProcessor = new WhatsAppProcessor();