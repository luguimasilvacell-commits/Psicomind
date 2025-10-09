/**
 * Middleware de Rate Limiting para proteção contra ataques
 */
import rateLimit from 'express-rate-limit'
import { Request, Response } from 'express'

/**
 * Rate limiting geral para todas as rotas
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP por janela
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Muitas requisições. Tente novamente em 15 minutos.',
      retryAfter: Math.ceil(((req as any).rateLimit?.resetTime?.getTime() || Date.now()) / 1000)
    })
  }
})

/**
 * Rate limiting rigoroso para autenticação
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas de login por IP por janela
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // não contar requests bem-sucedidos
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      retryAfter: Math.ceil(((req as any).rateLimit?.resetTime?.getTime() || Date.now()) / 1000)
    })
  }
})

/**
 * Rate limiting para criação de recursos
 */
export const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // máximo 10 criações por IP por minuto
  message: {
    success: false,
    message: 'Muitas criações. Tente novamente em 1 minuto.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Muitas criações. Tente novamente em 1 minuto.',
      retryAfter: Math.ceil(((req as any).rateLimit?.resetTime?.getTime() || Date.now()) / 1000)
    })
  }
})

/**
 * Rate limiting para uploads
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // máximo 5 uploads por IP por minuto
  message: {
    success: false,
    message: 'Muitos uploads. Tente novamente em 1 minuto.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Muitos uploads. Tente novamente em 1 minuto.',
      retryAfter: Math.ceil(((req as any).rateLimit?.resetTime?.getTime() || Date.now()) / 1000)
    })
  }
})

/**
 * Rate limiting para busca/consulta
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // máximo 60 buscas por IP por minuto
  message: {
    success: false,
    message: 'Muitas buscas. Tente novamente em 1 minuto.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Muitas buscas. Tente novamente em 1 minuto.',
      retryAfter: Math.ceil(((req as any).rateLimit?.resetTime?.getTime() || Date.now()) / 1000)
    })
  }
})

/**
 * Rate limiting para operações sensíveis (delete, update críticos)
 */
export const sensitiveLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 3, // máximo 3 operações sensíveis por IP por 5 minutos
  message: {
    success: false,
    message: 'Muitas operações sensíveis. Tente novamente em 5 minutos.',
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Muitas operações sensíveis. Tente novamente em 5 minutos.',
      retryAfter: Math.ceil(((req as any).rateLimit?.resetTime?.getTime() || Date.now()) / 1000)
    })
  }
})

/**
 * Rate limiting para API de relatórios (operações pesadas)
 */
export const reportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 2, // máximo 2 relatórios por IP por minuto
  message: {
    success: false,
    message: 'Muitas solicitações de relatório. Tente novamente em 1 minuto.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Muitas solicitações de relatório. Tente novamente em 1 minuto.',
      retryAfter: Math.ceil(((req as any).rateLimit?.resetTime?.getTime() || Date.now()) / 1000)
    })
  }
})