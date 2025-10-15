/**
 * Middleware de autenticação JWT
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        type: string;
      };
    }
  }
}

/**
 * Middleware para verificar token JWT
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token de acesso requerido'
      });
      return;
    }

    const secret = process.env.JWT_SECRET || 'fallback-secret';
    
    jwt.verify(token, secret, (err: any, decoded: any) => {
      if (err) {
        res.status(403).json({
          success: false,
          message: 'Token inválido ou expirado'
        });
        return;
      }

      // Add user info to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        type: decoded.type
      };

      next();
    });
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Middleware para verificar se o usuário é um psicólogo
 */
export const requirePsychologist = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    });
    return;
  }

  if (req.user.type !== 'psicologo') {
    res.status(403).json({
      success: false,
      message: 'Acesso restrito a psicólogos'
    });
    return;
  }

  next();
};

/**
 * Middleware para verificar se o usuário é um administrador
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    });
    return;
  }

  if (req.user.type !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Acesso restrito a administradores'
    });
    return;
  }

  next();
};

/**
 * Middleware de autenticação Supabase
 */
export const authenticateSupabase = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token de acesso requerido'
      });
      return;
    }

    // Verificar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({
        success: false,
        message: 'Token inválido ou expirado'
      });
      return;
    }

    // Buscar dados do psicólogo
    const { data: psicologo, error: psicologoError } = await supabase
      .from('psicologos')
      .select('id, email, nome, role')
      .eq('id', user.id)
      .single();

    if (psicologoError || !psicologo) {
      res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
      return;
    }

    // Add user info to request
    req.user = {
      userId: user.id,
      email: user.email || psicologo.email,
      type: psicologo.role || 'psicologo'
    };

    next();
  } catch (error) {
    console.error('Error in Supabase authentication middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

/**
 * Middleware opcional de autenticação (não falha se não houver token)
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const secret = process.env.JWT_SECRET || 'fallback-secret';
    
    jwt.verify(token, secret, (err: any, decoded: any) => {
      if (!err && decoded) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          type: decoded.type
        };
      }
      next();
    });
  } catch (error) {
    // Continue without authentication
    next();
  }
};