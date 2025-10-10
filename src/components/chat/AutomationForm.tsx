import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  MessageSquare, 
  Webhook, 
  Clock, 
  Save, 
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { 
  Automation, 
  AutomationFormProps,
  AutomationType,
  AutomationStatus 
} from '../../types/chat';

const AutomationForm: React.FC<AutomationFormProps> = ({
  automation,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'keyword' as AutomationType,
    status: 'active' as AutomationStatus,
    is_active: true,
    trigger_config: {
      keywords: [] as string[],
      webhook_url: '',
      schedule: '',
      conditions: {}
    },
    action_config: {
      n8n_workflow_id: '',
      response_message: '',
      forward_to_n8n: false,
      variables: {}
    }
  });

  const [newKeyword, setNewKeyword] = useState('');

  // Preencher formulário se estiver editando
  useEffect(() => {
    if (automation) {
      setFormData({
        name: automation.name,
        description: automation.description || '',
        type: automation.type,
        status: automation.status,
        is_active: automation.is_active,
        trigger_config: {
          keywords: automation.trigger_config.keywords || [],
          webhook_url: automation.trigger_config.webhook_url || '',
          schedule: automation.trigger_config.schedule || '',
          conditions: automation.trigger_config.conditions || {}
        },
        action_config: {
          n8n_workflow_id: automation.action_config.n8n_workflow_id || '',
          response_message: automation.action_config.response_message || '',
          forward_to_n8n: automation.action_config.forward_to_n8n || false,
          variables: automation.action_config.variables || {}
        }
      });
    }
  }, [automation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.trigger_config.keywords.includes(newKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        trigger_config: {
          ...prev.trigger_config,
          keywords: [...prev.trigger_config.keywords, newKeyword.trim()]
        }
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      trigger_config: {
        ...prev.trigger_config,
        keywords: prev.trigger_config.keywords.filter(k => k !== keyword)
      }
    }));
  };

  const getTypeIcon = (type: AutomationType) => {
    switch (type) {
      case 'keyword':
        return <MessageSquare className="w-4 h-4" />;
      case 'webhook':
        return <Webhook className="w-4 h-4" />;
      case 'scheduled':
        return <Clock className="w-4 h-4" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bot className="w-5 h-5" />
          <span>{automation ? 'Editar Automação' : 'Nova Automação'}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Automação</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Resposta automática de boas-vindas"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o que esta automação faz..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="type">Tipo de Gatilho</Label>
              <Select
                value={formData.type}
                onValueChange={(value: AutomationType) => 
                  setFormData(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>Palavra-chave</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="webhook">
                    <div className="flex items-center space-x-2">
                      <Webhook className="w-4 h-4" />
                      <span>Webhook</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="scheduled">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>Agendada</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Configuração do Gatilho */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center space-x-2">
              {getTypeIcon(formData.type)}
              <span>Configuração do Gatilho</span>
            </h3>
            
            {formData.type === 'keyword' && (
              <div>
                <Label>Palavras-chave</Label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Digite uma palavra-chave"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    />
                    <Button type="button" onClick={addKeyword} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {formData.trigger_config.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.trigger_config.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                          <span>{keyword}</span>
                          <button
                            type="button"
                            onClick={() => removeKeyword(keyword)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {formData.type === 'webhook' && (
              <div>
                <Label htmlFor="webhook_url">URL do Webhook</Label>
                <Input
                  id="webhook_url"
                  value={formData.trigger_config.webhook_url}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    trigger_config: { ...prev.trigger_config, webhook_url: e.target.value }
                  }))}
                  placeholder="https://exemplo.com/webhook"
                  type="url"
                />
              </div>
            )}
            
            {formData.type === 'scheduled' && (
              <div>
                <Label htmlFor="schedule">Agendamento (Cron)</Label>
                <Input
                  id="schedule"
                  value={formData.trigger_config.schedule}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    trigger_config: { ...prev.trigger_config, schedule: e.target.value }
                  }))}
                  placeholder="0 9 * * * (todo dia às 9h)"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Use formato cron. Ex: "0 9 * * *" para todo dia às 9h
                </p>
              </div>
            )}
          </div>

          {/* Configuração da Ação */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Configuração da Ação</h3>
            
            <div>
              <Label htmlFor="response_message">Mensagem de Resposta (opcional)</Label>
              <Textarea
                id="response_message"
                value={formData.action_config.response_message}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  action_config: { ...prev.action_config, response_message: e.target.value }
                }))}
                placeholder="Mensagem que será enviada automaticamente..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="n8n_workflow_id">ID do Workflow n8n (opcional)</Label>
              <Input
                id="n8n_workflow_id"
                value={formData.action_config.n8n_workflow_id}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  action_config: { ...prev.action_config, n8n_workflow_id: e.target.value }
                }))}
                placeholder="workflow-123"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="forward_to_n8n"
                checked={formData.action_config.forward_to_n8n}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  action_config: { ...prev.action_config, forward_to_n8n: e.target.checked }
                }))}
                className="rounded"
              />
              <Label htmlFor="forward_to_n8n">Encaminhar para n8n</Label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {automation ? 'Atualizar' : 'Criar'} Automação
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AutomationForm;