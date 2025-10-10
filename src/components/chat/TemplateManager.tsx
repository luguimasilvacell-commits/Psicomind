import React, { useState } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Edit, 
  Trash2, 
  Copy,
  Search,
  Filter,
  Tag
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { useTemplates } from '../../hooks/useTemplates';
import { MessageTemplate, TemplateCategory } from '../../types/chat';
import { toast } from 'sonner';

interface TemplateFormData {
  name: string;
  content: string;
  category: TemplateCategory;
  variables: string[];
}

const TemplateManager: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    content: '',
    category: 'greeting',
    variables: []
  });

  const {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate
  } = useTemplates();

  // Filtrar templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Estatísticas por categoria
  const stats = {
    total: templates.length,
    greeting: templates.filter(t => t.category === 'greeting').length,
    appointment: templates.filter(t => t.category === 'appointment').length,
    reminder: templates.filter(t => t.category === 'reminder').length,
    followup: templates.filter(t => t.category === 'followup').length,
    general: templates.filter(t => t.category === 'general').length
  };

  const resetForm = () => {
    setFormData({
      name: '',
      content: '',
      category: 'greeting',
      variables: []
    });
    setEditingTemplate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.content.trim()) {
      toast.error('Nome e conteúdo são obrigatórios');
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, formData);
        toast.success('Template atualizado com sucesso!');
      } else {
        await createTemplate(formData);
        toast.success('Template criado com sucesso!');
      }
      
      setShowForm(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar template');
    }
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      category: template.category,
      variables: template.variables || []
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este template?')) return;

    try {
      await deleteTemplate(id);
      toast.success('Template deletado com sucesso!');
    } catch (error) {
      toast.error('Erro ao deletar template');
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Template copiado para a área de transferência!');
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    return matches ? matches.map(match => match.slice(2, -2)) : [];
  };

  const handleContentChange = (content: string) => {
    const variables = extractVariables(content);
    setFormData(prev => ({ ...prev, content, variables }));
  };

  const getCategoryLabel = (category: TemplateCategory): string => {
    const labels = {
      greeting: 'Saudação',
      appointment: 'Agendamento',
      reminder: 'Lembrete',
      followup: 'Acompanhamento',
      general: 'Geral'
    };
    return labels[category];
  };

  const getCategoryColor = (category: TemplateCategory): string => {
    const colors = {
      greeting: 'bg-green-100 text-green-800',
      appointment: 'bg-blue-100 text-blue-800',
      reminder: 'bg-yellow-100 text-yellow-800',
      followup: 'bg-purple-100 text-purple-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[category];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Templates de Mensagem</h2>
            <p className="text-gray-600">Gerencie seus templates de mensagem</p>
          </div>
        </div>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do template"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as TemplateCategory }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="greeting">Saudação</option>
                    <option value="appointment">Agendamento</option>
                    <option value="reminder">Lembrete</option>
                    <option value="followup">Acompanhamento</option>
                    <option value="general">Geral</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Conteúdo</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Digite o conteúdo do template. Use {{variavel}} para variáveis dinâmicas."
                  rows={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use &#123;&#123;nome&#125;&#125; para criar variáveis dinâmicas
                </p>
              </div>
              
              {formData.variables.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Variáveis Detectadas</label>
                  <div className="flex flex-wrap gap-2">
                    {formData.variables.map((variable, index) => (
                      <Badge key={index} variant="outline">
                        <Tag className="w-3 h-3 mr-1" />
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {editingTemplate ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-600">Total</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.greeting}</p>
            <p className="text-sm text-gray-600">Saudação</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.appointment}</p>
            <p className="text-sm text-gray-600">Agendamento</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.reminder}</p>
            <p className="text-sm text-gray-600">Lembrete</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.followup}</p>
            <p className="text-sm text-gray-600">Acompanhamento</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-600">{stats.general}</p>
            <p className="text-sm text-gray-600">Geral</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as TemplateCategory | 'all')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Todas as categorias</option>
                <option value="greeting">Saudação</option>
                <option value="appointment">Agendamento</option>
                <option value="reminder">Lembrete</option>
                <option value="followup">Acompanhamento</option>
                <option value="general">Geral</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm || categoryFilter !== 'all' 
                ? 'Nenhum template encontrado com os filtros aplicados'
                : 'Nenhum template criado ainda'
              }
            </p>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge className={`mt-2 ${getCategoryColor(template.category)}`}>
                      {getCategoryLabel(template.category)}
                    </Badge>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(template.content)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {template.content}
                    </p>
                  </div>
                  
                  {template.variables && template.variables.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Variáveis:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    Criado em {new Date(template.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TemplateManager;