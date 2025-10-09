/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import pacientesRoutes from './routes/pacientes.js'
import auditRoutes from './routes/audit.js'
import logRoutes from './routes/logs.js'
import chatRoutes from './routes/chat.js'
import webhookRoutes from './routes/webhook.js'
import { requestLoggerMiddleware } from './services/logService.js'
import { 
  securityHeaders, 
  validateContentType, 
  validatePayloadSize, 
  preventParameterPollution,
  validateUserAgent,
  customSecurityHeaders,
  logSuspiciousActivity,
  validateOrigin
} from './middleware/security.js'
import { generalLimiter } from './middleware/rateLimiting.js'
import { auditLogger } from './middleware/auditLogger.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

// Configurar origens permitidas para CORS
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:3000', // React dev server alternativo
  'https://psicomind.vercel.app', // Produção (ajustar conforme necessário)
  process.env.FRONTEND_URL // URL do frontend em produção
].filter(Boolean) as string[]

// Middlewares de segurança (ordem importa!)
app.use(securityHeaders)
app.use(customSecurityHeaders)
app.use(logSuspiciousActivity)
app.use(validateUserAgent)
app.use(preventParameterPollution)
app.use(validateOrigin(allowedOrigins))
app.use(generalLimiter)

// Middleware de logging
app.use(requestLoggerMiddleware)

// CORS configurado
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Middlewares de parsing com validação
app.use(validateContentType)
app.use(validatePayloadSize(10 * 1024 * 1024)) // 10MB max
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Middleware de auditoria (deve vir após parsing mas antes das rotas)
app.use(auditLogger.middleware())

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/pacientes', pacientesRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/webhook', webhookRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
