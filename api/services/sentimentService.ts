import Sentiment from 'sentiment';
import { z } from 'zod';

// Schema para análise de sentimentos
const SentimentAnalysisSchema = z.object({
  score: z.number(),
  comparative: z.number(),
  calculation: z.array(z.object({
    word: z.string(),
    score: z.number(),
  })),
  tokens: z.array(z.string()),
  words: z.array(z.string()),
  positive: z.array(z.string()),
  negative: z.array(z.string()),
  label: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1),
  magnitude: z.number().min(0),
  psychologyInsights: z.object({
    emotionalState: z.string(),
    riskLevel: z.enum(['low', 'medium', 'high']),
    suggestedActions: z.array(z.string()),
    keywords: z.array(z.string()),
  }),
});

export type SentimentAnalysisResult = z.infer<typeof SentimentAnalysisSchema>;

// Schema para histórico de sentimentos
const SentimentHistorySchema = z.object({
  patientId: z.string(),
  sessionId: z.string().optional(),
  timestamp: z.date(),
  message: z.string(),
  sentiment: SentimentAnalysisSchema,
  context: z.object({
    messageType: z.enum(['chat', 'session_note', 'whatsapp', 'email']),
    sessionType: z.string().optional(),
    therapistId: z.string().optional(),
  }),
});

export type SentimentHistory = z.infer<typeof SentimentHistorySchema>;

// Dicionário personalizado para psicologia em português
const psychologyDictionary = {
  // Palavras positivas relacionadas à saúde mental
  'feliz': 3,
  'alegre': 3,
  'contente': 2,
  'satisfeito': 2,
  'otimista': 3,
  'esperançoso': 3,
  'confiante': 2,
  'tranquilo': 2,
  'calmo': 2,
  'relaxado': 2,
  'motivado': 3,
  'energizado': 2,
  'grato': 3,
  'agradecido': 3,
  'aliviado': 2,
  'melhor': 2,
  'progresso': 2,
  'crescimento': 2,
  'cura': 3,
  'recuperação': 3,
  'superação': 3,
  'força': 2,
  'coragem': 2,
  'resiliente': 3,
  'equilibrado': 2,
  'harmonia': 2,
  'paz': 2,
  'serenidade': 3,
  'bem-estar': 3,
  'saúde': 2,
  'positivo': 2,
  'sucesso': 2,
  'conquista': 2,
  'vitória': 3,

  // Palavras negativas relacionadas à saúde mental
  'triste': -3,
  'deprimido': -4,
  'depressão': -4,
  'ansioso': -3,
  'ansiedade': -3,
  'preocupado': -2,
  'estressado': -3,
  'estresse': -3,
  'angustiado': -3,
  'angústia': -3,
  'medo': -3,
  'pânico': -4,
  'terror': -4,
  'desespero': -4,
  'desesperado': -4,
  'desesperança': -4,
  'hopeless': -4,
  'vazio': -3,
  'solidão': -3,
  'sozinho': -2,
  'isolado': -3,
  'rejeitado': -3,
  'abandonado': -4,
  'traído': -3,
  'magoado': -3,
  'ferido': -3,
  'dor': -3,
  'sofrimento': -4,
  'trauma': -4,
  'traumatizado': -4,
  'culpa': -3,
  'culpado': -3,
  'vergonha': -3,
  'humilhado': -3,
  'fracasso': -3,
  'falha': -2,
  'perdido': -3,
  'confuso': -2,
  'irritado': -2,
  'raiva': -3,
  'ódio': -4,
  'revolta': -3,
  'frustrado': -3,
  'frustração': -3,
  'cansado': -2,
  'exausto': -3,
  'esgotado': -3,
  'burnout': -4,
  'insônia': -3,
  'pesadelo': -3,
  'suicídio': -5,
  'suicida': -5,
  'morte': -4,
  'morrer': -4,
  'acabar': -3,
  'desistir': -3,
  'impossível': -3,
  'inútil': -3,
  'incapaz': -3,
  'fraco': -2,
  'patético': -4,
  'horrível': -3,
  'terrível': -3,
  'péssimo': -3,
  'ruim': -2,
  'mal': -2,
  'pior': -3,
  'problema': -2,
  'dificuldade': -2,
  'crise': -3,
  'emergência': -3,
};

class SentimentService {
  private sentiment: Sentiment;
  private history: SentimentHistory[] = [];

  constructor() {
    this.sentiment = new Sentiment();
    // Temporariamente comentado para evitar erro no backend
    // TODO: Investigar problema com registerLanguage
    // this.sentiment.registerLanguage('pt', {
    //   labels: psychologyDictionary
    // });
  }

