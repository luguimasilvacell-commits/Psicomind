import React, { useState } from 'react'
import { X, Plus, Minus, TestTube, Save, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { MessageTemplate } from '../hooks/useTemplates'

interface TemplateFormData {
  name: string
  category: MessageTemplate['category']
  content: string
  variables: string[]
  conditions: {
    sentiment?: 'positive' | 'negative' | 'neutral'
    riskLevel?: 'low' | 'medium' | 'high'
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
  }
  isActive: boolean
  priority: number
}

interface CreateTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TemplateFormData) => Promise<void>
  formData: TemplateFormData
  setFormData: React.Dispatch<React.SetStateAction<TemplateFormData>>
  isLoading: boolean
}

interface EditTemplateModalProps extends CreateTemplateModalProps {
  template: MessageTemplate | null
}

interface TestTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  template: MessageTemplate | null
  onTest: (templateId: string, variables: Record<string, string>) => Promise<any>
  isLoading: boolean
}

export function CreateTemplateModal({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isLoading
}: CreateTemplateModalProps) {
  const [newVariable, setNewVariable] = useState('')

  const addVariable = () => {
    if (newVariable.trim() && !formData.variables.includes(newVariable.trim())) {
      setFormData(prev => ({
        ...prev,
        variables: [...prev.variables, newVariable.trim()]
      }))
      setNewVariable('')
    }
  }

  const removeVariable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.content.trim()) {
      toast.error('Nome e conteúdo são obrigatórios')
      return
    }
    await onSubmit(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Criar Novo Template</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Template *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Saudação Matinal"
              required
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as MessageTemplate['category'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="general">Geral</option>
              <option value="greeting">Saudação</option>
              <option value="appointment">Agendamento</option>
              <option value="emergency">Emergência</option>
              <option value="followup">Acompanhamento</option>
            </select>
          </div>

          {/* Conteúdo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conteúdo do Template *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Olá {nome}, como você está se sentindo hoje?"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Use &#123;variavel&#125; para inserir variáveis dinâmicas
            </p>
          </div>

          {/* Variáveis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Variáveis
            </label>
            <div className="space-y-2">
              {formData.variables.map((variable, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    &#123;{variable}&#125;
                  </span>
                  <button
                    type="button"
                    onClick={() => removeVariable(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  placeholder="Nome da variável"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVariable())}
                />
                <button
                  type="button"
                  onClick={addVariable}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Condições */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condições de Uso
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Sentimento</label>
                <select
                  value={formData.conditions.sentiment || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    conditions: {
                      ...prev.conditions,
                      sentiment: e.target.value as any || undefined
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Qualquer</option>
                  <option value="positive">Positivo</option>
                  <option value="neutral">Neutro</option>
                  <option value="negative">Negativo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Nível de Risco</label>
                <select
                  value={formData.conditions.riskLevel || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    conditions: {
                      ...prev.conditions,
                      riskLevel: e.target.value as any || undefined
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Qualquer</option>
                  <option value="low">Baixo</option>
                  <option value="medium">Médio</option>
                  <option value="high">Alto</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Período do Dia</label>
                <select
                  value={formData.conditions.timeOfDay || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    conditions: {
                      ...prev.conditions,
                      timeOfDay: e.target.value as any || undefined
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Qualquer</option>
                  <option value="morning">Manhã</option>
                  <option value="afternoon">Tarde</option>
                  <option value="evening">Noite</option>
                  <option value="night">Madrugada</option>
                </select>
              </div>
            </div>
          </div>

          {/* Configurações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioridade
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">0 = menor prioridade, 10 = maior prioridade</p>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Template ativo
              </label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Criar Template</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function EditTemplateModal({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isLoading,
  template
}: EditTemplateModalProps) {
  const [newVariable, setNewVariable] = useState('')

  const addVariable = () => {
    if (newVariable.trim() && !formData.variables.includes(newVariable.trim())) {
      setFormData(prev => ({
        ...prev,
        variables: [...prev.variables, newVariable.trim()]
      }))
      setNewVariable('')
    }
  }

  const removeVariable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.content.trim()) {
      toast.error('Nome e conteúdo são obrigatórios')
      return
    }
    await onSubmit(formData)
  }

  if (!isOpen || !template) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Editar Template</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Mesmo conteúdo do CreateTemplateModal, mas com título "Editar" */}
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Template *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Saudação Matinal"
              required
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as MessageTemplate['category'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="general">Geral</option>
              <option value="greeting">Saudação</option>
              <option value="appointment">Agendamento</option>
              <option value="emergency">Emergência</option>
              <option value="followup">Acompanhamento</option>
            </select>
          </div>

          {/* Conteúdo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conteúdo do Template *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Olá {nome}, como você está se sentindo hoje?"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Use &#123;variavel&#125; para inserir variáveis dinâmicas
            </p>
          </div>

          {/* Variáveis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Variáveis
            </label>
            <div className="space-y-2">
              {formData.variables.map((variable, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    &#123;{variable}&#125;
                  </span>
                  <button
                    type="button"
                    onClick={() => removeVariable(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  placeholder="Nome da variável"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVariable())}
                />
                <button
                  type="button"
                  onClick={addVariable}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Condições */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condições de Uso
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Sentimento</label>
                <select
                  value={formData.conditions.sentiment || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    conditions: {
                      ...prev.conditions,
                      sentiment: e.target.value as any || undefined
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Qualquer</option>
                  <option value="positive">Positivo</option>
                  <option value="neutral">Neutro</option>
                  <option value="negative">Negativo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Nível de Risco</label>
                <select
                  value={formData.conditions.riskLevel || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    conditions: {
                      ...prev.conditions,
                      riskLevel: e.target.value as any || undefined
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Qualquer</option>
                  <option value="low">Baixo</option>
                  <option value="medium">Médio</option>
                  <option value="high">Alto</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Período do Dia</label>
                <select
                  value={formData.conditions.timeOfDay || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    conditions: {
                      ...prev.conditions,
                      timeOfDay: e.target.value as any || undefined
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Qualquer</option>
                  <option value="morning">Manhã</option>
                  <option value="afternoon">Tarde</option>
                  <option value="evening">Noite</option>
                  <option value="night">Madrugada</option>
                </select>
              </div>
            </div>
          </div>

          {/* Configurações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioridade
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">0 = menor prioridade, 10 = maior prioridade</p>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="isActiveEdit"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActiveEdit" className="text-sm text-gray-700">
                Template ativo
              </label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function TestTemplateModal({
  isOpen,
  onClose,
  template,
  onTest,
  isLoading
}: TestTemplateModalProps) {
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<string>('')
  const [isTestLoading, setIsTestLoading] = useState(false)

  React.useEffect(() => {
    if (template && template.variables) {
      const initialVariables: Record<string, string> = {}
      template.variables.forEach(variable => {
        initialVariables[variable] = ''
      })
      setVariables(initialVariables)
    }
  }, [template])

  const handleTest = async () => {
    if (!template) return
    
    setIsTestLoading(true)
    try {
      const result = await onTest(template.id, variables)
      setTestResult(result.processedContent || template.content)
      toast.success('Template testado com sucesso!')
    } catch (error) {
      console.error('Erro ao testar template:', error)
      toast.error('Erro ao testar template')
    } finally {
      setIsTestLoading(false)
    }
  }

  const processContent = () => {
    if (!template) return ''
    
    let content = template.content
    Object.entries(variables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `{${key}}`)
    })
    return content
  }

  if (!isOpen || !template) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Testar Template</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações do template */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">{template.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{template.content}</p>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Categoria:</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {template.category}
              </span>
            </div>
          </div>

          {/* Variáveis */}
          {template.variables && template.variables.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valores das Variáveis
              </label>
              <div className="space-y-3">
                {template.variables.map(variable => (
                  <div key={variable}>
                    <label className="block text-xs text-gray-600 mb-1">
                      &#123;{variable}&#125;
                    </label>
                    <input
                      type="text"
                      value={variables[variable] || ''}
                      onChange={(e) => setVariables(prev => ({
                        ...prev,
                        [variable]: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Valor para ${variable}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview do Resultado
            </label>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {processContent()}
              </p>
            </div>
          </div>

          {/* Resultado do teste */}
          {testResult && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resultado do Teste
              </label>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Teste realizado com sucesso</span>
                </div>
                <p className="text-sm text-green-700 whitespace-pre-wrap">
                  {testResult}
                </p>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={handleTest}
              disabled={isTestLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isTestLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              <span>Testar Template</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}