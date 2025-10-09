import React, { useState } from 'react'
import { 
  Search, 
  Filter, 
  Calendar, 
  MessageSquare, 
  User, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Heart, 
  Download,
  Eye,
  Trash2,
  Archive,
  Star,
  MoreVertical,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from 'sonner'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sentiment?: {
    emotional_state: string
    risk_level: 'low' | 'medium' | 'high'
    confidence: number
  }
  metadata?: {
    model?: string
    responseTime?: number
    templateUsed?: string
  }
}

interface ChatSession {
  id: string
  title: string
  startTime: Date
  endTime?: Date
  messageCount: number
  participantName?: string
  participantPhone?: string
  messages: ChatMessage[]
  tags: string[]
  isArchived: boolean
  isStarred: boolean
  summary?: string
  avgSentiment?: {
    emotional_state: string
    risk_level: 'low' | 'medium' | 'high'
  }
}

// Mock data para demonstração
const mockChatSessions: ChatSession[] = [
  {
    id: '1',
    title: 'Sessão com Maria Silva',
    startTime: new Date('2024-01-15T10:00:00'),
    endTime: new Date('2024-01-15T10:45:00'),
    messageCount: 12,
    participantName: 'Maria Silva',
    participantPhone: '+55 11 99999-9999',
    messages: [
      {
        id: '1',
        role: 'user',
        content: 'Olá, estou me sentindo muito ansiosa hoje',
        timestamp: new Date('2024-01-15T10:00:00'),
        sentiment: {
          emotional_state: 'ansiedade',
          risk_level: 'medium',
          confidence: 0.85
        }
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Entendo que você está se sentindo ansiosa. Pode me contar um pouco mais sobre o que está causando essa ansiedade?',
        timestamp: new Date('2024-01-15T10:01:00'),
        metadata: {
          model: 'gemini-pro',
          responseTime: 1200,
          templateUsed: 'Resposta Empática'
        }
      }
    ],
    tags: ['ansiedade', 'primeira-consulta'],
    isArchived: false,
    isStarred: true,
    summary: 'Paciente relatou ansiedade relacionada ao trabalho. Aplicadas técnicas de respiração.',
    avgSentiment: {
      emotional_state: 'ansiedade',
      risk_level: 'medium'
    }
  },
  {
    id: '2',
    title: 'Acompanhamento João Santos',
    startTime: new Date('2024-01-14T14:30:00'),
    endTime: new Date('2024-01-14T15:15:00'),
    messageCount: 8,
    participantName: 'João Santos',
    participantPhone: '+55 11 88888-8888',
    messages: [],
    tags: ['acompanhamento', 'depressão'],
    isArchived: false,
    isStarred: false,
    summary: 'Sessão de acompanhamento. Paciente demonstrou melhora significativa.',
    avgSentiment: {
      emotional_state: 'melancolia',
      risk_level: 'low'
    }
  }
]

export default function ChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>(mockChatSessions)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  
  // Filtros
  const [filters, setFilters] = useState({
    dateRange: { start: '', end: '' },
    participant: '',
    tags: [] as string[],
    sentimentRisk: '' as '' | 'low' | 'medium' | 'high',
    isStarred: false,
    isArchived: false
  })

  const filteredSessions = sessions.filter(session => {
    // Busca por texto
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = session.title.toLowerCase().includes(query)
      const matchesParticipant = session.participantName?.toLowerCase().includes(query)
      const matchesTags = session.tags.some(tag => tag.toLowerCase().includes(query))
      const matchesMessages = session.messages.some(msg => 
        msg.content.toLowerCase().includes(query)
      )
      
      if (!matchesTitle && !matchesParticipant && !matchesTags && !matchesMessages) {
        return false
      }
    }

    // Filtro por participante
    if (filters.participant && !session.participantName?.toLowerCase().includes(filters.participant.toLowerCase())) {
      return false
    }

    // Filtro por risco de sentimento
    if (filters.sentimentRisk && session.avgSentiment?.risk_level !== filters.sentimentRisk) {
      return false
    }

    // Filtro por favoritos
    if (filters.isStarred && !session.isStarred) {
      return false
    }

    // Filtro por arquivados
    if (filters.isArchived !== session.isArchived) {
      return false
    }

    // Filtro por data
    if (filters.dateRange.start) {
      const startDate = new Date(filters.dateRange.start)
      if (session.startTime < startDate) {
        return false
      }
    }

    if (filters.dateRange.end) {
      const endDate = new Date(filters.dateRange.end)
      if (session.startTime > endDate) {
        return false
      }
    }

    return true
  })

  const handleToggleStar = (sessionId: string) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, isStarred: !session.isStarred }
        : session
    ))
  }

  const handleToggleArchive = (sessionId: string) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, isArchived: !session.isArchived }
        : session
    ))
    toast.success('Sessão arquivada com sucesso')
  }

  const handleDeleteSession = (sessionId: string) => {
    if (window.confirm('Tem certeza que deseja deletar esta sessão? Esta ação não pode ser desfeita.')) {
      setSessions(prev => prev.filter(session => session.id !== sessionId))
      toast.success('Sessão deletada com sucesso')
    }
  }

  const handleExportSession = (session: ChatSession) => {
    const data = {
      title: session.title,
      participant: session.participantName,
      startTime: session.startTime,
      endTime: session.endTime,
      messages: session.messages,
      summary: session.summary,
      tags: session.tags
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-session-${session.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Sessão exportada com sucesso')
  }

  const getSentimentColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getSentimentIcon = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'high': return <AlertTriangle className="h-3 w-3" />
      case 'medium': return <TrendingUp className="h-3 w-3" />
      case 'low': return <Heart className="h-3 w-3" />
      default: return <MessageSquare className="h-3 w-3" />
    }
  }

  const formatDuration = (start: Date, end?: Date) => {
    if (!end) return 'Em andamento'
    
    const duration = end.getTime() - start.getTime()
    const minutes = Math.floor(duration / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}min`
    }
    return `${minutes}min`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Conversas</h1>
          <p className="text-gray-600">Gerencie e analise suas sessões de chat</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Total de Sessões</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{sessions.length}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Tempo Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {sessions.reduce((total, session) => {
              if (session.endTime) {
                const duration = session.endTime.getTime() - session.startTime.getTime()
                return total + Math.floor(duration / (1000 * 60))
              }
              return total
            }, 0)}min
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-gray-600">Favoritas</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {sessions.filter(s => s.isStarred).length}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-gray-600">Alto Risco</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {sessions.filter(s => s.avgSentiment?.risk_level === 'high').length}
          </p>
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por participante, conteúdo, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filtros expandidos */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data Início</label>
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Participante</label>
                <input
                  type="text"
                  placeholder="Nome do participante"
                  value={filters.participant}
                  onChange={(e) => setFilters(prev => ({ ...prev, participant: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Nível de Risco</label>
                <select
                  value={filters.sentimentRisk}
                  onChange={(e) => setFilters(prev => ({ ...prev, sentimentRisk: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="low">Baixo</option>
                  <option value="medium">Médio</option>
                  <option value="high">Alto</option>
                </select>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.isStarred}
                    onChange={(e) => setFilters(prev => ({ ...prev, isStarred: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600">Favoritas</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.isArchived}
                    onChange={(e) => setFilters(prev => ({ ...prev, isArchived: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600">Arquivadas</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Sessões */}
      <div className="space-y-4">
        {filteredSessions.map(session => (
          <div key={session.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium text-gray-900">{session.title}</h3>
                    {session.isStarred && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                    {session.isArchived && (
                      <Archive className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{session.participantName}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{session.startTime.toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(session.startTime, session.endTime)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{session.messageCount} mensagens</span>
                    </div>
                  </div>

                  {/* Tags e Sentimento */}
                  <div className="flex items-center space-x-2 mt-2">
                    {session.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                    {session.avgSentiment && (
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getSentimentColor(session.avgSentiment.risk_level)}`}>
                        {getSentimentIcon(session.avgSentiment.risk_level)}
                        <span>{session.avgSentiment.emotional_state}</span>
                      </span>
                    )}
                  </div>

                  {/* Resumo */}
                  {session.summary && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {session.summary}
                    </p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Ver mensagens"
                  >
                    {expandedSession === session.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleToggleStar(session.id)}
                    className={`p-2 transition-colors ${session.isStarred ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                    title={session.isStarred ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    <Star className={`h-4 w-4 ${session.isStarred ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleExportSession(session)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    title="Exportar sessão"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleArchive(session.id)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title={session.isArchived ? 'Desarquivar' : 'Arquivar'}
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Deletar sessão"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mensagens expandidas */}
            {expandedSession === session.id && session.messages.length > 0 && (
              <div className="border-t border-gray-200 bg-gray-50 p-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {session.messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-xs ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                            {message.timestamp.toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          {message.sentiment && (
                            <span className={`inline-flex items-center space-x-1 px-1 py-0.5 rounded text-xs ${
                              message.role === 'user' ? 'bg-blue-500 text-blue-100' : getSentimentColor(message.sentiment.risk_level)
                            }`}>
                              {getSentimentIcon(message.sentiment.risk_level)}
                              <span>{message.sentiment.emotional_state}</span>
                            </span>
                          )}
                        </div>
                        {message.metadata?.templateUsed && (
                          <div className="text-xs text-gray-400 mt-1">
                            Template: {message.metadata.templateUsed}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma sessão encontrada</h3>
          <p className="text-gray-600">
            {searchQuery || Object.values(filters).some(f => f) 
              ? 'Tente ajustar os filtros de busca'
              : 'Suas conversas aparecerão aqui quando você começar a usar o chat'
            }
          </p>
        </div>
      )}
    </div>
  )
}