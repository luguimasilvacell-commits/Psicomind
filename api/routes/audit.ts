/**
 * Rotas para logs de auditoria
 */
import { Router, Request, Response } from 'express'
import { auditLogger } from '../middleware/auditLogger.js'
import { validatePagination } from '../middleware/validation.js'
import { sensitiveLimiter } from '../middleware/rateLimiting.js'
import { body, query, validationResult } from 'express-validator'

const router = Router()

// Middleware para verificar permissões de admin
const requireAdmin = (req: Request, res: Response, next: any) => {
  const user = (req as any).user
  
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso negado. Apenas administradores podem acessar logs de auditoria.'
    })
  }
  
  next()
}

// Validações para consulta de logs
const validateLogQuery = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Data de início deve estar no formato ISO8601'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Data de fim deve estar no formato ISO8601'),
  
  query('userId')
    .optional()
    .isUUID()
    .withMessage('ID do usuário deve ser um UUID válido'),
  
  query('action')
    .optional()
    .isIn(['login', 'logout', 'register', 'create', 'read', 'update', 'delete'])
    .withMessage('Ação deve ser uma das opções válidas'),
  
  query('resource')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Recurso deve ter entre 1 e 50 caracteres'),
  
  query('success')
    .optional()
    .isBoolean()
    .withMessage('Success deve ser um valor booleano'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limite deve ser um número entre 1 e 1000')
]

/**
 * GET /api/audit/logs
 * Buscar logs de auditoria com filtros
 */
router.get('/logs', 
  sensitiveLimiter,
  requireAdmin,
  validateLogQuery,
  validatePagination,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array()
        })
      }

      const {
        startDate,
        endDate,
        userId,
        action,
        resource,
        success,
        limit = 100
      } = req.query

      const filters: any = {}

      if (startDate) filters.startDate = new Date(startDate as string)
      if (endDate) filters.endDate = new Date(endDate as string)
      if (userId) filters.userId = userId as string
      if (action) filters.action = action as string
      if (resource) filters.resource = resource as string
      if (success !== undefined) filters.success = success === 'true'
      if (limit) filters.limit = parseInt(limit as string)

      const logs = await auditLogger.getLogs(filters)

      res.json({
        success: true,
        data: logs,
        total: logs.length,
        filters: filters
      })
    } catch (error) {
      console.error('Erro ao buscar logs:', error)
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar os logs de auditoria'
      })
    }
  }
)

/**
 * GET /api/audit/stats
 * Obter estatísticas dos logs de auditoria
 */
router.get('/stats',
  sensitiveLimiter,
  requireAdmin,
  [
    query('period')
      .optional()
      .isIn(['day', 'week', 'month'])
      .withMessage('Período deve ser day, week ou month')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array()
        })
      }

      const period = (req.query.period as 'day' | 'week' | 'month') || 'day'
      const stats = await auditLogger.getLogStats(period)

      res.json({
        success: true,
        data: stats,
        period
      })
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar as estatísticas'
      })
    }
  }
)

/**
 * GET /api/audit/user/:userId
 * Buscar logs específicos de um usuário
 */
router.get('/user/:userId',
  sensitiveLimiter,
  requireAdmin,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Limite deve ser um número entre 1 e 500'),
    
    query('action')
      .optional()
      .isIn(['login', 'logout', 'register', 'create', 'read', 'update', 'delete'])
      .withMessage('Ação deve ser uma das opções válidas')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array()
        })
      }

      const { userId } = req.params
      const { limit = 100, action } = req.query

      const filters: any = {
        userId,
        limit: parseInt(limit as string)
      }

      if (action) filters.action = action as string

      const logs = await auditLogger.getLogs(filters)

      res.json({
        success: true,
        data: logs,
        total: logs.length,
        userId
      })
    } catch (error) {
      console.error('Erro ao buscar logs do usuário:', error)
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar os logs do usuário'
      })
    }
  }
)

/**
 * GET /api/audit/security-events
 * Buscar eventos de segurança (falhas de login, tentativas suspeitas, etc.)
 */
router.get('/security-events',
  sensitiveLimiter,
  requireAdmin,
  [
    query('hours')
      .optional()
      .isInt({ min: 1, max: 168 }) // máximo 7 dias
      .withMessage('Horas deve ser um número entre 1 e 168'),
    
    query('severity')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Severidade deve ser low, medium, high ou critical')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array()
        })
      }

      const hours = parseInt(req.query.hours as string) || 24
      const startDate = new Date()
      startDate.setHours(startDate.getHours() - hours)

      // Buscar eventos de segurança (falhas de autenticação, etc.)
      const securityLogs = await auditLogger.getLogs({
        startDate,
        success: false,
        limit: 1000
      })

      // Filtrar eventos suspeitos
      const suspiciousEvents = securityLogs.filter(log => 
        log.action === 'login' || 
        log.statusCode === 401 || 
        log.statusCode === 403 ||
        log.statusCode === 429 // Rate limiting
      )

      // Agrupar por IP para detectar tentativas múltiplas
      const ipAttempts = suspiciousEvents.reduce((acc, log) => {
        if (!acc[log.ip]) {
          acc[log.ip] = []
        }
        acc[log.ip].push(log)
        return acc
      }, {} as Record<string, any[]>)

      // Identificar IPs suspeitos (múltiplas tentativas falhadas)
      const suspiciousIPs = Object.entries(ipAttempts)
        .filter(([ip, attempts]) => attempts.length >= 5)
        .map(([ip, attempts]) => ({
          ip,
          attempts: attempts.length,
          lastAttempt: attempts[0].timestamp,
          actions: [...new Set(attempts.map(a => a.action))]
        }))

      res.json({
        success: true,
        data: {
          totalEvents: suspiciousEvents.length,
          suspiciousIPs,
          recentEvents: suspiciousEvents.slice(0, 50),
          timeRange: {
            start: startDate.toISOString(),
            end: new Date().toISOString(),
            hours
          }
        }
      })
    } catch (error) {
      console.error('Erro ao buscar eventos de segurança:', error)
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar os eventos de segurança'
      })
    }
  }
)

/**
 * POST /api/audit/manual-log
 * Criar log manual de auditoria (para eventos especiais)
 */
router.post('/manual-log',
  sensitiveLimiter,
  requireAdmin,
  [
    body('action')
      .notEmpty()
      .isLength({ min: 1, max: 50 })
      .withMessage('Ação é obrigatória e deve ter entre 1 e 50 caracteres'),
    
    body('resource')
      .notEmpty()
      .isLength({ min: 1, max: 50 })
      .withMessage('Recurso é obrigatório e deve ter entre 1 e 50 caracteres'),
    
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Descrição deve ter no máximo 500 caracteres'),
    
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata deve ser um objeto')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array()
        })
      }

      const user = (req as any).user
      const { action, resource, description, metadata } = req.body

      await auditLogger.log({
        userId: user.id,
        userEmail: user.email,
        action,
        resource,
        method: 'MANUAL',
        endpoint: '/api/audit/manual-log',
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        success: true,
        statusCode: 200,
        duration: 0,
        metadata: {
          ...metadata,
          description,
          manualLog: true,
          createdBy: user.email
        }
      })

      res.json({
        success: true,
        message: 'Log de auditoria criado com sucesso'
      })
    } catch (error) {
      console.error('Erro ao criar log manual:', error)
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível criar o log de auditoria'
      })
    }
  }
)

export default router