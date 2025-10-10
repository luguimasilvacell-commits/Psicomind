// Rotas da API para Sistema de Chat WhatsApp da Fernanda
// Endpoints: webhook WhatsApp, gerenciamento de sessões e configuração da IA

// Estender interface Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { whatsappProcessor } from '../services/whatsappProcessor';
import { whatsappSessionService } from '../services/whatsappSessionService';
import { aiService } from '../services/aiService';
import { redisService } from '../services/redisService';
import { supabase } from '../lib/supabase';
import { WhatsAppWebhookData, AIConfig } from '../types/fernanda-chat';

const router = Router();

// Rate limiting específico para webhook WhatsApp
const whatsappWebhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 200, // máximo 200 requests por minuto (WhatsApp pode ser intenso)
  message: { error: 'Too many WhatsApp webhook requests' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit por telefone se disponível
    const telefone = req.body?.key?.remoteJid?.replace(/@.*$/, '');
    return telefone || req.ip;
  },
});

// Rate limiting para APIs de gerenciamento
const managementRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // máximo 60 requests por minuto
  message: { error: 'Too many management API requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware de validação de API key para webhook
const validateWebhookApiKey = (req: Request, res: Response, next: any) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required for webhook' });
  }

  const validApiKey = process.env.FERNANDA_WEBHOOK_API_KEY || process.env.EVOLUTION_API_KEY;
  if (apiKey !== validApiKey) {
    return res.status(401).json({ error: 'Invalid webhook API key' });
  }

  next();
};

// Middleware de autenticação para APIs de gerenciamento
const requireAuth = async (req: Request, res: Response, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * WEBHOOK DO WHATSAPP
 * Endpoint principal para receber mensagens do WhatsApp via Evolution API
 */
router.post('/webhook/whatsapp',
  whatsappWebhookRateLimit,
  validateWebhookApiKey,
  [
    body('key').isObject().withMessage('Message key is required'),
    body('key.remoteJid').notEmpty().withMessage('Remote JID is required'),
    body('key.id').notEmpty().withMessage('Message ID is required'),
    body('message').isObject().withMessage('Message content is required'),
    body('messageTimestamp').isNumeric().withMessage('Message timestamp must be numeric'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const webhookData: WhatsAppWebhookData = req.body;
      
      // Log da mensagem recebida
      console.log(`📱 WhatsApp webhook received from ${webhookData.key.remoteJid}`);

      // Processar webhook de forma assíncrona
      whatsappProcessor.processWebhook(webhookData).catch(error => {
        console.error('Erro no processamento assíncrono do webhook:', error);
      });

      // Resposta rápida para o WhatsApp
      res.status(200).json({
        success: true,
        message: 'Webhook received and queued for processing',
        messageId: webhookData.key.id,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('❌ WhatsApp webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    }
  }
);

/**
 * GERENCIAMENTO DE SESSÕES
 */

// Obter sessão ativa por telefone
router.get('/sessions/:telefone',
  managementRateLimit,
  requireAuth,
  [
    param('telefone').isMobilePhone('pt-BR').withMessage('Telefone deve ser válido'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { telefone } = req.params;
      const session = await whatsappSessionService.getActiveSession(telefone);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Nenhuma sessão ativa encontrada para este telefone',
        });
      }

      res.json({
        success: true,
        data: session,
      });

    } catch (error: any) {
      console.error('Erro ao obter sessão:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
      });
    }
  }
);

// Listar sessões por telefone
router.get('/sessions/:telefone/history',
  managementRateLimit,
  requireAuth,
  [
    param('telefone').isMobilePhone('pt-BR').withMessage('Telefone deve ser válido'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit deve ser entre 1 e 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset deve ser >= 0'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { telefone } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const sessions = await whatsappSessionService.getSessionsByPhone(telefone, limit, offset);

      res.json({
        success: true,
        data: sessions,
        pagination: {
          limit,
          offset,
          total: sessions.length,
        },
      });

    } catch (error: any) {
      console.error('Erro ao listar sessões:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
      });
    }
  }
);

