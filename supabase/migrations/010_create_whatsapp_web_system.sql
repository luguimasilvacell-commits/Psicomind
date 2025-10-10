-- Migration para Sistema de Chat WhatsApp Web
-- Baseado na documentação técnica atualizada

-- Criar tabela conversations (conforme documentação)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES pacientes(id),
    psychologist_id UUID NOT NULL REFERENCES psicologos(id),
    whatsapp_chat_id VARCHAR(255) UNIQUE NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_patient_id ON conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_psychologist_id ON conversations(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp_chat_id ON conversations(whatsapp_chat_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- Criar tabela messages (conforme documentação)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video')),
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('patient', 'psychologist')),
    whatsapp_message_id VARCHAR(255),
    media_url TEXT,
    media_type VARCHAR(100),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON messages(whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Criar tabela message_templates (conforme documentação)
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psychologist_id UUID NOT NULL REFERENCES psicologos(id),
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_message_templates_psychologist_id ON message_templates(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_is_active ON message_templates(is_active);

-- Criar tabela whatsapp_config (conforme documentação)
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psychologist_id UUID NOT NULL REFERENCES psicologos(id),
    is_connected BOOLEAN DEFAULT false,
    session_data TEXT,
    webhook_url VARCHAR(500),
    auto_reply_enabled BOOLEAN DEFAULT false,
    auto_reply_message TEXT,
    last_connected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_config_psychologist_id ON whatsapp_config(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_is_connected ON whatsapp_config(is_connected);

-- Habilitar RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para conversations
DROP POLICY IF EXISTS "Psychologists can manage their conversations" ON conversations;
CREATE POLICY "Psychologists can manage their conversations" ON conversations
    FOR ALL USING (psychologist_id = auth.uid());

-- Políticas RLS para messages
DROP POLICY IF EXISTS "Psychologists can manage their messages" ON messages;
CREATE POLICY "Psychologists can manage their messages" ON messages
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE psychologist_id = auth.uid()
        )
    );

-- Políticas RLS para message_templates
DROP POLICY IF EXISTS "Psychologists can manage their templates" ON message_templates;
CREATE POLICY "Psychologists can manage their templates" ON message_templates
    FOR ALL USING (psychologist_id = auth.uid());

-- Políticas RLS para whatsapp_config
DROP POLICY IF EXISTS "Psychologists can manage their WhatsApp config" ON whatsapp_config;
CREATE POLICY "Psychologists can manage their WhatsApp config" ON whatsapp_config
    FOR ALL USING (psychologist_id = auth.uid());

-- Conceder permissões
GRANT ALL PRIVILEGES ON conversations TO authenticated;
GRANT ALL PRIVILEGES ON messages TO authenticated;
GRANT ALL PRIVILEGES ON message_templates TO authenticated;
GRANT ALL PRIVILEGES ON whatsapp_config TO authenticated;

-- Função para atualizar timestamp de última mensagem
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET 
        last_message_at = NEW.timestamp,
        unread_count = CASE 
            WHEN NEW.sender_type = 'patient' THEN unread_count + 1
            ELSE unread_count
        END,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar conversa quando nova mensagem é inserida
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Função para marcar mensagens como lidas
CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE messages 
    SET status = 'read'
    WHERE conversation_id = conversation_uuid 
    AND sender_type = 'patient' 
    AND status != 'read';
    
    UPDATE conversations 
    SET unread_count = 0
    WHERE id = conversation_uuid;
END;
$$ LANGUAGE plpgsql;

-- Inserir templates padrão para psicólogos existentes
INSERT INTO message_templates (psychologist_id, name, content, category)
SELECT 
    id,
    'Bom dia',
    'Bom dia! Como você está se sentindo hoje?',
    'saudacao'
FROM psicologos
WHERE NOT EXISTS (
    SELECT 1 FROM message_templates 
    WHERE message_templates.psychologist_id = psicologos.id
    AND message_templates.name = 'Bom dia'
)
ON CONFLICT DO NOTHING;

INSERT INTO message_templates (psychologist_id, name, content, category)
SELECT 
    id,
    'Lembrete de Consulta',
    'Olá! Este é um lembrete da sua consulta agendada para amanhã às {horario}. Confirme sua presença, por favor.',
    'agendamento'
FROM psicologos
WHERE NOT EXISTS (
    SELECT 1 FROM message_templates 
    WHERE message_templates.psychologist_id = psicologos.id
    AND message_templates.name = 'Lembrete de Consulta'
)
ON CONFLICT DO NOTHING;

INSERT INTO message_templates (psychologist_id, name, content, category)
SELECT 
    id,
    'Encerramento',
    'Obrigado(a) pela sessão de hoje. Lembre-se de praticar os exercícios que conversamos. Até a próxima!',
    'encerramento'
FROM psicologos
WHERE NOT EXISTS (
    SELECT 1 FROM message_templates 
    WHERE message_templates.psychologist_id = psicologos.id
    AND message_templates.name = 'Encerramento'
)
ON CONFLICT DO NOTHING;