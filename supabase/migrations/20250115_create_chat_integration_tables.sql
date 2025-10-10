-- Migração para Integração de Mensagens n8n + Evolution API
-- Data: 2025-01-15
-- Descrição: Criação das tabelas para sistema de chat com automações

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Tabela de Conversas (se não existir)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    psychologist_id UUID NOT NULL REFERENCES psicologos(id) ON DELETE CASCADE,
    whatsapp_chat_id VARCHAR(255),
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para conversations
CREATE INDEX IF NOT EXISTS idx_conversations_patient_id ON conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_psychologist_id ON conversations(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp_chat_id ON conversations(whatsapp_chat_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- Trigger para updated_at em conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Tabela de Mensagens (se não existir)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video')),
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('patient', 'psychologist', 'automation')),
    whatsapp_message_id VARCHAR(255),
    media_url TEXT,
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- 3. Tabela de Automações
CREATE TABLE automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psychologist_id UUID NOT NULL REFERENCES psicologos(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    n8n_workflow_id VARCHAR(255),
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('appointment_reminder', 'follow_up', 'welcome', 'emergency', 'custom')),
    trigger_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para automations
CREATE INDEX idx_automations_psychologist_id ON automations(psychologist_id);
CREATE INDEX idx_automations_trigger_type ON automations(trigger_type);
CREATE INDEX idx_automations_is_active ON automations(is_active);
CREATE INDEX idx_automations_n8n_workflow_id ON automations(n8n_workflow_id);

-- Trigger para updated_at em automations
CREATE TRIGGER update_automations_updated_at BEFORE UPDATE ON automations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Tabela de Mensagens de Automação
CREATE TABLE automation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    n8n_execution_id VARCHAR(255),
    template_used TEXT,
    variables_used JSONB DEFAULT '{}',
    delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed', 'cancelled')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para automation_messages
CREATE INDEX idx_automation_messages_automation_id ON automation_messages(automation_id);
CREATE INDEX idx_automation_messages_conversation_id ON automation_messages(conversation_id);
CREATE INDEX idx_automation_messages_delivery_status ON automation_messages(delivery_status);
CREATE INDEX idx_automation_messages_sent_at ON automation_messages(sent_at DESC);
CREATE INDEX idx_automation_messages_n8n_execution_id ON automation_messages(n8n_execution_id);

-- 5. Tabela de Configurações de Automação
CREATE TABLE automation_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psychologist_id UUID NOT NULL REFERENCES psicologos(id) ON DELETE CASCADE,
    n8n_webhook_url VARCHAR(500),
    n8n_api_key VARCHAR(255),
    evolution_api_url VARCHAR(500),
    evolution_api_key VARCHAR(255),
    auto_response_enabled BOOLEAN DEFAULT false,
    business_hours_only BOOLEAN DEFAULT true,
    business_hours_start TIME DEFAULT '09:00',
    business_hours_end TIME DEFAULT '18:00',
    max_daily_messages INTEGER DEFAULT 50,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(psychologist_id)
);

-- Índices para automation_configs
CREATE INDEX idx_automation_configs_psychologist_id ON automation_configs(psychologist_id);

-- Trigger para updated_at em automation_configs
CREATE TRIGGER update_automation_configs_updated_at BEFORE UPDATE ON automation_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Tabela de Logs de Webhook
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL CHECK (source IN ('n8n', 'evolution', 'whatsapp')),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) DEFAULT 'POST',
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    processing_time_ms INTEGER,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para webhook_logs
CREATE INDEX idx_webhook_logs_source ON webhook_logs(source);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_response_status ON webhook_logs(response_status);
CREATE INDEX idx_webhook_logs_endpoint ON webhook_logs(endpoint);

-- 7. Tabela de Métricas de Automação
CREATE TABLE automation_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_read INTEGER DEFAULT 0,
    messages_failed INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    unique_recipients INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(automation_id, date)
);

