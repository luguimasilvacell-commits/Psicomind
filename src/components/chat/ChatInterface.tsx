/**
 * Componente principal da interface de chat
 */
import React, { useEffect } from 'react';
import { AlertCircle, Wifi, WifiOff, TestTube } from 'lucide-react';
import ConversationList from './ConversationList';
import MessageArea from './MessageArea';
import { useChat } from '../../hooks/useChat';
import { useSocket } from '../../hooks/useSocket';


const ChatInterface: React.FC = () => {
  console.log('🎯 [ChatInterface] Componente ChatInterface carregado');
  
  try {
    const { 
      conversations, 
      selectedConversation, 
      messages, 
      loading, 
      error,
      searchTerm,
      setSearchTerm,
      selectConversation, 
      sendMessage, 
      markAsRead,
      getWebhookStatus
    } = useChat();
    
    const { connected: socketConnected, error: socketError } = useSocket();

    console.log('🎯 [ChatInterface] Hooks carregados com sucesso', {
      conversations: conversations?.length,
      selectedConversation: selectedConversation?.id,
      loading,
      error,
      socketConnected,
      socketError
    });

    // Função de teste para selecionar primeira conversa e enviar mensagem
    const testChatFunctionality = async () => {
      console.log('🧪 [TESTE] Iniciando teste de funcionalidade do chat');
      
      if (conversations && conversations.length > 0) {
        const firstConversation = conversations[0];
        console.log('🧪 [TESTE] Selecionando primeira conversa:', firstConversation.patient?.nome);
        
        // Selecionar conversa
        selectConversation(firstConversation.id);
        
        // Aguardar um pouco e enviar mensagem de teste
        setTimeout(async () => {
          console.log('🧪 [TESTE] Enviando mensagem de teste');
          await sendMessage('Mensagem de teste para verificar webhook n8n', 'text');
        }, 1000);
      } else {
        console.log('🧪 [TESTE] Nenhuma conversa disponível para teste');
      }
    };

    // Show connection status
    const showConnectionWarning = !socketConnected;

    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Connection Status Bar */}
        {showConnectionWarning && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
            <div className="flex items-center space-x-2">
              {!socketConnected ? (
                <>
                  <WifiOff className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    Conectando ao servidor...
                  </span>
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    Conectado
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Botão de Teste Temporário */}
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <button
            onClick={testChatFunctionality}
            className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            <TestTube className="h-4 w-4" />
            <span>Testar Chat + Webhook</span>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Main Chat Interface */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation List */}
          <div className="w-1/3 border-r border-gray-200 bg-white">
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversation?.id}
              onSelectConversation={selectConversation}
              loading={loading}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>

          {/* Message Area */}
          <div className="flex-1 bg-white">
            <MessageArea
              conversation={selectedConversation}
              messages={messages}
              onSendMessage={sendMessage}
              loading={loading}
              onMarkAsRead={markAsRead}
              getWebhookStatus={getWebhookStatus}
            />
          </div>
        </div>
      </div>
    );

  } catch (error: any) {
    console.error('❌ [ChatInterface] Erro ao carregar componente:', error);
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro no Chat</h3>
          <p className="text-gray-600">Ocorreu um erro ao carregar a interface de chat.</p>
          <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }
};

export default ChatInterface;