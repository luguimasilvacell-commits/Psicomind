import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Tipos
export interface MessageTemplate {
  id: string
  name: string
  category: 'greeting' | 'appointment' | 'emergency' | 'followup' | 'general'
  content: string
  variables?: string[]
  conditions?: {
    sentiment?: 'positive' | 'negative' | 'neutral'
    riskLevel?: 'low' | 'medium' | 'high'
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
    dayOfWeek?: number[]
  }
  isActive: boolean
  priority: number
  createdAt: Date
  updatedAt: Date
}

export interface TemplateAnalytics {
  templateId: string
  totalUsage: number
  successRate: number
  avgResponseTime: number
  lastUsed: Date
  userFeedback: Array<{
    rating: number
    comment?: string
    date: Date
  }>
}

export interface TemplateSuggestion {
  template: MessageTemplate
  processedContent: string
  confidence: number
  metadata: {
    templateId: string
    templateName: string
    category: string
    usedVariables: string[]
  }
}

export interface TemplateCategory {
  value: string
  label: string
  description: string
}

// Cliente API
const apiClient = {
  // Buscar todos os templates
  getAllTemplates: async (): Promise<MessageTemplate[]> => {
    const response = await fetch('/api/templates')
    if (!response.ok) {
      throw new Error('Erro ao buscar templates')
    }
    const data = await response.json()
    return data.data
  },

  // Buscar template por ID
  getTemplateById: async (id: string): Promise<MessageTemplate> => {
    const response = await fetch(`/api/templates/${id}`)
    if (!response.ok) {
      throw new Error('Template não encontrado')
    }
    const data = await response.json()
    return data.data
  },

  // Criar template
  createTemplate: async (template: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<MessageTemplate> => {
    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(template)
    })
    if (!response.ok) {
      throw new Error('Erro ao criar template')
    }
    const data = await response.json()
    return data.data
  },

  // Atualizar template
  updateTemplate: async (id: string, updates: Partial<MessageTemplate>): Promise<MessageTemplate> => {
    const response = await fetch(`/api/templates/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })
    if (!response.ok) {
      throw new Error('Erro ao atualizar template')
    }
    const data = await response.json()
    return data.data
  },

  // Deletar template
  deleteTemplate: async (id: string): Promise<void> => {
    const response = await fetch(`/api/templates/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error('Erro ao deletar template')
    }
  },

  // Buscar templates
  searchTemplates: async (params: {
    query: string
    category?: string
    sentiment?: string
    riskLevel?: string
  }): Promise<MessageTemplate[]> => {
    const response = await fetch('/api/templates/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
    if (!response.ok) {
      throw new Error('Erro ao buscar templates')
    }
    const data = await response.json()
    return data.data
  },

  // Sugerir resposta
  suggestResponse: async (context: {
    message: string
    sentiment?: 'positive' | 'negative' | 'neutral'
    riskLevel?: 'low' | 'medium' | 'high'
    userId?: string
    variables?: Record<string, string>
  }): Promise<TemplateSuggestion | null> => {
    const response = await fetch('/api/templates/suggest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(context)
    })
    if (!response.ok) {
      throw new Error('Erro ao sugerir resposta')
    }
    const data = await response.json()
    return data.data
  },

  // Buscar templates por contexto
  getMatchingTemplates: async (context: {
    sentiment?: string
    riskLevel?: string
    category?: string
  }): Promise<MessageTemplate[]> => {
    const encodedContext = encodeURIComponent(JSON.stringify(context))
    const response = await fetch(`/api/templates/matching/${encodedContext}`)
    if (!response.ok) {
      throw new Error('Erro ao buscar templates por contexto')
    }
    const data = await response.json()
    return data.data
  },

  // Obter analytics
  getAnalyticsOverview: async (): Promise<{
    totalTemplates: number
    totalUsage: number
    avgSuccessRate: number
    mostUsedTemplates: TemplateAnalytics[]
  }> => {
    const response = await fetch('/api/templates/analytics/overview')
    if (!response.ok) {
      throw new Error('Erro ao buscar analytics')
    }
    const data = await response.json()
    return data.data
  },

  // Obter analytics de template específico
  getTemplateAnalytics: async (id: string): Promise<TemplateAnalytics> => {
    const response = await fetch(`/api/templates/analytics/${id}`)
    if (!response.ok) {
      throw new Error('Erro ao buscar analytics do template')
    }
    const data = await response.json()
    return data.data
  },

  // Listar categorias
  getCategories: async (): Promise<TemplateCategory[]> => {
    const response = await fetch('/api/templates/categories/list')
    if (!response.ok) {
      throw new Error('Erro ao buscar categorias')
    }
    const data = await response.json()
    return data.data
  },

  // Testar template
  testTemplate: async (id: string, variables: Record<string, string> = {}): Promise<{
    original: string
    processed: string
    variables: string[]
    providedVariables: Record<string, string>
  }> => {
    const response = await fetch(`/api/templates/${id}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ variables })
    })
    if (!response.ok) {
      throw new Error('Erro ao testar template')
    }
    const data = await response.json()
    return data.data
  }
}

export function useTemplates() {
  const queryClient = useQueryClient()
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  // Queries
  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: apiClient.getAllTemplates
  })

  const categoriesQuery = useQuery({
    queryKey: ['template-categories'],
    queryFn: apiClient.getCategories
  })

  const analyticsQuery = useQuery({
    queryKey: ['template-analytics'],
    queryFn: apiClient.getAnalyticsOverview
  })

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: apiClient.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['template-analytics'] })
      toast.success('Template criado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar template: ${error.message}`)
    }
  })

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<MessageTemplate> }) =>
      apiClient.updateTemplate(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template atualizado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar template: ${error.message}`)
    }
  })

  const deleteTemplateMutation = useMutation({
    mutationFn: apiClient.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['template-analytics'] })
      toast.success('Template deletado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao deletar template: ${error.message}`)
    }
  })

  const searchTemplatesMutation = useMutation({
    mutationFn: apiClient.searchTemplates
  })

  const suggestResponseMutation = useMutation({
    mutationFn: apiClient.suggestResponse
  })

  const testTemplateMutation = useMutation({
    mutationFn: ({ id, variables }: { id: string; variables: Record<string, string> }) =>
      apiClient.testTemplate(id, variables)
  })

  // Funções auxiliares
  const createTemplate = async (template: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    return createTemplateMutation.mutateAsync(template)
  }

  const updateTemplate = async (id: string, updates: Partial<MessageTemplate>) => {
    return updateTemplateMutation.mutateAsync({ id, updates })
  }

  const deleteTemplate = async (id: string) => {
    return deleteTemplateMutation.mutateAsync(id)
  }

  const searchTemplates = async (params: {
    query: string
    category?: string
    sentiment?: string
    riskLevel?: string
  }) => {
    return searchTemplatesMutation.mutateAsync(params)
  }

  const suggestResponse = async (context: {
    message: string
    sentiment?: 'positive' | 'negative' | 'neutral'
    riskLevel?: 'low' | 'medium' | 'high'
    userId?: string
    variables?: Record<string, string>
  }) => {
    return suggestResponseMutation.mutateAsync(context)
  }

  const testTemplate = async (id: string, variables: Record<string, string> = {}) => {
    return testTemplateMutation.mutateAsync({ id, variables })
  }

  // Templates filtrados
  const filteredTemplates = templatesQuery.data?.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = !selectedCategory || template.category === selectedCategory
    
    return matchesSearch && matchesCategory
  }) || []

  // Templates por categoria
  const templatesByCategory = templatesQuery.data?.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = []
    }
    acc[template.category].push(template)
    return acc
  }, {} as Record<string, MessageTemplate[]>) || {}

  return {
    // Dados
    templates: templatesQuery.data || [],
    filteredTemplates,
    templatesByCategory,
    categories: categoriesQuery.data || [],
    analytics: analyticsQuery.data,
    selectedTemplate,
    searchQuery,
    selectedCategory,

    // Estados de loading
    isLoading: templatesQuery.isLoading,
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending,
    isSearching: searchTemplatesMutation.isPending,
    isSuggesting: suggestResponseMutation.isPending,
    isTesting: testTemplateMutation.isPending,

    // Funções
    createTemplate,
    updateTemplate,
    deleteTemplate,
    searchTemplates,
    suggestResponse,
    testTemplate,
    setSelectedTemplate,
    setSearchQuery,
    setSelectedCategory,

    // Refetch
    refetchTemplates: templatesQuery.refetch,
    refetchAnalytics: analyticsQuery.refetch,

    // Resultados de mutations
    searchResults: searchTemplatesMutation.data,
    suggestion: suggestResponseMutation.data,
    testResult: testTemplateMutation.data
  }
}