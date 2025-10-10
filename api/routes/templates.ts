/**
 * Rotas para gerenciamento de templates de mensagens
 */
import { Router, type Request, type Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { chatService } from '../services/chatService.js';
import { logSensitiveAction } from '../middleware/auditLogger.js';

const router = Router();

/**
 * Get all message templates for authenticated psychologist
 * GET /api/templates
 */
router.get('/',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const psychologistId = req.user?.userId;
      const { category } = req.query;

      if (!psychologistId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const templates = await chatService.getMessageTemplates(
        psychologistId,
        category as string
      );

      res.status(200).json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error getting message templates:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar templates'
      });
    }
  }
);

/**
 * Create a new message template
 * POST /api/templates
 */
router.post('/',
  authenticateToken,
  logSensitiveAction('create_template', 'template'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const psychologistId = req.user?.userId;
      const { name, content, category } = req.body;

      if (!psychologistId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      if (!name || !content || !category) {
        res.status(400).json({
          success: false,
          message: 'Nome, conteúdo e categoria são obrigatórios'
        });
        return;
      }

      const template = await chatService.createMessageTemplate(
        psychologistId,
        name,
        content,
        category
      );

      res.status(201).json({
        success: true,
        data: template,
        message: 'Template criado com sucesso'
      });
    } catch (error) {
      console.error('Error creating message template:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar template'
      });
    }
  }
);

/**
 * Update a message template
 * PUT /api/templates/:templateId
 */
router.put('/:templateId',
  authenticateToken,
  logSensitiveAction('update_template', 'template'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const psychologistId = req.user?.userId;
      const { templateId } = req.params;
      const { name, content, category, is_active } = req.body;

      if (!psychologistId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (content !== undefined) updates.content = content;
      if (category !== undefined) updates.category = category;
      if (is_active !== undefined) updates.is_active = is_active;

      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          success: false,
          message: 'Nenhum campo para atualizar foi fornecido'
        });
        return;
      }

      const template = await chatService.updateMessageTemplate(
        templateId,
        psychologistId,
        updates
      );

      res.status(200).json({
        success: true,
        data: template,
        message: 'Template atualizado com sucesso'
      });
    } catch (error) {
      console.error('Error updating message template:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar template'
      });
    }
  }
);

/**
 * Delete a message template
 * DELETE /api/templates/:templateId
 */
router.delete('/:templateId',
  authenticateToken,
  logSensitiveAction('delete_template', 'template'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const psychologistId = req.user?.userId;
      const { templateId } = req.params;

      if (!psychologistId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      await chatService.deleteMessageTemplate(templateId, psychologistId);

      res.status(200).json({
        success: true,
        message: 'Template excluído com sucesso'
      });
    } catch (error) {
      console.error('Error deleting message template:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao excluir template'
      });
    }
  }
);

/**
 * Get template categories
 * GET /api/templates/categories
 */
router.get('/categories',
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

      // Get unique categories from user's templates
      const templates = await chatService.getMessageTemplates(psychologistId);
      const categories = [...new Set(templates.map(t => t.category))].sort();

      // Add default categories if not present
      const defaultCategories = [
        'Saudação',
        'Agendamento',
        'Confirmação',
        'Cancelamento',
        'Reagendamento',
        'Lembrete',
        'Informações',
        'Despedida',
        'Emergência',
        'Outros'
      ];

      const allCategories = [...new Set([...defaultCategories, ...categories])].sort();

      res.status(200).json({
        success: true,
        data: allCategories
      });
    } catch (error) {
      console.error('Error getting template categories:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar categorias'
      });
    }
  }
);

/**
 * Duplicate a message template
 * POST /api/templates/:templateId/duplicate
 */
router.post('/:templateId/duplicate',
  authenticateToken,
  logSensitiveAction('duplicate_template', 'template'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const psychologistId = req.user?.userId;
      const { templateId } = req.params;
      const { name } = req.body;

      if (!psychologistId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      // Get original template
      const templates = await chatService.getMessageTemplates(psychologistId);
      const originalTemplate = templates.find(t => t.id === templateId);

      if (!originalTemplate) {
        res.status(404).json({
          success: false,
          message: 'Template não encontrado'
        });
        return;
      }

      // Create duplicate
      const duplicatedTemplate = await chatService.createMessageTemplate(
        psychologistId,
        name || `${originalTemplate.name} (Cópia)`,
        originalTemplate.content,
        originalTemplate.category
      );

      res.status(201).json({
        success: true,
        data: duplicatedTemplate,
        message: 'Template duplicado com sucesso'
      });
    } catch (error) {
      console.error('Error duplicating message template:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao duplicar template'
      });
    }
  }
);

/**
 * Preview template with variables replaced
 * POST /api/templates/:templateId/preview
 */
router.post('/:templateId/preview',
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const psychologistId = req.user?.userId;
      const { templateId } = req.params;
      const { variables = {} } = req.body;

      if (!psychologistId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      // Get template
      const templates = await chatService.getMessageTemplates(psychologistId);
      const template = templates.find(t => t.id === templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Template não encontrado'
        });
        return;
      }

      // Replace variables in template content
      let previewContent = template.content;
      
      // Default variables
      const defaultVariables = {
        nome_paciente: variables.nome_paciente || '[Nome do Paciente]',
        nome_psicologo: variables.nome_psicologo || '[Nome do Psicólogo]',
        data: variables.data || new Date().toLocaleDateString('pt-BR'),
        hora: variables.hora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        clinica: variables.clinica || '[Nome da Clínica]'
      };

      // Replace variables
      Object.entries({ ...defaultVariables, ...variables }).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        previewContent = previewContent.replace(regex, value as string);
      });

      res.status(200).json({
        success: true,
        data: {
          original: template.content,
          preview: previewContent,
          variables_used: Object.keys(defaultVariables)
        }
      });
    } catch (error) {
      console.error('Error previewing template:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao visualizar template'
      });
    }
  }
);

export default router;