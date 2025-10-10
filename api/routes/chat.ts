/**
 * Rotas do sistema de chat WhatsApp Web
 */
import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { chatService } from '../services/chatService.js';
import { logSensitiveAction } from '../middleware/auditLogger.js';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, documents, audio, and video
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|mp3|wav|mp4|mov/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

/**
 * Get conversations for authenticated psychologist
 * GET /api/chat/conversations
 */
router.get('/conversations',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const psychologistId = req.user?.userId;
      const { search, limit = '50', offset = '0' } = req.query;

      if (!psychologistId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const conversations = await chatService.getConversations(
        psychologistId,
        search as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.status(200).json({
        success: true,
        data: conversations
      });
    } catch (error) {
      console.error('Error getting conversations:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar conversas'
      });
    }
  }
);

/**
 * Get messages for a specific conversation
 * GET /api/chat/conversations/:conversationId/messages
 */
router.get('/conversations/:conversationId/messages',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const psychologistId = req.user?.userId;
      const { conversationId } = req.params;
      const { limit = '50', offset = '0' } = req.query;

      if (!psychologistId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const messages = await chatService.getMessages(
        conversationId,
        psychologistId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.status(200).json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar mensagens'
      });
    }
  }
);

/**
 * Send a message
 * POST /api/chat/conversations/:conversationId/messages
 */
router.post('/conversations/:conversationId/messages',
  authenticateToken,
  upload.single('media'),
  logSensitiveAction('send_message', 'chat'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const psychologistId = req.user?.userId;
      const { conversationId } = req.params;
      const { content, messageType = 'text' } = req.body;

      if (!psychologistId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      if (!content && !req.file) {
        res.status(400).json({
          success: false,
          message: 'Conteúdo da mensagem é obrigatório'
        });
        return;
      }

      const message = await chatService.sendMessage(
        psychologistId,
        conversationId,
        content || req.file?.originalname || '',
        messageType,
        req.file?.buffer
      );

      res.status(201).json({
        success: true,
        data: message
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem'
      });
    }
  }
);

/**
 * Mark messages as read
 * PUT /api/chat/conversations/:conversationId/read
 */
router.put('/conversations/:conversationId/read',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const psychologistId = req.user?.userId;
      const { conversationId } = req.params;

      if (!psychologistId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      await chatService.markMessagesAsRead(conversationId, psychologistId);

      res.status(200).json({
        success: true,
        message: 'Mensagens marcadas como lidas'
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao marcar mensagens como lidas'
      });
    }
  }
);

/**
 * Search conversations and messages
 * GET /api/chat/search
 */
router.get('/search',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const psychologistId = req.user?.userId;
      const { q: searchTerm, limit = '50', offset = '0' } = req.query;

      if (!psychologistId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      if (!searchTerm) {
        res.status(400).json({
          success: false,
          message: 'Termo de busca é obrigatório'
        });
        return;
      }

      const results = await chatService.searchConversations(
        psychologistId,
        searchTerm as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error searching conversations:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar conversas'
      });
    }
  }
);

/**
 * Get conversation statistics
 * GET /api/chat/stats
 */
router.get('/stats',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const psychologistId = req.user?.userId;

      if (!psychologistId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const stats = await chatService.getConversationStats(psychologistId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas'
      });
    }
  }
);

/**
 * Export conversation data
 * GET /api/chat/conversations/:conversationId/export
 */
router.get('/conversations/:conversationId/export',
  authenticateToken,
  logSensitiveAction('export_conversation', 'chat'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const psychologistId = req.user?.userId;
      const { conversationId } = req.params;
      const { format = 'json' } = req.query;

      if (!psychologistId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const exportData = await chatService.exportConversation(
        conversationId,
        psychologistId,
        format as 'json' | 'csv'
      );

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="conversa_${conversationId}.csv"`);
        res.status(200).send(exportData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="conversa_${conversationId}.json"`);
        res.status(200).json(exportData);
      }
    } catch (error) {
      console.error('Error exporting conversation:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao exportar conversa'
      });
    }
  }
);

export default router;