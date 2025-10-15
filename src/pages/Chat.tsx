import React from 'react';
import ChatInterface from '../components/chat/ChatInterface';

const Chat: React.FC = () => {
  console.log('🎯 [Chat] Componente Chat carregado');
  
  return (
    <div className="h-full">
      <ChatInterface />
    </div>
  );
};

export default Chat;