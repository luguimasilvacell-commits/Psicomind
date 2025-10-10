import { useState, useEffect, useCallback } from 'react';
import { 
  WhatsAppMessageTemplate, 
  WhatsAppTemplateCategory, 
  WhatsAppTemplateVariable,
  UseTemplatesReturn 
} from '@/types/whatsapp';

export const useWhatsAppTemplates = (): UseTemplatesReturn => {
  const [templates, setTemplates] = useState<WhatsAppMessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<WhatsAppTemplateCategory | 'all'>('all');

  const categories: { value: WhatsAppTemplateCategory; label: string }[] = [
    { value: 'greeting', label: 'Saudação' },
    { value: 'appointment', label: 'Agendamento' },
    { value: 'reminder', label: 'Lembrete' },
    { value: 'follow_up', label: 'Acompanhamento' },
    { value: 'emergency', label: 'Emergência' },
    { value: 'general', label: 'Geral' }
  ];

  // Load templates
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/whatsapp/templates?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      } else {
        setError('Erro ao carregar templates');
      }
    } catch (error) {
      setError('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  // Create template
  const createTemplate = useCallback(async (templateData: {
    name: string;
    content: string;
    category: WhatsAppTemplateCategory;
    variables?: WhatsAppTemplateVariable[];
  }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...templateData,
          variables: templateData.variables || extractVariables(templateData.content)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(prev => [data.template, ...prev]);
        return data.template;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Erro ao criar template');
        return null;
      }
    } catch (error) {
      setError('Erro ao criar template');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update template
  const updateTemplate = useCallback(async (id: string, templateData: Partial<WhatsAppMessageTemplate>) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/whatsapp/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...templateData,
          variables: templateData.content ? extractVariables(templateData.content) : templateData.variables
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(prev => 
          prev.map(template => 
            template.id === id ? data.template : template
          )
        );
        return data.template;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Erro ao atualizar template');
        return null;
      }
    } catch (error) {
      setError('Erro ao atualizar template');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete template
  const deleteTemplate = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/whatsapp/templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setTemplates(prev => prev.filter(template => template.id !== id));
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Erro ao excluir template');
        return false;
      }
    } catch (error) {
      setError('Erro ao excluir template');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Duplicate template
  const duplicateTemplate = useCallback(async (template: WhatsAppMessageTemplate) => {
    const duplicatedData = {
      name: `${template.name} (Cópia)`,
      content: template.content,
      category: template.category,
      variables: template.variables
    };

    return await createTemplate(duplicatedData);
  }, [createTemplate]);

  // Use template (increment usage count)
  const useTemplate = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/whatsapp/templates/${id}/use`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setTemplates(prev => 
          prev.map(template => 
            template.id === id 
              ? { ...template, usage_count: template.usage_count + 1 }
              : template
          )
        );
      }
    } catch (error) {
      console.error('Erro ao registrar uso do template:', error);
    }
  }, []);

  // Extract variables from template content
  const extractVariables = useCallback((content: string): WhatsAppTemplateVariable[] => {
    const variableRegex = /\{(\w+)\}/g;
    const variables: WhatsAppTemplateVariable[] = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      const name = match[1];
      if (!variables.some(v => v.name === name)) {
        variables.push({
          name,
          type: 'text',
          required: true,
          description: `Variável ${name}`
        });
      }
    }

    return variables;
  }, []);

  // Replace variables in template content
  const replaceVariables = useCallback((content: string, variables: Record<string, string>): string => {
    let result = content;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  }, []);

  // Preview template with variables
  const previewTemplate = useCallback((template: WhatsAppMessageTemplate, variables?: Record<string, string>): string => {
    if (!variables || Object.keys(variables).length === 0) {
      // Return template with example values
      let content = template.content;
      
      if (template.variables) {
        template.variables.forEach(variable => {
          const placeholder = `{${variable.name}}`;
          const exampleValue = getExampleValue(variable.name);
          content = content.replace(new RegExp(`\\{${variable.name}\\}`, 'g'), exampleValue);
        });
      }
      
      return content;
    }

    return replaceVariables(template.content, variables);
  }, [replaceVariables]);

  // Get example value for variable
  const getExampleValue = (variableName: string): string => {
    const examples: Record<string, string> = {
      nome: 'João Silva',
      data: '15/01/2024',
      hora: '14:30',
      local: 'Consultório',
      telefone: '(11) 99999-9999',
      email: 'joao@email.com',
      valor: 'R$ 150,00',
      procedimento: 'Consulta',
      medico: 'Dr. Silva',
      paciente: 'João Silva'
    };

    return examples[variableName.toLowerCase()] || `[${variableName}]`;
  };

  // Get template by ID
  const getTemplate = useCallback((id: string): WhatsAppMessageTemplate | null => {
    return templates.find(template => template.id === id) || null;
  }, [templates]);

  // Search templates
  const searchTemplates = useCallback((searchTerm: string): WhatsAppMessageTemplate[] => {
    if (!searchTerm.trim()) return templates;

    const term = searchTerm.toLowerCase();
    return templates.filter(template => 
      template.name.toLowerCase().includes(term) ||
      template.content.toLowerCase().includes(term)
    );
  }, [templates]);

  // Get templates by category
  const getTemplatesByCategory = useCallback((category: WhatsAppTemplateCategory | 'all'): WhatsAppMessageTemplate[] => {
    if (category === 'all') return templates;
    return templates.filter(template => template.category === category);
  }, [templates]);

  // Get template statistics
  const getTemplateStats = useCallback(() => {
    const stats = {
      total: templates.length,
      byCategory: {} as Record<WhatsAppTemplateCategory, number>,
      mostUsed: templates.sort((a, b) => b.usage_count - a.usage_count).slice(0, 5),
      totalUsage: templates.reduce((sum, template) => sum + template.usage_count, 0)
    };

    categories.forEach(({ value }) => {
      stats.byCategory[value] = templates.filter(t => t.category === value).length;
    });

    return stats;
  }, [templates]);

  // Validate template
  const validateTemplate = useCallback((template: Partial<WhatsAppMessageTemplate>): string[] => {
    const errors: string[] = [];

    if (!template.name?.trim()) {
      errors.push('Nome é obrigatório');
    }

    if (!template.content?.trim()) {
      errors.push('Conteúdo é obrigatório');
    }

    if (!template.category) {
      errors.push('Categoria é obrigatória');
    }

    if (template.content && template.content.length > 4096) {
      errors.push('Conteúdo não pode exceder 4096 caracteres');
    }

    return errors;
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load templates on mount and when category changes
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    // State
    templates,
    categories,
    loading,
    error,
    selectedCategory,
    
    // Actions
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    useTemplate,
    
    // Utils
    extractVariables,
    replaceVariables,
    previewTemplate,
    getTemplate,
    searchTemplates,
    getTemplatesByCategory,
    getTemplateStats,
    validateTemplate,
    clearError,
    
    // Setters
    setSelectedCategory
  };
};