  public analyze(
    text: string,
    context?: {
      patientId?: string;
      sessionId?: string;
      messageType?: 'chat' | 'session_note' | 'whatsapp' | 'email';
      sessionType?: string;
      therapistId?: string;
    }
  ): SentimentAnalysisResult {
    try {
      // Análise básica com a biblioteca Sentiment
      const result = this.sentiment.analyze(text, { language: 'pt' });

      // Calcular label baseado no score
      let label: 'positive' | 'negative' | 'neutral';
      if (result.score > 0) {
        label = 'positive';
      } else if (result.score < 0) {
        label = 'negative';
      } else {
        label = 'neutral';
      }

      // Calcular confiança baseada na magnitude do score
      const confidence = Math.min(Math.abs(result.comparative) * 2, 1);

      // Calcular magnitude (intensidade emocional)
      const magnitude = Math.abs(result.comparative);

      // Análise psicológica avançada
      const psychologyInsights = this.analyzePsychologyInsights(text, result);

      const analysis: SentimentAnalysisResult = {
        score: result.score,
        comparative: result.comparative,
        calculation: result.calculation.map(calc => ({
          word: calc[0] as string,
          score: calc[1] as number,
        })),
        tokens: result.tokens,
        words: result.words,
        positive: result.positive,
        negative: result.negative,
        label,
        confidence,
        magnitude,
        psychologyInsights,
      };

      // Salvar no histórico se contexto fornecido
      if (context?.patientId) {
        this.addToHistory(text, analysis, context as typeof context & { patientId: string });
      }

      return analysis;
    } catch (error) {
      console.error('Erro na análise de sentimentos:', error);
      
      // Retornar análise neutra em caso de erro
      return {
        score: 0,
        comparative: 0,
        calculation: [],
        tokens: text.split(' '),
        words: text.split(' '),
        positive: [],
        negative: [],
        label: 'neutral',
        confidence: 0,
        magnitude: 0,
        psychologyInsights: {
          emotionalState: 'Indeterminado',
          riskLevel: 'low',
          suggestedActions: ['Continuar monitoramento'],
          keywords: [],
        },
      };
    }
  }

