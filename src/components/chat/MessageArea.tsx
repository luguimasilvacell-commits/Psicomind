/**
 * Componente da área de mensagens do chat
 */
import React, { useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Phone, 
  Video,
  User,
  Check,
  CheckCheck
} from 'lucide-react';
import { Message, MessageAreaProps, MessageType } from '../../types/chat';

const MessageArea: React.FC<MessageAreaProps> = ({
  conversation,
  messages,
  onSendMessage,
  loading,
  onMarkAsRead
}) => {
  const [messageText, setMessageText] = React.useState('');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isTyping, setIsTyping] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (conversation && conversation.unread_count > 0) {
      const timer = setTimeout(() => {
        onMarkAsRead?.();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [conversation, onMarkAsRead]);

  const handleSendMessage = async () => {
    if (!messageText.trim() && !selectedFile) return;

    const messageType: MessageType = selectedFile 
      ? selectedFile.type.startsWith('image/') ? 'image'
      : selectedFile.type.startsWith('audio/') ? 'audio'
      : selectedFile.type.startsWith('video/') ? 'video'
      : 'document'
      : 'text';

    await onSendMessage(messageText.trim(), messageType, selectedFile || undefined);
    
    setMessageText('');
    setSelectedFile(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="w-4 h-4 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const renderMessageContent = (message: Message) => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="max-w-xs">
            {message.media_url ? (
              <img 
                src={message.media_url} 
                alt="Imagem" 
                className="rounded-lg max-w-full h-auto"
              />
            ) : (
              <div className="bg-gray-200 rounded-lg p-4 text-center">
                📷 Imagem
              </div>
            )}
            {message.content && (
              <p className="mt-2 text-sm">{message.content}</p>
            )}
          </div>
        );
      
      case 'audio':
        return (
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              🎵
            </div>
            <div>
              <p className="text-sm font-medium">Áudio</p>
              {message.content && (
                <p className="text-xs text-gray-600">{message.content}</p>
              )}
            </div>
          </div>
        );
      
      case 'document':
        return (
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              📄
            </div>
            <div>
              <p className="text-sm font-medium">Documento</p>
              {message.content && (
                <p className="text-xs text-gray-600">{message.content}</p>
              )}
            </div>
          </div>
        );
      
      case 'video':
        return (
          <div className="max-w-xs">
            {message.media_url ? (
              <video 
                src={message.media_url} 
                controls 
                className="rounded-lg max-w-full h-auto"
              />
            ) : (
              <div className="bg-gray-200 rounded-lg p-4 text-center">
                🎥 Vídeo
              </div>
            )}
            {message.content && (
              <p className="mt-2 text-sm">{message.content}</p>
            )}
          </div>
        );
      
      default:
        return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Selecione uma conversa
          </h3>
          <p className="text-gray-500">
            Escolha uma conversa da lista para começar a conversar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {conversation.patient_name}
            </h3>
            <p className="text-sm text-gray-500">
              {conversation.phone_number}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-gray-500 mb-2">Nenhuma mensagem ainda</p>
              <p className="text-sm text-gray-400">
                Envie uma mensagem para iniciar a conversa
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_type === 'psychologist' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender_type === 'psychologist'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {renderMessageContent(message)}
                
                <div className={`flex items-center justify-end space-x-1 mt-1 ${
                  message.sender_type === 'psychologist' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <span className="text-xs">
                    {formatTime(message.timestamp)}
                  </span>
                  {message.sender_type === 'psychologist' && (
                    <div className="ml-1">
                      {getMessageStatusIcon(message.status)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        {selectedFile && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Arquivo selecionado:</span>
              <span className="text-sm text-gray-600">{selectedFile.name}</span>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}
        
        <div className="flex items-end space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>
          
          <button
            onClick={() => {/* Emoji picker */}}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Smile className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim() && !selectedFile}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageArea;