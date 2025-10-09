import React from 'react'
import { Send, Bot, User, MessageSquare, Settings, Zap, Brain, Phone, AlertTriangle, Heart, TrendingUp, ChevronDown, Users } from 'lucide-react'
import { supabase, type ChatHistorico, type Paciente } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { formatDate } from '../lib/utils'
import { toast } from 'sonner'
import ChatSettings from '../components/ChatSettings'
import PacienteSelectionModal from '../components/PacienteSelectionModal'
import { useChatAI } from '../hooks/useChatAI'

export default function Chat() {
  const { psicologo } = useAuthStore()
  const { 
    messages: aiMessages, 
    status, 
    loading: aiLoading,
    sendMessageToGemini, 
    processMessage,
    analyzeSentiment,
    clearMessages,
    addMessage,
    sendWhatsAppMessage
  } = useChatAI()
  
  const [inputMessage, setInputMessage] = React.useState('')
  const [chatHistory, setChatHistory] = React.useState<ChatHistorico[]>([])
  const [selectedChat, setSelectedChat] = React.useState<string | null>(null)
  const [showSettings, setShowSettings] = React.useState(false)
  const [sentimentAnalysis, setSentimentAnalysis] = React.useState<any>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  
  // Estados para conversa com pacientes
  const [chatMode, setChatMode] = React.useState<'ai' | 'patient'>('ai')
  const [selectedPaciente, setSelectedPaciente] = React.useState<Paciente | null>(null)
  const [showPacienteModal, setShowPacienteModal] = React.useState(false)
  const [showNewChatDropdown, setShowNewChatDropdown] = React.useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [aiMessages])

  React.useEffect(() => {
    loadChatHistory()
  }, [psicologo?.id])

  // Fechar dropdown quando clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showNewChatDropdown) {
        setShowNewChatDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNewChatDropdown])

  const loadChatHistory = async () => {
    if (!psicologo?.id) return

    try {
      const { data, error } = await supabase
        .from('chat_historico')
        .select('*')
        .eq('psicologo_id', psicologo.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setChatHistory(data || [])
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    }
  }

  const saveChatMessage = async (message: string, response: string) => {
    if (!psicologo?.id) return

    try {
      const { error } = await supabase
        .from('chat_historico')
        .insert({
          psicologo_id: psicologo.id,
          mensagem: message,
          resposta: response,
          tipo: 'assistente_ia'
        })

      if (error) throw error
      loadChatHistory()
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || aiLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')

    try {
      if (chatMode === 'patient' && selectedPaciente) {
        // Modo conversa com paciente
        addMessage({ role: 'user', content: userMessage })
        
        // Enviar mensagem via WhatsApp
        await sendWhatsAppMessage(selectedPaciente.telefone, userMessage)
        
        // Adicionar confirmação de envio
        addMessage({
          role: 'assistant',
          content: `Mensagem enviada para ${selectedPaciente.nome} via WhatsApp: "${userMessage}"`
        })
        
        toast.success('Mensagem enviada via WhatsApp')
      } else {
        // Modo conversa com IA (comportamento original)
        addMessage({ role: 'user', content: userMessage })

        // Processar mensagem com IA
        const response = await processMessage(userMessage)
        
        // Analisar sentimento da mensagem do usuário
        const sentiment = await analyzeSentiment(userMessage)
        setSentimentAnalysis(sentiment)

        // Salvar no histórico se não for um chat existente
        if (!selectedChat && psicologo?.id && response) {
          await saveChatMessage(userMessage, response)
        }
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      toast.error('Erro ao enviar mensagem')
    }
  }

  const simulateAIResponse = async (message: string): Promise<string> => {
    // Simular delay da API
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Respostas simuladas baseadas em palavras-chave
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('ansiedade') || lowerMessage.includes('ansioso')) {
      return 'A ansiedade é uma resposta natural do corpo, mas quando excessiva pode impactar significativamente a qualidade de vida. Algumas técnicas que podem ajudar incluem:\n\n• Respiração diafragmática\n• Mindfulness e meditação\n• Exercícios físicos regulares\n• Identificação e questionamento de pensamentos ansiosos\n\nRecomendo explorar essas técnicas com o paciente e considerar uma avaliação mais detalhada se os sintomas persistirem.'
    }

    if (lowerMessage.includes('depressão') || lowerMessage.includes('deprimido')) {
      return 'A depressão é um transtorno sério que requer atenção profissional. Alguns pontos importantes a considerar:\n\n• Avaliação de risco de autolesão\n• Histórico familiar e pessoal\n• Fatores desencadeantes\n• Rede de apoio social\n• Possível necessidade de encaminhamento psiquiátrico\n\nA terapia cognitivo-comportamental tem mostrado eficácia no tratamento da depressão, especialmente quando combinada com outras intervenções quando necessário.'
    }

    if (lowerMessage.includes('terapia') || lowerMessage.includes('sessão')) {
      return 'Para uma sessão terapêutica eficaz, considere:\n\n• Estabelecer rapport e ambiente seguro\n• Definir objetivos claros para a sessão\n• Usar técnicas apropriadas para o caso\n• Fazer anotações relevantes no prontuário\n• Planejar homework terapêutico se apropriado\n• Agendar próxima sessão\n\nLembre-se de sempre documentar adequadamente o progresso do paciente.'
    }

    if (lowerMessage.includes('técnica') || lowerMessage.includes('intervenção')) {
      return 'Algumas técnicas terapêuticas eficazes incluem:\n\n**Cognitivo-Comportamental:**\n• Reestruturação cognitiva\n• Exposição gradual\n• Registro de pensamentos\n\n**Humanística:**\n• Escuta ativa\n• Reflexão de sentimentos\n• Aceitação incondicional\n\n**Sistêmica:**\n• Genograma\n• Técnicas de comunicação\n• Intervenções familiares\n\nA escolha da técnica deve sempre considerar o perfil do paciente e o contexto terapêutico.'
    }

    // Resposta padrão
    return 'Entendo sua questão. Como assistente de IA para psicólogos, posso ajudar com:\n\n• Sugestões de técnicas terapêuticas\n• Orientações sobre documentação\n• Informações sobre transtornos mentais\n• Dicas para manejo de casos\n• Recursos para desenvolvimento profissional\n\nPoderia ser mais específico sobre o que gostaria de saber? Lembre-se de que minhas sugestões não substituem sua expertise clínica.'
  }

  const startNewChat = () => {
    clearMessages();
    setSelectedChat(null);
    setSentimentAnalysis(null);
    setChatMode('ai');
    setSelectedPaciente(null);
  }

  const startNewAIChat = () => {
    startNewChat();
    setChatMode('ai');
    setShowNewChatDropdown(false);
  }

  const startNewPatientChat = () => {
    setShowPacienteModal(true);
    setShowNewChatDropdown(false);
  }

  const handleSelectPaciente = async (paciente: Paciente) => {
    try {
      // Limpar chat atual
      clearMessages();
      setSelectedChat(null);
      setSentimentAnalysis(null);
      
      // Configurar modo paciente
      setChatMode('patient');
      setSelectedPaciente(paciente);
      
      // Enviar mensagem inicial via WhatsApp
      const initialMessage = `Olá ${paciente.nome}! Sou ${psicologo?.nome}, seu psicólogo. Como você está se sentindo hoje?`;
      
      // Adicionar mensagem ao chat local
      addMessage({
        role: 'assistant',
        content: `Mensagem enviada para ${paciente.nome} via WhatsApp: "${initialMessage}"`
      });
      
      // Enviar via WhatsApp
      await sendWhatsAppMessage(paciente.telefone, initialMessage);
      
      toast.success(`Conversa iniciada com ${paciente.nome}`);
    } catch (error) {
      console.error('Erro ao iniciar conversa com paciente:', error);
      toast.error('Erro ao iniciar conversa com paciente');
    }
  }

  const loadChat = (chat: ChatHistorico) => {
    setSelectedChat(chat.id);
    clearMessages();
    
    // Adicionar mensagens do histórico
    addMessage({
      content: chat.mensagem,
      role: 'user',
    });
    
    addMessage({
      content: chat.resposta,
      role: 'assistant',
    });
    
    setSentimentAnalysis(null);
  }

  const suggestions = [
    'Como lidar com pacientes com ansiedade?',
    'Técnicas para primeira sessão',
    'Documentação de prontuários',
    'Manejo de crises emocionais'
  ]

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Sidebar com histórico */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          {/* Nova Conversa Button with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNewChatDropdown(!showNewChatDropdown)}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Nova Conversa
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>
            
            {showNewChatDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={startNewAIChat}
                  className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
                >
                  <Brain className="h-4 w-4 mr-3 text-blue-600" />
                  <div>
                    <div className="font-medium text-gray-900">Nova Conversa com IA</div>
                    <div className="text-sm text-gray-500">Conversar com o assistente psicológico</div>
                  </div>
                </button>
                <button
                  onClick={startNewPatientChat}
                  className="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <Users className="h-4 w-4 mr-3 text-green-600" />
                  <div>
                    <div className="font-medium text-gray-900">Conversa com Paciente</div>
                    <div className="text-sm text-gray-500">Iniciar conversa via WhatsApp</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Histórico de Conversas</h3>
          <div className="space-y-2">
            {chatHistory.map((chat) => (
              <button
                key={chat.id}
                onClick={() => loadChat(chat)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedChat === chat.id
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <p className="text-sm font-medium text-gray-900 truncate">
                  {chat.mensagem.substring(0, 50)}...
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(chat.created_at)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Status das Integrações */}
        <div className="p-4 border-t border-gray-200">
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status das Integrações</h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-600">
                  <Brain className="h-4 w-4 mr-2" />
                  <span>Gemini AI</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${status.gemini ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`text-xs ${status.gemini ? 'text-green-600' : 'text-red-600'}`}>
                    {status.gemini ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>WhatsApp</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${status.whatsapp ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`text-xs ${status.whatsapp ? 'text-green-600' : 'text-red-600'}`}>
                    {status.whatsapp ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Análise de Sentimentos */}
            {sentimentAnalysis && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <h5 className="text-xs font-medium text-gray-700 mb-2">Análise Emocional</h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Estado:</span>
                    <span className="font-medium">{sentimentAnalysis.emotionalState}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Risco:</span>
                    <span className={`font-medium ${
                      sentimentAnalysis.riskLevel === 'high' ? 'text-red-600' :
                      sentimentAnalysis.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {sentimentAnalysis.riskLevel === 'high' ? 'Alto' :
                       sentimentAnalysis.riskLevel === 'medium' ? 'Médio' : 'Baixo'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Confiança:</span>
                    <span className="font-medium">{Math.round(sentimentAnalysis.confidence * 100)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Área principal do chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {chatMode === 'patient' && selectedPaciente ? (
                <>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Conversa com {selectedPaciente.nome}
                    </h2>
                    <p className="text-sm text-gray-500">
                      WhatsApp: {selectedPaciente.telefone} • Via Evolution API
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <Bot className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Assistente IA</h2>
                    <p className="text-sm text-gray-500">Seu assistente para prática clínica</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {chatMode === 'patient' && selectedPaciente && (
                <button
                  onClick={startNewChat}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Voltar para IA
                </button>
              )}
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {aiMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Olá! Sou seu assistente de IA
              </h3>
              <p className="text-gray-500 mb-6 max-w-md">
                Posso ajudar com técnicas terapêuticas, documentação, orientações clínicas e muito mais.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(suggestion)}
                    className="p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    <div className="flex items-center">
                      <Zap className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-sm text-gray-700">{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {aiMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-3' : 'mr-3'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' 
                          ? 'bg-blue-600' 
                          : 'bg-gray-100'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="h-5 w-5 text-white" />
                        ) : (
                          <Bot className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Indicadores de sentimentos */}
                      {message.sentiment && message.role === 'assistant' && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex items-center space-x-3 text-xs">
                            <div className="flex items-center space-x-1">
                              <Heart className="h-3 w-3" />
                              <span>{message.sentiment.emotionalState}</span>
                            </div>
                            {message.sentiment.riskLevel === 'high' && (
                              <div className="flex items-center space-x-1 text-red-600">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Alto Risco</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <TrendingUp className="h-3 w-3" />
                              <span>{Math.round(message.sentiment.confidence * 100)}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Metadata da IA */}
                      {message.metadata && message.role === 'assistant' && (
                        <div className="mt-1 text-xs text-gray-400">
                          <span>{message.metadata.model}</span>
                          {message.metadata.responseTime && (
                            <span> • {message.metadata.responseTime}ms</span>
                          )}
                        </div>
                      )}
                      
                      <p className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="flex mr-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Bot className="h-5 w-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="bg-gray-100 px-4 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Digite sua pergunta..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={aiLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || aiLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          
          {/* Status da IA */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              {status.gemini && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>IA Ativa</span>
                </div>
              )}
              {status.whatsapp && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>WhatsApp Conectado</span>
                </div>
              )}
              {!status.gemini && !status.whatsapp && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Modo Simulação</span>
                </div>
              )}
            </div>
            
            <p className="text-xs text-gray-400">
              {status.gemini ? 'IA Real Ativa' : 'Configure a IA nas configurações'}
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Configurações */}
      <ChatSettings 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
      
      {/* Modal de Seleção de Paciente */}
      <PacienteSelectionModal
        isOpen={showPacienteModal}
        onClose={() => setShowPacienteModal(false)}
        onSelectPaciente={handleSelectPaciente}
      />
    </div>
  )
}