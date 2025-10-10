import React, { useState } from 'react';
import { 
  MessageSquare, 
  Bot, 
  BarChart3, 
  FileText,
  Settings,
  Users
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import ChatInterface from '../components/chat/ChatInterface';
import AutomationList from '../components/chat/AutomationList';
import AutomationForm from '../components/chat/AutomationForm';
import TemplateManager from '../components/chat/TemplateManager';
import MetricsDashboard from '../components/chat/MetricsDashboard';
import { useAutomations } from '../hooks/useAutomations';
import { useChat } from '../hooks/useChat';
import { useSocket } from '../hooks/useSocket';
import { Automation, AutomationStatus } from '../types/chat';
import { toast } from 'sonner';

const Chat: React.FC = () => {
  const [showAutomationForm, setShowAutomationForm] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  const { 
    automations, 
    loading: automationsLoading,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation
  } = useAutomations();

  const { conversations, messages } = useChat();
  const { connectionStatus } = useSocket();

  // Estatísticas rápidas
  const stats = {
    activeConversations: conversations.filter(c => c.status === 'active').length,
    totalMessages: messages.length,
    activeAutomations: automations.filter(a => a.status === 'active').length,
    connectionStatus
  };

  const handleCreateAutomation = async (automationData: Omit<Automation, 'id' | 'psychologist_id' | 'created_at' | 'updated_at'>) => {
    try {
      await createAutomation(automationData);
      setShowAutomationForm(false);
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
      setShowAutomationForm(false);
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
    setShowAutomationForm(true);
  };

  if (showAutomationForm) {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">
            {editingAutomation ? 'Editar Automação' : 'Nova Automação'}
          </h1>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <AutomationForm
            automation={editingAutomation || undefined}
            onSubmit={editingAutomation ? handleUpdateAutomation : handleCreateAutomation}
            onCancel={() => {
              setShowAutomationForm(false);
              setEditingAutomation(null);
            }}
            loading={automationsLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">Chat & Automações</h1>
            
            {/* Status de Conexão */}
            <Badge 
              variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
              className="flex items-center space-x-1"
            >
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="capitalize">{connectionStatus}</span>
            </Badge>
          </div>
          
          {/* Estatísticas Rápidas */}
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{stats.activeConversations} conversas ativas</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageSquare className="w-4 h-4" />
              <span>{stats.totalMessages} mensagens</span>
            </div>
            <div className="flex items-center space-x-1">
              <Bot className="w-4 h-4" />
              <span>{stats.activeAutomations} automações ativas</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="chat" className="h-full flex flex-col">
          <div className="border-b border-gray-200 px-6">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="chat" className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Chat</span>
              </TabsTrigger>
              <TabsTrigger value="automations" className="flex items-center space-x-2">
                <Bot className="w-4 h-4" />
                <span>Automações</span>
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Templates</span>
              </TabsTrigger>
              <TabsTrigger value="metrics" className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Métricas</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="chat" className="h-full m-0">
              <ChatInterface />
            </TabsContent>

            <TabsContent value="automations" className="h-full m-0 overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Automações</h2>
                    <p className="text-gray-600">Gerencie suas automações de chat</p>
                  </div>
                  <Button onClick={() => setShowAutomationForm(true)}>
                    <Bot className="w-4 h-4 mr-2" />
                    Nova Automação
                  </Button>
                </div>

                <AutomationList
                  automations={automations}
                  onEdit={handleEditAutomation}
                  onDelete={handleDeleteAutomation}
                  onToggleStatus={handleToggleStatus}
                  loading={automationsLoading}
                />
              </div>
            </TabsContent>

            <TabsContent value="templates" className="h-full m-0 overflow-auto">
              <div className="p-6">
                <TemplateManager />
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="h-full m-0 overflow-auto">
              <div className="p-6">
                <MetricsDashboard />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Chat;