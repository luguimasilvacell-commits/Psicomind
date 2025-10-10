import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Copy, 
  Eye, 
  MessageSquare,
  Filter,
  MoreVertical,
  Star,
  Clock,
  TrendingUp,
  BarChart3,
  Save,
  X
} from 'lucide-react';
import { useWhatsAppTemplates } from '../hooks/useWhatsAppTemplates';
import { toast } from 'sonner';
import { 
  WhatsAppMessageTemplate,
  WhatsAppTemplateCategory,
  WhatsAppTemplateVariable 
} from '../types/whatsapp';

export default function WhatsAppTemplates() {
  const {
    templates,
    categories,
    loading,
    error,
    selectedCategory,
    setSelectedCategory,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    useTemplate,
    searchTemplates,
    validateTemplate,
    clearError,
    getTemplateStats
  } = useWhatsAppTemplates();

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppMessageTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    content: '',
    category: 'general' as WhatsAppTemplateCategory,
    psychologist_id: '',
    is_active: true
  });

  // Get stats
  const stats = getTemplateStats();

  const handleCreateTemplate = async () => {
    const validation = validateTemplate(templateForm);
    
    if (validation.length > 0) {
      console.error('Validation errors:', validation);
      return;
    }

    try {
      const result = await createTemplate({
        name: templateForm.name,
        content: templateForm.content,
        category: templateForm.category
      });

      if (result) {
        setTemplateForm({
          name: '',
          content: '',
          category: 'general',
          psychologist_id: '',
          is_active: true
        });
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Erro ao criar template:', error);
    }
  };

  const handleEditTemplate = async () => {
    const validation = validateTemplate(templateForm);
    
    if (validation.length > 0) {
      console.error('Validation errors:', validation);
      return;
    }

    try {
      const result = await updateTemplate(selectedTemplate?.id!, {
        name: templateForm.name,
        content: templateForm.content,
        category: templateForm.category
      });

      if (result) {
        setShowEditModal(false);
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error('Erro ao atualizar template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      await deleteTemplate(templateId);
      toast.success('Template excluído com sucesso');
    } catch (error) {
      toast.error('Erro ao excluir template');
    }
  };

  const handleDuplicateTemplate = async (template: any) => {
    try {
      await duplicateTemplate(template.id);
      toast.success('Template duplicado com sucesso');
    } catch (error) {
      toast.error('Erro ao duplicar template');
    }
  };

  const handleUseTemplate = async (template: any) => {
    try {
      await useTemplate(template.id);
      toast.success('Template usado com sucesso');
    } catch (error) {
      toast.error('Erro ao usar template');
    }
  };

  const openEditModal = (template: any) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      content: template.content,
      category: template.category,
      psychologist_id: '',
      is_active: true
    });
    setShowEditModal(true);
  };

  const openPreviewModal = (template: any) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryLabels = {
    greeting: 'Saudação',
    appointment: 'Agendamento',
    reminder: 'Lembrete',
    follow_up: 'Acompanhamento',
    emergency: 'Emergência',
    general: 'Geral'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates de Mensagens</h1>
          <p className="text-gray-600">Gerencie seus templates de mensagens do WhatsApp</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Template</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-800">{error}</p>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Templates</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mais Usado</p>
              <p className="text-2xl font-bold text-gray-900">{stats.mostUsed?.[0]?.usage_count || 0}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Uso Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsage}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categorias</p>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.byCategory).length}</p>
            </div>
            <Filter className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Categoria:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as WhatsAppTemplateCategory | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="flex justify-between">
                <div className="h-8 bg-gray-200 rounded w-16"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))
        ) : filteredTemplates.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum template encontrado</h3>
            <p className="text-gray-600">Crie seu primeiro template para começar</p>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {categoryLabels[template.category] || template.category}
                  </span>
                </div>
                <div className="relative">
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {template.content}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>Usado {template.usage_count || 0} vezes</span>
                </div>
                {template.variables && template.variables.length > 0 && (
                  <span>{template.variables.length} variáveis</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openPreviewModal(template)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                    title="Visualizar"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(template)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicateTemplate(template)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                    title="Duplicar"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-100 rounded-lg"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => handleUseTemplate(template)}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Usar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Novo Template</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Template
                </label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Boas-vindas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as WhatsAppTemplateCategory })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conteúdo da Mensagem
                </label>
                <textarea
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite o conteúdo do template..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use &#123;&#123;variavel&#125;&#125; para criar variáveis
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTemplate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Criar Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {showEditModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Editar Template</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Template
                </label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as WhatsAppTemplateCategory })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conteúdo da Mensagem
                </label>
                <textarea
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Salvar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Template Modal */}
      {showPreviewModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Visualizar Template</h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">{selectedTemplate.name}</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {selectedTemplate.content}
                </p>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Categoria:</span>
                  <span>{categoryLabels[selectedTemplate.category] || selectedTemplate.category}</span>
                </div>
                <div className="flex justify-between">
                  <span>Usado:</span>
                  <span>{selectedTemplate.usage_count || 0} vezes</span>
                </div>
                {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                  <div className="flex justify-between">
                    <span>Variáveis:</span>
                    <span>{selectedTemplate.variables.map((v: any) => v.name).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  handleUseTemplate(selectedTemplate);
                  setShowPreviewModal(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Usar Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}