// Finalizar sessão
router.post('/sessions/:telefone/finalize',
  managementRateLimit,
  requireAuth,
  [
    param('telefone').isMobilePhone('pt-BR').withMessage('Telefone deve ser válido'),
    body('motivo').optional().isString().withMessage('Motivo deve ser uma string'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { telefone } = req.params;
      const { motivo } = req.body;

      await whatsappSessionService.finalizeSession(telefone, motivo || 'Finalizada manualmente');

      res.json({
        success: true,
        message: 'Sessão finalizada com sucesso',
      });

    } catch (error: any) {
      console.error('Erro ao finalizar sessão:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
      });
    }
  }
);

// Bloquear agente na sessão
router.post('/sessions/:telefone/block-agent',
  managementRateLimit,
  requireAuth,
  [
    param('telefone').isMobilePhone('pt-BR').withMessage('Telefone deve ser válido'),
    body('motivo').notEmpty().withMessage('Motivo é obrigatório'),
    body('duracaoSegundos').optional().isInt({ min: 60, max: 86400 }).withMessage('Duração deve ser entre 60 e 86400 segundos'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { telefone } = req.params;
      const { motivo, duracaoSegundos } = req.body;

      await whatsappSessionService.blockAgentInSession(telefone, motivo, duracaoSegundos || 3600);

      res.json({
        success: true,
        message: 'Agente bloqueado com sucesso',
      });

    } catch (error: any) {
      console.error('Erro ao bloquear agente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
      });
    }
  }
);

// Desbloquear agente na sessão
router.post('/sessions/:telefone/unblock-agent',
  managementRateLimit,
  requireAuth,
  [
    param('telefone').isMobilePhone('pt-BR').withMessage('Telefone deve ser válido'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { telefone } = req.params;

      await whatsappSessionService.unblockAgentInSession(telefone);

      res.json({
        success: true,
        message: 'Agente desbloqueado com sucesso',
      });

    } catch (error: any) {
      console.error('Erro ao desbloquear agente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
      });
    }
  }
);

// Obter estatísticas de sessões
router.get('/sessions/stats',
  managementRateLimit,
  requireAuth,
  [
    query('telefone').optional().isMobilePhone('pt-BR').withMessage('Telefone deve ser válido'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { telefone } = req.query;
      const stats = await whatsappSessionService.getSessionStats(telefone as string);

      res.json({
        success: true,
        data: stats,
      });

    } catch (error: any) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
      });
    }
  }
);

/**
 * CONFIGURAÇÃO DA IA JÚLIA
 */

// Obter configuração da IA
router.get('/ai/config',
  managementRateLimit,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const config = await aiService.getAIConfig();

      res.json({
        success: true,
        data: config,
      });

    } catch (error: any) {
      console.error('Erro ao obter configuração da IA:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
      });
    }
  }
);

// Atualizar configuração da IA
router.put('/ai/config',
  managementRateLimit,
  requireAuth,
  [
    body('nome').optional().isString().withMessage('Nome deve ser uma string'),
    body('personalidade').optional().isString().withMessage('Personalidade deve ser uma string'),
    body('instrucoes_sistema').optional().isString().withMessage('Instruções do sistema devem ser uma string'),
    body('modelo_openai').optional().isString().withMessage('Modelo OpenAI deve ser uma string'),
    body('modelo_gemini').optional().isString().withMessage('Modelo Gemini deve ser uma string'),
    body('temperatura').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperatura deve ser entre 0 e 2'),
    body('max_tokens').optional().isInt({ min: 1, max: 4000 }).withMessage('Max tokens deve ser entre 1 e 4000'),
    body('ativa').optional().isBoolean().withMessage('Ativa deve ser um boolean'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updateData: Partial<AIConfig> = req.body;
      const updatedConfig = await aiService.updateAIConfig(updateData);

      res.json({
        success: true,
        data: updatedConfig,
        message: 'Configuração da IA atualizada com sucesso',
      });

    } catch (error: any) {
      console.error('Erro ao atualizar configuração da IA:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
      });
    }
  }
);

