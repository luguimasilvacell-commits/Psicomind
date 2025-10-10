import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { 
  Automation, 
  UseAutomationsReturn,
  AutomationStatus,
  AutomationType
} from '../types/chat';

export const useAutomations = (): UseAutomationsReturn => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const refreshAutomations = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('automations')
        .select('*')
        .eq('psychologist_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Mapear os dados do banco para o formato esperado pelos tipos TypeScript
      const mappedAutomations = (data || []).map(automation => ({
        ...automation,
        type: automation.trigger_type as AutomationType,
        status: automation.is_active ? 'active' as AutomationStatus : 'inactive' as AutomationStatus,
        action_config: automation.action_config || {}
      }));

      setAutomations(mappedAutomations);
    } catch (err) {
      console.error('Error fetching automations:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar automações');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const createAutomation = useCallback(async (
    automation: Omit<Automation, 'id' | 'psychologist_id' | 'created_at' | 'updated_at'>
  ) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    setLoading(true);
    setError(null);

    try {
      // Mapear os dados para o formato do banco
      const dbAutomation = {
        name: automation.name,
        description: automation.description,
        trigger_type: automation.type,
        trigger_config: automation.trigger_config,
        is_active: automation.status === 'active',
        psychologist_id: user.id
      };

      const { data, error: createError } = await supabase
        .from('automations')
        .insert(dbAutomation)
        .select()
        .single();

      if (createError) throw createError;

      // Mapear os dados de volta para o formato TypeScript
      const mappedAutomation = {
        ...data,
        type: data.trigger_type as AutomationType,
        status: data.is_active ? 'active' as AutomationStatus : 'inactive' as AutomationStatus,
        action_config: data.action_config || {}
      };

      setAutomations(prev => [mappedAutomation, ...prev]);
    } catch (err) {
      console.error('Error creating automation:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar automação');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const updateAutomation = useCallback(async (
    id: string, 
    updates: Partial<Automation>
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('automations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('psychologist_id', user?.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setAutomations(prev => 
        prev.map(automation => 
          automation.id === id ? data : automation
        )
      );
    } catch (err) {
      console.error('Error updating automation:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar automação');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const deleteAutomation = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('automations')
        .delete()
        .eq('id', id)
        .eq('psychologist_id', user?.id);

      if (deleteError) throw deleteError;

      setAutomations(prev => 
        prev.filter(automation => automation.id !== id)
      );
    } catch (err) {
      console.error('Error deleting automation:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar automação');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const toggleAutomation = useCallback(async (id: string) => {
    const automation = automations.find(a => a.id === id);
    if (!automation) return;

    const newStatus: AutomationStatus = automation.status === 'active' ? 'inactive' : 'active';
    
    await updateAutomation(id, { 
      status: newStatus,
      is_active: newStatus === 'active'
    });
  }, [automations, updateAutomation]);

  const executeAutomation = useCallback(async (id: string, context?: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/automations/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          automationId: id,
          context
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao executar automação');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error executing automation:', err);
      setError(err instanceof Error ? err.message : 'Erro ao executar automação');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.access_token]);

  // Carregar automações ao montar o componente
  useEffect(() => {
    refreshAutomations();
  }, [refreshAutomations]);

  // Escutar mudanças em tempo real
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('automations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'automations',
          filter: `psychologist_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Automation change:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              setAutomations(prev => [payload.new as Automation, ...prev]);
              break;
            case 'UPDATE':
              setAutomations(prev => 
                prev.map(automation => 
                  automation.id === payload.new.id ? payload.new as Automation : automation
                )
              );
              break;
            case 'DELETE':
              setAutomations(prev => 
                prev.filter(automation => automation.id !== payload.old.id)
              );
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    automations,
    loading,
    error,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    executeAutomation,
    refreshAutomations
  };
};