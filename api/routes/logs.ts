import express from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { logService, LogQuerySchema, LogLevelSchema, LogCategorySchema } from '../services/logService.js'

const router = express.Router()

// Rate limiting para logs
const logRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: { error: 'Muitas requisições para logs. Tente novamente em 15 minutos.' }
})

const adminLogRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // máximo 20 requests por IP para operações administrativas
  message: { error: 'Muitas requisições administrativas. Tente novamente em 5 minutos.' }
})

// Schemas para validação
const CreateLogSchema = z.object({
  level: LogLevelSchema,
  category: LogCategorySchema,
  message: z.string().min(1).max(1000),
  details: z.record(z.any()).optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

const LogAIInteractionSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  model: z.string(),
  prompt: z.string(),
  response: z.string(),
  tokens: z.object({
    input: z.number(),
    output: z.number(),
    total: z.number()
  }),
  duration: z.number(),
  success: z.boolean(),
  error: z.string().optional(),
  sentiment: z.object({
    score: z.number(),
    label: z.string(),
    confidence: z.number()
  }).optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  templateUsed: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

// GET /api/logs - Buscar logs
router.get('/', logRateLimit, async (req, res) => {
  try {
    const query = LogQuerySchema.parse(req.query)
    const result = await logService.queryLogs(query)
    
    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Erro ao buscar logs:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros de busca inválidos',
        details: error.errors
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// GET /api/logs/stats - Estatísticas dos logs
router.get('/stats', adminLogRateLimit, async (req, res) => {
  try {
    const stats = await logService.getLogStats()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Erro ao obter estatísticas dos logs:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// GET /api/logs/levels - Listar níveis de log disponíveis
router.get('/levels', (req, res) => {
  res.json({
    success: true,
    data: Object.values(LogLevelSchema.enum)
  })
})

// GET /api/logs/categories - Listar categorias de log disponíveis
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: Object.values(LogCategorySchema.enum)
  })
})

// POST /api/logs - Criar novo log
router.post('/', logRateLimit, async (req, res) => {
  try {
    const logData = CreateLogSchema.parse(req.body)
    
    await logService.log(
      logData.level,
      logData.category,
      logData.message,
      logData.details,
      {
        userId: logData.userId || req.user?.id,
        sessionId: logData.sessionId || req.sessionId,
        requestId: req.requestId,
        metadata: logData.metadata
      }
    )
    
    res.status(201).json({
      success: true,
      message: 'Log criado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao criar log:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados do log inválidos',
        details: error.errors
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// POST /api/logs/ai-interaction - Log específico para interações de IA
router.post('/ai-interaction', logRateLimit, async (req, res) => {
  try {
    const validatedData = LogAIInteractionSchema.parse(req.body)
    
    await logService.logAIInteraction({
      requestId: req.requestId || `ai_${Date.now()}`,
      userId: req.user?.id || validatedData.userId,
      sessionId: req.sessionId || validatedData.sessionId,
      model: validatedData.model,
      prompt: validatedData.prompt,
      response: validatedData.response,
      tokens: {
        input: validatedData.tokens.input,
        output: validatedData.tokens.output,
        total: validatedData.tokens.total
      },
      duration: validatedData.duration,
      success: validatedData.success,
      error: validatedData.error,
      sentiment: validatedData.sentiment,
      riskLevel: validatedData.riskLevel,
      templateUsed: validatedData.templateUsed,
      metadata: validatedData.metadata
    })
    
    res.status(201).json({
      success: true,
      message: 'Log de interação de IA criado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao criar log de interação de IA:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados da interação de IA inválidos',
        details: error.errors
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// POST /api/logs/error - Log específico para erros
router.post('/error', logRateLimit, async (req, res) => {
  try {
    const { message, name, stack, category, metadata } = req.body
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Mensagem de erro é obrigatória'
      })
    }
    
    const error = new Error(message)
    if (name) error.name = name
    if (stack) error.stack = stack
    
    await logService.logError(error, {
      userId: req.user?.id,
      sessionId: req.sessionId,
      requestId: req.requestId,
      category: category || 'error_handling',
      metadata
    })
    
    res.status(201).json({
      success: true,
      message: 'Log de erro criado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao criar log de erro:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// POST /api/logs/security - Log específico para eventos de segurança
router.post('/security', adminLogRateLimit, async (req, res) => {
  try {
    const { event, details } = req.body
    
    if (!event || !details) {
      return res.status(400).json({
        success: false,
        error: 'Evento e detalhes são obrigatórios'
      })
    }
    
    await logService.logSecurity(event, details, {
      userId: req.user?.id,
      sessionId: req.sessionId,
      requestId: req.requestId
    })
    
    res.status(201).json({
      success: true,
      message: 'Log de segurança criado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao criar log de segurança:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// GET /api/logs/export - Exportar logs
router.get('/export', adminLogRateLimit, async (req, res) => {
  try {
    const query = LogQuerySchema.parse({
      ...req.query,
      limit: 10000 // Limite maior para exportação
    })
    
    const result = await logService.queryLogs(query)
    
    // Configurar headers para download
    const filename = `logs-${new Date().toISOString().split('T')[0]}.json`
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    
    res.json({
      exportDate: new Date().toISOString(),
      query,
      totalLogs: result.total,
      logs: result.logs
    })
  } catch (error) {
    console.error('Erro ao exportar logs:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros de exportação inválidos',
        details: error.errors
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    })
  }
})

// GET /api/logs/health - Health check do sistema de logs
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'log-service',
      version: '1.0.0'
    }
  })
})

export default router