// Testar configuração da IA
router.post('/ai/test',
  managementRateLimit,
  requireAuth,
  [
    body('mensagem').notEmpty().withMessage('Mensagem de teste é obrigatória'),
    body('telefone').optional().isMobilePhone('pt-BR').withMessage('Telefone deve ser válido'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { mensagem, telefone } = req.body;

      const response = await aiService.processMessage({
        telefone: telefone || '5511999999999',
        nome: 'Teste',
        tipo_mensagem: 'texto',
        conteudo: mensagem,
        whatsapp_message_id: 'test-' + Date.now(),
        timestamp: new Date(),
        agente_bloqueado: false,
      });

      res.json({
        success: true,
        data: response,
        message: 'Teste da IA executado com sucesso',
      });

    } catch (error: any) {
      console.error('Erro ao testar IA:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
      });
    }
  }
);

// Obter estatísticas da IA
router.get('/ai/stats',
  managementRateLimit,
  requireAuth,
  [
    query('inicio').optional().isISO8601().withMessage('Data de início deve ser uma data válida'),
    query('fim').optional().isISO8601().withMessage('Data de fim deve ser uma data válida'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Definir período padrão (últimos 30 dias)
      const fim = req.query.fim as string || new Date().toISOString();
      const inicio = req.query.inicio as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const stats = await aiService.getAIStats({ inicio, fim });

      res.json({
        success: true,
        data: stats,
      });

    } catch (error: any) {
      console.error('Erro ao obter estatísticas da IA:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
      });
    }
  }
);

/**
 * ENDPOINTS DE MONITORAMENTO E SAÚDE
 */

// Health check do sistema
router.get('/health',
  async (req: Request, res: Response) => {
    try {
      const sessionHealth = await whatsappSessionService.healthCheck();
      const redisHealth = await redisService.healthCheck();

      const overallStatus = sessionHealth.status === 'saudavel' && redisHealth.status === 'saudavel' 
        ? 'healthy' 
        : sessionHealth.status === 'indisponivel' || redisHealth.status === 'indisponivel'
        ? 'unhealthy'
        : 'degraded';

      res.status(overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 206 : 503).json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services: {
          sessions: sessionHealth,
          redis: redisHealth,
        },
      });

    } catch (error: any) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }
);

// Métricas de performance
router.get('/metrics',
  managementRateLimit,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const sessionMetrics = await whatsappSessionService.getPerformanceMetrics();
      const processingStats = await whatsappProcessor.getProcessingStats();

      res.json({
        success: true,
        data: {
          sessions: sessionMetrics,
          processing: processingStats,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error: any) {
      console.error('Erro ao obter métricas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
      });
    }
  }
);

// Limpeza de dados antigos
router.post('/cleanup',
  managementRateLimit,
  requireAuth,
  [
    body('diasParaManter').optional().isInt({ min: 1, max: 365 }).withMessage('Dias para manter deve ser entre 1 e 365'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { diasParaManter } = req.body;
      const result = await whatsappProcessor.cleanupOldData(diasParaManter || 30);

      res.json({
        success: true,
        data: result,
        message: 'Limpeza de dados executada com sucesso',
      });

    } catch (error: any) {
      console.error('Erro na limpeza de dados:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
      });
    }
  }
);

// Reprocessar mensagens pendentes
router.post('/reprocess',
  managementRateLimit,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const processadas = await whatsappProcessor.reprocessPendingMessages();

      res.json({
        success: true,
        data: {
          mensagens_processadas: processadas,
        },
        message: `${processadas} mensagens reprocessadas com sucesso`,
      });

    } catch (error: any) {
      console.error('Erro no reprocessamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message,
      });
    }
  }
);

export default router;