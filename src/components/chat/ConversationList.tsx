/**
 * Componente da lista de conversas do chat
 */
import React from 'react';
import { Search, MessageCircle, Clock, User } from 'lucide-react';
import { Conversation, ConversationListProps } from '../../types/chat';

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  searchTerm,
  onSearchChange,
  loading
}) => {
  console.log('🎯 [ConversationList] Componente carregado', {
    conversations: conversations?.length,
    selectedConversationId,
    loading
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('pt-BR', { 
        weekday: 'short' 
      });
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const getMessageIcon = (messageType: string) => {
    switch (messageType) {
      case 'image':
        return '📷';
      case 'audio':
        return '🎵';
      case 'document':
        return '📄';
      case 'video':
        return '🎥';
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Conversas
        </h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <MessageCircle className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-center">
              {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </p>
            {!searchTerm && (
              <p className="text-sm text-center mt-2">
                As conversas aparecerão aqui quando você receber mensagens
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => {
                  console.log('🎯 [ConversationList] Conversa clicada:', {
                    id: conversation.id,
                    patientName: conversation.patient?.nome
                  });
                  onSelectConversation(conversation);
                }}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversationId === conversation.id 
                    ? 'bg-blue-50 border-r-2 border-blue-500' 
                    : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.patient?.nome || 'Paciente'}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {conversation.last_message_at && (
                          <span className="text-xs text-gray-500">
                            {formatTime(conversation.last_message_at)}
                          </span>
                        )}
                        {conversation.unread_count > 0 && (
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-500 rounded-full">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        {conversation.last_message && (
                          <>
                            {getMessageIcon(conversation.last_message.message_type) && (
                              <span className="text-sm">
                                {getMessageIcon(conversation.last_message.message_type)}
                              </span>
                            )}
                            <p className="text-sm text-gray-600 truncate">
                              {conversation.last_message.sender_type === 'psychologist' && 'Você: '}
                              {truncateMessage(conversation.last_message.content)}
                            </p>
                          </>
                        )}
                        {!conversation.last_message && (
                          <p className="text-sm text-gray-400 italic">
                            Conversa iniciada
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status indicators */}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {conversation.patient?.telefone || 'Telefone não informado'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {conversation.is_active && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                        {!conversation.is_active && (
                          <Clock className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;