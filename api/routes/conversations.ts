import { Router, Request, Response } from 'express'
import { body, param, query, validationResult } from 'express-validator'
import { authenticateToken } from '../middleware/auth.js'
import { supabase } from '../lib/supabase.js'
import { queueMessage } from '../services/queueProcessors.js'
import { evolutionApiService } from '../services/evolutionApiService.js'

const router = Router()

// Aplicar autenticação em todas as rotas
router.use(authenticateToken)

/**
 * Listar conversas do psicólogo
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const psicologoId = req.user?.userId
    const { status, search, limit = 50, offset = 0 } = req.query

    let query = supabase
      .from('conversations')
      .select(`
        *,
        paciente:pacientes(nome, telefone),
        _count_messages:messages(count)
      `)
      .eq('psicologo_id', psicologoId)
      .order('last_message_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`phone_number.ilike.%${search}%,contact_name.ilike.%${search}%`)
    }

    const { data: conversations, error } = await query

    if (error) {
      throw error
    }

    res.status(200).json({
      success: true,
      conversations,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
      },
    })

  } catch (error: any) {
    console.error('❌ Error fetching conversations:', error.message)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    })
  }
})

/**
 * Obter conversa específica com mensagens
 */
router.get('/:id',
  [param('id').isUUID().withMessage('Invalid conversation ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { id } = req.params
      const psicologoId = req.user?.userId
      const { limit = 50, offset = 0 } = req.query

      // Busca conversa
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select(`
          *,
          paciente:pacientes(nome, telefone, email)
        `)
        .eq('id', id)
        .eq('psicologo_id', psicologoId)
        .single()

      if (conversationError || !conversation) {
        return res.status(404).json({ error: 'Conversation not found' })
      }

      // Busca mensagens da conversa
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })
        .range(Number(offset), Number(offset) + Number(limit) - 1)

      if (messagesError) {
        throw messagesError
      }

      res.status(200).json({
        success: true,
        conversation: {
          ...conversation,
          messages,
        },
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
        },
      })

    } catch (error: any) {
      console.error('❌ Error fetching conversation:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Criar nova conversa
 */
router.post('/',
  [
    body('phone_number').notEmpty().withMessage('Phone number is required'),
    body('contact_name').optional().isString(),
    body('paciente_id').optional().isUUID(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const psicologoId = req.user?.userId
      const { phone_number, contact_name, paciente_id } = req.body

      // Verifica se já existe conversa com este número
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('phone_number', phone_number)
        .eq('psicologo_id', psicologoId)
        .single()

      if (existing) {
        return res.status(400).json({ error: 'Conversation already exists for this phone number' })
      }

      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          psicologo_id: psicologoId,
          phone_number,
          contact_name,
          paciente_id,
          status: 'active',
          last_message_at: new Date().toISOString(),
        })
        .select(`
          *,
          paciente:pacientes(nome, telefone, email)
        `)
        .single()

      if (error) {
        throw error
      }

      res.status(201).json({
        success: true,
        conversation,
        message: 'Conversation created successfully',
      })

    } catch (error: any) {
      console.error('❌ Error creating conversation:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Atualizar conversa
 */
router.put('/:id',
  [
    param('id').isUUID().withMessage('Invalid conversation ID'),
    body('contact_name').optional().isString(),
    body('paciente_id').optional().isUUID(),
    body('status').optional().isIn(['active', 'archived', 'blocked']),
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

      const { data: conversation, error } = await supabase
        .from('conversations')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('psicologo_id', psicologoId)
        .select(`
          *,
          paciente:pacientes(nome, telefone, email)
        `)
        .single()

      if (error) {
        throw error
      }

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' })
      }

      res.status(200).json({
        success: true,
        conversation,
        message: 'Conversation updated successfully',
      })

    } catch (error: any) {
      console.error('❌ Error updating conversation:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Deletar conversa
 */
router.delete('/:id',
  [param('id').isUUID().withMessage('Invalid conversation ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { id } = req.params
      const psicologoId = req.user?.userId

      // Primeiro deleta as mensagens
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', id)

      // Depois deleta a conversa
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('psicologo_id', psicologoId)

      if (error) {
        throw error
      }

      res.status(200).json({
        success: true,
        message: 'Conversation deleted successfully',
      })

    } catch (error: any) {
      console.error('❌ Error deleting conversation:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Enviar mensagem
 */
router.post('/:id/messages',
  [
    param('id').isUUID().withMessage('Invalid conversation ID'),
    body('content').notEmpty().withMessage('Message content is required'),
    body('message_type').optional().isIn(['text', 'image', 'audio', 'video', 'document', 'location']),
    body('media_url').optional().isURL(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { id: conversationId } = req.params
      const { content, message_type = 'text', media_url } = req.body
      const psicologoId = req.user?.userId

      // Verifica se a conversa existe
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('psicologo_id', psicologoId)
        .single()

      if (conversationError || !conversation) {
        return res.status(404).json({ error: 'Conversation not found' })
      }

      // Cria mensagem no banco
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content,
          message_type,
          direction: 'outbound',
          status: 'pending',
          media_url,
          metadata: {
            source: 'manual',
            psicologoId,
          },
        })
        .select()
        .single()

      if (messageError) {
        throw messageError
      }

      // Atualiza última mensagem da conversa
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      // Adiciona à fila para envio
      await queueMessage({
        conversationId,
        messageId: message.id,
        content,
        direction: 'outbound',
        phoneNumber: conversation.phone_number,
        psicologoId,
      })

      res.status(201).json({
        success: true,
        message,
        status: 'Message queued for sending',
      })

    } catch (error: any) {
      console.error('❌ Error sending message:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Marcar mensagens como lidas
 */
router.patch('/:id/read',
  [param('id').isUUID().withMessage('Invalid conversation ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { id: conversationId } = req.params
      const psicologoId = req.user?.userId

      // Verifica se a conversa existe
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('psicologo_id', psicologoId)
        .single()

      if (conversationError || !conversation) {
        return res.status(404).json({ error: 'Conversation not found' })
      }

      // Marca mensagens recebidas como lidas
      const { error } = await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('conversation_id', conversationId)
        .eq('direction', 'inbound')
        .neq('status', 'read')

      if (error) {
        throw error
      }

      res.status(200).json({
        success: true,
        message: 'Messages marked as read',
      })

    } catch (error: any) {
      console.error('❌ Error marking messages as read:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

/**
 * Obter estatísticas da conversa
 */
router.get('/:id/stats',
  [param('id').isUUID().withMessage('Invalid conversation ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { id: conversationId } = req.params
      const psicologoId = req.user?.userId

      // Verifica se a conversa existe
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('id, created_at')
        .eq('id', conversationId)
        .eq('psicologo_id', psicologoId)
        .single()

      if (conversationError || !conversation) {
        return res.status(404).json({ error: 'Conversation not found' })
      }

      // Busca estatísticas das mensagens
      const { data: messageStats, error: statsError } = await supabase
        .from('messages')
        .select('direction, status, message_type, created_at')
        .eq('conversation_id', conversationId)

      if (statsError) {
        throw statsError
      }

      // Processa estatísticas
      const stats = {
        totalMessages: messageStats.length,
        inboundMessages: messageStats.filter(m => m.direction === 'inbound').length,
        outboundMessages: messageStats.filter(m => m.direction === 'outbound').length,
        unreadMessages: messageStats.filter(m => m.direction === 'inbound' && m.status !== 'read').length,
        messageTypes: messageStats.reduce((acc: any, msg) => {
          acc[msg.message_type] = (acc[msg.message_type] || 0) + 1
          return acc
        }, {}),
        conversationAge: Math.floor((new Date().getTime() - new Date(conversation.created_at).getTime()) / (1000 * 60 * 60 * 24)), // dias
        lastActivity: messageStats.length > 0 ? messageStats[messageStats.length - 1].created_at : conversation.created_at,
      }

      res.status(200).json({
        success: true,
        stats,
      })

    } catch (error: any) {
      console.error('❌ Error fetching conversation stats:', error.message)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      })
    }
  }
)

export default router