  private analyzePsychologyInsights(text: string, sentimentResult: any): {
    emotionalState: string;
    riskLevel: 'low' | 'medium' | 'high';
    suggestedActions: string[];
    keywords: string[];
  } {
    const lowerText = text.toLowerCase();
    const keywords: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const suggestedActions: string[] = [];

    // Palavras-chave de alto risco
    const highRiskKeywords = [
      'suicídio', 'suicida', 'me matar', 'acabar com tudo', 'não aguento mais',
      'quero morrer', 'melhor morto', 'sem saída', 'desistir de tudo',
      'não vale a pena viver', 'fim da linha'
    ];

    // Palavras-chave de médio risco
    const mediumRiskKeywords = [
      'depressão', 'ansiedade', 'pânico', 'desespero', 'trauma',
      'não consigo', 'impossível', 'sem esperança', 'sozinho',
      'abandonado', 'inútil', 'fracasso', 'culpa', 'vergonha'
    ];

    // Palavras-chave positivas
    const positiveKeywords = [
      'melhor', 'progresso', 'esperança', 'força', 'superação',
      'crescimento', 'cura', 'recuperação', 'otimista', 'grato',
      'confiante', 'tranquilo', 'feliz', 'bem-estar'
    ];

    // Verificar palavras de alto risco
    highRiskKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        keywords.push(keyword);
        riskLevel = 'high';
      }
    });

    // Verificar palavras de médio risco (se não há alto risco)
    if (riskLevel === 'low') {
      mediumRiskKeywords.forEach(keyword => {
        if (lowerText.includes(keyword)) {
          keywords.push(keyword);
          riskLevel = 'medium';
        }
      });
    }

    // Verificar palavras positivas
    positiveKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        keywords.push(keyword);
      }
    });

    // Determinar estado emocional
    let emotionalState: string;
    if (sentimentResult.score > 2) {
      emotionalState = 'Muito Positivo';
    } else if (sentimentResult.score > 0) {
      emotionalState = 'Positivo';
    } else if (sentimentResult.score === 0) {
      emotionalState = 'Neutro';
    } else if (sentimentResult.score > -2) {
      emotionalState = 'Levemente Negativo';
    } else if (sentimentResult.score > -5) {
      emotionalState = 'Negativo';
    } else {
      emotionalState = 'Muito Negativo';
    }

    // Sugestões baseadas no nível de risco
    switch (riskLevel as 'low' | 'medium' | 'high') {
      case 'high':
        suggestedActions.push(
          'Contato imediato com profissional de saúde mental',
          'Avaliação de risco de suicídio',
          'Considerar intervenção de emergência',
          'Ativar rede de apoio familiar/social',
          'Monitoramento contínuo'
        );
        break;
      case 'medium':
        suggestedActions.push(
          'Agendar consulta prioritária',
          'Implementar estratégias de coping',
          'Aumentar frequência de sessões',
          'Avaliar necessidade de medicação',
          'Fortalecer rede de apoio'
        );
        break;
      case 'low':
        if (sentimentResult.score < 0) {
          suggestedActions.push(
            'Continuar acompanhamento regular',
            'Explorar fatores estressantes',
            'Reforçar estratégias de autocuidado'
          );
        } else {
          suggestedActions.push(
            'Manter progresso atual',
            'Reforçar conquistas positivas',
            'Continuar estratégias eficazes'
          );
        }
        break;
    }

    return {
      emotionalState,
      riskLevel,
      suggestedActions,
      keywords,
    };
  }

  private addToHistory(
    message: string,
    sentiment: SentimentAnalysisResult,
    context: {
      patientId: string;
      sessionId?: string;
      messageType?: 'chat' | 'session_note' | 'whatsapp' | 'email';
      sessionType?: string;
      therapistId?: string;
    }
  ): void {
    const historyEntry: SentimentHistory = {
      patientId: context.patientId,
      sessionId: context.sessionId,
      timestamp: new Date(),
      message,
      sentiment,
      context: {
        messageType: context.messageType || 'chat',
        sessionType: context.sessionType,
        therapistId: context.therapistId,
      },
    };

    this.history.push(historyEntry);

    // Manter apenas os últimos 1000 registros por paciente
    const patientHistory = this.history.filter(h => h.patientId === context.patientId);
    if (patientHistory.length > 1000) {
      this.history = this.history.filter(h => 
        h.patientId !== context.patientId || 
        h.timestamp >= patientHistory[patientHistory.length - 1000].timestamp
      );
    }
  }

  public getPatientSentimentHistory(
    patientId: string,
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      messageType?: 'chat' | 'session_note' | 'whatsapp' | 'email';
    }
  ): SentimentHistory[] {
    let filtered = this.history.filter(h => h.patientId === patientId);

    if (options?.startDate) {
      filtered = filtered.filter(h => h.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      filtered = filtered.filter(h => h.timestamp <= options.endDate!);
    }

    if (options?.messageType) {
      filtered = filtered.filter(h => h.context.messageType === options.messageType);
    }

    // Ordenar por data (mais recente primeiro)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  public getPatientSentimentTrend(
    patientId: string,
    days: number = 30
  ): {
    trend: 'improving' | 'declining' | 'stable';
    averageScore: number;
    riskLevelDistribution: Record<'low' | 'medium' | 'high', number>;
    dailyAverages: Array<{ date: string; score: number; count: number }>;
  } {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

    const history = this.getPatientSentimentHistory(patientId, {
      startDate,
      endDate,
    });

    if (history.length === 0) {
      return {
        trend: 'stable',
        averageScore: 0,
        riskLevelDistribution: { low: 0, medium: 0, high: 0 },
        dailyAverages: [],
      };
    }

    // Calcular média geral
    const averageScore = history.reduce((sum, h) => sum + h.sentiment.score, 0) / history.length;

    // Distribuição de níveis de risco
    const riskLevelDistribution = history.reduce(
      (acc, h) => {
        acc[h.sentiment.psychologyInsights.riskLevel]++;
        return acc;
      },
      { low: 0, medium: 0, high: 0 }
    );

    // Médias diárias
    const dailyGroups = history.reduce((acc, h) => {
      const dateKey = h.timestamp.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(h.sentiment.score);
      return acc;
    }, {} as Record<string, number[]>);

    const dailyAverages = Object.entries(dailyGroups)
      .map(([date, scores]) => ({
        date,
        score: scores.reduce((sum, score) => sum + score, 0) / scores.length,
        count: scores.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Determinar tendência
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (dailyAverages.length >= 2) {
      const firstHalf = dailyAverages.slice(0, Math.floor(dailyAverages.length / 2));
      const secondHalf = dailyAverages.slice(Math.floor(dailyAverages.length / 2));

      const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.score, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.score, 0) / secondHalf.length;

      const difference = secondHalfAvg - firstHalfAvg;
      if (difference > 0.5) {
        trend = 'improving';
      } else if (difference < -0.5) {
        trend = 'declining';
      }
    }

    return {
      trend,
      averageScore,
      riskLevelDistribution,
      dailyAverages,
    };
  }

  public clearHistory(patientId?: string): void {
    if (patientId) {
      this.history = this.history.filter(h => h.patientId !== patientId);
    } else {
      this.history = [];
    }
  }

  public getOverallStatistics(): {
    totalAnalyses: number;
    averageScore: number;
    riskLevelDistribution: Record<'low' | 'medium' | 'high', number>;
    mostCommonKeywords: Array<{ keyword: string; count: number }>;
  } {
    if (this.history.length === 0) {
      return {
        totalAnalyses: 0,
        averageScore: 0,
        riskLevelDistribution: { low: 0, medium: 0, high: 0 },
        mostCommonKeywords: [],
      };
    }

    const averageScore = this.history.reduce((sum, h) => sum + h.sentiment.score, 0) / this.history.length;

    const riskLevelDistribution = this.history.reduce(
      (acc, h) => {
        acc[h.sentiment.psychologyInsights.riskLevel]++;
        return acc;
      },
      { low: 0, medium: 0, high: 0 }
    );

    // Contar palavras-chave mais comuns
    const keywordCounts: Record<string, number> = {};
    this.history.forEach(h => {
      h.sentiment.psychologyInsights.keywords.forEach(keyword => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      });
    });

    const mostCommonKeywords = Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalAnalyses: this.history.length,
      averageScore,
      riskLevelDistribution,
      mostCommonKeywords,
    };
  }
}

// Instância singleton
export const sentimentService = new SentimentService();
export default sentimentService;