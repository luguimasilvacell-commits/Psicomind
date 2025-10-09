import { z } from 'zod'

// Schemas de validação
export const MessageTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['greeting', 'appointment', 'emergency', 'followup', 'general']),
  content: z.string(),
  variables: z.array(z.string()).optional(),
  conditions: z.object({
    sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']).optional(),
    dayOfWeek: z.array(z.number()).optional() // 0-6 (domingo-sábado)
  }).optional(),
  isActive: z.boolean().default(true),
  priority: z.number().default(0),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
})

export const TemplateUsageSchema = z.object({
  templateId: z.string(),
  userId: z.string().optional(),
  context: z.object({
    sentiment: z.string().optional(),
    riskLevel: z.string().optional(),
    originalMessage: z.string().optional(),
    variables: z.record(z.string()).optional()
  }),
  usedAt: z.date().default(() => new Date())
})

export const TemplateAnalyticsSchema = z.object({
  templateId: z.string(),
  totalUsage: z.number(),
  successRate: z.number(),
  avgResponseTime: z.number(),
  lastUsed: z.date(),
  userFeedback: z.array(z.object({
    rating: z.number().min(1).max(5),
    comment: z.string().optional(),
    date: z.date()
  }))
})

export type MessageTemplate = z.infer<typeof MessageTemplateSchema>
export type TemplateUsage = z.infer<typeof TemplateUsageSchema>
export type TemplateAnalytics = z.infer<typeof TemplateAnalyticsSchema>

export class TemplateService {
  private templates: Map<string, MessageTemplate> = new Map()
  private usage: TemplateUsage[] = []
  private analytics: Map<string, TemplateAnalytics> = new Map()

  constructor() {
    this.initializeDefaultTemplates()
  }

