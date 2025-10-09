import express from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { templateService, MessageTemplateSchema } from '../services/templateService.js'

const router = express.Router()

// Rate limiting para templates
const templateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: { error: 'Muitas requisições para templates. Tente novamente em 15 minutos.' }
})

const createTemplateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 criações por hora
  message: { error: 'Limite de criação de templates atingido. Tente novamente em 1 hora.' }
})

// Middleware para validação de erros
const handleValidationError = (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: error.errors
    })
  }
  next(error)
}

// Schemas para requests
const CreateTemplateSchema = MessageTemplateSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
})

const UpdateTemplateSchema = MessageTemplateSchema.partial().omit({ 
  id: true, 
  createdAt: true 
})

const SuggestResponseSchema = z.object({
  message: z.string().min(1, 'Mensagem é obrigatória'),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  userId: z.string().optional(),
  variables: z.record(z.string()).optional()
})

const SearchTemplatesSchema = z.object({
  query: z.string().min(1),
  category: z.enum(['greeting', 'appointment', 'emergency', 'followup', 'general']).optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional()
})

// GET /api/templates - Listar todos os templates
router.get('/', templateLimiter, (req, res) => {
  try {
    const templates = templateService.getAllTemplates()
    res.json({
      success: true,
      data: templates,
      total: templates.length
    })
  } catch (error) {
    console.error('Erro ao buscar templates:', error)
    res.status(500).json({
      error: 'Erro interno do servidor'
    })
  }
})

// GET /api/templates/:id - Buscar template por ID
router.get('/:id', templateLimiter, (req, res) => {
  try {
    const { id } = req.params
    const template = templateService.getTemplateById(id)
    
    if (!template) {
      return res.status(404).json({
        error: 'Template não encontrado'
      })
    }

    res.json({
      success: true,
      data: template
    })
  } catch (error) {
    console.error('Erro ao buscar template:', error)
    res.status(500).json({
      error: 'Erro interno do servidor'
    })
  }
})

// POST /api/templates - Criar novo template
router.post('/', createTemplateLimiter, (req, res) => {
  try {
    const templateData = CreateTemplateSchema.parse(req.body)
    const template = templateService.createTemplate(templateData)
    
    res.status(201).json({
      success: true,
      data: template,
      message: 'Template criado com sucesso'
    })
  } catch (error) {
    handleValidationError(error, req, res, () => {
      console.error('Erro ao criar template:', error)
      res.status(500).json({
        error: 'Erro interno do servidor'
      })
    })
  }
})

// PUT /api/templates/:id - Atualizar template
router.put('/:id', templateLimiter, (req, res) => {
  try {
    const { id } = req.params
    const updates = UpdateTemplateSchema.parse(req.body)
    
    const updatedTemplate = templateService.updateTemplate(id, updates)
    
    if (!updatedTemplate) {
      return res.status(404).json({
        error: 'Template não encontrado'
      })
    }

    res.json({
      success: true,
      data: updatedTemplate,
      message: 'Template atualizado com sucesso'
    })
  } catch (error) {
    handleValidationError(error, req, res, () => {
      console.error('Erro ao atualizar template:', error)
      res.status(500).json({
        error: 'Erro interno do servidor'
      })
    })
  }
})

// DELETE /api/templates/:id - Deletar template
router.delete('/:id', templateLimiter, (req, res) => {
  try {
    const { id } = req.params
    const deleted = templateService.deleteTemplate(id)
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Template não encontrado'
      })
    }

    res.json({
      success: true,
      message: 'Template deletado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao deletar template:', error)
    res.status(500).json({
      error: 'Erro interno do servidor'
    })
  }
})

// POST /api/templates/search - Buscar templates
router.post('/search', templateLimiter, (req, res) => {
  try {
    const { query, category, sentiment, riskLevel } = SearchTemplatesSchema.parse(req.body)
    
    let templates = templateService.searchTemplates(query)
    
    // Filtrar por contexto se fornecido
    if (category || sentiment || riskLevel) {
      const matchingTemplates = templateService.findMatchingTemplates({
        category,
        sentiment,
        riskLevel
      })
      
      // Interseção dos resultados
      const matchingIds = new Set(matchingTemplates.map(t => t.id))
      templates = templates.filter(t => matchingIds.has(t.id))
    }

    res.json({
      success: true,
      data: templates,
      total: templates.length,
      query: {
        text: query,
        category,
        sentiment,
        riskLevel
      }
    })
  } catch (error) {
    handleValidationError(error, req, res, () => {
      console.error('Erro ao buscar templates:', error)
      res.status(500).json({
        error: 'Erro interno do servidor'
      })
    })
  }
})

