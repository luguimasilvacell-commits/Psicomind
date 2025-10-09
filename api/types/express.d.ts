import { Request } from 'express'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        [key: string]: any
      }
      sessionId?: string
      requestId?: string
    }
  }
}