  private initializeDefaultTemplates() {
    const defaultTemplates: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Saudação Matinal',
        category: 'greeting',
        content: 'Bom dia, {name}! Como você está se sentindo hoje? Estou aqui para te ajudar.',
        variables: ['name'],
        conditions: {
          timeOfDay: 'morning'
        },
        isActive: true,
        priority: 1
      },
      {
        name: 'Saudação Vespertina',
        category: 'greeting',
        content: 'Boa tarde, {name}! Espero que seu dia esteja sendo produtivo. Em que posso ajudá-lo?',
        variables: ['name'],
        conditions: {
          timeOfDay: 'afternoon'
        },
        isActive: true,
        priority: 1
      },
      {
        name: 'Saudação Noturna',
        category: 'greeting',
        content: 'Boa noite, {name}! Como foi seu dia? Estou aqui se precisar conversar.',
        variables: ['name'],
        conditions: {
          timeOfDay: 'evening'
        },
        isActive: true,
        priority: 1
      },
      {
        name: 'Resposta Emergência',
        category: 'emergency',
        content: 'Entendo que você está passando por um momento difícil. Sua segurança é nossa prioridade. Se for uma emergência, procure ajuda imediata ligando para 188 (CVV) ou 192 (SAMU). Estou aqui para te apoiar.',
        conditions: {
          riskLevel: 'high'
        },
        isActive: true,
        priority: 10
      },
      {
        name: 'Agendamento de Consulta',
        category: 'appointment',
        content: 'Vou te ajudar a agendar uma consulta. Temos horários disponíveis em {availableDates}. Qual seria o melhor dia e horário para você?',
        variables: ['availableDates'],
        isActive: true,
        priority: 2
      },
      {
        name: 'Follow-up Positivo',
        category: 'followup',
        content: 'Que bom saber que você está se sentindo melhor! Continue cuidando de si mesmo. Lembre-se de que estou sempre aqui quando precisar.',
        conditions: {
          sentiment: 'positive'
        },
        isActive: true,
        priority: 1
      },
      {
        name: 'Apoio Emocional',
        category: 'general',
        content: 'Percebo que você pode estar passando por um momento desafiador. Seus sentimentos são válidos e é normal ter altos e baixos. Vamos conversar sobre isso?',
        conditions: {
          sentiment: 'negative',
          riskLevel: 'medium'
        },
        isActive: true,
        priority: 3
      },
      {
        name: 'Resposta Neutra',
        category: 'general',
        content: 'Entendo. Pode me contar mais sobre isso? Estou aqui para te ouvir e ajudar no que for possível.',
        conditions: {
          sentiment: 'neutral'
        },
        isActive: true,
        priority: 0
      }
    ]

    defaultTemplates.forEach(template => {
      const id = this.generateId()
      const fullTemplate: MessageTemplate = {
        ...template,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      this.templates.set(id, fullTemplate)
      
      // Inicializar analytics
      this.analytics.set(id, {
        templateId: id,
        totalUsage: 0,
        successRate: 0,
        avgResponseTime: 0,
        lastUsed: new Date(),
        userFeedback: []
      })
    })
  }

  private generateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    if (hour >= 18 && hour < 22) return 'evening'
    return 'night'
  }

  private getDayOfWeek(): number {
    return new Date().getDay()
  }

  // Buscar templates baseado em contexto
  findMatchingTemplates(context: {
    sentiment?: 'positive' | 'negative' | 'neutral'
    riskLevel?: 'low' | 'medium' | 'high'
    category?: string
    message?: string
  }): MessageTemplate[] {
    const currentTime = this.getTimeOfDay()
    const currentDay = this.getDayOfWeek()

    const matchingTemplates = Array.from(this.templates.values())
      .filter(template => {
        if (!template.isActive) return false

        const conditions = template.conditions
        if (!conditions) return true

        // Verificar sentimento
        if (conditions.sentiment && context.sentiment && conditions.sentiment !== context.sentiment) {
          return false
        }

        // Verificar nível de risco
        if (conditions.riskLevel && context.riskLevel && conditions.riskLevel !== context.riskLevel) {
          return false
        }

        // Verificar hora do dia
        if (conditions.timeOfDay && conditions.timeOfDay !== currentTime) {
          return false
        }

        // Verificar dia da semana
        if (conditions.dayOfWeek && !conditions.dayOfWeek.includes(currentDay)) {
          return false
        }

        return true
      })
      .filter(template => {
        // Filtrar por categoria se especificada
        if (context.category) {
          return template.category === context.category
        }
        return true
      })
      .sort((a, b) => b.priority - a.priority) // Ordenar por prioridade

    return matchingTemplates
  }

  // Buscar o melhor template para o contexto
  getBestTemplate(context: {
    sentiment?: 'positive' | 'negative' | 'neutral'
    riskLevel?: 'low' | 'medium' | 'high'
    category?: string
    message?: string
  }): MessageTemplate | null {
    const matchingTemplates = this.findMatchingTemplates(context)
    
    if (matchingTemplates.length === 0) {
      // Retornar template padrão
      return this.findMatchingTemplates({ sentiment: 'neutral' })[0] || null
    }

    // Retornar o template com maior prioridade
    return matchingTemplates[0]
  }

  // Processar template com variáveis
  processTemplate(template: MessageTemplate, variables: Record<string, string> = {}): string {
    let processedContent = template.content

    // Substituir variáveis
    if (template.variables) {
      template.variables.forEach(variable => {
        const value = variables[variable] || `{${variable}}`
        const regex = new RegExp(`\\{${variable}\\}`, 'g')
        processedContent = processedContent.replace(regex, value)
      })
    }

    return processedContent
  }

  // Registrar uso de template
  recordTemplateUsage(templateId: string, context: any, userId?: string) {
    const usage: TemplateUsage = {
      templateId,
      userId,
      context,
      usedAt: new Date()
    }

    this.usage.push(usage)

    // Atualizar analytics
    const analytics = this.analytics.get(templateId)
    if (analytics) {
      analytics.totalUsage++
      analytics.lastUsed = new Date()
      this.analytics.set(templateId, analytics)
    }
  }

  // Obter todos os templates
  getAllTemplates(): MessageTemplate[] {
    return Array.from(this.templates.values())
  }

  // Obter template por ID
  getTemplateById(id: string): MessageTemplate | null {
    return this.templates.get(id) || null
  }

  // Criar novo template
  createTemplate(templateData: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>): MessageTemplate {
    const id = this.generateId()
    const template: MessageTemplate = {
      ...templateData,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.templates.set(id, template)
    
    // Inicializar analytics
    this.analytics.set(id, {
      templateId: id,
      totalUsage: 0,
      successRate: 0,
      avgResponseTime: 0,
      lastUsed: new Date(),
      userFeedback: []
    })

    return template
  }

  // Atualizar template
  updateTemplate(id: string, updates: Partial<MessageTemplate>): MessageTemplate | null {
    const template = this.templates.get(id)
    if (!template) return null

    const updatedTemplate: MessageTemplate = {
      ...template,
      ...updates,
      id, // Manter ID original
      updatedAt: new Date()
    }

    this.templates.set(id, updatedTemplate)
    return updatedTemplate
  }

  // Deletar template
  deleteTemplate(id: string): boolean {
    const deleted = this.templates.delete(id)
    if (deleted) {
      this.analytics.delete(id)
    }
    return deleted
  }

  // Obter analytics de template
  getTemplateAnalytics(id: string): TemplateAnalytics | null {
    return this.analytics.get(id) || null
  }

  // Obter analytics de todos os templates
  getAllAnalytics(): TemplateAnalytics[] {
    return Array.from(this.analytics.values())
  }

  // Obter templates mais usados
  getMostUsedTemplates(limit: number = 10): TemplateAnalytics[] {
    return Array.from(this.analytics.values())
      .sort((a, b) => b.totalUsage - a.totalUsage)
      .slice(0, limit)
  }

  // Buscar templates por texto
  searchTemplates(query: string): MessageTemplate[] {
    const lowercaseQuery = query.toLowerCase()
    return Array.from(this.templates.values())
      .filter(template => 
        template.name.toLowerCase().includes(lowercaseQuery) ||
        template.content.toLowerCase().includes(lowercaseQuery) ||
        template.category.toLowerCase().includes(lowercaseQuery)
      )
  }

  // Sugerir resposta inteligente
  suggestResponse(context: {
    message: string
    sentiment?: 'positive' | 'negative' | 'neutral'
    riskLevel?: 'low' | 'medium' | 'high'
    userId?: string
    variables?: Record<string, string>
  }): {
    template: MessageTemplate
    processedContent: string
    confidence: number
  } | null {
    const template = this.getBestTemplate(context)
    if (!template) return null

    const processedContent = this.processTemplate(template, context.variables)
    
    // Calcular confiança baseada em correspondência de condições
    let confidence = 0.5 // Base
    
    if (template.conditions) {
      if (template.conditions.sentiment === context.sentiment) confidence += 0.2
      if (template.conditions.riskLevel === context.riskLevel) confidence += 0.3
    }

    // Registrar uso
    this.recordTemplateUsage(template.id, context, context.userId)

    return {
      template,
      processedContent,
      confidence: Math.min(confidence, 1.0)
    }
  }
}

// Instância singleton
export const templateService = new TemplateService()