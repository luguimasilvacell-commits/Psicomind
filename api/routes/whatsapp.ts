import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { whatsappService } from '../services/whatsappService.js';
import { supabase } from '../lib/supabase.js';
import { LoggingService, LogLevel, LogCategory } from '../../src/services/loggingService.js';

const logger = LoggingService.getInstance();
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware para validação de erros
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array()
    });
  }
  next();
};

// Middleware para verificar autenticação - usando authenticateToken do middleware padrão

// POST /api/whatsapp/initialize - Inicializar conexão WhatsApp
router.post('/initialize',
  authenticateToken,
  async (req: express.Request, res: express.Response) => {
    try {
      const psychologistId = req.user?.userId;
      if (!psychologistId) {
        return res.status(400).json({ success: false, message: 'ID do psicólogo não encontrado' });
      }

      const result = await whatsappService.initializeClient(psychologistId);
      
      logger.info(LogCategory.INTEGRATION, `Inicialização WhatsApp para ${psychologistId}: ${result.message}`);
      
      res.json({
        success: result.success,
        message: result.message,
        session_id: psychologistId
      });
    } catch (error) {
      logger.error(LogCategory.INTEGRATION, `Erro ao inicializar WhatsApp: ${error}`);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// GET /api/whatsapp/qr-code - Obter QR Code
router.get('/qr-code',
  authenticateToken,
  async (req: express.Request, res: express.Response) => {
    try {
      const psychologistId = req.user?.userId;
      if (!psychologistId) {
        return res.status(400).json({ success: false, message: 'ID do psicólogo não encontrado' });
      }

      const qrCode = await whatsappService.getQRCode(psychologistId);
      const status = await whatsappService.getConnectionStatus(psychologistId);

      res.json({
        success: true,
        qr_code: qrCode,
        status: status
      });
    } catch (error) {
      logger.error(LogCategory.INTEGRATION, `Erro ao obter QR Code: ${error}`);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// GET /api/whatsapp/status - Obter status da conexão
router.get('/status',
  authenticateToken,
  async (req: express.Request, res: express.Response) => {
    try {
      const psychologistId = req.user?.userId;
      if (!psychologistId) {
        return res.status(400).json({ success: false, message: 'ID do psicólogo não encontrado' });
      }

      const status = await whatsappService.getConnectionStatus(psychologistId);
      
      // Buscar informações da sessão no banco
      const { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('psychologist_id', psychologistId)
        .single();

      res.json({
        success: true,
        status: status,
        is_connected: session?.is_connected || false,
        client_info: session?.client_info || null,
        session_data: session ? {
          auto_reply_enabled: session.auto_reply_enabled,
          business_hours_enabled: session.business_hours_enabled,
          business_hours_start: session.business_hours_start,
          business_hours_end: session.business_hours_end
        } : null
      });
    } catch (error) {
      logger.error(LogCategory.INTEGRATION, `Erro ao obter status: ${error}`);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// POST /api/whatsapp/send-message - Enviar mensagem
router.post('/send-message',
  authenticateToken,
  [
    body('to').notEmpty().withMessage('Destinatário é obrigatório'),
    body('message').notEmpty().withMessage('Mensagem é obrigatória'),
    body('type').optional().isIn(['text', 'image', 'document', 'audio', 'video']).withMessage('Tipo inválido')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const psychologistId = req.user?.userId;
      if (!psychologistId) {
        return res.status(400).json({ success: false, message: 'ID do psicólogo não encontrado' });
      }

      const { to, message, type = 'text' } = req.body;

      const result = await whatsappService.sendMessage(psychologistId, to, message, type);
      
      logger.info(LogCategory.INTEGRATION, `Mensagem enviada de ${psychologistId} para ${to}: ${result.success}`);
      
      res.json(result);
    } catch (error) {
      logger.error(LogCategory.INTEGRATION, `Erro ao enviar mensagem: ${error}`);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// GET /api/whatsapp/conversations - Obter conversas
router.get('/conversations',
  authenticateToken,
  async (req: express.Request, res: express.Response) => {
    try {
      const psychologistId = req.user?.userId;
      if (!psychologistId) {
        return res.status(400).json({ success: false, message: 'ID do psicólogo não encontrado' });
      }

      const conversations = await whatsappService.getConversations(psychologistId);
      
      res.json({
        success: true,
        conversations: conversations
      });
    } catch (error) {
      logger.error(LogCategory.INTEGRATION, `Erro ao obter conversas: ${error}`);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// GET /api/whatsapp/messages/:conversation_id - Obter mensagens de uma conversa
router.get('/messages/:conversation_id',
  authenticateToken,
  [
    param('conversation_id').isUUID().withMessage('ID da conversa inválido')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const psychologistId = req.user?.userId;
      const { conversation_id } = req.params;

      if (!psychologistId) {
        return res.status(400).json({ success: false, message: 'ID do psicólogo não encontrado' });
      }

      // Verificar se a conversa pertence ao psicólogo
      const { data: conversation } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('id', conversation_id)
        .eq('psychologist_id', psychologistId)
        .single();

      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversa não encontrada' });
      }

      const messages = await whatsappService.getMessages(conversation_id);
      
      res.json({
        success: true,
        messages: messages
      });
    } catch (error) {
      logger.error(LogCategory.INTEGRATION, `Erro ao obter mensagens: ${error}`);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// POST /api/whatsapp/disconnect - Desconectar WhatsApp
router.post('/disconnect',
  authenticateToken,
  async (req: express.Request, res: express.Response) => {
    try {
      const psychologistId = req.user?.userId;
      if (!psychologistId) {
        return res.status(400).json({ success: false, message: 'ID do psicólogo não encontrado' });
      }

      const result = await whatsappService.disconnectClient(psychologistId);
      
      logger.info(LogCategory.INTEGRATION, `Desconexão WhatsApp para ${psychologistId}: ${result.message}`);
      
      res.json(result);
    } catch (error) {
      logger.error(LogCategory.INTEGRATION, `Erro ao desconectar WhatsApp: ${error}`);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// PUT /api/whatsapp/settings - Atualizar configurações
router.put('/settings',
  authenticateToken,
  [
    body('auto_reply_enabled').optional().isBoolean().withMessage('auto_reply_enabled deve ser boolean'),
    body('auto_reply_message').optional().isString().withMessage('auto_reply_message deve ser string'),
    body('business_hours_enabled').optional().isBoolean().withMessage('business_hours_enabled deve ser boolean'),
    body('business_hours_start').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido'),
    body('business_hours_end').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido'),
    body('away_message').optional().isString().withMessage('away_message deve ser string'),
    body('webhook_url').optional().isURL().withMessage('webhook_url deve ser uma URL válida')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const psychologistId = req.user?.userId;
      if (!psychologistId) {
        return res.status(400).json({ success: false, message: 'ID do psicólogo não encontrado' });
      }

      const settings = req.body;

      const { error } = await supabase
        .from('whatsapp_sessions')
        .upsert({
          psychologist_id: psychologistId,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      logger.info(LogCategory.INTEGRATION, `Configurações WhatsApp atualizadas para ${psychologistId}`);

      res.json({
        success: true,
        message: 'Configurações atualizadas com sucesso'
      });
    } catch (error) {
      logger.error(LogCategory.INTEGRATION, `Erro ao atualizar configurações: ${error}`);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// GET /api/whatsapp/templates - Obter templates
router.get('/templates',
  authenticateToken,
  async (req: express.Request, res: express.Response) => {
    try {
      const psychologistId = req.user?.userId;
      if (!psychologistId) {
        return res.status(400).json({ success: false, message: 'ID do psicólogo não encontrado' });
      }

      const { data: templates, error } = await supabase
        .from('whatsapp_message_templates')
        .select('*')
        .eq('psychologist_id', psychologistId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({
        success: true,
        templates: templates || []
      });
    } catch (error) {
      logger.error(LogCategory.INTEGRATION, `Erro ao obter templates: ${error}`);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// POST /api/whatsapp/templates - Criar template
router.post('/templates',
  authenticateToken,
  [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('content').notEmpty().withMessage('Conteúdo é obrigatório'),
    body('category').optional().isString().withMessage('Categoria deve ser string')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const psychologistId = req.user?.userId;
      if (!psychologistId) {
        return res.status(400).json({ success: false, message: 'ID do psicólogo não encontrado' });
      }

      const { name, content, category = 'general' } = req.body;

      const { data: template, error } = await supabase
        .from('whatsapp_message_templates')
        .insert({
          psychologist_id: psychologistId,
          name,
          content,
          category
        })
        .select()
        .single();

      if (error) throw error;

      logger.info(LogCategory.INTEGRATION, `Template criado por ${psychologistId}: ${name}`);

      res.json({
        success: true,
        message: 'Template criado com sucesso',
        template: template
      });
    } catch (error) {
      logger.error(LogCategory.INTEGRATION, `Erro ao criar template: ${error}`);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// PUT /api/whatsapp/templates/:template_id - Atualizar template
router.put('/templates/:template_id',
  authenticateToken,
  [
    param('template_id').isUUID().withMessage('ID do template inválido'),
    body('name').optional().notEmpty().withMessage('Nome não pode estar vazio'),
    body('content').optional().notEmpty().withMessage('Conteúdo não pode estar vazio'),
    body('category').optional().isString().withMessage('Categoria deve ser string')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const psychologistId = req.user?.userId;
      const { template_id } = req.params;

      if (!psychologistId) {
        return res.status(400).json({ success: false, message: 'ID do psicólogo não encontrado' });
      }

      const updates = req.body;

      const { data: template, error } = await supabase
        .from('whatsapp_message_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', template_id)
        .eq('psychologist_id', psychologistId)
        .select()
        .single();

      if (error) throw error;

      if (!template) {
        return res.status(404).json({ success: false, message: 'Template não encontrado' });
      }

      logger.info(LogCategory.INTEGRATION, `Template atualizado por ${psychologistId}: ${template_id}`);

      res.json({
        success: true,
        message: 'Template atualizado com sucesso',
        template: template
      });
    } catch (error) {
      logger.error(LogCategory.INTEGRATION, `Erro ao atualizar template: ${error}`);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// DELETE /api/whatsapp/templates/:template_id - Excluir template
router.delete('/templates/:template_id',
  authenticateToken,
  [
    param('template_id').isUUID().withMessage('ID do template inválido')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const psychologistId = req.user?.userId;
      const { template_id } = req.params;

      if (!psychologistId) {
        return res.status(400).json({ success: false, message: 'ID do psicólogo não encontrado' });
      }

      const { error } = await supabase
        .from('whatsapp_message_templates')
        .delete()
        .eq('id', template_id)
        .eq('psychologist_id', psychologistId);

      if (error) throw error;

      logger.info(LogCategory.INTEGRATION, `Template excluído por ${psychologistId}: ${template_id}`);

      res.json({
        success: true,
        message: 'Template excluído com sucesso'
      });
    } catch (error) {
      logger.error(LogCategory.INTEGRATION, `Erro ao excluir template: ${error}`);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

// POST /api/whatsapp/mark-as-read - Marcar mensagens como lidas
router.post('/mark-as-read',
  authenticateToken,
  [
    body('conversation_id').isUUID().withMessage('ID da conversa inválido')
  ],
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const psychologistId = req.user?.userId;
      const { conversation_id } = req.body;

      if (!psychologistId) {
        return res.status(400).json({ success: false, message: 'ID do psicólogo não encontrado' });
      }

      // Verificar se a conversa pertence ao psicólogo
      const { data: conversation } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('id', conversation_id)
        .eq('psychologist_id', psychologistId)
        .single();

      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversa não encontrada' });
      }

      // Atualizar contador de mensagens não lidas
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversation_id);

      if (error) throw error;

      res.json({
        success: true,
        message: 'Mensagens marcadas como lidas'
      });
    } catch (error) {
      logger.error(LogCategory.INTEGRATION, `Erro ao marcar como lidas: ${error}`);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
);

export default router;