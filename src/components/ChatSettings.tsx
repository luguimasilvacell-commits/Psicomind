import React from 'react'
import { X, Brain, Phone, Key, Settings, AlertCircle, CheckCircle, Save, TestTube, User, Smartphone, Wifi, WifiOff, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import { useChatAI } from '../hooks/useChatAI'

interface ChatSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export default function ChatSettings({ isOpen, onClose }: ChatSettingsProps) {
  const { 
    config, 
    status, 
    loading: aiLoading,
    configureGemini,
    configureWhatsApp,
    connectWhatsAppInstance,
    refetchGeminiStatus,
    refetchWhatsAppStatus
  } = useChatAI()
  
  const [localConfig, setLocalConfig] = React.useState(config)
  const [qrCode, setQrCode] = React.useState<string | null>(null)
  const [showQrCode, setShowQrCode] = React.useState(false)

  React.useEffect(() => {
    setLocalConfig(config)
  }, [config])

  const handleSaveGeminiConfig = async () => {
    if (!localConfig.geminiApiKey) {
      toast.error('Insira a API Key do Gemini')
      return
    }

    try {
      await configureGemini(
        localConfig.geminiApiKey,
        localConfig.aiModel,
        localConfig.temperature,
        localConfig.maxTokens
      )
    } catch (error) {
      console.error('Erro ao salvar configuração do Gemini:', error)
    }
  }

  const handleSaveWhatsAppConfig = async () => {
    if (!localConfig.evolutionServerUrl || !localConfig.evolutionApiKey || !localConfig.evolutionInstanceName) {
      toast.error('Insira a URL do servidor, API Key e nome da instância')
      return
    }

    try {
      await configureWhatsApp(
        localConfig.evolutionServerUrl,
        localConfig.evolutionApiKey,
        localConfig.evolutionInstanceName,
        localConfig.evolutionWebhookUrl || `${window.location.origin}/api/webhook/whatsapp`
      )
    } catch (error) {
      console.error('Erro ao salvar configuração da Evolution API:', error)
    }
  }

  const testGeminiConnection = async () => {
    if (!localConfig.geminiApiKey) {
      toast.error('Insira a API Key do Gemini')
      return
    }

    try {
      // Primeiro configurar com a chave atual
      const configResult = await configureGemini(
        localConfig.geminiApiKey,
        localConfig.aiModel,
        localConfig.temperature,
        localConfig.maxTokens
      )
      
      if (configResult) {
        // Depois verificar o status
        await refetchGeminiStatus()
        if (status.gemini) {
          toast.success('Conexão com Gemini estabelecida!')
        } else {
          // Buscar detalhes do erro
          const statusResponse = await fetch('/api/ai/gemini/status')
          const statusData = await statusResponse.json()
          const errorMessage = statusData.error || 'Verifique a API Key'
          toast.error(`Erro na conexão: ${errorMessage}`)
        }
      }
    } catch (error) {
      toast.error('Erro ao testar conexão com Gemini')
    }
  }

  const testWhatsAppConnection = async () => {
    if (!localConfig.evolutionServerUrl || !localConfig.evolutionApiKey || !localConfig.evolutionInstanceName) {
      toast.error('Insira a URL do servidor, API Key e nome da instância')
      return
    }

    try {
      await refetchWhatsAppStatus()
      if (status.whatsapp) {
        toast.success('Conexão com Evolution API estabelecida!')
      } else {
        toast.error('Erro ao conectar com Evolution API. Verifique as credenciais.')
      }
    } catch (error) {
      toast.error('Erro ao testar conexão com Evolution API')
    }
  }

  const handleConnectWhatsApp = async () => {
    if (!localConfig.evolutionServerUrl || !localConfig.evolutionApiKey || !localConfig.evolutionInstanceName) {
      toast.error('Configure primeiro a Evolution API')
      return
    }

    try {
      const result = await connectWhatsAppInstance()
      if (result.success && result.qrCode) {
        setQrCode(result.qrCode)
        setShowQrCode(true)
        toast.success('QR Code gerado! Escaneie com seu WhatsApp.')
      } else {
        toast.error(result.error || 'Erro ao gerar QR Code')
      }
    } catch (error) {
      toast.error('Erro ao conectar instância WhatsApp')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Configurações do Chat IA</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Configurações do Gemini */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Google Gemini</h3>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Como obter sua API Key:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Acesse <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
                    <li>Faça login com sua conta Google</li>
                    <li>Clique em "Create API Key"</li>
                    <li>Copie a chave gerada</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key do Gemini
                </label>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    value={localConfig.geminiApiKey}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                    placeholder="AIza..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={testGeminiConnection}
                    disabled={aiLoading}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                  >
                    <TestTube className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleSaveGeminiConfig}
                    disabled={aiLoading}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modelo
                  </label>
                  <select
                    value={localConfig.aiModel}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, aiModel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="gemini-pro">Gemini Pro</option>
                    <option value="gemini-pro-vision">Gemini Pro Vision</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={localConfig.maxTokens}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, maxTokens: Number(e.target.value) }))}
                    min="100"
                    max="4000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperature ({localConfig.temperature})
                  </label>
                  <input
                    type="range"
                    value={localConfig.temperature}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                    min="0"
                    max="1"
                    step="0.1"
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Conservador</span>
                    <span>Criativo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Configurações do WhatsApp (Evolution API) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-medium text-gray-900">WhatsApp Evolution API</h3>
              </div>
              {status.whatsapp && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-700">Ativo</span>
                </div>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">Configuração da Evolution API:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Configure sua instância da <a href="https://doc.evolution-api.com/v1/pt/get-started/introduction" target="_blank" rel="noopener noreferrer" className="underline">Evolution API</a></li>
                    <li>Obtenha a URL do servidor e API Key</li>
                    <li>Defina um nome único para sua instância</li>
                    <li>Configure o webhook (opcional)</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL do Servidor
                </label>
                <input
                  type="url"
                  value={localConfig.evolutionServerUrl || ''}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, evolutionServerUrl: e.target.value }))}
                  placeholder="https://sua-evolution-api.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    value={localConfig.evolutionApiKey || ''}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, evolutionApiKey: e.target.value }))}
                    placeholder="sua-api-key"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <button
                    onClick={testWhatsAppConnection}
                    disabled={aiLoading}
                    className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                  >
                    <TestTube className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleSaveWhatsAppConfig}
                    disabled={aiLoading}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Instância
                </label>
                <input
                  type="text"
                  value={localConfig.evolutionInstanceName || ''}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, evolutionInstanceName: e.target.value }))}
                  placeholder="psicomind-instance"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL (Opcional)
                </label>
                <input
                  type="url"
                  value={localConfig.evolutionWebhookUrl || ''}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, evolutionWebhookUrl: e.target.value }))}
                  placeholder={`${window.location.origin}/api/webhook/whatsapp`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Botão para conectar instância */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleConnectWhatsApp}
                  disabled={aiLoading || !status.whatsapp}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Phone className="h-4 w-4" />
                  <span>Conectar WhatsApp (Gerar QR Code)</span>
                </button>
                {!status.whatsapp && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Configure e salve primeiro a Evolution API para conectar
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status das Integrações */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Status das Integrações</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Gemini</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${status.gemini ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={`text-sm ${status.gemini ? 'text-green-600' : 'text-red-600'}`}>
                      {aiLoading ? 'Verificando...' : status.gemini ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                </div>
                {status.gemini && (
                  <div className="mt-2 text-xs text-gray-600">
                    <p>Modelo: {config.aiModel}</p>
                    <p>Max Tokens: {config.maxTokens}</p>
                    <p>Temperature: {config.temperature}</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-5 w-5 text-green-600" />
                    <span className="font-medium">WhatsApp Evolution API</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {status.whatsapp ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${status.whatsapp ? 'text-green-600' : 'text-red-600'}`}>
                      {aiLoading ? 'Verificando...' : status.whatsapp ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                </div>
                
                {status.whatsapp && config.evolutionInstanceName && (
                  <div className="space-y-3">
                    {/* Informações da Instância */}
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <Smartphone className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-sm text-gray-900">Instância Ativa</span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Nome:</span>
                          <span className="font-medium text-gray-900">{config.evolutionInstanceName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className={`font-medium ${status.whatsappInstanceStatus === 'open' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {status.whatsappInstanceStatus === 'open' ? 'Conectado' : status.whatsappInstanceStatus || 'Verificando...'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Servidor:</span>
                          <span className="font-medium text-gray-900 truncate max-w-32" title={config.evolutionServerUrl}>
                            {config.evolutionServerUrl?.replace(/^https?:\/\//, '')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Controles da Instância */}
                    <div className="flex space-x-2">
                      <button
                        onClick={handleConnectWhatsApp}
                        disabled={aiLoading}
                        className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 text-xs font-medium flex items-center justify-center space-x-1"
                      >
                        <Phone className="h-3 w-3" />
                        <span>Reconectar</span>
                      </button>
                      <button
                        onClick={() => {
                          // Função para desconectar (implementar se necessário)
                          toast.info('Funcionalidade de desconexão em desenvolvimento')
                        }}
                        disabled={aiLoading}
                        className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 text-xs font-medium flex items-center justify-center space-x-1"
                      >
                        <PowerOff className="h-3 w-3" />
                        <span>Desconectar</span>
                      </button>
                    </div>
                  </div>
                )}
                
                {!status.whatsapp && (
                  <div className="text-center py-2">
                    <div className="text-xs text-gray-500 mb-2">
                      Configure a Evolution API para conectar sua instância WhatsApp
                    </div>
                    <button
                      onClick={testWhatsAppConnection}
                      disabled={aiLoading || !config.evolutionServerUrl || !config.evolutionApiKey}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                      Testar Conexão
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Use os botões <Save className="inline h-3 w-3" /> para salvar e <TestTube className="inline h-3 w-3" /> para testar cada integração
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Modal do QR Code */}
      {showQrCode && qrCode && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Conectar WhatsApp</h3>
              <button
                onClick={() => {
                  setShowQrCode(false)
                  setQrCode(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="text-center">
              <div className="mb-4">
                <img 
                  src={qrCode} 
                  alt="QR Code WhatsApp" 
                  className="mx-auto border border-gray-200 rounded-lg"
                  style={{ maxWidth: '250px', maxHeight: '250px' }}
                />
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <p className="font-medium">Como conectar:</p>
                <ol className="list-decimal list-inside text-left space-y-1">
                  <li>Abra o WhatsApp no seu celular</li>
                  <li>Toque em "Mais opções" (⋮) &gt; "Aparelhos conectados"</li>
                  <li>Toque em "Conectar um aparelho"</li>
                  <li>Escaneie este QR code</li>
                </ol>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Importante:</strong> Este QR code expira em alguns minutos. 
                  Se não conseguir conectar, gere um novo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}