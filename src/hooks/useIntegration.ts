import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { 
  AutomationConfig, 
  AutomationMetric, 
  WebhookLog,
  UseIntegrationReturn 
} from '../types/chat';

export const useIntegration = (): UseIntegrationReturn => {
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [metrics, setMetrics] = useState<AutomationMetric[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const loadConfig = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('automation_configs')
        .select('*')
        .eq('psychologist_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setConfig(data || null);
    } catch (err) {
      console.error('Error loading config:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar configuração');
    }
  }, [user?.id]);

  const updateConfig = useCallback(async (updates: Partial<AutomationConfig>) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    setLoading(true);
    setError(null);

    try {
      let result;

      if (config) {
        // Atualizar configuração existente
        const { data, error: updateError } = await supabase
          .from('automation_configs')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', config.id)
          .select()
          .single();

        if (updateError) throw updateError;
        result = data;
      } else {
        // Criar nova configuração
        const { data, error: createError } = await supabase
          .from('automation_configs')
          .insert({
            psychologist_id: user.id,
            default_timeout: 30000,
            retry_attempts: 3,
            enable_logging: true,
            ...updates
          })
          .select()
          .single();

        if (createError) throw createError;
        result = data;
      }

      setConfig(result);
    } catch (err) {
      console.error('Error updating config:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar configuração');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.id, config]);

  const testConnection = useCallback(async (service: 'n8n' | 'evolution' | 'both', config?: any) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/webhooks/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          service, 
          config: config || {
            n8n: {
              baseUrl: config?.n8n_webhook_url,
              apiKey: config?.n8n_api_key
            },
            evolution: {
              baseUrl: config?.evolution_api_url,
              apiKey: config?.evolution_api_key,
              instanceName: config?.evolution_instance_name
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Erro ao testar conexão: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error testing connection:', err);
      setError(err instanceof Error ? err.message : 'Erro ao testar conexão');
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao testar conexão' };
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const retryWebhook = useCallback(async (logId: string) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/webhooks/retry/${logId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        throw new Error(`Erro ao reprocessar webhook: ${response.statusText}`);
      }

      // Recarregar logs após retry será feito manualmente pelo usuário
    } catch (err) {
      console.error('Error retrying webhook:', err);
      setError(err instanceof Error ? err.message : 'Erro ao reprocessar webhook');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const getMetrics = useCallback(async (timeRange: string) => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const endDate = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case 'day':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Buscar métricas através das automações do psicólogo
      const { data: userAutomations, error: automationsError } = await supabase
        .from('automations')
        .select('id')
        .eq('psychologist_id', user.id);

      if (automationsError) throw automationsError;

      const automationIds = userAutomations?.map(a => a.id) || [];

      if (automationIds.length === 0) {
        setMetrics([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('automation_metrics')
        .select('*')
        .in('automation_id', automationIds)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      setMetrics(data || []);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const getLogs = useCallback(async (filters: any) => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Como webhook_logs não tem psychologist_id, vamos buscar todos os logs
      // Em um ambiente real, você pode querer filtrar por outros critérios
      let query = supabase
        .from('webhook_logs')
        .select('*');

      if (filters.source) {
        query = query.eq('source', filters.source);
      }

      if (filters.status) {
        if (filters.status === 'success') {
          query = query.gte('response_status', 200).lt('response_status', 300);
        } else if (filters.status === 'error') {
          query = query.or('response_status.gte.400,response_status.lt.200');
        }
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Carregar configuração ao montar
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Carregar métricas e logs iniciais
  useEffect(() => {
    if (user?.id) {
      getMetrics('week');
      getLogs({});
    }
  }, [user?.id, getMetrics, getLogs]);

  // Escutar mudanças em tempo real
  useEffect(() => {
    if (!user?.id) return;

    const configChannel = supabase
      .channel('config_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'automation_configs',
          filter: `psychologist_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setConfig(payload.new as AutomationConfig);
          }
        }
      )
      .subscribe();

    const logsChannel = supabase
      .channel('logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webhook_logs'
          // Removido filter pois psychologist_id não existe nesta tabela
        },
        (payload) => {
          setLogs(prev => [payload.new as WebhookLog, ...prev.slice(0, 99)]);
        }
      )
      .subscribe();

    const metricsChannel = supabase
      .channel('metrics_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'automation_metrics'
          // Removido filter pois psychologist_id não existe nesta tabela
        },
        (payload) => {
          setMetrics(prev => [payload.new as AutomationMetric, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(configChannel);
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(metricsChannel);
    };
  }, [user?.id]);

  return {
    config,
    metrics,
    logs,
    loading,
    error,
    updateConfig,
    testConnection,
    retryWebhook,
    getMetrics,
    getLogs
  };
};