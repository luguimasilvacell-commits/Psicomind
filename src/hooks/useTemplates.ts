import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageTemplate, TemplateCategory } from '../types/chat';
import { useAuthStore } from '../stores/authStore';

interface CreateTemplateData {
  name: string;
  content: string;
  category: TemplateCategory;
  variables?: string[];
}

interface UpdateTemplateData {
  name?: string;
  content?: string;
  category?: TemplateCategory;
  variables?: string[];
}

export const useTemplates = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Carregar templates
  const loadTemplates = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('psychologist_id', user.id)
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      setTemplates(data || []);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Criar template
  const createTemplate = async (templateData: CreateTemplateData): Promise<MessageTemplate> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('message_templates')
        .insert({
          ...templateData,
          psychologist_id: user.id
        })
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      const newTemplate = data as MessageTemplate;
      setTemplates(prev => [newTemplate, ...prev]);
      
      return newTemplate;
    } catch (err) {
      console.error('Erro ao criar template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Atualizar template
  const updateTemplate = async (id: string, templateData: UpdateTemplateData): Promise<MessageTemplate> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('message_templates')
        .update({
          ...templateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('psychologist_id', user.id)
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      const updatedTemplate = data as MessageTemplate;
      setTemplates(prev => 
        prev.map(template => 
          template.id === id ? updatedTemplate : template
        )
      );
      
      return updatedTemplate;
    } catch (err) {
      console.error('Erro ao atualizar template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Deletar template
  const deleteTemplate = async (id: string): Promise<void> => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      setLoading(true);
      setError(null);

      const { error: supabaseError } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id)
        .eq('psychologist_id', user.id);

      if (supabaseError) throw supabaseError;

      setTemplates(prev => prev.filter(template => template.id !== id));
    } catch (err) {
      console.error('Erro ao deletar template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Buscar template por ID
  const getTemplate = async (id: string): Promise<MessageTemplate | null> => {
    if (!user) return null;

    try {
      const { data, error: supabaseError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', id)
        .eq('psychologist_id', user.id)
        .single();

      if (supabaseError) throw supabaseError;

      return data as MessageTemplate;
    } catch (err) {
      console.error('Erro ao buscar template:', err);
      return null;
    }
  };

  // Buscar templates por categoria
  const getTemplatesByCategory = (category: TemplateCategory): MessageTemplate[] => {
    return templates.filter(template => template.category === category);
  };

  // Buscar templates por termo
  const searchTemplates = (searchTerm: string): MessageTemplate[] => {
    const term = searchTerm.toLowerCase();
    return templates.filter(template => 
      template.name.toLowerCase().includes(term) ||
      template.content.toLowerCase().includes(term)
    );
  };

  // Processar template com variáveis
  const processTemplate = (template: MessageTemplate, variables: Record<string, string>): string => {
    let processedContent = template.content;
    
    // Substituir variáveis no formato {{variavel}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processedContent = processedContent.replace(regex, value);
    });
    
    return processedContent;
  };

  // Extrair variáveis de um template
  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    return matches ? matches.map(match => match.slice(2, -2)) : [];
  };

  // Validar template
  const validateTemplate = (templateData: CreateTemplateData | UpdateTemplateData): string[] => {
    const errors: string[] = [];
    
    if ('name' in templateData && (!templateData.name || templateData.name.trim().length === 0)) {
      errors.push('Nome é obrigatório');
    }
    
    if ('content' in templateData && (!templateData.content || templateData.content.trim().length === 0)) {
      errors.push('Conteúdo é obrigatório');
    }
    
    if ('name' in templateData && templateData.name && templateData.name.length > 100) {
      errors.push('Nome deve ter no máximo 100 caracteres');
    }
    
    if ('content' in templateData && templateData.content && templateData.content.length > 2000) {
      errors.push('Conteúdo deve ter no máximo 2000 caracteres');
    }
    
    return errors;
  };

  // Configurar escuta em tempo real
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('message_templates_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_templates',
          filter: `psychologist_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Template change received:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              setTemplates(prev => [payload.new as MessageTemplate, ...prev]);
              break;
              
            case 'UPDATE':
              setTemplates(prev =>
                prev.map(template =>
                  template.id === payload.new.id ? payload.new as MessageTemplate : template
                )
              );
              break;
              
            case 'DELETE':
              setTemplates(prev =>
                prev.filter(template => template.id !== payload.old.id)
              );
              break;
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Carregar templates quando o usuário estiver disponível
  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    getTemplatesByCategory,
    searchTemplates,
    processTemplate,
    extractVariables,
    validateTemplate,
    loadTemplates
  };
};