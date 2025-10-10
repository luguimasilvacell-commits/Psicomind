/**
 * Hook para gerenciar templates de mensagens
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  UseTemplatesReturn, 
  MessageTemplate, 
  TemplateCategory,
  ApiResponse 
} from '../types/chat';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useTemplates = (): UseTemplatesReturn => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { token } = useAuthStore();

  // API helper function
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }, [token]);

  // Load templates
  const loadTemplates = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response: ApiResponse<MessageTemplate[]> = await apiCall(
        `/templates?${params.toString()}`
      );

      if (response.success && response.data) {
        setTemplates(response.data);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  }, [token, selectedCategory, apiCall]);

  // Load categories
  const loadCategories = useCallback(async () => {
    if (!token) return;

    try {
      const response: ApiResponse<TemplateCategory[]> = await apiCall('/templates/categories');

      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }, [token, apiCall]);

  // Create template
  const createTemplate = useCallback(async (templateData: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    if (!token) return null;

    try {
      setLoading(true);
      setError(null);

      const response: ApiResponse<MessageTemplate> = await apiCall(
        '/templates',
        {
          method: 'POST',
          body: JSON.stringify(templateData),
        }
      );

      if (response.success && response.data) {
        setTemplates(prev => [response.data!, ...prev]);
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Error creating template:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar template');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, apiCall]);

  // Update template
  const updateTemplate = useCallback(async (id: string, templateData: Partial<MessageTemplate>) => {
    if (!token) return null;

    try {
      setLoading(true);
      setError(null);

      const response: ApiResponse<MessageTemplate> = await apiCall(
        `/templates/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(templateData),
        }
      );

      if (response.success && response.data) {
        setTemplates(prev => 
          prev.map(template => 
            template.id === id ? response.data! : template
          )
        );
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Error updating template:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar template');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, apiCall]);

  // Delete template
  const deleteTemplate = useCallback(async (id: string) => {
    if (!token) return false;

    try {
      setLoading(true);
      setError(null);

      const response: ApiResponse<{ message: string }> = await apiCall(
        `/templates/${id}`,
        { method: 'DELETE' }
      );

      if (response.success) {
        setTemplates(prev => prev.filter(template => template.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar template');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, apiCall]);

  // Duplicate template
  const duplicateTemplate = useCallback(async (id: string) => {
    if (!token) return null;

    try {
      setLoading(true);
      setError(null);

      const response: ApiResponse<MessageTemplate> = await apiCall(
        `/templates/${id}/duplicate`,
        { method: 'POST' }
      );

      if (response.success && response.data) {
        setTemplates(prev => [response.data!, ...prev]);
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Error duplicating template:', err);
      setError(err instanceof Error ? err.message : 'Erro ao duplicar template');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, apiCall]);

  // Preview template with variables
  const previewTemplate = useCallback(async (id: string, variables: Record<string, string>) => {
    if (!token) return null;

    try {
      const response: ApiResponse<{ preview: string }> = await apiCall(
        `/templates/${id}/preview`,
        {
          method: 'POST',
          body: JSON.stringify({ variables }),
        }
      );

      if (response.success && response.data) {
        return response.data.preview;
      }
      return null;
    } catch (err) {
      console.error('Error previewing template:', err);
      setError(err instanceof Error ? err.message : 'Erro ao visualizar template');
      return null;
    }
  }, [token, apiCall]);

  // Get template by ID
  const getTemplate = useCallback((id: string): MessageTemplate | null => {
    return templates.find(template => template.id === id) || null;
  }, [templates]);

  // Filter templates by search term
  const searchTemplates = useCallback((searchTerm: string): MessageTemplate[] => {
    if (!searchTerm.trim()) return templates;

    const term = searchTerm.toLowerCase();
    return templates.filter(template => 
      template.name.toLowerCase().includes(term) ||
      template.content.toLowerCase().includes(term) ||
      template.category.toLowerCase().includes(term)
    );
  }, [templates]);

  // Get templates by category
  const getTemplatesByCategory = useCallback((category: string): MessageTemplate[] => {
    if (category === 'all') return templates;
    return templates.filter(template => template.category === category);
  }, [templates]);

  // Extract variables from template content
  const extractVariables = useCallback((content: string): string[] => {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }, []);

  // Replace variables in template content
  const replaceVariables = useCallback((content: string, variables: Record<string, string>): string => {
    let result = content;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  }, []);

  // Load data on mount and when dependencies change
  useEffect(() => {
    if (token) {
      loadTemplates();
      loadCategories();
    }
  }, [token, loadTemplates, loadCategories]);

  // Reload templates when category changes
  useEffect(() => {
    if (token) {
      loadTemplates();
    }
  }, [selectedCategory, loadTemplates]);

  return {
    templates,
    categories,
    loading,
    error,
    selectedCategory,
    setSelectedCategory,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    previewTemplate,
    getTemplate,
    searchTemplates,
    getTemplatesByCategory,
    extractVariables,
    replaceVariables
  };
};