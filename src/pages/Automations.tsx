import React, { useState } from 'react';
import { 
  Bot, 
  Plus, 
  Settings, 
  Activity,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import AutomationList from '../components/chat/AutomationList';
import AutomationForm from '../components/chat/AutomationForm';
import ConnectionTest from '../components/ConnectionTest';
import { useAutomations } from '../hooks/useAutomations';
import { useIntegration } from '../hooks/useIntegration';
import { Automation, AutomationStatus } from '../types/chat';
import { toast } from 'sonner';

const Automations: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AutomationStatus | 'all'>('all');

  const {
    automations,
    loading: automationsLoading,
    error: automationsError,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation
  } = useAutomations();

  const {
    config,
    metrics,
    logs,
    loading: integrationLoading,
    updateConfig,
    testConnection
  } = useIntegration();

  // Filtrar automações
  const filteredAutomations = automations.filter(automation => {
    const matchesSearch = automation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         automation.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || automation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Estatísticas
  const stats = {
    total: automations.length,
    active: automations.filter(a => a.status === 'active').length,
    inactive: automations.filter(a => a.status === 'inactive').length,
    paused: automations.filter(a => a.status === 'paused').length
  };

  const handleCreateAutomation = async (automationData: Omit<Automation, 'id' | 'psychologist_id' | 'created_at' | 'updated_at'>) => {
    try {
      await createAutomation(automationData);
      setShowForm(false);
      toast.success('Automação criada com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar automação');
    }
  };

  const handleUpdateAutomation = async (automationData: Omit<Automation, 'id' | 'psychologist_id' | 'created_at' | 'updated_at'>) => {
    if (!editingAutomation) return;

    try {
      await updateAutomation(editingAutomation.id, automationData);
      setEditingAutomation(null);
      setShowForm(false);
      toast.success('Automação atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar automação');
    }
  };

  const handleDeleteAutomation = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta automação?')) return;

    try {
      await deleteAutomation(id);
      toast.success('Automação deletada com sucesso!');
    } catch (error) {
      toast.error('Erro ao deletar automação');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: AutomationStatus) => {
    try {
      await toggleAutomation(id);
      const newStatus = currentStatus === 'active' ? 'inativa' : 'ativa';
      toast.success(`Automação ${newStatus} com sucesso!`);
    } catch (error) {
      toast.error('Erro ao alterar status da automação');
    }
  };

  const handleEditAutomation = (automation: Automation) => {
    setEditingAutomation(automation);
    setShowForm(true);
  };



  if (showForm) {
    return (
      <div className="container mx-auto px-4 py-6">
        <AutomationForm
          automation={editingAutomation || undefined}
          onSubmit={editingAutomation ? handleUpdateAutomation : handleCreateAutomation}
          onCancel={() => {
            setShowForm(false);
            setEditingAutomation(null);
          }}
          loading={automationsLoading}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Automações</h1>
            <p className="text-gray-600">Gerencie suas automações de chat</p>
          </div>
        </div>
        
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Automação
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Bot className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ativas</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inativas</p>
                <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
              </div>
              <Settings className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pausadas</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.paused}</p>
              </div>
              <FileText className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="automations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="automations">Automações</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
        </TabsList>

        <TabsContent value="automations" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar automações..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as AutomationStatus | 'all')}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="all">Todos os status</option>
                    <option value="active">Ativas</option>
                    <option value="inactive">Inativas</option>
                    <option value="paused">Pausadas</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Automações */}
          <AutomationList
            automations={filteredAutomations}
            onEdit={handleEditAutomation}
            onDelete={handleDeleteAutomation}
            onToggleStatus={handleToggleStatus}
            loading={automationsLoading}
          />
        </TabsContent>

        <TabsContent value="config">
          <div className="space-y-6">
            {/* Teste de Conexão */}
            <Card>
              <CardHeader>
                <CardTitle>Teste de Conexão</CardTitle>
              </CardHeader>
              <CardContent>
                <ConnectionTest 
                  service="both" 
                  config={{
                    n8n: {
                      baseUrl: config?.n8n_webhook_url,
                      apiKey: config?.n8n_api_key
                    },
                    evolution: {
                      baseUrl: config?.evolution_api_url,
                      apiKey: config?.evolution_api_key,
                      instanceName: config?.evolution_instance_name
                    }
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configurações de Integração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
              {/* Configuração n8n */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">n8n</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">URL do Webhook</label>
                    <Input
                      value={config?.n8n_webhook_url || ''}
                      onChange={(e) => updateConfig({ n8n_webhook_url: e.target.value })}
                      placeholder="https://n8n.exemplo.com/webhook"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">API Key</label>
                    <Input
                      type="password"
                      value={config?.n8n_api_key || ''}
                      onChange={(e) => updateConfig({ n8n_api_key: e.target.value })}
                      placeholder="n8n-api-key"
                    />
                  </div>
                </div>
              </div>

              {/* Configuração Evolution API */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Evolution API</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">URL da API</label>
                    <Input
                      value={config?.evolution_api_url || ''}
                      onChange={(e) => updateConfig({ evolution_api_url: e.target.value })}
                      placeholder="https://evolution.exemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">API Key</label>
                    <Input
                      type="password"
                      value={config?.evolution_api_key || ''}
                      onChange={(e) => updateConfig({ evolution_api_key: e.target.value })}
                      placeholder="evolution-api-key"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Nome da Instância</label>
                    <Input
                      value={config?.evolution_instance_name || ''}
                      onChange={(e) => updateConfig({ evolution_instance_name: e.target.value })}
                      placeholder="psicomind"
                    />
                  </div>
                </div>
              </div>

              {/* Configurações Gerais */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Configurações Gerais</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Timeout (ms)</label>
                    <Input
                      type="number"
                      value={config?.default_timeout || 30000}
                      onChange={(e) => updateConfig({ default_timeout: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Tentativas de Retry</label>
                    <Input
                      type="number"
                      value={config?.retry_attempts || 3}
                      onChange={(e) => updateConfig({ retry_attempts: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      checked={config?.enable_logging || true}
                      onChange={(e) => updateConfig({ enable_logging: e.target.checked })}
                      className="rounded"
                    />
                    <label className="text-sm font-medium">Habilitar Logs</label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Webhook</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Nenhum log encontrado
                  </p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={log.response_status >= 200 && log.response_status < 300 ? 'default' : 'destructive'}>
                            {log.source}
                          </Badge>
                          <span className="text-sm text-gray-600">{log.event_type}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-sm">
                        <p><strong>Status:</strong> {log.response_status}</p>
                        <p><strong>Tempo:</strong> {log.processing_time}ms</p>
                        {log.error_message && (
                          <p className="text-red-600"><strong>Erro:</strong> {log.error_message}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Automação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Nenhuma métrica encontrada
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {metrics.map((metric) => (
                      <Card key={metric.id}>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-600 capitalize">
                              {metric.metric_type.replace('_', ' ')}
                            </p>
                            <p className="text-2xl font-bold">
                              {metric.metric_value}
                              {metric.metric_type === 'response_time' && 'ms'}
                              {metric.metric_type === 'success_rate' && '%'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(metric.date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Automations;