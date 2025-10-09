import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { z } from 'zod';

// Schema para validação de configuração
const GeminiConfigSchema = z.object({
  apiKey: z.string().min(1, 'API Key é obrigatória'),
  model: z.enum(['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-flash']).default('gemini-pro'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(8192).default(2048),
});

export type GeminiConfig = z.infer<typeof GeminiConfigSchema>;

// Schema para mensagens
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  timestamp: z.date().default(() => new Date()),
});

export type Message = z.infer<typeof MessageSchema>;

// Schema para análise de sentimentos
const SentimentAnalysisSchema = z.object({
  score: z.number().min(-1).max(1),
  magnitude: z.number().min(0),
  label: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1),
});

export type SentimentAnalysis = z.infer<typeof SentimentAnalysisSchema>;

// Schema para resposta do Gemini
const GeminiResponseSchema = z.object({
  content: z.string(),
  sentiment: SentimentAnalysisSchema.optional(),
  suggestions: z.array(z.string()).optional(),
  metadata: z.object({
    model: z.string(),
    timestamp: z.date(),
    tokensUsed: z.number().optional(),
    responseTime: z.number(),
  }),
});

export type GeminiResponse = z.infer<typeof GeminiResponseSchema>;

class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private chatSession: ChatSession | null = null;
  private config: GeminiConfig | null = null;
  private isConnected = false;

  constructor() {
    this.initializeFromEnv();
  }

  private initializeFromEnv(): void {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const model = process.env.GEMINI_MODEL as 'gemini-pro' | 'gemini-pro-vision' | 'gemini-1.5-flash' || 'gemini-pro';
        this.configure({
          apiKey,
          model,
          temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
          maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '2048'),
        });
      } catch (error) {
        console.error('Erro ao inicializar Gemini com variáveis de ambiente:', error);
      }
    }
  }

  public configure(config: Partial<GeminiConfig>): void {
    try {
      this.config = GeminiConfigSchema.parse(config);
      this.genAI = new GoogleGenerativeAI(this.config.apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: this.config.model,
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens,
        },
      });
      this.isConnected = true;
    } catch (error) {
      console.error('Erro ao configurar Gemini:', error);
      this.isConnected = false;
      throw new Error('Falha na configuração do Gemini API');
    }
  }

  public async checkConnection(): Promise<{ connected: boolean; error?: string }> {
    if (!this.model || !this.config) {
      return { connected: false, error: 'Gemini não configurado' };
    }

    try {
      const startTime = Date.now();
      const result = await this.model.generateContent('Test connection');
      const responseTime = Date.now() - startTime;
      
      if (result.response.text()) {
        this.isConnected = true;
        return { connected: true };
      } else {
        this.isConnected = false;
        return { connected: false, error: 'Resposta vazia do Gemini' };
      }
    } catch (error) {
      this.isConnected = false;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return { connected: false, error: errorMessage };
    }
  }

  public async sendMessage(
    message: string,
    context?: {
      patientId?: string;
      sessionType?: string;
      previousMessages?: Message[];
      analysisType?: 'sentiment' | 'suggestions' | 'both';
    }
  ): Promise<GeminiResponse> {
    if (!this.model || !this.isConnected) {
      throw new Error('Gemini não está conectado');
    }

    const startTime = Date.now();

    try {
      // Construir prompt contextualizado para psicologia
      const systemPrompt = this.buildPsychologyPrompt(context);
      const fullPrompt = `${systemPrompt}\n\nPaciente: ${message}`;

      // Enviar mensagem para o Gemini
      const result = await this.model.generateContent(fullPrompt);
      const responseText = result.response.text();

      // Analisar sentimentos se solicitado
      let sentiment: SentimentAnalysis | undefined;
      if (context?.analysisType === 'sentiment' || context?.analysisType === 'both') {
        sentiment = await this.analyzeSentiment(message);
      }

      // Gerar sugestões se solicitado
      let suggestions: string[] | undefined;
      if (context?.analysisType === 'suggestions' || context?.analysisType === 'both') {
        suggestions = await this.generateSuggestions(message, responseText);
      }

      const responseTime = Date.now() - startTime;

      return GeminiResponseSchema.parse({
        content: responseText,
        sentiment,
        suggestions,
        metadata: {
          model: this.config!.model,
          timestamp: new Date(),
          responseTime,
        },
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem para Gemini:', error);
      throw new Error('Falha na comunicação com Gemini API');
    }
  }

  private buildPsychologyPrompt(context?: {
    patientId?: string;
    sessionType?: string;
    previousMessages?: Message[];
  }): string {
    let prompt = `Você é um assistente de IA especializado em psicologia clínica. Suas respostas devem ser:
- Empáticas e acolhedoras
- Baseadas em evidências científicas
- Respeitosas aos limites éticos da profissão
- Focadas no bem-estar do paciente
- Nunca substitutos de diagnóstico ou tratamento profissional

Diretrizes importantes:
- Sempre encoraje a busca por ajuda profissional quando necessário
- Mantenha confidencialidade e privacidade
- Use linguagem acessível e não técnica
- Ofereça suporte emocional e validação
- Sugira técnicas de autoajuda quando apropriado`;

    if (context?.sessionType) {
      prompt += `\n\nTipo de sessão: ${context.sessionType}`;
    }

    if (context?.previousMessages && context.previousMessages.length > 0) {
      prompt += '\n\nContexto da conversa anterior:';
      context.previousMessages.slice(-3).forEach((msg, index) => {
        prompt += `\n${msg.role}: ${msg.content}`;
      });
    }

    return prompt;
  }

  private async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    try {
      const prompt = `Analise o sentimento do seguinte texto e retorne apenas um JSON com os campos:
{
  "score": número entre -1 (muito negativo) e 1 (muito positivo),
  "magnitude": número entre 0 e 1 indicando intensidade,
  "label": "positive", "negative" ou "neutral",
  "confidence": número entre 0 e 1 indicando confiança
}

Texto: "${text}"`;

      const result = await this.model!.generateContent(prompt);
      const responseText = result.response.text();
      
      // Extrair JSON da resposta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const sentimentData = JSON.parse(jsonMatch[0]);
        return SentimentAnalysisSchema.parse(sentimentData);
      }
      
      // Fallback para análise básica
      return {
        score: 0,
        magnitude: 0.5,
        label: 'neutral',
        confidence: 0.5,
      };
    } catch (error) {
      console.error('Erro na análise de sentimentos:', error);
      return {
        score: 0,
        magnitude: 0.5,
        label: 'neutral',
        confidence: 0.5,
      };
    }
  }

  private async generateSuggestions(userMessage: string, aiResponse: string): Promise<string[]> {
    try {
      const prompt = `Com base na conversa entre paciente e assistente, gere 3 sugestões práticas e empáticas para continuar a conversa ou oferecer apoio. Retorne apenas um array JSON de strings.

Paciente: "${userMessage}"
Assistente: "${aiResponse}"

Formato: ["sugestão 1", "sugestão 2", "sugestão 3"]`;

      const result = await this.model!.generateContent(prompt);
      const responseText = result.response.text();
      
      // Extrair array JSON da resposta
      const arrayMatch = responseText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        const suggestions = JSON.parse(arrayMatch[0]);
        return Array.isArray(suggestions) ? suggestions.slice(0, 3) : [];
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      return [];
    }
  }

  public async startChatSession(systemPrompt?: string): Promise<void> {
    if (!this.model) {
      throw new Error('Gemini não configurado');
    }

    try {
      this.chatSession = this.model.startChat({
        history: systemPrompt ? [
          {
            role: 'user',
            parts: [{ text: systemPrompt }],
          },
          {
            role: 'model',
            parts: [{ text: 'Entendido. Estou pronto para ajudar com questões de psicologia de forma ética e empática.' }],
          },
        ] : [],
      });
    } catch (error) {
      console.error('Erro ao iniciar sessão de chat:', error);
      throw new Error('Falha ao iniciar sessão de chat');
    }
  }

  public async sendChatMessage(message: string): Promise<string> {
    if (!this.chatSession) {
      await this.startChatSession();
    }

    try {
      const result = await this.chatSession!.sendMessage(message);
      return result.response.text();
    } catch (error) {
      console.error('Erro ao enviar mensagem no chat:', error);
      throw new Error('Falha ao enviar mensagem no chat');
    }
  }

  public getConfig(): GeminiConfig | null {
    return this.config;
  }

  public isConfigured(): boolean {
    return this.config !== null && this.isConnected;
  }

  public disconnect(): void {
    this.genAI = null;
    this.model = null;
    this.chatSession = null;
    this.config = null;
    this.isConnected = false;
  }
}

// Instância singleton
export const geminiService = new GeminiService();
export default geminiService;