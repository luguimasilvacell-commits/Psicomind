import { Router, Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { authenticateToken } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'
import { queueAutomation } from '../services/queueProcessors.js'
import { n8nService } from '../services/n8nService.js'

const router = Router()

// Aplicar autenticação em todas as rotas
router.use(authenticateToken)

/**
 * Listar automações do psicólogo
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const psicologoId = req.user?.userId
    const { active, trigger_type, limit = 50, offset = 0 } = req.query

    let query = supabase
      .from('automations')
      .select('*')
      .eq('psicologo_id', psicologoId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    if (active !== undefined) {
      query = query.eq('is_active', active === 'true')
    }

    if (trigger_type) {
      query = query.eq('trigger_type', trigger_type)
    }

    const { data: automations, error } = await query

    if (error) {
      throw error
    }

    res.status(200).json({
      success: true,
      automations,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
      },
    })

  } catch (error: any) {
    console.error('❌ Error fetching automations:', error.message)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * Obter automação específica
 */
router.get('/:id',
  [param('id').isUUID().withMessage('Invalid automation ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { id } = req.params
      const psicologoId = req.user?.userId

      const { data: automation, error } = await supabase
        .from('automations')
        .select('*')
        .eq('id', id)
        .eq('psicologo_id', psicologoId)
        .single()

      if (error || !automation) {
        return res.status(404).json({ error: 'Automation not found' })
      }

      res.status(200).json({
        success: true,
        automation,
      })

    } catch (error: any) {
      console.error('❌ Error fetching automation:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Criar nova automação
 */
router.post('/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('trigger_type').isIn(['keyword', 'schedule', 'webhook', 'manual']).withMessage('Invalid trigger type'),
    body('trigger_config').isObject().withMessage('Trigger config must be an object'),
    body('description').optional().isString(),
    body('n8n_workflow_id').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const psicologoId = req.user?.userId
      const { name, description, trigger_type, trigger_config, n8n_workflow_id } = req.body

      // Validação específica por tipo de trigger
      if (trigger_type === 'keyword' && !trigger_config.keywords) {
        return res.status(400).json({ error: 'Keywords are required for keyword trigger' })
      }

      if (trigger_type === 'webhook' && !trigger_config.webhook_url) {
        return res.status(400).json({ error: 'Webhook URL is required for webhook trigger' })
      }

      if (trigger_type === 'schedule' && !trigger_config.schedule) {
        return res.status(400).json({ error: 'Schedule is required for schedule trigger' })
      }

      const { data: automation, error } = await supabase
        .from('automations')
        .insert({
          psicologo_id: psicologoId,
          name,
          description,
          trigger_type,
          trigger_config,
          n8n_workflow_id,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      res.status(201).json({
        success: true,
        automation,
        message: 'Automation created successfully',
      })

    } catch (error: any) {
      console.error('❌ Error creating automation:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Atualizar automação
 */
router.put('/:id',
  [
    param('id').isUUID().withMessage('Invalid automation ID'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('trigger_type').optional().isIn(['keyword', 'schedule', 'webhook', 'manual']).withMessage('Invalid trigger type'),
    body('trigger_config').optional().isObject().withMessage('Trigger config must be an object'),
    body('description').optional().isString(),
    body('n8n_workflow_id').optional().isString(),
    body('is_active').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { id } = req.params
      const psicologoId = req.user?.userId
      const updateData = req.body

      // Verifica se a automação existe e pertence ao psicólogo
      const { data: existing, error: fetchError } = await supabase
        .from('automations')
        .select('*')
        .eq('id', id)
        .eq('psicologo_id', psicologoId)
        .single()

      if (fetchError || !existing) {
        return res.status(404).json({ error: 'Automation not found' })
      }

      const { data: automation, error } = await supabase
        .from('automations')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('psicologo_id', psicologoId)
        .select()
        .single()

      if (error) {
        throw error
      }

      res.status(200).json({
        success: true,
        automation,
        message: 'Automation updated successfully',
      })

    } catch (error: any) {
      console.error('❌ Error updating automation:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Deletar automação
 */
router.delete('/:id',
  [param('id').isUUID().withMessage('Invalid automation ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { id } = req.params
      const psicologoId = req.user?.userId

      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', id)
        .eq('psicologo_id', psicologoId)

      if (error) {
        throw error
      }

      res.status(200).json({
        success: true,
        message: 'Automation deleted successfully',
      })

    } catch (error: any) {
      console.error('❌ Error deleting automation:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Ativar/desativar automação
 */
router.patch('/:id/toggle',
  [param('id').isUUID().withMessage('Invalid automation ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { id } = req.params
      const psicologoId = req.user?.userId

      // Busca estado atual
      const { data: current, error: fetchError } = await supabase
        .from('automations')
        .select('is_active')
        .eq('id', id)
        .eq('psicologo_id', psicologoId)
        .single()

      if (fetchError || !current) {
        return res.status(404).json({ error: 'Automation not found' })
      }

      // Alterna estado
      const { data: automation, error } = await supabase
        .from('automations')
        .update({
          is_active: !current.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('psicologo_id', psicologoId)
        .select()
        .single()

      if (error) {
        throw error
      }

      res.status(200).json({
        success: true,
        automation,
        message: `Automation ${automation.is_active ? 'activated' : 'deactivated'} successfully`,
      })

    } catch (error: any) {
      console.error('❌ Error toggling automation:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Executar automação manualmente
 */
router.post('/:id/execute',
  [
    param('id').isUUID().withMessage('Invalid automation ID'),
    body('conversation_id').isUUID().withMessage('Conversation ID is required'),
    body('trigger_data').optional().isObject(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { id } = req.params
      const { conversation_id, trigger_data = {} } = req.body
      const psicologoId = req.user?.userId

      // Verifica se a automação existe
      const { data: automation, error: automationError } = await supabase
        .from('automations')
        .select('*')
        .eq('id', id)
        .eq('psicologo_id', psicologoId)
        .single()

      if (automationError || !automation) {
        return res.status(404).json({ error: 'Automation not found' })
      }

      // Verifica se a conversa existe
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversation_id)
        .eq('psicologo_id', psicologoId)
        .single()

      if (conversationError || !conversation) {
        return res.status(404).json({ error: 'Conversation not found' })
      }

      // Cria registro de execução manual
      const { data: automationMessage, error: messageError } = await supabase
        .from('automation_messages')
        .insert({
          automation_id: id,
          conversation_id,
          message_id: null, // Execução manual não tem mensagem específica
          trigger_data: { ...trigger_data, manual: true },
          execution_status: 'pending',
        })
        .select()
        .single()

      if (messageError) {
        throw messageError
      }

      // Adiciona à fila de processamento
      await queueAutomation({
        automationId: id,
        conversationId: conversation_id,
        messageId: automationMessage.id,
        triggerData: { ...trigger_data, manual: true },
        psicologoId,
      })

      res.status(200).json({
        success: true,
        message: 'Automation queued for execution',
        executionId: automationMessage.id,
      })

    } catch (error: any) {
      console.error('❌ Error executing automation:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Obter histórico de execuções de uma automação
 */
router.get('/:id/executions',
  [
    param('id').isUUID().withMessage('Invalid automation ID'),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { id } = req.params
      const { limit = 50, offset = 0 } = req.query
      const psicologoId = req.user?.userId

      // Verifica se a automação existe
      const { data: automation, error: automationError } = await supabase
        .from('automations')
        .select('id')
        .eq('id', id)
        .eq('psicologo_id', psicologoId)
        .single()

      if (automationError || !automation) {
        return res.status(404).json({ error: 'Automation not found' })
      }

      const { data: executions, error } = await supabase
        .from('automation_messages')
        .select(`
          *,
          conversation:conversations(phone_number, contact_name),
          message:messages(content, created_at)
        `)
        .eq('automation_id', id)
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1)

      if (error) {
        throw error
      }

      res.status(200).json({
        success: true,
        executions,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
        },
      })

    } catch (error: any) {
      console.error('❌ Error fetching automation executions:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Obter workflows disponíveis do n8n
 */
router.get('/n8n/workflows', async (req: Request, res: Response) => {
  try {
    const workflows = await n8nService.getActiveWorkflows()

    res.status(200).json({
      success: true,
      workflows,
    })

  } catch (error: any) {
    console.error('❌ Error fetching n8n workflows:', error.message)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

export default router