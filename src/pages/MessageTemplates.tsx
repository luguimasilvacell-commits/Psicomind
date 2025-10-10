/**
 * Página de gerenciamento de templates de mensagens
 */
import React, { useState } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Copy, 
  Eye,
  Filter,
  Save,
  X
} from 'lucide-react';
import { useTemplates } from '../hooks/useTemplates';
import { MessageTemplate } from '../types/chat';

const MessageTemplates: React.FC = () => {
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
    previewTemplate,
    searchTemplates,
    extractVariables,
    replaceVariables
  } = useTemplates();

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [previewData, setPreviewData] = useState<{ template: MessageTemplate; variables: Record<string, string> } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: 'geral',
    variables: [] as string[]
  });

  // Filter templates based on search and category
  const filteredTemplates = React.useMemo(() => {
    let result = templates;
    
    if (searchTerm) {
      result = searchTemplates(searchTerm);
    }
    
    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter(template => template.category === selectedCategory);
    }
    
    return result;
  }, [templates, searchTerm, selectedCategory, searchTemplates]);

  const handleOpenModal = (template?: MessageTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        content: template.content,
        category: template.category,
        variables: extractVariables(template.content)
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        content: '',
        category: 'geral',
        variables: []
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setFormData({
      name: '',
      content: '',
      category: 'geral',
      variables: []
    });
  };

  const handleContentChange = (content: string) => {
    const variables = extractVariables(content);
    setFormData(prev => ({
      ...prev,
      content,
      variables
    }));
  };

  const handleSaveTemplate = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      return;
    }

    const templateData = {
      name: formData.name,
      content: formData.content,
      category: formData.category,
      variables: formData.variables
    };

    let success = false;
    if (editingTemplate) {
      success = await updateTemplate(editingTemplate.id, templateData) !== null;
    } else {
      success = await createTemplate(templateData) !== null;
    }

    if (success) {
      handleCloseModal();
    }
  };

  const handleDeleteTemplate = async (template: MessageTemplate) => {
    if (window.confirm(`Tem certeza que deseja excluir o template "${template.name}"?`)) {
      await deleteTemplate(template.id);
    }
  };

  const handleDuplicateTemplate = async (template: MessageTemplate) => {
    await duplicateTemplate(template.id);
  };

  const handlePreviewTemplate = (template: MessageTemplate) => {
    const variables = extractVariables(template.content);
    const defaultValues: Record<string, string> = {};
    
    variables.forEach(variable => {
      switch (variable.toLowerCase()) {
        case 'nome':
        case 'name':
          defaultValues[variable] = 'João Silva';
          break;
        case 'data':
        case 'date':
          defaultValues[variable] = new Date().toLocaleDateString('pt-BR');
          break;
        case 'hora':
        case 'time':
          defaultValues[variable] = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          break;
        default:
          defaultValues[variable] = `[${variable}]`;
      }
    });

    setPreviewData({ template, variables: defaultValues });
  };

  const renderPreviewModal = () => {
    if (!previewData) return null;

    const { template, variables } = previewData;
    const previewText = replaceVariables(template.content, variables);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Pré-visualização: {template.name}
            </h3>
            <button
              onClick={() => setPreviewData(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Variables */}
            {template.variables && template.variables.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Variáveis:</h4>
                <div className="grid grid-cols-2 gap-3">
                  {template.variables.map((variable) => (
                    <div key={variable}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {variable}
                      </label>
                      <input
                        type="text"
                        value={variables[variable] || ''}
                        onChange={(e) => setPreviewData(prev => prev ? {
                          ...prev,
                          variables: { ...prev.variables, [variable]: e.target.value }
                        } : null)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Pré-visualização:</h4>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-sm whitespace-pre-wrap">{previewText}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Templates de Mensagens
              </h1>
              <p className="text-sm text-gray-500">
                Gerencie templates para respostas rápidas
              </p>
            </div>
          </div>
          
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Template
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todas as categorias</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Nenhum template encontrado' 
                : 'Nenhum template criado'
              }
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedCategory !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Crie seu primeiro template para começar'
              }
            </p>
            {!searchTerm && selectedCategory === 'all' && (
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Template
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {template.name}
                      </h3>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {template.category}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {template.content}
                    </p>
                  </div>

                  {/* Variables */}
                  {template.variables && template.variables.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        Variáveis:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable) => (
                          <span
                            key={variable}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {variable}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePreviewTemplate(template)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        title="Pré-visualizar"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(template)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicateTemplate(template)}
                        className="p-1 text-gray-400 hover:text-green-600 rounded"
                        title="Duplicar"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <span className="text-xs text-gray-400">
                      {new Date(template.updated_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="template_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Template
                </label>
                <input
                  type="text"
                  id="template_name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Boas-vindas"
                />
              </div>

              <div>
                <label htmlFor="template_category" className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  id="template_category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="template_content" className="block text-sm font-medium text-gray-700 mb-2">
                  Conteúdo da Mensagem
                </label>
                <textarea
                  id="template_content"
                  value={formData.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite o conteúdo do template... Use {{variavel}} para criar variáveis"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use &#123;&#123;nome&#125;&#125; para criar variáveis que podem ser substituídas
                </p>
              </div>

              {/* Variables Preview */}
              {formData.variables.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Variáveis Detectadas
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {formData.variables.map((variable) => (
                      <span
                        key={variable}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {variable}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!formData.name.trim() || !formData.content.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingTemplate ? 'Atualizar' : 'Criar'} Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {renderPreviewModal()}
    </div>
  );
};

export default MessageTemplates;