// POST /api/templates/suggest - Sugerir resposta inteligente
router.post('/suggest', templateLimiter, (req, res) => {
  try {
    const parsedBody = SuggestResponseSchema.parse(req.body)
    
    const suggestion = templateService.suggestResponse({
      message: parsedBody.message,
      sentiment: parsedBody.sentiment,
      riskLevel: parsedBody.riskLevel,
      userId: parsedBody.userId,
      variables: parsedBody.variables
    })
    
    if (!suggestion) {
      return res.json({
        success: true,
        data: null,
        message: 'Nenhum template adequado encontrado'
      })
    }

    res.json({
      success: true,
      data: {
        template: suggestion.template,
        processedContent: suggestion.processedContent,
        confidence: suggestion.confidence,
        metadata: {
          templateId: suggestion.template.id,
          templateName: suggestion.template.name,
          category: suggestion.template.category,
          usedVariables: suggestion.template.variables || []
        }
      }
    })
  } catch (error) {
    handleValidationError(error, req, res, () => {
      console.error('Erro ao sugerir resposta:', error)
      res.status(500).json({
        error: 'Erro interno do servidor'
      })
    })
  }
})

// GET /api/templates/matching/:context - Buscar templates por contexto
router.get('/matching/:context', templateLimiter, (req, res) => {
  try {
    const context = JSON.parse(decodeURIComponent(req.params.context))
    const templates = templateService.findMatchingTemplates(context)
    
    res.json({
      success: true,
      data: templates,
      total: templates.length,
      context
    })
  } catch (error) {
    console.error('Erro ao buscar templates por contexto:', error)
    res.status(400).json({
      error: 'Contexto inválido'
    })
  }
})

// GET /api/templates/analytics/overview - Visão geral das analytics
router.get('/analytics/overview', templateLimiter, (req, res) => {
  try {
    const analytics = templateService.getAllAnalytics()
    const mostUsed = templateService.getMostUsedTemplates(5)
    
    const overview = {
      totalTemplates: analytics.length,
      totalUsage: analytics.reduce((sum, a) => sum + a.totalUsage, 0),
      avgSuccessRate: analytics.length > 0 
        ? analytics.reduce((sum, a) => sum + a.successRate, 0) / analytics.length 
        : 0,
      mostUsedTemplates: mostUsed
    }

    res.json({
      success: true,
      data: overview
    })
  } catch (error) {
    console.error('Erro ao buscar analytics:', error)
    res.status(500).json({
      error: 'Erro interno do servidor'
    })
  }
})

// GET /api/templates/analytics/:id - Analytics de template específico
router.get('/analytics/:id', templateLimiter, (req, res) => {
  try {
    const { id } = req.params
    const analytics = templateService.getTemplateAnalytics(id)
    
    if (!analytics) {
      return res.status(404).json({
        error: 'Analytics não encontradas para este template'
      })
    }

    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    console.error('Erro ao buscar analytics do template:', error)
    res.status(500).json({
      error: 'Erro interno do servidor'
    })
  }
})

// GET /api/templates/categories/list - Listar categorias disponíveis
router.get('/categories/list', templateLimiter, (req, res) => {
  try {
    const categories = [
      { value: 'greeting', label: 'Saudações', description: 'Templates para cumprimentos e boas-vindas' },
      { value: 'appointment', label: 'Agendamentos', description: 'Templates para marcação de consultas' },
      { value: 'emergency', label: 'Emergência', description: 'Templates para situações de risco' },
      { value: 'followup', label: 'Acompanhamento', description: 'Templates para follow-up de pacientes' },
      { value: 'general', label: 'Geral', description: 'Templates para uso geral' }
    ]

    res.json({
      success: true,
      data: categories
    })
  } catch (error) {
    console.error('Erro ao listar categorias:', error)
    res.status(500).json({
      error: 'Erro interno do servidor'
    })
  }
})

// POST /api/templates/:id/test - Testar template com variáveis
router.post('/:id/test', templateLimiter, (req, res) => {
  try {
    const { id } = req.params
    const { variables = {} } = req.body
    
    const template = templateService.getTemplateById(id)
    if (!template) {
      return res.status(404).json({
        error: 'Template não encontrado'
      })
    }

    const processedContent = templateService.processTemplate(template, variables)
    
    res.json({
      success: true,
      data: {
        original: template.content,
        processed: processedContent,
        variables: template.variables || [],
        providedVariables: variables
      }
    })
  } catch (error) {
    console.error('Erro ao testar template:', error)
    res.status(500).json({
      error: 'Erro interno do servidor'
    })
  }
})

export default router