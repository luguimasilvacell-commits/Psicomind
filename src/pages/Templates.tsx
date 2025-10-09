import React, { useState } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Copy, 
  TestTube, 
  BarChart3,
  MessageSquare,
  Clock,
  TrendingUp,
  Users,
  Star,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import { toast } from 'sonner'
import { useTemplates, MessageTemplate } from '../hooks/useTemplates'
import { CreateTemplateModal, EditTemplateModal, TestTemplateModal } from '../components/TemplateModals'

export default function Templates() {
  const {
    templates,
    filteredTemplates,
    categories,
    analytics,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    testTemplate,
    suggestResponse
  } = useTemplates()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Formulário para criar/editar template
  const [formData, setFormData] = useState({
    name: '',
    category: 'general' as MessageTemplate['category'],
    content: '',
    variables: [] as string[],
    conditions: {
      sentiment: undefined as 'positive' | 'negative' | 'neutral' | undefined,
      riskLevel: undefined as 'low' | 'medium' | 'high' | undefined,
      timeOfDay: undefined as 'morning' | 'afternoon' | 'evening' | 'night' | undefined
    },
    isActive: true,
    priority: 0
  })

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'general',
      content: '',
      variables: [],
      conditions: {
        sentiment: undefined,
        riskLevel: undefined,
        timeOfDay: undefined
      },
      isActive: true,
      priority: 0
    })
  }

  const handleCreateTemplate = async () => {
    try {
      await createTemplate({
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any)
      setShowCreateModal(false)
      resetForm()
    } catch (error) {
      console.error('Erro ao criar template:', error)
    }
  }

  const handleEditTemplate = async () => {
    if (!selectedTemplate) return
    
    try {
      await updateTemplate(selectedTemplate.id, formData)
      setShowEditModal(false)
      setSelectedTemplate(null)
      resetForm()
    } catch (error) {
      console.error('Erro ao atualizar template:', error)
    }
  }

  const handleDeleteTemplate = async (template: MessageTemplate) => {
    if (window.confirm(`Tem certeza que deseja deletar o template "${template.name}"?`)) {
      try {
        await deleteTemplate(template.id)
      } catch (error) {
        console.error('Erro ao deletar template:', error)
      }
    }
  }

  const handleCopyTemplate = (template: MessageTemplate) => {
    navigator.clipboard.writeText(template.content)
    toast.success('Conteúdo do template copiado!')
  }

  const openEditModal = (template: MessageTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      category: template.category,
      content: template.content,
      variables: template.variables || [],
      conditions: {
        sentiment: template.conditions?.sentiment,
        riskLevel: template.conditions?.riskLevel,
        timeOfDay: template.conditions?.timeOfDay
      },
      isActive: template.isActive,
      priority: template.priority
    })
    setShowEditModal(true)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'greeting': return <MessageSquare className="h-4 w-4" />
      case 'appointment': return <Clock className="h-4 w-4" />
      case 'emergency': return <AlertTriangle className="h-4 w-4" />
      case 'followup': return <TrendingUp className="h-4 w-4" />
      default: return <MessageSquare className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'greeting': return 'bg-blue-100 text-blue-800'
      case 'appointment': return 'bg-green-100 text-green-800'
      case 'emergency': return 'bg-red-100 text-red-800'
      case 'followup': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskLevelColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates de Resposta</h1>
          <p className="text-gray-600">Gerencie templates inteligentes para respostas automáticas</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Template</span>
        </button>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total Templates</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalTemplates}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Total de Usos</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalUsage}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-600">Taxa de Sucesso</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {Math.round(analytics.avgSuccessRate * 100)}%
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Mais Usado</span>
            </div>
            <p className="text-sm font-bold text-gray-900 mt-1">
              {analytics.mostUsedTemplates[0]?.templateId ? 
                templates.find(t => t.id === analytics.mostUsedTemplates[0].templateId)?.name || 'N/A'
                : 'N/A'
              }
            </p>
          </div>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filtro por categoria */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas as categorias</option>
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Controles de visualização */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <div className="grid grid-cols-2 gap-1 w-4 h-4">
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
              </div>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <div className="space-y-1 w-4 h-4">
                <div className="bg-current h-1 rounded-sm"></div>
                <div className="bg-current h-1 rounded-sm"></div>
                <div className="bg-current h-1 rounded-sm"></div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Templates */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${
              viewMode === 'list' ? 'flex items-center justify-between' : ''
            }`}
          >
            <div className={viewMode === 'list' ? 'flex-1' : ''}>
              {/* Header do template */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                    {getCategoryIcon(template.category)}
                    <span>{categories.find(c => c.value === template.category)?.label}</span>
                  </span>
                  {!template.isActive && (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs text-gray-500">{template.priority}</span>
                </div>
              </div>

              {/* Nome e conteúdo */}
              <h3 className="font-medium text-gray-900 mb-1">{template.name}</h3>
              <p className={`text-sm text-gray-600 ${viewMode === 'grid' ? 'line-clamp-2' : 'line-clamp-1'} mb-2`}>
                {template.content}
              </p>

              {/* Condições */}
              {template.conditions && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {template.conditions.sentiment && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                      Sentimento: {template.conditions.sentiment}
                    </span>
                  )}
                  {template.conditions.riskLevel && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getRiskLevelColor(template.conditions.riskLevel)}`}>
                      Risco: {template.conditions.riskLevel}
                    </span>
                  )}
                  {template.conditions.timeOfDay && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                      {template.conditions.timeOfDay}
                    </span>
                  )}
                </div>
              )}

              {/* Variáveis */}
              {template.variables && template.variables.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-gray-500">Variáveis: </span>
                  <span className="text-xs text-blue-600">
                    {template.variables.map(v => `{${v}}`).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className={`flex ${viewMode === 'list' ? 'space-x-2' : 'justify-between mt-3'}`}>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleCopyTemplate(template)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Copiar conteúdo"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedTemplate(template)
                    setShowTestModal(true)
                  }}
                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                  title="Testar template"
                >
                  <TestTube className="h-4 w-4" />
                </button>
                <button
                  onClick={() => openEditModal(template)}
                  className="p-1 text-gray-400 hover:text-yellow-600 transition-colors"
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Deletar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum template encontrado</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || selectedCategory 
              ? 'Tente ajustar os filtros de busca'
              : 'Comece criando seu primeiro template de resposta'
            }
          </p>
          {!searchQuery && !selectedCategory && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Criar Template</span>
            </button>
          )}
        </div>
      )}

      {/* Modais */}
      <CreateTemplateModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetForm()
        }}
        onSubmit={handleCreateTemplate}
        formData={formData}
        setFormData={setFormData}
        isLoading={isCreating}
      />

      <EditTemplateModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedTemplate(null)
          resetForm()
        }}
        onSubmit={handleEditTemplate}
        formData={formData}
        setFormData={setFormData}
        isLoading={isUpdating}
        template={selectedTemplate}
      />

      <TestTemplateModal
        isOpen={showTestModal}
        onClose={() => {
          setShowTestModal(false)
          setSelectedTemplate(null)
        }}
        template={selectedTemplate}
        onTest={testTemplate}
        isLoading={isLoading}
      />
    </div>
  )
}