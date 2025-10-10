import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  QrCode, 
  Settings, 
  Clock, 
  Bell, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Power,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { toast } from 'sonner';

export default function WhatsAppConfig() {
  const {
    isConnected,
    isConnecting,
    qrCode,
    clientInfo,
    config,
    error,
    connectionStatus,
    connect,
    disconnect,
    updateConfig,
    refreshQRCode,
    clearError
  } = useWhatsApp();

  const [activeTab, setActiveTab] = useState('connection');
  const [configForm, setConfigForm] = useState({
    autoReply: false,
    autoReplyMessage: '',
    businessHours: {
      enabled: false,
      start: '09:00',
      end: '18:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    },
    webhookUrl: '',
    maxRetries: 3,
    retryDelay: 5000
  });

  useEffect(() => {
    if (config) {
      setConfigForm(config);
    }
  }, [config]);

  const handleConnect = async () => {
    try {
      await connect();
      toast.success('Conectando ao WhatsApp...');
    } catch (error) {
      toast.error('Erro ao conectar ao WhatsApp');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success('Desconectado do WhatsApp');
    } catch (error) {
      toast.error('Erro ao desconectar do WhatsApp');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await updateConfig(configForm);
      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className="h-5 w-5" />;
      case 'connecting': return <RefreshCw className="h-5 w-5 animate-spin" />;
      case 'disconnected': return <WifiOff className="h-5 w-5" />;
      default: return <WifiOff className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuração WhatsApp</h1>
          <p className="text-gray-600">Configure sua integração com o WhatsApp Web</p>
        </div>
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="font-medium capitalize">{connectionStatus}</span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'connection', label: 'Conexão', icon: Smartphone },
            { id: 'settings', label: 'Configurações', icon: Settings },
            { id: 'automation', label: 'Automação', icon: Bell },
            { id: 'security', label: 'Segurança', icon: Shield }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Connection Tab */}
        {activeTab === 'connection' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Connection Status */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Status da Conexão</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
                    {getStatusIcon()}
                    <span className="font-medium capitalize">{connectionStatus}</span>
                  </div>
                </div>

                {clientInfo && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Número:</span>
                      <span className="font-medium">{clientInfo.number}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Nome:</span>
                      <span className="font-medium">{clientInfo.name}</span>
                    </div>
                  </>
                )}

                <div className="pt-4 space-y-2">
                  {!isConnected ? (
                    <button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isConnecting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Conectando...</span>
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4" />
                          <span>Conectar</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleDisconnect}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2"
                    >
                      <Power className="h-4 w-4" />
                      <span>Desconectar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <QrCode className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">QR Code</h3>
                </div>
                <button
                  onClick={refreshQRCode}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col items-center space-y-4">
                {qrCode ? (
                  <>
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                      <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      Escaneie este QR Code com seu WhatsApp para conectar
                    </p>
                  </>
                ) : (
                  <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">QR Code será exibido aqui</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Settings className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Configurações Gerais</h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL do Webhook
                </label>
                <input
                  type="url"
                  value={configForm.webhookUrl}
                  onChange={(e) => setConfigForm({ ...configForm, webhookUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://seu-webhook.com/whatsapp"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Máximo de Tentativas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={configForm.maxRetries}
                    onChange={(e) => setConfigForm({ ...configForm, maxRetries: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delay entre Tentativas (ms)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={configForm.retryDelay}
                    onChange={(e) => setConfigForm({ ...configForm, retryDelay: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSaveConfig}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Salvar Configurações</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Automation Tab */}
        {activeTab === 'automation' && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Bell className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Automação</h3>
            </div>

            <div className="space-y-6">
              {/* Auto Reply */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Resposta Automática</h4>
                  <p className="text-sm text-gray-500">Enviar resposta automática para novas mensagens</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.autoReply}
                    onChange={(e) => setConfigForm({ ...configForm, autoReply: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {configForm.autoReply && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensagem de Resposta Automática
                  </label>
                  <textarea
                    value={configForm.autoReplyMessage}
                    onChange={(e) => setConfigForm({ ...configForm, autoReplyMessage: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Olá! Obrigado por entrar em contato. Responderemos em breve."
                  />
                </div>
              )}

              {/* Business Hours */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Horário Comercial</h4>
                  <p className="text-sm text-gray-500">Definir horários de funcionamento</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.businessHours.enabled}
                    onChange={(e) => setConfigForm({
                      ...configForm,
                      businessHours: { ...configForm.businessHours, enabled: e.target.checked }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {configForm.businessHours.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horário de Início
                    </label>
                    <input
                      type="time"
                      value={configForm.businessHours.start}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        businessHours: { ...configForm.businessHours, start: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horário de Fim
                    </label>
                    <input
                      type="time"
                      value={configForm.businessHours.end}
                      onChange={(e) => setConfigForm({
                        ...configForm,
                        businessHours: { ...configForm.businessHours, end: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleSaveConfig}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Salvar Automação</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Shield className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Segurança</h3>
            </div>

            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <h4 className="text-sm font-medium text-yellow-800">Importante</h4>
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                  Mantenha sua sessão do WhatsApp segura. Não compartilhe o QR Code com terceiros.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Sessão Ativa</h4>
                    <p className="text-sm text-gray-500">Sua sessão está protegida</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Criptografia</h4>
                    <p className="text-sm text-gray-500">Mensagens criptografadas de ponta a ponta</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Webhook Seguro</h4>
                    <p className="text-sm text-gray-500">Conexão HTTPS obrigatória</p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}