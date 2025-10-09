/**
 * Página de Configuração do WhatsApp
 * Sistema de Chat WhatsApp
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Wifi, WifiOff, QrCode, Save, TestTube, RefreshCw, Eye, EyeOff, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';

interface ConfiguracaoWhatsApp {
  id?: string;
  evolution_api_url: string;
  evolution_api_key: string;
  instance_name: string;
  webhook_url: string;
  webhook_secret: string;
  ativo: boolean;
  status_conexao?: string;
  hasApiKey?: boolean;
}

interface StatusInstancia {
  state: string;
  qrcode?: string;
  phone?: string;
}

export default function ConfiguracaoWhatsApp() {
  const navigate = useNavigate();
  const [configuracao, setConfiguracao] = useState<ConfiguracaoWhatsApp>({
    evolution_api_url: '',
    evolution_api_key: '',
    instance_name: '',
    webhook_url: '',
    webhook_secret: '',
    ativo: true
  });
  
  const [carregando, setCarregando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [qrCodeVisible, setQrCodeVisible] = useState(false);
  const [statusInstancia, setStatusInstancia] = useState<StatusInstancia | null>(null);

  // Funções utilitárias
  const gerarWebhookUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/webhook`;
  };

  const gerarWebhookSecret = () => {
    const secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setConfiguracao(prev => ({ ...prev, webhook_secret: secret }));
  };

  // Carregar configuração existente e verificar status
  useEffect(() => {
    carregarConfiguracao();
  }, []);

  // Verificar status automaticamente após carregar configuração
  useEffect(() => {
    console.log('🔍 Verificando condições para verificação automática:', {
      hasInstanceName: !!configuracao.instance_name,
      hasApiUrl: !!configuracao.evolution_api_url,
      hasApiKey: configuracao.hasApiKey,
      instanceName: configuracao.instance_name
    });
    
    if (configuracao.instance_name && configuracao.evolution_api_url && configuracao.hasApiKey) {
      console.log('🔄 Verificando status automaticamente para instância:', configuracao.instance_name);
      verificarStatusAutomatico();
    } else {
      console.log('⚠️ Verificação automática não executada - campos obrigatórios faltando');
    }
  }, [configuracao.instance_name, configuracao.evolution_api_url, configuracao.hasApiKey]);

  const carregarConfiguracao = async () => {
    try {
      console.log('🔄 Carregando configuração do WhatsApp...');
      const { token } = useAuthStore.getState();
      if (!token) {
        console.error('❌ Token não encontrado para carregar configuração');
        return;
      }
      
      const response = await fetch('/api/chat/config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Resposta do carregamento de configuração:', {
        status: response.status,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Dados de configuração recebidos:', data);
        
        if (data.config) {
          // Garantir que todos os campos sejam strings, nunca null ou undefined
          const novaConfiguracao = {
            id: data.config.id || undefined,
            evolution_api_url: data.config.evolution_api_url || '',
            evolution_api_key: data.config.evolution_api_key || '',
            instance_name: data.config.instance_name || '',
            webhook_url: data.config.webhook_url || '',
            webhook_secret: data.config.webhook_secret || '',
            ativo: data.config.ativo !== undefined ? data.config.ativo : true,
            status_conexao: data.config.status_conexao || undefined,
            hasApiKey: data.config.hasApiKey // Vem do backend
          };
          
          console.log('✅ Configuração processada:', {
            hasApiUrl: !!novaConfiguracao.evolution_api_url,
            hasApiKey: novaConfiguracao.hasApiKey,
            hasInstanceName: !!novaConfiguracao.instance_name,
            instanceName: novaConfiguracao.instance_name
          });
          
          setConfiguracao(novaConfiguracao);
        } else {
          console.log('⚠️ Nenhuma configuração encontrada no response');
        }
      } else {
        const error = await response.json();
        console.error('❌ Erro ao carregar configuração:', error);
      }
    } catch (error) {
      console.error('💥 Erro ao carregar configuração:', error);
      toast.error('Erro ao carregar configuração');
    } finally {
      setCarregando(false);
    }
  };

  const salvarConfiguracao = async () => {
    setCarregando(true);
    try {
      const { token } = useAuthStore.getState();
      if (!token) {
        console.error('Token não encontrado');
        return;
      }
      
      const response = await fetch('/api/chat/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(configuracao)
      });

      if (response.ok) {
        const data = await response.json();
        setConfiguracao(data.config);
        toast.success('Configuração salva com sucesso');
        
        // Status será verificado quando necessário
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setCarregando(false);
    }
  };

  const testarConexao = async () => {
    if (!configuracao.evolution_api_url || !configuracao.evolution_api_key) {
      toast.error('Preencha a URL e chave da API primeiro');
      return;
    }

    setTestando(true);
    try {
      const { token } = useAuthStore.getState();
      if (!token) {
        console.error('Token não encontrado');
        toast.error('Erro de autenticação. Faça login novamente.');
        return;
      }
      
      console.log('🔍 Iniciando teste de conexão:', {
        url: configuracao.evolution_api_url,
        hasApiKey: !!configuracao.evolution_api_key,
        timestamp: new Date().toISOString()
      });
      
      const response = await fetch('/api/chat/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          apiUrl: configuracao.evolution_api_url,
          apiKey: configuracao.evolution_api_key
        })
      });

      const responseData = await response.json();
      console.log('📡 Resposta do teste de conexão:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });

      if (response.ok) {
        toast.success(responseData.message || 'Conexão testada com sucesso', {
          description: responseData.details || 'API Evolution respondeu corretamente'
        });
      } else {
        // Exibir erro detalhado baseado no status HTTP
        let errorTitle = responseData.message || 'Erro na conexão';
        let errorDescription = '';

        if (responseData.details) {
          errorDescription = responseData.details;
        }

        if (responseData.errorBody && responseData.errorBody !== 'Sem detalhes adicionais') {
          errorDescription += responseData.errorBody ? ` | ${responseData.errorBody}` : '';
        }

        if (responseData.errorCode) {
          errorDescription += ` (Código: ${responseData.errorCode})`;
        }

        console.error('❌ Erro detalhado no teste de conexão:', {
          status: response.status,
          message: errorTitle,
          details: errorDescription,
          fullResponse: responseData
        });

        toast.error(errorTitle, {
          description: errorDescription || 'Verifique a URL e chave da API',
          duration: 8000 // Mostrar por mais tempo para erros
        });
      }
    } catch (error: any) {
      console.error('💥 Erro de rede no teste de conexão:', error);
      
      // Identificar tipos de erro de rede
      let errorMessage = 'Erro ao testar conexão';
      let errorDescription = '';

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Erro de conectividade';
        errorDescription = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Timeout na conexão';
        errorDescription = 'A requisição demorou muito para responder.';
      } else {
        errorDescription = error.message || 'Erro desconhecido';
      }

      toast.error(errorMessage, {
        description: errorDescription,
        duration: 6000
      });
    } finally {
      setTestando(false);
    }
  };

  const conectarInstancia = async () => {
    if (!configuracao.instance_name) {
      toast.error('Nome da instância é obrigatório');
      return;
    }

    setCarregando(true);
    try {
      const { token } = useAuthStore.getState();
      if (!token) {
        console.error('Token não encontrado');
        toast.error('Erro de autenticação. Faça login novamente.');
        return;
      }
      
      const response = await fetch('/api/chat/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          instanceName: configuracao.instance_name
        })
      });

      if (response.ok) {
        const data = await response.json();
        setStatusInstancia(data.status);
        console.log('🔄 Estado statusInstancia atualizado (automático):', JSON.stringify(data.status, null, 2));
        
        if (data.status.qrcode) {
          setQrCodeVisible(true);
          toast.info('QR Code gerado. Escaneie com seu WhatsApp');
        }
        
        // Verificar status periodicamente
        const interval = setInterval(async () => {
          // Verificar status da instância
          try {
            const { token: statusToken } = useAuthStore.getState();
            if (!statusToken) {
              console.error('Token não encontrado para verificação de status');
              clearInterval(interval);
              return;
            }
            
            const statusResponse = await fetch('/api/chat/status', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${statusToken}`
              },
              body: JSON.stringify({
                instanceName: configuracao.instance_name
              })
            });
            
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              setStatusInstancia(statusData.status);
              
              if (statusData.status?.state === 'open') {
                clearInterval(interval);
                setQrCodeVisible(false);
                toast.success('WhatsApp conectado com sucesso!');
              }
            }
          } catch (error) {
            console.error('Erro ao verificar status:', error);
          }
        }, 3000);

        // Limpar interval após 2 minutos
        setTimeout(() => clearInterval(interval), 120000);
        
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao conectar instância');
      }
    } catch (error) {
      console.error('Erro ao conectar instância:', error);
      toast.error('Erro ao conectar instância');
    } finally {
      setCarregando(false);
    }
  };

  const desconectarInstancia = async () => {
    try {
      setCarregando(true);
      const { token } = useAuthStore.getState();
      if (!token) {
        console.error('Token não encontrado');
        toast.error('Erro de autenticação. Faça login novamente.');
        return;
      }
      
      const response = await fetch('/api/chat/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          instanceName: configuracao.instance_name
        })
      });

      if (response.ok) {
          toast.success('Instância desconectada com sucesso');
          setConfiguracao(prev => ({ ...prev, status_conexao: 'desconectado' }));
          setStatusInstancia(null);
        } else {
          const error = await response.json();
          throw new Error(error.message || 'Erro ao desconectar instância');
        }
      } catch (error) {
        console.error('Erro ao desconectar instância:', error);
        toast.error(error instanceof Error ? error.message : 'Erro ao desconectar instância');
      } finally {
        setCarregando(false);
      }
  };

  const verificarStatus = async () => {
    if (!configuracao.instance_name) {
      toast.error('Nome da instância é obrigatório');
      return;
    }

    try {
      const { token } = useAuthStore.getState();
      if (!token) {
        console.error('Token não encontrado');
        return;
      }
      
      console.log('🔍 Verificando status da instância:', {
        instanceName: configuracao.instance_name,
        timestamp: new Date().toISOString()
      });
      
      const response = await fetch('/api/chat/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          instanceName: configuracao.instance_name
        })
      });

      console.log('📡 Resposta da verificação de status:', {
        status: response.status,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Status recebido:', data.status);
        
        // Normalizar a estrutura do status
        const normalizedStatus = {
          state: data.status?.instance?.state || data.status?.state,
          phone: data.status?.instance?.phone || data.status?.phone,
          qrcode: data.status?.qrcode
        };
        
        setStatusInstancia(normalizedStatus);
        toast.success('Status verificado com sucesso');
      } else {
        const error = await response.json();
        console.error('❌ Erro na verificação de status:', error);
        toast.error(error.message || 'Erro ao verificar status');
      }
    } catch (error) {
      console.error('💥 Erro ao verificar status:', error);
      toast.error('Erro ao verificar status');
    }
  };

  // Função para verificar status automaticamente (sem toast)
  const verificarStatusAutomatico = async () => {
    if (!configuracao.instance_name) {
      console.log('⚠️ Nome da instância não definido para verificação automática');
      return;
    }

    try {
      const { token } = useAuthStore.getState();
      if (!token) {
        console.error('❌ Token não encontrado para verificação automática');
        return;
      }
      
      console.log('🔄 Verificação automática de status iniciada:', {
        instanceName: configuracao.instance_name,
        timestamp: new Date().toISOString()
      });
      
      const response = await fetch('/api/chat/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          instanceName: configuracao.instance_name
        })
      });

      console.log('📡 Resposta da verificação automática:', {
        status: response.status,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Status automático recebido:', {
          state: data.status?.instance?.state || data.status?.state,
          phone: data.status?.instance?.phone || data.status?.phone,
          hasQrcode: !!data.status?.qrcode
        });
        
        // Normalizar a estrutura do status
        const normalizedStatus = {
          state: data.status?.instance?.state || data.status?.state,
          phone: data.status?.instance?.phone || data.status?.phone,
          qrcode: data.status?.qrcode
        };
        
        setStatusInstancia(normalizedStatus);
        console.log('🔄 Estado statusInstancia atualizado (automático):', JSON.stringify(data.status, null, 2));
      } else {
        const error = await response.json();
        console.warn('⚠️ Erro na verificação automática de status:', error);
        // Não mostrar toast para verificação automática
      }
    } catch (error) {
      console.warn('⚠️ Erro na verificação automática de status:', error);
      // Não mostrar toast para verificação automática
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configuração WhatsApp</h1>
                <p className="text-gray-600">Configure a integração com a Evolution API</p>
              </div>
            </div>
            
            {/* Status da Conexão */}
            <div className="flex items-center space-x-2">
              {statusInstancia?.state === 'open' ? (
                <div className="flex items-center text-green-600">
                  <Wifi className="h-5 w-5 mr-2" />
                  <span className="font-medium">Conectado</span>
                  {statusInstancia.phone && (
                    <span className="ml-2 text-sm text-gray-500">({statusInstancia.phone})</span>
                  )}
                </div>
              ) : statusInstancia?.state === 'connecting' ? (
                <div className="flex items-center text-yellow-600">
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  <span className="font-medium">Conectando...</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <WifiOff className="h-5 w-5 mr-2" />
                  <span className="font-medium">Desconectado</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Configurações da API */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configurações da Evolution API</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL da Evolution API *
                </label>
                <input
                  type="url"
                  value={configuracao.evolution_api_url}
                  onChange={(e) => setConfiguracao(prev => ({ ...prev, evolution_api_url: e.target.value }))}
                  placeholder="https://api.evolution.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chave da API *
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={configuracao.evolution_api_key}
                    onChange={(e) => setConfiguracao(prev => ({ ...prev, evolution_api_key: e.target.value }))}
                    placeholder="Sua chave da API"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Instância *
                </label>
                <input
                  type="text"
                  value={configuracao.instance_name}
                  onChange={(e) => setConfiguracao(prev => ({ ...prev, instance_name: e.target.value }))}
                  placeholder="minha-instancia"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={testarConexao}
                  disabled={testando || !configuracao.evolution_api_url || !configuracao.evolution_api_key}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testando ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Testar Conexão
                </button>
              </div>
            </div>
          </div>

          {/* Configurações do Webhook */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configurações do Webhook</h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL do Webhook
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={configuracao.webhook_url || gerarWebhookUrl()}
                    onChange={(e) => setConfiguracao(prev => ({ ...prev, webhook_url: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                  <button
                    onClick={() => setConfiguracao(prev => ({ ...prev, webhook_url: gerarWebhookUrl() }))}
                    className="px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    Gerar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Segredo do Webhook
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      type={showWebhookSecret ? 'text' : 'password'}
                      value={configuracao.webhook_secret}
                      onChange={(e) => setConfiguracao(prev => ({ ...prev, webhook_secret: e.target.value }))}
                      placeholder="Segredo para validação"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showWebhookSecret ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={gerarWebhookSecret}
                    className="px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    Gerar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Controles de Conexão */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Controle da Instância</h2>
            <div className="flex space-x-4">
              {statusInstancia?.state === 'open' ? (
                <button
                  onClick={desconectarInstancia}
                  disabled={carregando}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {carregando ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <WifiOff className="h-4 w-4 mr-2" />
                  )}
                  Desconectar
                </button>
              ) : (
                <button
                  onClick={conectarInstancia}
                  disabled={carregando || !configuracao.instance_name}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {carregando ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Smartphone className="h-4 w-4 mr-2" />
                  )}
                  Conectar WhatsApp
                </button>
              )}

              <button
                onClick={verificarStatus}
                className="flex items-center px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar Status
              </button>
            </div>
          </div>

          {/* QR Code */}
          {statusInstancia?.qrcode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <QrCode className="h-6 w-6 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-blue-900">Escaneie o QR Code</h3>
              </div>
              <div className="flex flex-col items-center">
                <img 
                  src={statusInstancia.qrcode} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64 border border-gray-300 rounded-lg"
                />
                <p className="text-sm text-blue-700 mt-4 text-center">
                  Abra o WhatsApp no seu celular, vá em Dispositivos Conectados e escaneie este código
                </p>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={salvarConfiguracao}
              disabled={carregando}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {carregando ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configuração
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}