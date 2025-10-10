import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Search, 
  Phone, 
  Video, 
  MoreVertical,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  User,
  MessageCircle,
  Image,
  File
} from 'lucide-react';
import { useWhatsAppChat } from '../hooks/useWhatsAppChat';
import { toast } from 'sonner';

export default function WhatsAppChat() {
  const {
    conversations,
    selectedConversation,
    messages,
    isLoading,
    isConnected,
    selectConversation,
    sendMessage,
    markAsRead,
    searchConversations,
    loadMoreMessages
  } = useWhatsAppChat();

  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    try {
      await sendMessage(selectedConversation.id, messageText);
      setMessageText('');
      toast.success('Mensagem enviada');
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
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
        return <Check className="h-4 w-4 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-4 w-4 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.contact.number.includes(searchTerm)
  );

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">WhatsApp não conectado</h3>
          <p className="text-gray-600">Conecte-se ao WhatsApp para começar a conversar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Lista de Conversas */}
      <div className={`${isMobileView && selectedConversation ? 'hidden' : 'flex'} flex-col w-full md:w-1/3 bg-white border-r border-gray-200`}>
        {/* Header da Sidebar */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Conversas</h2>
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
          
          {/* Barra de Pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => selectConversation(conversation.id)}
                className={`flex items-center space-x-3 p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                  {conversation.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {conversation.unreadCount}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 truncate">
                      {conversation.contact.name}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatTime(conversation.lastMessage.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {conversation.lastMessage.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Área de Chat */}
      <div className={`${isMobileView && !selectedConversation ? 'hidden' : 'flex'} flex-col flex-1`}>
        {selectedConversation ? (
          <>
            {/* Header do Chat */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isMobileView && (
                    <button
                      onClick={() => selectConversation(null)}
                      className="p-1 text-gray-600 hover:text-gray-900"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  )}
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {selectedConversation.contact.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedConversation.contact.number}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                    <Phone className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                    <Video className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Área de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.fromMe
                        ? 'bg-green-500 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    {message.type === 'text' && (
                      <p className="text-sm">{message.content}</p>
                    )}
                    
                    {message.type === 'image' && (
                      <div className="space-y-2">
                        <div className="bg-gray-200 rounded-lg p-4 flex items-center justify-center">
                          <Image className="h-8 w-8 text-gray-400" />
                        </div>
                        {message.caption && (
                          <p className="text-sm">{message.caption}</p>
                        )}
                      </div>
                    )}
                    
                    {message.type === 'document' && (
                      <div className="flex items-center space-x-2">
                        <File className="h-5 w-5" />
                        <span className="text-sm">{message.filename || 'Documento'}</span>
                      </div>
                    )}
                    
                    <div className={`flex items-center justify-end space-x-1 mt-1 ${
                      message.fromMe ? 'text-green-100' : 'text-gray-500'
                    }`}>
                      <span className="text-xs">
                        {formatTime(message.timestamp)}
                      </span>
                      {message.fromMe && getMessageStatusIcon(message.status)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de Mensagem */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleFileUpload}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                
                <div className="flex-1 relative">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite uma mensagem..."
                    rows={1}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
                
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  <Smile className="h-5 w-5" />
                </button>
                
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Input de Arquivo (Hidden) */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                // Handle file upload
                console.log('Files selected:', e.target.files);
              }}
            />
          </>
        ) : (
          /* Tela de Boas-vindas */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="h-24 w-24 text-gray-400 mx-auto mb-6" />
              <h3 className="text-2xl font-medium text-gray-900 mb-2">
                WhatsApp Web
              </h3>
              <p className="text-gray-600 max-w-md">
                Selecione uma conversa para começar a enviar mensagens
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}