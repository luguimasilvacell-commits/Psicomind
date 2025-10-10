// WhatsAppSessionService para Sistema de Chat da Fernanda
// Gerenciamento de sessões de chat por telefone

import { 
  ChatSession, 
  RedisSessionData,
  ChatStats,
  PerformanceMetrics,
  ChatWhatsAppMessage,
  ChatProcessingLog,
  HealthCheck
} from '../types/fernanda-chat';
import { supabase } from '../lib/supabase';
import { redisService } from './redisService';

export class WhatsAppSessionService {
  private readonly SESSION_TIMEOUT = 3600; // 1 hora em segundos
  private readonly MAX_SESSIONS_PER_PHONE = 1; // Apenas uma sessão ativa por telefone
  private readonly CLEANUP_INTERVAL = 300; // 5 minutos

  constructor() {
    // Iniciar limpeza automática de sessões expiradas
    this.startCleanupTimer();
  }

  // Criar ou obter sessão existente
  async getOrCreateSession(telefone: string, nome?: string): Promise<ChatSession> {
    try {
      // Verificar se já existe sessão ativa no Redis
      const redisSession = await redisService.getSession(telefone);
      
      if (redisSession && redisSession.session_id) {
        // Verificar se sessão ainda existe no banco
        const { data: existingSession } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('id', redisSession.session_id)
          .eq('ativa', true)
          .single();

        if (existingSession) {
          // Atualizar última atividade
          await this.updateSessionActivity(existingSession.id);
          return existingSession;
        }
      }

      // Criar nova sessão
      return await this.createNewSession(telefone, nome);

    } catch (error) {
      console.error('Erro ao obter/criar sessão:', error);
      throw new Error(`Falha ao gerenciar sessão para ${telefone}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  // Criar nova sessão
  private async createNewSession(telefone: string, nome?: string): Promise<ChatSession> {
    try {
      // Finalizar sessões ativas existentes
      await this.finalizePreviousSessions(telefone);

      // Criar nova sessão no banco
      const { data: newSession, error } = await supabase
        .from('chat_sessions')
        .insert({
          telefone,
          nome,
          ativa: true,
          iniciada_em: new Date().toISOString(),
          ultima_atividade: new Date().toISOString(),
          agente_bloqueado: false,
          metadata: {
            user_agent: 'WhatsApp',
            platform: 'mobile',
            created_by: 'whatsapp_processor',
          },
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao criar sessão: ${error.message}`);
      }

      // Salvar dados da sessão no Redis
      const redisSessionData: RedisSessionData = {
        session_id: newSession.id,
        telefone,
        nome,
        iniciada_em: newSession.iniciada_em,
        ultima_atividade: newSession.ultima_atividade,
        agente_bloqueado: false,
        mensagens_concatenadas: '',
        metadata: newSession.metadata || {},
      };

      await redisService.setSession(telefone, redisSessionData, this.SESSION_TIMEOUT);

      console.log(`Nova sessão criada para ${telefone}: ${newSession.id}`);
      return newSession;

    } catch (error) {
      console.error('Erro ao criar nova sessão:', error);
      throw error;
    }
  }

  // Finalizar sessões anteriores
  private async finalizePreviousSessions(telefone: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({
          ativa: false,
          finalizada_em: new Date().toISOString(),
          motivo_finalizacao: 'Nova sessão iniciada',
        })
        .eq('telefone', telefone)
        .eq('ativa', true);

      if (error) {
        console.error('Erro ao finalizar sessões anteriores:', error);
      }
    } catch (error) {
      console.error('Erro ao finalizar sessões anteriores:', error);
    }
  }

  // Atualizar atividade da sessão
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const agora = new Date().toISOString();

      // Atualizar no banco
      await supabase
        .from('chat_sessions')
        .update({ ultima_atividade: agora })
        .eq('id', sessionId);

      // Obter dados da sessão para atualizar Redis
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('telefone')
        .eq('id', sessionId)
        .single();

      if (session) {
        // Atualizar no Redis
        const redisSession = await redisService.getSession(session.telefone);
        if (redisSession) {
          redisSession.ultima_atividade = agora;
          await redisService.setSession(session.telefone, redisSession, this.SESSION_TIMEOUT);
        }
      }

    } catch (error) {
      console.error('Erro ao atualizar atividade da sessão:', error);
    }
  }

  // Finalizar sessão
  async finalizeSession(
    telefone: string, 
    motivo: string = 'Finalizada pelo usuário'
  ): Promise<void> {
    try {
      const agora = new Date().toISOString();

      // Finalizar no banco
      const { error } = await supabase
        .from('chat_sessions')
        .update({
          ativa: false,
          finalizada_em: agora,
          motivo_finalizacao: motivo,
        })
        .eq('telefone', telefone)
        .eq('ativa', true);

      if (error) {
        throw new Error(`Erro ao finalizar sessão: ${error.message}`);
      }

      // Remover do Redis
      await redisService.deleteSession(telefone);

      console.log(`Sessão finalizada para ${telefone}: ${motivo}`);

    } catch (error) {
      console.error('Erro ao finalizar sessão:', error);
      throw error;
    }
  }

  // Bloquear agente na sessão
  async blockAgentInSession(
    telefone: string, 
    motivo: string, 
    duracaoSegundos: number = 3600
  ): Promise<void> {
    try {
      const agora = new Date().toISOString();
      const bloqueadoAte = new Date(Date.now() + duracaoSegundos * 1000).toISOString();

      // Atualizar no banco
      await supabase
        .from('chat_sessions')
        .update({
          agente_bloqueado: true,
          agente_bloqueado_em: agora,
          agente_bloqueado_ate: bloqueadoAte,
          motivo_bloqueio: motivo,
        })
        .eq('telefone', telefone)
        .eq('ativa', true);

      // Atualizar no Redis
      await redisService.blockAgent(telefone, motivo, duracaoSegundos);

      // Atualizar dados da sessão no Redis
      const redisSession = await redisService.getSession(telefone);
      if (redisSession) {
        redisSession.agente_bloqueado = true;
        await redisService.setSession(telefone, redisSession, this.SESSION_TIMEOUT);
      }

      console.log(`Agente bloqueado na sessão ${telefone}: ${motivo}`);

    } catch (error) {
      console.error('Erro ao bloquear agente na sessão:', error);
      throw error;
    }
  }

  // Desbloquear agente na sessão
  async unblockAgentInSession(telefone: string): Promise<void> {
    try {
      // Atualizar no banco
      await supabase
        .from('chat_sessions')
        .update({
          agente_bloqueado: false,
          agente_bloqueado_em: null,
          agente_bloqueado_ate: null,
          motivo_bloqueio: null,
        })
        .eq('telefone', telefone)
        .eq('ativa', true);

      // Desbloquear no Redis
      await redisService.unblockAgent(telefone);

      // Atualizar dados da sessão no Redis
      const redisSession = await redisService.getSession(telefone);
      if (redisSession) {
        redisSession.agente_bloqueado = false;
        await redisService.setSession(telefone, redisSession, this.SESSION_TIMEOUT);
      }

      console.log(`Agente desbloqueado na sessão ${telefone}`);

    } catch (error) {
      console.error('Erro ao desbloquear agente na sessão:', error);
      throw error;
    }
  }

  // Verificar se agente está bloqueado
  async isAgentBlocked(telefone: string): Promise<boolean> {
    try {
      // Verificar primeiro no Redis (mais rápido)
      const bloqueado = await redisService.isAgentBlocked(telefone);
      if (bloqueado) {
        return true;
      }

      // Verificar no banco como fallback
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('agente_bloqueado, agente_bloqueado_ate')
        .eq('telefone', telefone)
        .eq('ativa', true)
        .single();

      if (session && session.agente_bloqueado) {
        // Verificar se ainda está dentro do período de bloqueio
        if (session.agente_bloqueado_ate) {
          const agora = new Date();
          const bloqueadoAte = new Date(session.agente_bloqueado_ate);
          
          if (agora < bloqueadoAte) {
            return true;
          } else {
            // Bloqueio expirou, desbloquear automaticamente
            await this.unblockAgentInSession(telefone);
            return false;
          }
        }
        return true;
      }

      return false;

    } catch (error) {
      console.error('Erro ao verificar bloqueio do agente:', error);
      return false; // Em caso de erro, assumir que não está bloqueado
    }
  }

  // Obter sessão ativa
  async getActiveSession(telefone: string): Promise<ChatSession | null> {
    try {
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('telefone', telefone)
        .eq('ativa', true)
        .order('iniciada_em', { ascending: false })
        .limit(1)
        .single();

      return session || null;

    } catch (error) {
      console.error('Erro ao obter sessão ativa:', error);
      return null;
    }
  }

  // Listar sessões por telefone
  async getSessionsByPhone(
    telefone: string, 
    limit: number = 10, 
    offset: number = 0
  ): Promise<ChatSession[]> {
    try {
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('telefone', telefone)
        .order('iniciada_em', { ascending: false })
        .range(offset, offset + limit - 1);

      return sessions || [];

    } catch (error) {
      console.error('Erro ao listar sessões:', error);
      return [];
    }
  }

  // Obter estatísticas de sessões
  async getSessionStats(telefone?: string): Promise<ChatStats> {
    try {
      let query = supabase
        .from('chat_sessions')
        .select('*');

      if (telefone) {
        query = query.eq('telefone', telefone);
      }

      const { data: sessions } = await query;

      if (!sessions || sessions.length === 0) {
        return {
          total_sessoes: 0,
          sessoes_ativas: 0,
          sessoes_finalizadas: 0,
          tempo_medio_sessao: 0,
          sessoes_com_bloqueio: 0,
          ultima_atividade: null,
        };
      }

      const ativas = sessions.filter(s => s.ativa);
      const finalizadas = sessions.filter(s => !s.ativa);
      const comBloqueio = sessions.filter(s => s.agente_bloqueado);

      // Calcular tempo médio de sessão (apenas para sessões finalizadas)
      const temposSessao = finalizadas
        .filter(s => s.finalizada_em)
        .map(s => {
          const inicio = new Date(s.iniciada_em);
          const fim = new Date(s.finalizada_em!);
          return fim.getTime() - inicio.getTime();
        });

      const tempoMedio = temposSessao.length > 0 
        ? temposSessao.reduce((a, b) => a + b, 0) / temposSessao.length 
        : 0;

      // Última atividade
      const ultimaAtividade = sessions
        .map(s => new Date(s.ultima_atividade))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      return {
        total_sessoes: sessions.length,
        sessoes_ativas: ativas.length,
        sessoes_finalizadas: finalizadas.length,
        tempo_medio_sessao: Math.round(tempoMedio / 1000), // em segundos
        sessoes_com_bloqueio: comBloqueio.length,
        ultima_atividade: ultimaAtividade.toISOString(),
      };

    } catch (error) {
      console.error('Erro ao obter estatísticas de sessões:', error);
      throw error;
    }
  }

  // Limpar sessões expiradas
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const agora = new Date();
      const tempoLimite = new Date(agora.getTime() - this.SESSION_TIMEOUT * 1000);

      // Finalizar sessões expiradas
      const { data: sessoesExpiradas } = await supabase
        .from('chat_sessions')
        .select('id, telefone')
        .eq('ativa', true)
        .lt('ultima_atividade', tempoLimite.toISOString());

      if (!sessoesExpiradas || sessoesExpiradas.length === 0) {
        return 0;
      }

      // Finalizar cada sessão expirada
      for (const sessao of sessoesExpiradas) {
        await this.finalizeSession(sessao.telefone, 'Sessão expirada por inatividade');
      }

      console.log(`${sessoesExpiradas.length} sessões expiradas foram finalizadas`);
      return sessoesExpiradas.length;

    } catch (error) {
      console.error('Erro ao limpar sessões expiradas:', error);
      return 0;
    }
  }

  // Obter métricas de performance
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const agora = new Date();
      const ultimaHora = new Date(agora.getTime() - 3600000); // 1 hora atrás
      const ultimoDia = new Date(agora.getTime() - 86400000); // 24 horas atrás

      // Sessões na última hora
      const { count: sessoesUltimaHora } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('iniciada_em', ultimaHora.toISOString());

      // Sessões no último dia
      const { count: sessoesUltimoDia } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('iniciada_em', ultimoDia.toISOString());

      // Sessões ativas atualmente
      const { count: sessoesAtivas } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('ativa', true);

      // Tempo médio de resposta (baseado nos logs de processamento)
      const { data: logs } = await supabase
        .from('chat_processing_logs')
        .select('tempo_processamento')
        .gte('created_at', ultimaHora.toISOString())
        .not('tempo_processamento', 'is', null);

      const temposProcessamento = logs?.map(log => log.tempo_processamento) || [];
      const tempoMedioResposta = temposProcessamento.length > 0
        ? temposProcessamento.reduce((a, b) => a + b, 0) / temposProcessamento.length
        : 0;

      return {
        sessoes_ativas: sessoesAtivas || 0,
        sessoes_ultima_hora: sessoesUltimaHora || 0,
        sessoes_ultimo_dia: sessoesUltimoDia || 0,
        tempo_medio_resposta: Math.round(tempoMedioResposta),
        memoria_redis_mb: await this.getRedisMemoryUsage(),
        uptime_segundos: process.uptime(),
      };

    } catch (error) {
      console.error('Erro ao obter métricas de performance:', error);
      throw error;
    }
  }

  // Obter uso de memória do Redis
  private async getRedisMemoryUsage(): Promise<number> {
    try {
      const info = await redisService.getRedisInfo();
      // Extrair uso de memória do Redis info
      const memoryMatch = info.match(/used_memory:(\d+)/);
      if (memoryMatch) {
        return Math.round(parseInt(memoryMatch[1]) / 1024 / 1024); // Converter para MB
      }
      return 0;
    } catch (error) {
      console.error('Erro ao obter uso de memória do Redis:', error);
      return 0;
    }
  }

  // Timer de limpeza automática
  private startCleanupTimer(): void {
    setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error) {
        console.error('Erro na limpeza automática de sessões:', error);
      }
    }, this.CLEANUP_INTERVAL * 1000);

    console.log(`Timer de limpeza de sessões iniciado (intervalo: ${this.CLEANUP_INTERVAL}s)`);
  }

  // Exportar dados de sessão para backup
  async exportSessionData(telefone?: string): Promise<{
    sessions: ChatSession[];
    redis_data: Record<string, RedisSessionData>;
  }> {
    try {
      let query = supabase
        .from('chat_sessions')
        .select('*');

      if (telefone) {
        query = query.eq('telefone', telefone);
      }

      const { data: sessions } = await query;

      // Obter dados do Redis para cada telefone
      const redisData: Record<string, RedisSessionData> = {};
      
      if (sessions) {
        for (const session of sessions) {
          const sessionData = await redisService.getSession(session.telefone);
          if (sessionData) {
            redisData[session.telefone] = sessionData;
          }
        }
      }

      return {
        sessions: sessions || [],
        redis_data: redisData,
      };

    } catch (error) {
      console.error('Erro ao exportar dados de sessão:', error);
      throw error;
    }
  }

  // Health check do serviço
  async healthCheck(): Promise<HealthCheck> {
    try {
      const startTime = Date.now();

      // Verificar conexão com banco
      const { error: dbError } = await supabase
        .from('chat_sessions')
        .select('count')
        .limit(1);

      // Verificar conexão com Redis
      const redisHealthy = await redisService.healthCheck();

      // Verificar métricas
      const metrics = await this.getPerformanceMetrics();

      const responseTime = Date.now() - startTime;

      const details = {
        database: !dbError,
        redis: redisHealthy.status === 'saudavel',
        response_time_ms: responseTime,
        active_sessions: metrics.sessoes_ativas,
        memory_usage_mb: metrics.memoria_redis_mb,
      };

      let status: 'saudavel' | 'degradado' | 'indisponivel' = 'saudavel';

      if (dbError || redisHealthy.status === 'indisponivel') {
        status = 'indisponivel';
      } else if (responseTime > 1000 || redisHealthy.status === 'degradado') {
        status = 'degradado';
      }

      return {
        servico: 'whatsapp-sessions',
        status,
        latencia: responseTime,
        ultima_verificacao: new Date().toISOString(),
        detalhes: details,
      };

    } catch (error) {
      return {
        servico: 'whatsapp-sessions',
        status: 'indisponivel',
        latencia: -1,
        ultima_verificacao: new Date().toISOString(),
        detalhes: {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        },
      };
    }
  }
}

// Instância singleton do WhatsAppSessionService
export const whatsappSessionService = new WhatsAppSessionService();