/**
 * Componente principal da interface de chat
 */
import React, { useEffect } from 'react';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import ConversationList from './ConversationList';
import MessageArea from './MessageArea';
import { useChat } from '../../hooks/useChat';
import { useSocket } from '../../hooks/useSocket';


const ChatInterface: React.FC = () => {
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
    refreshConversations
  } = useChat();

  const { connected: socketConnected, error: socketError } = useSocket();

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
                <WifiOff className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  Conexão perdida - Tentando reconectar...
                </span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800">
                  Conectado
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {(error || socketError) && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-800">
              {error || socketError}
            </span>
          </div>
        </div>
      )}

      {/* Main Chat Interface */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations Sidebar */}
        <div className="w-80 flex-shrink-0">
          <ConversationList
            conversations={conversations}
            selectedConversationId={selectedConversation?.id}
            onSelectConversation={selectConversation}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            loading={loading}
          />
        </div>

        {/* Message Area */}
        <div className="flex-1">
          <MessageArea
            conversation={selectedConversation}
            messages={messages}
            onSendMessage={sendMessage}
            onMarkAsRead={markAsRead}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;