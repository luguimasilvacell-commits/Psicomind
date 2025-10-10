-- Migração para criar tabelas do WhatsApp Web
-- Data: 2024-01-15
-- Descrição: Criação das tabelas para integração WhatsApp Web completa

-- Criar tabela de sessões WhatsApp
CREATE TABLE whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psychologist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_connected BOOLEAN DEFAULT false,
    session_data TEXT,
    client_info JSONB,
    webhook_url TEXT,
    auto_reply_enabled BOOLEAN DEFAULT false,
    auto_reply_message TEXT,
    business_hours_enabled BOOLEAN DEFAULT false,
    business_hours_start TIME DEFAULT '09:00',
    business_hours_end TIME DEFAULT '18:00',
    away_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de conversas
CREATE TABLE whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psychologist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES pacientes(id) ON DELETE SET NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_phone VARCHAR(20) NOT NULL,
    last_message_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unread_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de mensagens
CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video')),
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('patient', 'psychologist')),
    whatsapp_message_id VARCHAR(255),
    media_url TEXT,
    media_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de templates
CREATE TABLE whatsapp_message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psychologist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX idx_whatsapp_sessions_psychologist ON whatsapp_sessions(psychologist_id);
CREATE INDEX idx_whatsapp_conversations_psychologist ON whatsapp_conversations(psychologist_id);
CREATE INDEX idx_whatsapp_conversations_phone ON whatsapp_conversations(patient_phone);
CREATE INDEX idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp DESC);
CREATE INDEX idx_whatsapp_templates_psychologist ON whatsapp_message_templates(psychologist_id);

-- Conceder permissões
GRANT ALL PRIVILEGES ON whatsapp_sessions TO authenticated;
GRANT ALL PRIVILEGES ON whatsapp_conversations TO authenticated;
GRANT ALL PRIVILEGES ON whatsapp_messages TO authenticated;
GRANT ALL PRIVILEGES ON whatsapp_message_templates TO authenticated;

GRANT SELECT ON whatsapp_sessions TO anon;
GRANT SELECT ON whatsapp_conversations TO anon;
GRANT SELECT ON whatsapp_messages TO anon;
GRANT SELECT ON whatsapp_message_templates TO anon;

-- Dados iniciais de exemplo
INSERT INTO whatsapp_message_templates (psychologist_id, name, content, category) VALUES
((SELECT id FROM auth.users WHERE email = 'admin@psicomind.com' LIMIT 1), 'Saudação', 'Olá! Como posso ajudá-lo hoje?', 'greeting'),
((SELECT id FROM auth.users WHERE email = 'admin@psicomind.com' LIMIT 1), 'Agendamento', 'Vamos agendar sua próxima sessão. Que dia seria melhor para você?', 'scheduling'),
((SELECT id FROM auth.users WHERE email = 'admin@psicomind.com' LIMIT 1), 'Confirmação', 'Sua sessão está confirmada para {data} às {hora}. Até lá!', 'confirmation');