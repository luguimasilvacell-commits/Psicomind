import React, { useState } from 'react';
import { 
  Bot, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Plus,
  Settings,
  Activity,
  Clock,
  MessageSquare,
  Webhook
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  Automation, 
  AutomationListProps,
  AutomationType,
  AutomationStatus 
} from '../../types/chat';

const AutomationList: React.FC<AutomationListProps> = ({
  automations,
  onEdit,
  onDelete,
  onToggleStatus,
  loading = false
}) => {
  const [selectedAutomation, setSelectedAutomation] = useState<string | null>(null);

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

  const getTypeLabel = (type: AutomationType) => {
    switch (type) {
      case 'keyword':
        return 'Palavra-chave';
      case 'webhook':
        return 'Webhook';
      case 'scheduled':
        return 'Agendada';
      default:
        return type;
    }
  };

  const getStatusColor = (status: AutomationStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: AutomationStatus) => {
    switch (status) {
      case 'active':
        return 'Ativa';
      case 'inactive':
        return 'Inativa';
      case 'paused':
        return 'Pausada';
      default:
        return status;
    }
  };

  const formatTriggerConfig = (automation: Automation) => {
    if (!automation.trigger_config) {
      return 'Configuração não definida';
    }
    
    switch (automation.type) {
      case 'keyword':
        return automation.trigger_config.keywords?.join(', ') || 'Nenhuma palavra-chave';
      case 'webhook':
        return automation.trigger_config.webhook_url || 'URL não configurada';
      case 'scheduled':
        return automation.trigger_config.schedule || 'Agendamento não configurado';
      default:
        return 'Configuração não definida';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (automations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bot className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma automação encontrada
          </h3>
          <p className="text-gray-500 text-center mb-6">
            Crie sua primeira automação para começar a automatizar suas conversas.
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Criar Automação
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {automations.map((automation) => (
        <Card 
          key={automation.id}
          className={`transition-all duration-200 hover:shadow-md ${
            selectedAutomation === automation.id ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  automation.status === 'active' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {getTypeIcon(automation.type)}
                </div>
                <div>
                  <CardTitle className="text-lg">{automation.name}</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(automation.type)}
                    </Badge>
                    <Badge className={`text-xs ${getStatusColor(automation.status)}`}>
                      {getStatusLabel(automation.status)}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleStatus(automation.id, automation.status)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  {automation.status === 'active' ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(automation)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(automation.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {automation.description && (
              <p className="text-gray-600 text-sm mb-3">
                {automation.description}
              </p>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Gatilho:</span>
                <span className="text-gray-900 font-medium">
                  {formatTriggerConfig(automation)}
                </span>
              </div>
              
              {automation.action_config?.response_message && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Resposta:</span>
                  <span className="text-gray-900 font-medium truncate max-w-xs">
                    {automation.action_config.response_message}
                  </span>
                </div>
              )}
              
              {automation.action_config?.n8n_workflow_id && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Workflow n8n:</span>
                  <span className="text-gray-900 font-medium">
                    {automation.action_config.n8n_workflow_id}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-gray-500">Criada em:</span>
                <span className="text-gray-900">
                  {new Date(automation.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AutomationList;