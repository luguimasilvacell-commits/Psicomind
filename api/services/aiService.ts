// AIService para Sistema de Chat WhatsApp da Fernanda
// Integração com OpenAI e Google Gemini para IA Júlia

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIConfig, AIResponse, MessageProcessingContext, AudioTranscription, SentimentAnalysis } from '../types/fernanda-chat';
import { supabase } from '../lib/supabase';
import { redisService } from './redisService';

export class AIService {
  private openai: OpenAI;
  private gemini: GoogleGenerativeAI;
  private currentConfig: AIConfig | null = null;

  constructor() {
    // Inicializar OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Inicializar Google Gemini
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  // Carregar configuração da IA do banco de dados
  async loadAIConfig(): Promise<AIConfig> {
    if (this.currentConfig) {
      return this.currentConfig;
    }

    const { data, error } = await supabase
      .from('ai_config')
      .select('*')
      .eq('ativo', true)
      .order('versao', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error('Configuração da IA não encontrada');
    }

    this.currentConfig = data;
    return this.currentConfig;
  }

  // Processar mensagem com IA Júlia
  async processMessage(context: MessageProcessingContext): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      const config = await this.loadAIConfig();
      
      // Buscar histórico de conversa do Redis
      const sessionData = await redisService.getSession(context.telefone);
      const mensagensConcatenadas = await redisService.getConcatenatedMessages(context.telefone) || '';
      
      // Construir contexto da conversa
      const conversationContext = this.buildConversationContext(
        context,
        sessionData?.contexto || {},
        mensagensConcatenadas
      );

      // Processar com o modelo configurado
      let response: string;
      if (config.modelo_ia.startsWith('gpt')) {
        response = await this.processWithOpenAI(config, conversationContext);
      } else if (config.modelo_ia.startsWith('gemini')) {
        response = await this.processWithGemini(config, conversationContext);
      } else {
        throw new Error(`Modelo de IA não suportado: ${config.modelo_ia}`);
      }

      // Analisar resposta para extrair ações
      const actionAnalysis = this.analyzeResponseForActions(response);
      
      const aiResponse: AIResponse = {
        resposta: response,
        acao: actionAnalysis.acao,
        parametros: actionAnalysis.parametros,
        confianca: actionAnalysis.confianca,
        tempo_processamento: Date.now() - startTime,
      };

      // Salvar contexto atualizado no Redis
      await this.updateConversationContext(context.telefone, aiResponse);

      return aiResponse;
    } catch (error) {
      console.error('Erro no processamento da IA:', error);
      
      return {
        resposta: 'Desculpe, estou com dificuldades técnicas no momento. Pode repetir sua mensagem?',
        confianca: 0,
        tempo_processamento: Date.now() - startTime,
      };
    }
  }

  // Processar com OpenAI
  private async processWithOpenAI(config: AIConfig, context: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: config.modelo_ia,
      messages: [
        {
          role: 'system',
          content: config.prompt_sistema,
        },
        {
          role: 'user',
          content: context,
        },
      ],
      temperature: config.temperatura,
      max_tokens: config.max_tokens,
    });

    return completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';
  }

  // Processar com Google Gemini
  private async processWithGemini(config: AIConfig, context: string): Promise<string> {
    const model = this.gemini.getGenerativeModel({ model: config.modelo_ia });
    
    const prompt = `${config.prompt_sistema}\n\nContexto da conversa:\n${context}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text() || 'Desculpe, não consegui processar sua mensagem.';
  }

  // Construir contexto da conversa
  private buildConversationContext(
    context: MessageProcessingContext,
    sessionContext: Record<string, any>,
    mensagensConcatenadas: string
  ): string {
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    
    let contextString = `Data/Hora atual: ${agora}\n`;
    contextString += `Telefone do paciente: ${context.telefone}\n`;
    
    if (context.nome) {
      contextString += `Nome do paciente: ${context.nome}\n`;
    }
    
    contextString += `Tipo de mensagem: ${context.tipo_mensagem}\n`;
    
    if (context.agente_bloqueado) {
      contextString += `IMPORTANTE: O agente está bloqueado para este paciente.\n`;
    }
    
    if (mensagensConcatenadas) {
      contextString += `\nHistórico recente da conversa:\n${mensagensConcatenadas}\n`;
    }
    
    contextString += `\nMensagem atual do paciente: ${context.conteudo}\n`;
    
    if (Object.keys(sessionContext).length > 0) {
      contextString += `\nContexto da sessão: ${JSON.stringify(sessionContext, null, 2)}\n`;
    }
    
    return contextString;
  }

  // Analisar resposta para extrair ações
  private analyzeResponseForActions(response: string): {
    acao?: 'agendar' | 'remarcar' | 'cancelar' | 'informar' | 'encaminhar';
    parametros?: Record<string, any>;
    confianca: number;
  } {
    const lowerResponse = response.toLowerCase();
    
    // Detectar ação de agendamento
    if (lowerResponse.includes('agendar') || lowerResponse.includes('marcar consulta')) {
      return {
        acao: 'agendar',
        parametros: this.extractSchedulingParams(response),
        confianca: 0.8,
      };
    }
    
    // Detectar ação de reagendamento
    if (lowerResponse.includes('reagendar') || lowerResponse.includes('remarcar')) {
      return {
        acao: 'remarcar',
        parametros: this.extractSchedulingParams(response),
        confianca: 0.8,
      };
    }
    
    // Detectar ação de cancelamento
    if (lowerResponse.includes('cancelar') || lowerResponse.includes('desmarcar')) {
      return {
        acao: 'cancelar',
        parametros: this.extractCancellationParams(response),
        confianca: 0.9,
      };
    }
    
    // Detectar necessidade de encaminhamento
    if (lowerResponse.includes('encaminhar') || lowerResponse.includes('falar com a psicóloga')) {
      return {
        acao: 'encaminhar',
        parametros: { motivo: 'solicitacao_paciente' },
        confianca: 0.9,
      };
    }
    
    return {
      acao: 'informar',
      confianca: 0.7,
    };
  }

  // Extrair parâmetros de agendamento
  private extractSchedulingParams(response: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extrair data (formato simples)
    const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
    const dateMatch = response.match(dateRegex);
    if (dateMatch) {
      params.data = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
    }
    
    // Extrair horário
    const timeRegex = /(\d{1,2}):(\d{2})/;
    const timeMatch = response.match(timeRegex);
    if (timeMatch) {
      params.horario = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    }
    
    return params;
  }

  // Extrair parâmetros de cancelamento
  private extractCancellationParams(response: string): Record<string, any> {
    return {
      motivo: 'solicitacao_paciente',
      timestamp: new Date().toISOString(),
    };
  }

  // Atualizar contexto da conversa
  private async updateConversationContext(telefone: string, aiResponse: AIResponse): Promise<void> {
    const sessionData = await redisService.getSession(telefone);
    
    if (sessionData) {
      // Atualizar contexto com informações da resposta da IA
      sessionData.contexto.ultima_resposta_ia = aiResponse.resposta;
      sessionData.contexto.ultima_acao = aiResponse.acao;
      sessionData.contexto.timestamp_ultima_ia = new Date().toISOString();
      
      if (aiResponse.parametros) {
        sessionData.contexto.parametros_ultima_acao = aiResponse.parametros;
      }
      
      await redisService.setSession(telefone, sessionData);
    }
  }

  // Transcrever áudio usando OpenAI Whisper
  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<AudioTranscription> {
    const startTime = Date.now();
    
    try {
      // Criar arquivo temporário para o áudio
      const audioFile = new File([audioBuffer], 'audio.ogg', { type: mimeType });
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'pt',
        response_format: 'verbose_json',
      });
      
      return {
        texto: transcription.text,
        confianca: 0.9, // Whisper não retorna confidence, assumimos alta
        duracao: transcription.duration || 0,
        idioma: transcription.language || 'pt',
      };
    } catch (error) {
      console.error('Erro na transcrição de áudio:', error);
      
      return {
        texto: '[Erro na transcrição do áudio]',
        confianca: 0,
        duracao: 0,
        idioma: 'pt',
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  // Análise de sentimento
  async analyzeSentiment(texto: string): Promise<SentimentAnalysis> {
    try {
      const config = await this.loadAIConfig();
      
      const prompt = `Analise o sentimento da seguinte mensagem e retorne um JSON com:
      - score: número entre -1 (muito negativo) e 1 (muito positivo)
      - magnitude: intensidade da emoção entre 0 e 1
      - classificacao: uma das opções: muito_negativo, negativo, neutro, positivo, muito_positivo
      - confianca: nível de confiança da análise entre 0 e 1
      - emocoes_detectadas: array com emoções identificadas

      Mensagem: "${texto}"
      
      Responda apenas com o JSON, sem explicações adicionais.`;

      let response: string;
      if (config.modelo_ia.startsWith('gpt')) {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 200,
        });
        response = completion.choices[0]?.message?.content || '{}';
      } else {
        const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(prompt);
        response = (await result.response).text();
      }

      // Tentar parsear a resposta JSON
      try {
        const analysis = JSON.parse(response);
        return {
          score: analysis.score || 0,
          magnitude: analysis.magnitude || 0,
          classificacao: analysis.classificacao || 'neutro',
          confianca: analysis.confianca || 0.5,
          emocoes_detectadas: analysis.emocoes_detectadas || [],
        };
      } catch {
        // Fallback se não conseguir parsear
        return {
          score: 0,
          magnitude: 0,
          classificacao: 'neutro',
          confianca: 0.1,
          emocoes_detectadas: [],
        };
      }
    } catch (error) {
      console.error('Erro na análise de sentimento:', error);
      
      return {
        score: 0,
        magnitude: 0,
        classificacao: 'neutro',
        confianca: 0,
        emocoes_detectadas: [],
      };
    }
  }

  // Gerar resposta automática baseada em template
  async generateTemplateResponse(template: string, variables: Record<string, any>): Promise<string> {
    try {
      const config = await this.loadAIConfig();
      
      const prompt = `Personalize o seguinte template de mensagem substituindo as variáveis pelos valores fornecidos e adaptando o tom para ser mais natural e empático:

      Template: ${template}
      Variáveis: ${JSON.stringify(variables)}
      
      Retorne apenas a mensagem personalizada, sem explicações adicionais.`;

      if (config.modelo_ia.startsWith('gpt')) {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 300,
        });
        return completion.choices[0]?.message?.content || template;
      } else {
        const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(prompt);
        return (await result.response).text() || template;
      }
    } catch (error) {
      console.error('Erro na geração de template:', error);
      return template;
    }
  }

  // Detectar intenção da mensagem
  async detectIntent(mensagem: string): Promise<{
    intencao: string;
    confianca: number;
    entidades: Record<string, any>;
  }> {
    try {
      const prompt = `Analise a seguinte mensagem e identifique:
      1. A intenção principal (agendar, cancelar, remarcar, informacao, emergencia, saudacao, despedida, reclamacao, elogio)
      2. Nível de confiança (0-1)
      3. Entidades importantes (datas, horários, nomes, etc.)

      Mensagem: "${mensagem}"
      
      Responda em JSON com: {"intencao": "", "confianca": 0.0, "entidades": {}}`;

      const config = await this.loadAIConfig();
      let response: string;

      if (config.modelo_ia.startsWith('gpt')) {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 200,
        });
        response = completion.choices[0]?.message?.content || '{}';
      } else {
        const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(prompt);
        response = (await result.response).text();
      }

      try {
        const analysis = JSON.parse(response);
        return {
          intencao: analysis.intencao || 'informacao',
          confianca: analysis.confianca || 0.5,
          entidades: analysis.entidades || {},
        };
      } catch {
        return {
          intencao: 'informacao',
          confianca: 0.1,
          entidades: {},
        };
      }
    } catch (error) {
      console.error('Erro na detecção de intenção:', error);
      
      return {
        intencao: 'informacao',
        confianca: 0,
        entidades: {},
      };
    }
  }

  // Obter configuração atual da IA
  async getAIConfig(): Promise<AIConfig> {
    return await this.loadAIConfig();
  }

  // Atualizar configuração da IA
  async updateAIConfig(newConfig: Partial<AIConfig>): Promise<AIConfig> {
    const { data, error } = await supabase
      .from('ai_config')
      .update(newConfig)
      .eq('id', this.currentConfig?.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar configuração da IA: ${error.message}`);
    }

    this.currentConfig = data;
    return data;
  }

  // Obter estatísticas de uso da IA
  async getAIStats(periodo: { inicio: string; fim: string }): Promise<{
    total_processamentos: number;
    tempo_medio_resposta: number;
    taxa_sucesso: number;
    intencoes_mais_comuns: Array<{ intencao: string; count: number }>;
  }> {
    const { data: logs } = await supabase
      .from('chat_processing_logs')
      .select('*')
      .eq('tipo_processamento', 'ai_processing')
      .gte('created_at', periodo.inicio)
      .lte('created_at', periodo.fim);

    if (!logs || logs.length === 0) {
      return {
        total_processamentos: 0,
        tempo_medio_resposta: 0,
        taxa_sucesso: 0,
        intencoes_mais_comuns: [],
      };
    }

    const sucessos = logs.filter(log => log.status === 'sucesso');
    const tempos = sucessos
      .filter(log => log.tempo_processamento)
      .map(log => log.tempo_processamento);

    const intencoes: Record<string, number> = {};
    sucessos.forEach(log => {
      const intencao = log.detalhes?.intencao || 'desconhecida';
      intencoes[intencao] = (intencoes[intencao] || 0) + 1;
    });

    const intencoesMaisComuns = Object.entries(intencoes)
      .map(([intencao, count]) => ({ intencao, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total_processamentos: logs.length,
      tempo_medio_resposta: tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0,
      taxa_sucesso: sucessos.length / logs.length,
      intencoes_mais_comuns: intencoesMaisComuns,
    };
  }

  // Limpar cache da configuração
  clearConfigCache(): void {
    this.currentConfig = null;
  }
}

// Instância singleton do AIService
export const aiService = new AIService();