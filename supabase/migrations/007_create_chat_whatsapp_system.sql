-- Migration para Sistema de Chat WhatsApp
-- Baseado na arquitetura técnica definida na documentação

-- Tabela de Conversas
CREATE TABLE conversas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psicologo_id UUID NOT NULL REFERENCES psicologos(id) ON DELETE CASCADE,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    ultima_mensagem TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativa BOOLEAN DEFAULT true,
    mensagens_nao_lidas INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(psicologo_id, paciente_id)
);

-- Índices para performance
CREATE INDEX idx_conversas_psicologo_id ON conversas(psicologo_id);
CREATE INDEX idx_conversas_paciente_id ON conversas(paciente_id);
CREATE INDEX idx_conversas_ultima_mensagem ON conversas(ultima_mensagem DESC);
CREATE INDEX idx_conversas_ativa ON conversas(ativa);

-- Tabela de Mensagens
CREATE TABLE mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
    conteudo TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'texto' CHECK (tipo IN ('texto', 'imagem', 'audio', 'documento')),
    direcao VARCHAR(20) NOT NULL CHECK (direcao IN ('enviada', 'recebida')),
    status_entrega VARCHAR(20) DEFAULT 'enviando' CHECK (status_entrega IN ('enviando', 'entregue', 'lida', 'erro')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Campos específicos para integração WhatsApp
    whatsapp_message_id VARCHAR(255),
    reply_to_message_id UUID REFERENCES mensagens(id)
);

-- Índices para performance
CREATE INDEX idx_mensagens_conversa_id ON mensagens(conversa_id);
CREATE INDEX idx_mensagens_created_at ON mensagens(created_at DESC);
CREATE INDEX idx_mensagens_status ON mensagens(status_entrega);
CREATE INDEX idx_mensagens_whatsapp_id ON mensagens(whatsapp_message_id);

-- Tabela de Configurações WhatsApp
CREATE TABLE configuracoes_whatsapp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psicologo_id UUID NOT NULL REFERENCES psicologos(id) ON DELETE CASCADE,
    evolution_api_url VARCHAR(255) NOT NULL,
    evolution_api_key VARCHAR(255) NOT NULL,
    instance_name VARCHAR(100) NOT NULL,
    numero_whatsapp VARCHAR(20),
    ativo BOOLEAN DEFAULT false,
    webhook_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(psicologo_id)
);

-- Índices
CREATE INDEX idx_config_whatsapp_psicologo_id ON configuracoes_whatsapp(psicologo_id);
CREATE INDEX idx_config_whatsapp_ativo ON configuracoes_whatsapp(ativo);

-- Tabela de Logs de Auditoria para Chat
CREATE TABLE chat_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psicologo_id UUID REFERENCES psicologos(id),
    paciente_id UUID REFERENCES pacientes(id),
    action_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (action_type IN (
        'message_sent', 'message_received', 'message_read',
        'conversation_accessed', 'data_exported', 'config_changed'
    )),
    
    CHECK (resource_type IN (
        'message', 'conversation', 'configuration', 'export'
    ))
);

-- Índices para consultas de auditoria
CREATE INDEX idx_chat_audit_psicologo ON chat_audit_logs(psicologo_id);
CREATE INDEX idx_chat_audit_timestamp ON chat_audit_logs(timestamp DESC);
CREATE INDEX idx_chat_audit_action ON chat_audit_logs(action_type);

-- Tabela para registro de consentimentos LGPD
CREATE TABLE chat_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id),
    consent_type VARCHAR(50) NOT NULL,
    consent_text TEXT NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    evidence JSONB DEFAULT '{}',
    
    CHECK (consent_type IN (
        'whatsapp_communication', 'data_processing', 
        'data_retention', 'data_sharing'
    ))
);

-- Índices para consentimentos
CREATE INDEX idx_chat_consent_paciente ON chat_consent_records(paciente_id);
CREATE INDEX idx_chat_consent_type ON chat_consent_records(consent_type);

-- Habilitar RLS nas novas tabelas
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_consent_records ENABLE ROW LEVEL SECURITY;

-- Políticas para conversas
CREATE POLICY "Psicólogos podem ver suas conversas" ON conversas
    FOR ALL USING (psicologo_id = auth.uid());

-- Políticas para mensagens
CREATE POLICY "Psicólogos podem ver mensagens de suas conversas" ON mensagens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM conversas 
            WHERE conversas.id = mensagens.conversa_id 
            AND conversas.psicologo_id = auth.uid()
        )
    );

-- Políticas para configurações
CREATE POLICY "Psicólogos podem gerenciar suas configurações" ON configuracoes_whatsapp
    FOR ALL USING (psicologo_id = auth.uid());

-- Políticas para logs de auditoria
CREATE POLICY "Psicólogos podem ver seus logs" ON chat_audit_logs
    FOR SELECT USING (psicologo_id = auth.uid());

-- Políticas para consentimentos
CREATE POLICY "Psicólogos podem ver consentimentos de seus pacientes" ON chat_consent_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM pacientes 
            WHERE pacientes.id = chat_consent_records.paciente_id 
            AND pacientes.psicologo_id = auth.uid()
        )
    );

-- Conceder permissões
GRANT ALL PRIVILEGES ON conversas TO authenticated;
GRANT ALL PRIVILEGES ON mensagens TO authenticated;
GRANT ALL PRIVILEGES ON configuracoes_whatsapp TO authenticated;
GRANT SELECT ON chat_audit_logs TO authenticated;
GRANT ALL PRIVILEGES ON chat_consent_records TO authenticated;

-- Inserir configuração padrão para psicólogos existentes
INSERT INTO configuracoes_whatsapp (psicologo_id, evolution_api_url, evolution_api_key, instance_name)
SELECT 
    id,
    'https://api.evolution.com',
    'sua_api_key_aqui',
    'psicomind_' || LOWER(REPLACE(nome, ' ', '_'))
FROM psicologos
WHERE NOT EXISTS (
    SELECT 1 FROM configuracoes_whatsapp 
    WHERE configuracoes_whatsapp.psicologo_id = psicologos.id
);