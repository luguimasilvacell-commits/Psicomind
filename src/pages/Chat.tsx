/**
 * Página principal do sistema de Chat WhatsApp
 * Lista de conversas e interface de chat individual
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Search, Settings, Phone, Clock, Check, CheckCheck, Wifi, WifiOff } from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { toast } from 'sonner';
import type { Conversa, Mensagem, ChatStats } from '../types/chat';

interface ConversaComPreview {
  id: string;
  psicologo_id: string;
  paciente_id: string;
  ultima_mensagem: string;
  ativa: boolean;
  mensagens_nao_lidas: number;
  created_at: string;
  updated_at: string;
  paciente: {
    id: string;
    nome: string;
    telefone: string;
    email?: string;
  };
  preview_mensagem: string;
}

const Chat: React.FC = () => {
  console.log('🎯 [DEBUG] Componente Chat carregado!');
  const { user } = useAuthStore();
  const [conversas, setConversas] = useState<ConversaComPreview[]>([]);
  const [conversaSelecionada, setConversaSelecionada] = useState<ConversaComPreview | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [usuariosDigitando, setUsuariosDigitando] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Callbacks para WebSocket
  const handleNewMessage = useCallback((data: any) => {
    console.log('🔥 [DEBUG] handleNewMessage chamado:', data);
    const { mensagem, conversa } = data.data;
    
    // Atualizar lista de conversas
    setConversas(prev => {
      const index = prev.findIndex(c => c.id === conversa.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = { ...conversa, ultima_mensagem: mensagem.conteudo };
        return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      } else {
        return [{ ...conversa, ultima_mensagem: mensagem.conteudo }, ...prev];
      }
    });

    // Se a conversa está selecionada, adicionar mensagem
    if (conversaSelecionada?.id === conversa.id) {
      setMensagens(prev => [...prev, mensagem]);
      
      // Marcar como lida se for mensagem recebida
      if (mensagem.tipo === 'recebida') {
        markAsRead(conversa.id);
      }
    }
  }, [conversaSelecionada]);

  const handleMessageStatusUpdate = useCallback((data: any) => {
    // Atualizar status das mensagens
    setMensagens(prev => 
      prev.map(msg => 
        data.data.messageId.includes(msg.id) 
          ? { ...msg, status: data.data.status }
          : msg
      )
    );
  }, []);

  const handleWhatsAppStatusChange = useCallback((data: any) => {
    const { state, instance } = data.data;
    
    if (state === 'open') {
      toast.success(`WhatsApp conectado (${instance})`);
    } else if (state === 'close') {
      toast.warning(`WhatsApp desconectado (${instance})`);
    }
  }, []);

  const handleUserTyping = useCallback((data: { userId: string; typing: boolean; conversaId: string }) => {
    if (data.conversaId === conversaSelecionada?.id) {
      setUsuariosDigitando(prev => {
        const newSet = new Set(prev);
        if (data.typing) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    }
  }, [conversaSelecionada]);

  // Configurar WebSocket
  const { 
    isConnected, 
    connectionError, 
    joinConversation, 
    leaveConversation, 
    startTyping, 
    stopTyping, 
    markAsRead 
  } = useWebSocket({
    onNewMessage: handleNewMessage,
    onMessageStatusUpdate: handleMessageStatusUpdate,
    onWhatsAppStatusChange: handleWhatsAppStatusChange,
    onUserTyping: handleUserTyping
  });

  // Scroll para o final das mensagens
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Carregar conversas
  useEffect(() => {
    console.log('🚀 [DEBUG] useEffect carregarConversas executado');
    carregarConversas();
    carregarEstatisticas();
  }, []);

  // Auto-selecionar primeira conversa para teste
  useEffect(() => {
    if (conversas.length > 0 && !conversaSelecionada) {
      console.log('🔄 [DEBUG] Auto-selecionando primeira conversa para teste:', conversas[0].paciente?.nome);
      const primeiraConversa = conversas[0];
      setConversaSelecionada(primeiraConversa);
      joinConversation(primeiraConversa.paciente.id);
      carregarMensagens(primeiraConversa.paciente.id);
    }
  }, [conversas, conversaSelecionada]);

  // Carregar mensagens quando conversa é selecionada
  useEffect(() => {
    if (conversaSelecionada) {
      carregarMensagens(conversaSelecionada?.paciente.id || '');
    }
  }, [conversaSelecionada]);

  const carregarConversas = async () => {
    console.log('💬 [DEBUG] Iniciando carregarConversas...');
    try {
      const { token, user: currentUser } = useAuthStore.getState();
      console.log('💬 [DEBUG] Token disponível:', !!token);
      console.log('💬 [DEBUG] Usuário atual:', currentUser);
      
      if (!token) {
        console.error('🔐 [DEBUG] Token não encontrado para conversas');
        return;
      }
      
      console.log('💬 [DEBUG] Carregando conversas para usuário:', currentUser?.id, currentUser?.email);
      console.log('💬 [DEBUG] Fazendo fetch para: /api/chat/conversas');
      
      const response = await fetch('/api/chat/conversas', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      console.log('💬 [DEBUG] Response status conversas:', response.status);
      console.log('💬 [DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('💬 [DEBUG] Conversas carregadas:', data.conversas?.length || 0);
        console.log('💬 [DEBUG] Dados completos:', data);
        setConversas(data.conversas || []);
      } else {
        const errorData = await response.text();
        console.error('❌ [DEBUG] Erro ao carregar conversas:', response.status, errorData);
      }
    } catch (error) {
      console.error('💥 [DEBUG] Erro ao carregar conversas:', error);
    } finally {
      console.log('💬 [DEBUG] Finalizando carregarConversas, setLoading(false)');
      setLoading(false);
    }
  };

  const carregarMensagens = async (pacienteId: string) => {
    try {
      const { token } = useAuthStore.getState();
      if (!token) {
        console.error('🔐 [DEBUG] Token não encontrado');
        return;
      }
      
      console.log('📨 [DEBUG] Carregando mensagens para paciente:', pacienteId);
      
      const response = await fetch(`/api/chat/conversas/${pacienteId}/mensagens`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      console.log('📨 [DEBUG] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📨 [DEBUG] Mensagens carregadas:', data.mensagens?.length || 0);
        setMensagens(data.mensagens || []);
      } else {
        const errorData = await response.text();
        console.error('❌ [DEBUG] Erro ao carregar mensagens:', response.status, errorData);
      }
    } catch (error) {
      console.error('💥 [DEBUG] Erro ao carregar mensagens:', error);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      const { token } = useAuthStore.getState();
      if (!token) {
        console.error('Token não encontrado');
        return;
      }
      
      const response = await fetch('/api/chat/estatisticas', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada || enviandoMensagem) return;

    setEnviandoMensagem(true);
    
    // Parar indicador de digitação
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    stopTyping(conversaSelecionada?.paciente.id || '', conversaSelecionada?.paciente.id || '');
    
    try {
      const { token } = useAuthStore.getState();
      if (!token) {
        console.error('Token não encontrado');
        return;
      }
      
      const response = await fetch('/api/chat/mensagens', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pacienteId: conversaSelecionada?.paciente.id,
          conteudo: novaMensagem,
          tipo: 'texto'
        })
      });

      if (response.ok) {
        setNovaMensagem('');
        // Recarregar mensagens para mostrar a nova mensagem
        await carregarMensagens(conversaSelecionada?.paciente.id || '');
        // Atualizar lista de conversas
        await carregarConversas();
      } else {
        console.error('Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setEnviandoMensagem(false);
    }
  };

  // Manipular digitação
  const handleTyping = (value: string) => {
    setNovaMensagem(value);
    
    if (!conversaSelecionada) return;
    
    // Iniciar indicador de digitação
    startTyping(conversaSelecionada?.paciente.id || '', conversaSelecionada?.paciente.id || '');
    
    // Parar indicador após 3 segundos de inatividade
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(conversaSelecionada?.paciente.id || '', conversaSelecionada?.paciente.id || '');
    }, 3000);
  };

  const marcarComoLida = async (conversaId: string) => {
    try {
      const { token } = useAuthStore.getState();
      if (!token) {
        console.error('Token não encontrado');
        return;
      }
      
      const response = await fetch(`/api/chat/conversas/${conversaId}/marcar-lida`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Atualizar contador de não lidas
        setConversas(prev => 
          prev.map(c => 
            c.id === conversaId 
              ? { ...c, mensagens_nao_lidas: 0 }
              : c
          )
        );
        
        // Notificar via WebSocket
        markAsRead(conversaId);
      }
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const conversasFiltradas = conversas.filter(conversa =>
    conversa.paciente?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    conversa.paciente?.telefone?.includes(busca)
  );

  const conversaAtual = conversaSelecionada;

  const formatarHora = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'lida':
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      case 'entregue':
        return <Check className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                <MessageCircle className="w-6 h-6 mr-2 text-blue-600" />
                Chat WhatsApp
              </h1>
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <div className="flex items-center text-green-600">
                    <Wifi className="h-4 w-4 mr-1" />
                    <span className="text-sm">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <WifiOff className="h-4 w-4 mr-1" />
                    <span className="text-sm">Offline</span>
                  </div>
                )}
                {connectionError && (
                  <span className="text-xs text-red-500" title={connectionError}>
                    Erro de conexão
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/chat/configuracao'}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="Configurações do WhatsApp"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>

          {/* Estatísticas */}
          {stats && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-blue-50 p-2 rounded-lg">
                <div className="text-xs text-blue-600">Conversas</div>
                <div className="text-lg font-semibold text-blue-700">{stats.total_conversas}</div>
              </div>
              <div className="bg-green-50 p-2 rounded-lg">
                <div className="text-xs text-green-600">Não lidas</div>
                <div className="text-lg font-semibold text-green-700">{stats.mensagens_nao_lidas}</div>
              </div>
            </div>
          )}

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto">
          {conversasFiltradas.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {busca ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </div>
          ) : (
            conversasFiltradas.map((conversa) => (
              <div
                key={conversa.id}
                onClick={async () => {
                  console.log('🔄 [DEBUG] Selecionando conversa:', conversa.paciente?.nome, 'ID:', conversa.paciente?.id);
                  
                  // Sair da conversa anterior
                  if (conversaSelecionada) {
                    leaveConversation(conversaSelecionada.paciente.id);
                  }
                  
                  setConversaSelecionada(conversa);
                  if (conversa.mensagens_nao_lidas > 0) {
                    marcarComoLida(conversa.id);
                  }
                  
                  // Entrar na nova conversa via WebSocket
                  joinConversation(conversa.paciente.id);
                  
                  // Carregar mensagens da conversa
                  console.log('📨 [DEBUG] Iniciando carregamento de mensagens para:', conversa.paciente.id);
                  await carregarMensagens(conversa.paciente.id);
                }}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  conversaSelecionada?.paciente?.id === conversa.paciente?.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conversa.paciente?.nome}
                      </h3>
                      {conversa.ultima_mensagem && (
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(conversa.ultima_mensagem), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center mt-1">
                      <Phone className="w-3 h-3 text-gray-400 mr-1" />
                      <span className="text-xs text-gray-500">{conversa.paciente?.telefone}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conversa.preview_mensagem || 'Sem mensagens'}
                    </p>
                  </div>
                  {conversa.mensagens_nao_lidas > 0 && (
                    <div className="ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {conversa.mensagens_nao_lidas}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col">
        {conversaSelecionada && conversaAtual ? (
          <>
            {/* Header do Chat */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {conversaAtual.paciente?.nome?.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {conversaAtual.paciente?.nome}
                  </h2>
                  <p className="text-sm text-gray-500">{conversaAtual.paciente?.telefone}</p>
                </div>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {mensagens.map((mensagem) => (
                <div
                  key={mensagem.id}
                  className={`flex ${mensagem.direcao === 'enviada' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      mensagem.direcao === 'enviada'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{mensagem.conteudo}</p>
                    <div className={`flex items-center justify-end mt-1 space-x-1 ${
                      mensagem.direcao === 'enviada' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <span className="text-xs">
                        {formatarHora(mensagem.created_at)}
                      </span>
                      {mensagem.direcao === 'enviada' && getStatusIcon(mensagem.status_entrega)}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Indicador de digitação */}
              {usuariosDigitando.size > 0 && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-xs">
                    <div className="flex items-center space-x-1">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500 ml-2">digitando...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input de Mensagem */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={novaMensagem}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
                  placeholder="Digite sua mensagem..."
                  disabled={enviandoMensagem}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <button
                  onClick={enviarMensagem}
                  disabled={!novaMensagem.trim() || enviandoMensagem}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enviandoMensagem ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecione uma conversa
              </h3>
              <p className="text-gray-500">
                Escolha uma conversa da lista para começar a conversar
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Configurações (placeholder) */}
      {showConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Configurações do WhatsApp</h3>
            <p className="text-gray-600 mb-4">
              As configurações da Evolution API serão implementadas em breve.
            </p>
            <button
              onClick={() => setShowConfig(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;