-- Índices para automation_metrics
CREATE INDEX idx_automation_metrics_automation_id ON automation_metrics(automation_id);
CREATE INDEX idx_automation_metrics_date ON automation_metrics(date DESC);

-- Conceder permissões para todas as tabelas
GRANT ALL PRIVILEGES ON conversations TO authenticated;
GRANT ALL PRIVILEGES ON messages TO authenticated;
GRANT ALL PRIVILEGES ON automations TO authenticated;
GRANT ALL PRIVILEGES ON automation_messages TO authenticated;
GRANT ALL PRIVILEGES ON automation_configs TO authenticated;
GRANT ALL PRIVILEGES ON webhook_logs TO authenticated;
GRANT ALL PRIVILEGES ON automation_metrics TO authenticated;

-- Habilitar RLS (Row Level Security) para todas as tabelas
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para conversations
CREATE POLICY "Psicólogos podem gerenciar suas próprias conversas" ON conversations
    FOR ALL USING (psychologist_id = auth.uid());

-- Políticas RLS para messages
CREATE POLICY "Psicólogos podem gerenciar mensagens de suas conversas" ON messages
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE psychologist_id = auth.uid()
        )
    );

-- Políticas RLS para automations
CREATE POLICY "Psicólogos podem gerenciar suas próprias automações" ON automations
    FOR ALL USING (psychologist_id = auth.uid());

-- Políticas RLS para automation_messages
CREATE POLICY "Psicólogos podem ver mensagens de suas automações" ON automation_messages
    FOR ALL USING (
        automation_id IN (
            SELECT id FROM automations WHERE psychologist_id = auth.uid()
        )
    );

-- Políticas RLS para automation_configs
CREATE POLICY "Psicólogos podem gerenciar suas próprias configurações" ON automation_configs
    FOR ALL USING (psychologist_id = auth.uid());

-- Políticas RLS para webhook_logs (apenas leitura para psicólogos)
CREATE POLICY "Psicólogos podem ver logs relacionados a eles" ON webhook_logs
    FOR SELECT USING (
        payload->>'psychologist_id' = auth.uid()::text
    );

-- Políticas RLS para automation_metrics
CREATE POLICY "Psicólogos podem ver métricas de suas automações" ON automation_metrics
    FOR ALL USING (
        automation_id IN (
            SELECT id FROM automations WHERE psychologist_id = auth.uid()
        )
    );

-- Inserir configuração padrão para psicólogos existentes
INSERT INTO automation_configs (psychologist_id, auto_response_enabled, business_hours_only, max_daily_messages)
SELECT id, false, true, 50
FROM psicologos
WHERE id NOT IN (SELECT psychologist_id FROM automation_configs WHERE psychologist_id IS NOT NULL);

-- Inserir automações de exemplo para psicólogos existentes
INSERT INTO automations (psychologist_id, name, description, trigger_type, trigger_config, is_active)
SELECT 
    id,
    'Lembrete de Consulta',
    'Envia lembrete automático 24h antes da consulta',
    'appointment_reminder',
    '{"hours_before": 24, "template": "Olá {patient_name}, lembrando da sua consulta amanhã às {appointment_time}"}',
    false
FROM psicologos
WHERE id NOT IN (SELECT psychologist_id FROM automations WHERE name = 'Lembrete de Consulta');

-- Comentários para documentação
COMMENT ON TABLE conversations IS 'Conversas entre psicólogos e pacientes via WhatsApp';
COMMENT ON TABLE messages IS 'Mensagens individuais dentro das conversas';
COMMENT ON TABLE automations IS 'Configurações de automações do n8n';
COMMENT ON TABLE automation_messages IS 'Mensagens enviadas por automações';
COMMENT ON TABLE automation_configs IS 'Configurações de integração por psicólogo';
COMMENT ON TABLE webhook_logs IS 'Logs de todos os webhooks recebidos';
COMMENT ON TABLE automation_metrics IS 'Métricas diárias de performance das automações';