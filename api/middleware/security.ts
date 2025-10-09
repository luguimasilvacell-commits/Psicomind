/**
 * Middleware de segurança geral
 */
import { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'

/**
 * Configuração do Helmet para segurança HTTP
 */
export const securityHeaders = helmet({
  // Configurações de Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.supabase.co", "wss://realtime.supabase.co"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  
  // Configurações HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  },
  
  // Prevenir clickjacking
  frameguard: { action: 'deny' },
  
  // Prevenir MIME type sniffing
  noSniff: true,
  
  // Configurar X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: false,
  
  // Remover header X-Powered-By
  hidePoweredBy: true,
  
  // Configurar Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
})

/**
 * Middleware para validar Content-Type em requests POST/PUT/PATCH
 */
export const validateContentType = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const methods = ['POST', 'PUT', 'PATCH']
  
  if (methods.includes(req.method)) {
    const contentType = req.get('Content-Type')
    
    if (!contentType || !contentType.includes('application/json')) {
      res.status(400).json({
        success: false,
        message: 'Content-Type deve ser application/json'
      })
      return
    }
  }
  
  next()
}

/**
 * Middleware para validar tamanho do payload
 */
export const validatePayloadSize = (maxSize: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('Content-Length')
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      res.status(413).json({
        success: false,
        message: `Payload muito grande. Máximo permitido: ${maxSize} bytes`
      })
      return
    }
    
    next()
  }
}

/**
 * Middleware para prevenir ataques de HTTP Parameter Pollution
 */
export const preventParameterPollution = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Verificar se há parâmetros duplicados na query string
  const url = new URL(req.url, `http://${req.get('host')}`)
  const params = new URLSearchParams(url.search)
  const paramNames = new Set()
  
  for (const [name] of params) {
    if (paramNames.has(name)) {
      res.status(400).json({
        success: false,
        message: 'Parâmetros duplicados não são permitidos'
      })
      return
    }
    paramNames.add(name)
  }
  
  next()
}

/**
 * Middleware para validar User-Agent
 */
export const validateUserAgent = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Permitir webhooks sem validação de User-Agent
  if (req.path.startsWith('/api/webhook')) {
    next()
    return
  }
  
  const userAgent = req.get('User-Agent')
  
  if (!userAgent || userAgent.length < 10 || userAgent.length > 500) {
    res.status(400).json({
      success: false,
      message: 'User-Agent inválido'
    })
    return
  }
  
  // Bloquear user agents suspeitos
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zap/i,
    /burp/i,
    /wget/i,
    /curl/i
  ]
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(userAgent)) {
      res.status(403).json({
        success: false,
        message: 'Acesso negado'
      })
      return
    }
  }
  
  next()
}

/**
 * Middleware para adicionar headers de segurança customizados
 */
export const customSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Adicionar header personalizado para identificar a API
  res.setHeader('X-API-Version', '1.0.0')
  
  // Adicionar header para prevenir cache de dados sensíveis
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  
  // Adicionar header para prevenir embedding em iframes
  res.setHeader('X-Frame-Options', 'DENY')
  
  // Adicionar header para forçar HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  
  next()
}

/**
 * Middleware para log de tentativas de acesso suspeitas
 */
export const logSuspiciousActivity = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /drop.*table/i,  // SQL injection
    /exec\(/i,  // Code injection
    /eval\(/i,  // Code injection
    /<script/i,  // XSS
    /javascript:/i,  // XSS
    /vbscript:/i,  // XSS
    /onload=/i,  // XSS
    /onerror=/i  // XSS
  ]
  
  const url = req.url
  const userAgent = req.get('User-Agent') || ''
  const body = JSON.stringify(req.body)
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(userAgent) || pattern.test(body)) {
      console.warn(`[SECURITY] Atividade suspeita detectada:`, {
        ip: req.ip,
        userAgent,
        url,
        method: req.method,
        timestamp: new Date().toISOString(),
        pattern: pattern.toString()
      })
      break
    }
  }
  
  next()
}

/**
 * Middleware para validar origem das requisições (CORS personalizado)
 */
export const validateOrigin = (allowedOrigins: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.get('Origin')
    
    // Permitir requisições sem Origin (ex: Postman, aplicações mobile)
    if (!origin) {
      next()
      return
    }
    
    if (!allowedOrigins.includes(origin)) {
      res.status(403).json({
        success: false,
        message: 'Origem não permitida'
      })
      return
    }
    
    next()
  }
}