/**
 * Página principal do sistema de chat WhatsApp Web
 */
import React from 'react';
import { MessageCircle } from 'lucide-react';
import ChatInterface from '../components/chat/ChatInterface';

const Chat: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Chat WhatsApp
            </h1>
            <p className="text-sm text-gray-500">
              Gerencie suas conversas com pacientes
            </p>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
};

export default Chat;