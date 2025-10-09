import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import geminiService from '../services/geminiService.js';
import { evolutionApiService } from '../services/evolutionApiService.js';
import sentimentService from '../services/sentimentService.js';

const router = express.Router();

// Rate limiting para APIs de IA
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP por janela
  message: {
    error: 'Muitas solicitações de IA. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const geminiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 20, // máximo 20 requests por IP por minuto para Gemini
  message: {
    error: 'Muitas solicitações para Gemini. Tente novamente em 1 minuto.',
  },
});

// Middleware para validação de erros
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array(),
    });
  }
  next();
};

// Aplicar rate limiting a todas as rotas de IA
router.use(aiRateLimit);

// ===== ROTAS DO GEMINI =====

// Configurar Gemini
router.post('/gemini/configure', [
  body('apiKey').notEmpty().withMessage('API Key é obrigatória'),
  body('model').optional().isString(),
  body('temperature').optional().isFloat({ min: 0, max: 2 }),
  body('maxTokens').optional().isInt({ min: 1, max: 8192 }),
], handleValidationErrors, async (req, res) => {
  try {
    const { apiKey, model, temperature, maxTokens } = req.body;
    
    geminiService.configure({
      apiKey,
      model,
      temperature,
      maxTokens,
    });

    // Testar conexão
    const connectionTest = await geminiService.checkConnection();
    
    res.json({
      success: true,
      message: 'Gemini configurado com sucesso',
      connected: connectionTest.connected,
      error: connectionTest.error,
    });
  } catch (error) {
    console.error('Erro ao configurar Gemini:', error);
    res.status(500).json({
      error: 'Falha na configuração do Gemini',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Verificar conexão do Gemini
router.get('/gemini/status', async (req, res) => {
  try {
    const status = await geminiService.checkConnection();
    const config = geminiService.getConfig();
    
    res.json({
      connected: status.connected,
      configured: geminiService.isConfigured(),
      error: status.error,
      config: config ? {
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      } : null,
    });
  } catch (error) {
    console.error('Erro ao verificar status do Gemini:', error);
    res.status(500).json({
      error: 'Falha ao verificar status do Gemini',
    });
  }
});

// Enviar mensagem para Gemini
router.post('/gemini/message', geminiRateLimit, [
  body('message').notEmpty().withMessage('Mensagem é obrigatória'),
  body('patientId').optional().isString(),
  body('sessionType').optional().isString(),
  body('analysisType').optional().isIn(['sentiment', 'suggestions', 'both']),
], handleValidationErrors, async (req, res) => {
  try {
    const { message, patientId, sessionType, analysisType } = req.body;
    
    if (!geminiService.isConfigured()) {
      return res.status(400).json({
        error: 'Gemini não está configurado',
      });
    }

    const response = await geminiService.sendMessage(message, {
      patientId,
      sessionType,
      analysisType,
    });

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem para Gemini:', error);
    res.status(500).json({
      error: 'Falha ao enviar mensagem para Gemini',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Iniciar sessão de chat com Gemini
router.post('/gemini/chat/start', [
  body('systemPrompt').optional().isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const { systemPrompt } = req.body;
    
    if (!geminiService.isConfigured()) {
      return res.status(400).json({
        error: 'Gemini não está configurado',
      });
    }

    await geminiService.startChatSession(systemPrompt);

    res.json({
      success: true,
      message: 'Sessão de chat iniciada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao iniciar sessão de chat:', error);
    res.status(500).json({
      error: 'Falha ao iniciar sessão de chat',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Enviar mensagem na sessão de chat
router.post('/gemini/chat/message', geminiRateLimit, [
  body('message').notEmpty().withMessage('Mensagem é obrigatória'),
], handleValidationErrors, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!geminiService.isConfigured()) {
      return res.status(400).json({
        error: 'Gemini não está configurado',
      });
    }

    const response = await geminiService.sendChatMessage(message);

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem no chat:', error);
    res.status(500).json({
      error: 'Falha ao enviar mensagem no chat',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// ===== ROTAS DO WHATSAPP (EVOLUTION API) =====

// Configurar Evolution API
router.post('/whatsapp/configure', [
  body('serverUrl').notEmpty().withMessage('URL do servidor é obrigatória'),
  body('apiKey').notEmpty().withMessage('API Key é obrigatória'),
  body('instanceName').notEmpty().withMessage('Nome da instância é obrigatório'),
  body('webhookUrl').optional().isURL(),
], handleValidationErrors, async (req, res) => {
  try {
    const { serverUrl, apiKey, instanceName, webhookUrl } = req.body;
    
    evolutionApiService.configure({
      serverUrl,
      apiKey,
      instanceName,
      webhookUrl,
    });

    // Criar instância se não existir
    const createResult = await evolutionApiService.createInstance();
    if (!createResult.success) {
      return res.status(400).json({
        error: 'Falha ao criar instância',
        details: createResult.error,
      });
    }

    // Conectar instância
    const connectResult = await evolutionApiService.connectInstance();
    
    res.json({
      success: true,
      message: 'Evolution API configurada com sucesso',
      instanceCreated: createResult.success,
      instanceId: createResult.instanceId,
      qrCode: connectResult.qrCode,
      error: connectResult.error,
    });
  } catch (error) {
    console.error('Erro ao configurar Evolution API:', error);
    res.status(500).json({
      error: 'Falha na configuração da Evolution API',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Verificar status da Evolution API
router.get('/whatsapp/status', async (req, res) => {
  try {
    const status = await evolutionApiService.checkConnection();
    const config = evolutionApiService.getConfig();
    
    res.json({
      connected: status.connected,
      configured: evolutionApiService.isConfigured(),
      instanceStatus: evolutionApiService.getInstanceStatus(),
      error: status.error,
      config: config ? {
        serverUrl: config.serverUrl,
        instanceName: config.instanceName,
        webhookUrl: config.webhookUrl,
      } : null,
    });
  } catch (error) {
    console.error('Erro ao verificar status da Evolution API:', error);
    res.status(500).json({
      error: 'Falha ao verificar status da Evolution API',
    });
  }
});

// Enviar mensagem via Evolution API
router.post('/whatsapp/send', [
  body('to').notEmpty().withMessage('Número de destino é obrigatório'),
  body('message').notEmpty().withMessage('Mensagem é obrigatória'),
  body('templateId').optional().isString(),
  body('variables').optional().isObject(),
  body('delay').optional().isNumeric(),
  body('presence').optional().isIn(['composing', 'recording', 'paused']),
], handleValidationErrors, async (req, res) => {
  try {
    const { to, message, templateId, variables, delay, presence } = req.body;
    
    if (!evolutionApiService.isConfigured()) {
      return res.status(400).json({
        error: 'Evolution API não está configurada',
      });
    }

    if (!evolutionApiService.getConnectionStatus()) {
      return res.status(400).json({
        error: 'Evolution API não está conectada',
      });
    }

    const response = await evolutionApiService.sendMessage(to, message, {
      templateId,
      variables,
      delay,
      presence,
    });

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem Evolution API:', error);
    res.status(500).json({
      error: 'Falha ao enviar mensagem via Evolution API',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Enviar mensagem interativa via Evolution API
router.post('/whatsapp/send-interactive', [
  body('to').notEmpty().withMessage('Número de destino é obrigatório'),
  body('text').notEmpty().withMessage('Texto é obrigatório'),
  body('buttons').isArray().withMessage('Botões devem ser um array'),
  body('buttons.*.id').notEmpty().withMessage('ID do botão é obrigatório'),
  body('buttons.*.title').notEmpty().withMessage('Título do botão é obrigatório'),
], handleValidationErrors, async (req, res) => {
  try {
    const { to, text, buttons } = req.body;
    
    if (!evolutionApiService.isConfigured()) {
      return res.status(400).json({
        error: 'Evolution API não está configurada',
      });
    }

    if (!evolutionApiService.getConnectionStatus()) {
      return res.status(400).json({
        error: 'Evolution API não está conectada',
      });
    }

    const response = await evolutionApiService.sendInteractiveMessage(to, text, buttons);

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem interativa Evolution API:', error);
    res.status(500).json({
      error: 'Falha ao enviar mensagem interativa via Evolution API',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Listar templates da Evolution API
router.get('/whatsapp/templates', async (req, res) => {
  try {
    const templates = evolutionApiService.getTemplates();
    
    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Erro ao listar templates Evolution API:', error);
    res.status(500).json({
      error: 'Falha ao listar templates',
    });
  }
});

// Criar template da Evolution API
router.post('/whatsapp/templates', [
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('category').isIn(['appointment', 'reminder', 'welcome', 'followup', 'emergency']).withMessage('Categoria inválida'),
  body('content').notEmpty().withMessage('Conteúdo é obrigatório'),
  body('variables').optional().isArray(),
  body('language').optional().isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const { name, category, content, variables, language } = req.body;
    
    const template = evolutionApiService.addTemplate({
      name,
      category,
      content,
      variables: variables || [],
      language: language || 'pt_BR',
      isActive: true,
    });

    res.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Erro ao criar template Evolution API:', error);
    res.status(500).json({
      error: 'Falha ao criar template',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Conectar instância Evolution API (para gerar QR Code)
router.post('/whatsapp/connect', async (req, res) => {
  try {
    if (!evolutionApiService.isConfigured()) {
      return res.status(400).json({
        error: 'Evolution API não está configurada',
      });
    }

    // Primeiro, tenta criar a instância se ela não existir
    const createResult = await evolutionApiService.createInstance();
    if (!createResult.success) {
      // Se falhar na criação, pode ser que a instância já existe
      console.log('Instância pode já existir, tentando conectar diretamente:', createResult.error);
    }

    // Agora tenta conectar para obter o QR Code
    const connectResult = await evolutionApiService.connectInstance();
    
    res.json({
      success: connectResult.success,
      qrCode: connectResult.qrCode,
      error: connectResult.error,
    });
  } catch (error) {
    console.error('Erro ao conectar instância Evolution API:', error);
    res.status(500).json({
      error: 'Falha ao conectar instância',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Enviar mensagem de lista via Evolution API
router.post('/whatsapp/send-list', [
  body('to').notEmpty().withMessage('Número de destino é obrigatório'),
  body('text').notEmpty().withMessage('Texto é obrigatório'),
  body('buttonText').notEmpty().withMessage('Texto do botão é obrigatório'),
  body('sections').isArray().withMessage('Seções devem ser um array'),
], handleValidationErrors, async (req, res) => {
  try {
    const { to, text, buttonText, sections } = req.body;
    
    if (!evolutionApiService.isConfigured()) {
      return res.status(400).json({
        error: 'Evolution API não está configurada',
      });
    }

    if (!evolutionApiService.getConnectionStatus()) {
      return res.status(400).json({
        error: 'Evolution API não está conectada',
      });
    }

    const response = await evolutionApiService.sendListMessage(to, text, buttonText, sections);

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error('Erro ao enviar lista Evolution API:', error);
    res.status(500).json({
      error: 'Falha ao enviar lista via Evolution API',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// ===== ROTAS DE ANÁLISE DE SENTIMENTOS =====

// Analisar sentimento de texto
router.post('/sentiment/analyze', [
  body('text').notEmpty().withMessage('Texto é obrigatório'),
  body('patientId').optional().isString(),
  body('sessionId').optional().isString(),
  body('messageType').optional().isIn(['chat', 'session_note', 'whatsapp', 'email']),
  body('sessionType').optional().isString(),
  body('therapistId').optional().isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const { text, patientId, sessionId, messageType, sessionType, therapistId } = req.body;
    
    const analysis = sentimentService.analyze(text, {
      patientId,
      sessionId,
      messageType,
      sessionType,
      therapistId,
    });

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Erro na análise de sentimentos:', error);
    res.status(500).json({
      error: 'Falha na análise de sentimentos',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Obter histórico de sentimentos do paciente
router.get('/sentiment/history/:patientId', [
  param('patientId').notEmpty().withMessage('ID do paciente é obrigatório'),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('messageType').optional().isIn(['chat', 'session_note', 'whatsapp', 'email']),
], handleValidationErrors, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit, startDate, endDate, messageType } = req.query;
    
    const options: any = {};
    if (limit) options.limit = parseInt(limit as string);
    if (startDate) options.startDate = new Date(startDate as string);
    if (endDate) options.endDate = new Date(endDate as string);
    if (messageType) options.messageType = messageType;

    const history = sentimentService.getPatientSentimentHistory(patientId, options);

    res.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('Erro ao obter histórico de sentimentos:', error);
    res.status(500).json({
      error: 'Falha ao obter histórico de sentimentos',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Obter tendência de sentimentos do paciente
router.get('/sentiment/trend/:patientId', [
  param('patientId').notEmpty().withMessage('ID do paciente é obrigatório'),
  query('days').optional().isInt({ min: 1, max: 365 }),
], handleValidationErrors, async (req, res) => {
  try {
    const { patientId } = req.params;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    
    const trend = sentimentService.getPatientSentimentTrend(patientId, days);

    res.json({
      success: true,
      trend,
    });
  } catch (error) {
    console.error('Erro ao obter tendência de sentimentos:', error);
    res.status(500).json({
      error: 'Falha ao obter tendência de sentimentos',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Obter estatísticas gerais de sentimentos
router.get('/sentiment/statistics', async (req, res) => {
  try {
    const statistics = sentimentService.getOverallStatistics();

    res.json({
      success: true,
      statistics,
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de sentimentos:', error);
    res.status(500).json({
      error: 'Falha ao obter estatísticas de sentimentos',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// ===== ROTAS COMBINADAS =====

// Processar mensagem com IA completa (Gemini + Análise de Sentimentos)
router.post('/process-message', geminiRateLimit, [
  body('message').notEmpty().withMessage('Mensagem é obrigatória'),
  body('patientId').optional().isString(),
  body('sessionId').optional().isString(),
  body('sessionType').optional().isString(),
  body('therapistId').optional().isString(),
  body('includeGemini').optional().isBoolean(),
  body('includeSentiment').optional().isBoolean(),
  body('includeSuggestions').optional().isBoolean(),
], handleValidationErrors, async (req, res) => {
  try {
    const {
      message,
      patientId,
      sessionId,
      sessionType,
      therapistId,
      includeGemini = true,
      includeSentiment = true,
      includeSuggestions = true,
    } = req.body;

    const result: any = {
      success: true,
      message,
      timestamp: new Date(),
    };

    // Análise de sentimentos
    if (includeSentiment) {
      result.sentiment = sentimentService.analyze(message, {
        patientId,
        sessionId,
        messageType: 'chat',
        sessionType,
        therapistId,
      });
    }

    // Resposta do Gemini
    if (includeGemini && geminiService.isConfigured()) {
      const analysisType = includeSuggestions ? 'both' : 'sentiment';
      result.geminiResponse = await geminiService.sendMessage(message, {
        patientId,
        sessionType,
        analysisType,
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Erro ao processar mensagem com IA:', error);
    res.status(500).json({
      error: 'Falha ao processar mensagem com IA',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

export default router;