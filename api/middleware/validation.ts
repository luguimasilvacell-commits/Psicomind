/**
 * Middleware de validação robusta com sanitização
 */
import { Request, Response, NextFunction } from 'express'
import { body, param, query, validationResult, ValidationChain } from 'express-validator'
import xss from 'xss'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Configurar DOMPurify para Node.js
const window = new JSDOM('').window
const purify = DOMPurify(window)

/**
 * Middleware para processar resultados de validação
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? error.value : undefined
      }))
    })
    return
  }
  
  next()
}

/**
 * Sanitizar strings contra XSS
 */
export const sanitizeString = (value: string): string => {
  if (typeof value !== 'string') return value
  
  // Primeiro, usar XSS para limpeza básica
  let cleaned = xss(value, {
    whiteList: {}, // Não permitir nenhuma tag HTML
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  })
  
  // Depois, usar DOMPurify para limpeza adicional
  cleaned = purify.sanitize(cleaned, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  })
  
  return cleaned.trim()
}

/**
 * Middleware para sanitizar todos os campos de string no body
 */
export const sanitizeBody = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeString(obj)
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject)
      }
      
      if (obj && typeof obj === 'object') {
        const sanitized: any = {}
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value)
        }
        return sanitized
      }
      
      return obj
    }
    
    req.body = sanitizeObject(req.body)
  }
  
  next()
}

/**
 * Validações para pacientes
 */
export const validatePaciente = [
  body('nome')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Nome deve conter apenas letras e espaços'),
    
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email muito longo'),
    
  body('telefone')
    .trim()
    .matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)
    .withMessage('Telefone deve estar no formato (XX) XXXXX-XXXX'),
    
  body('cpf')
    .trim()
    .matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
    .withMessage('CPF deve estar no formato XXX.XXX.XXX-XX')
    .custom((value) => {
      // Validação básica de CPF
      const cpf = value.replace(/\D/g, '')
      if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        throw new Error('CPF inválido')
      }
      return true
    }),
    
  body('data_nascimento')
    .isISO8601()
    .withMessage('Data de nascimento inválida')
    .custom((value) => {
      const date = new Date(value)
      const now = new Date()
      const age = now.getFullYear() - date.getFullYear()
      if (age < 0 || age > 120) {
        throw new Error('Data de nascimento inválida')
      }
      return true
    }),
    
  body('endereco.cep')
    .optional()
    .trim()
    .matches(/^\d{5}-\d{3}$/)
    .withMessage('CEP deve estar no formato XXXXX-XXX'),
    
  body('endereco.logradouro')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Logradouro muito longo'),
    
  body('endereco.numero')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Número muito longo'),
    
  body('endereco.cidade')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Cidade muito longa'),
    
  body('endereco.estado')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('Estado deve ter 2 caracteres'),
    
  sanitizeBody,
  handleValidationErrors
]

/**
 * Validações para agendamentos
 */
export const validateAgendamento = [
  body('paciente_id')
    .isUUID()
    .withMessage('ID do paciente inválido'),
    
  body('data_hora')
    .isISO8601()
    .withMessage('Data e hora inválidas')
    .custom((value) => {
      const date = new Date(value)
      const now = new Date()
      if (date <= now) {
        throw new Error('Data e hora devem ser futuras')
      }
      return true
    }),
    
  body('tipo')
    .isIn(['consulta', 'retorno', 'avaliacao', 'terapia'])
    .withMessage('Tipo de agendamento inválido'),
    
  body('status')
    .optional()
    .isIn(['agendado', 'confirmado', 'cancelado', 'realizado'])
    .withMessage('Status inválido'),
    
  body('observacoes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Observações muito longas'),
    
  body('valor')
    .optional()
    .isFloat({ min: 0, max: 9999.99 })
    .withMessage('Valor inválido'),
    
  sanitizeBody,
  handleValidationErrors
]

/**
 * Validações para prontuários
 */
export const validateProntuario = [
  body('paciente_id')
    .isUUID()
    .withMessage('ID do paciente inválido'),
    
  body('data_sessao')
    .isISO8601()
    .withMessage('Data da sessão inválida'),
    
  body('tipo_sessao')
    .isIn(['individual', 'grupo', 'familiar', 'casal'])
    .withMessage('Tipo de sessão inválido'),
    
  body('observacoes')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Observações devem ter entre 10 e 5000 caracteres'),
    
  body('diagnostico')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Diagnóstico muito longo'),
    
  body('plano_tratamento')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Plano de tratamento muito longo'),
    
  body('medicamentos')
    .optional()
    .isArray()
    .withMessage('Medicamentos deve ser um array'),
    
  body('medicamentos.*.nome')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Nome do medicamento muito longo'),
    
  body('medicamentos.*.dosagem')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Dosagem muito longa'),
    
  sanitizeBody,
  handleValidationErrors
]

/**
 * Validações para transações financeiras
 */
export const validateTransacao = [
  body('tipo')
    .isIn(['receita', 'despesa'])
    .withMessage('Tipo de transação inválido'),
    
  body('categoria')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Categoria deve ter entre 2 e 50 caracteres'),
    
  body('descricao')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Descrição deve ter entre 3 e 255 caracteres'),
    
  body('valor')
    .isFloat({ min: 0.01, max: 999999.99 })
    .withMessage('Valor deve ser positivo e menor que 1 milhão'),
    
  body('data')
    .isISO8601()
    .withMessage('Data inválida'),
    
  body('paciente_id')
    .optional()
    .isUUID()
    .withMessage('ID do paciente inválido'),
    
  sanitizeBody,
  handleValidationErrors
]

/**
 * Validações para parâmetros de ID
 */
export const validateId = [
  param('id')
    .isUUID()
    .withMessage('ID inválido'),
  handleValidationErrors
]

/**
 * Validações para queries de paginação
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Página deve ser um número entre 1 e 1000'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número entre 1 e 100'),
    
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Termo de busca muito longo'),
    
  handleValidationErrors
]

/**
 * Validações para autenticação
 */
export const validateAuth = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email muito longo'),
    
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Senha deve ter entre 8 e 128 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Senha deve conter ao menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial'),
    
  sanitizeBody,
  handleValidationErrors
]

export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
    
  body('password')
    .isLength({ min: 1 })
    .withMessage('Senha é obrigatória'),
    
  sanitizeBody,
  handleValidationErrors
]