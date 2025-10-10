-- Migration para Sistema de Chat WhatsApp da Fernanda
-- Baseado no fluxo de atendimento analisado do n8n

-- Tabela para histórico de mensagens WhatsApp (chat_whatsapp)
CREATE TABLE chat_whatsapp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone VARCHAR(20) NOT NULL,
    nome VARCHAR(255),
    tipo_mensagem VARCHAR(20) NOT NULL CHECK (tipo_mensagem IN ('texto', 'audio', 'imagem', 'documento')),
    conteudo TEXT NOT NULL,
    conteudo_original TEXT, -- Para áudios transcritos
    metadata JSONB DEFAULT '{}',
    whatsapp_message_id VARCHAR(255),
    timestamp_whatsapp TIMESTAMP WITH TIME ZONE,
    direcao VARCHAR(20) NOT NULL CHECK (direcao IN ('entrada', 'saida')),
    processado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_chat_whatsapp_telefone ON chat_whatsapp(telefone);
CREATE INDEX idx_chat_whatsapp_created_at ON chat_whatsapp(created_at DESC);
CREATE INDEX idx_chat_whatsapp_processado ON chat_whatsapp(processado);
CREATE INDEX idx_chat_whatsapp_tipo ON chat_whatsapp(tipo_mensagem);
CREATE INDEX idx_chat_whatsapp_message_id ON chat_whatsapp(whatsapp_message_id);

-- Tabela para sessões de chat (chat_sessions)
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone VARCHAR(20) NOT NULL,
    session_key VARCHAR(255) NOT NULL, -- Chave para Redis
    agente_bloqueado BOOLEAN DEFAULT false,
    motivo_bloqueio TEXT,
    mensagem_concatenada TEXT DEFAULT '',
    ultima_atividade TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contexto_conversa JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'ativa' CHECK (status IN ('ativa', 'pausada', 'finalizada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(telefone)
);

-- Índices para sessões
CREATE INDEX idx_chat_sessions_telefone ON chat_sessions(telefone);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_agente_bloqueado ON chat_sessions(agente_bloqueado);
CREATE INDEX idx_chat_sessions_ultima_atividade ON chat_sessions(ultima_atividade DESC);

-- Tabela para configuração da IA Júlia (ai_config)
CREATE TABLE ai_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL DEFAULT 'Júlia',
    prompt_sistema TEXT NOT NULL,
    modelo_ia VARCHAR(50) NOT NULL DEFAULT 'gpt-4',
    temperatura DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 1000,
    configuracoes_extras JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    versao INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para configuração da IA
CREATE INDEX idx_ai_config_ativo ON ai_config(ativo);
CREATE INDEX idx_ai_config_versao ON ai_config(versao DESC);

-- Tabela para logs de processamento de mensagens
CREATE TABLE chat_processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone VARCHAR(20) NOT NULL,
    tipo_processamento VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('sucesso', 'erro', 'processando')),
    detalhes JSONB DEFAULT '{}',
    erro_mensagem TEXT,
    tempo_processamento INTEGER, -- em milissegundos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para logs
CREATE INDEX idx_chat_processing_logs_telefone ON chat_processing_logs(telefone);
CREATE INDEX idx_chat_processing_logs_status ON chat_processing_logs(status);
CREATE INDEX idx_chat_processing_logs_created_at ON chat_processing_logs(created_at DESC);

-- Tabela para controle de bloqueio de agente
CREATE TABLE agent_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone VARCHAR(20) NOT NULL,
    bloqueado BOOLEAN DEFAULT false,
    motivo TEXT,
    bloqueado_em TIMESTAMP WITH TIME ZONE,
    desbloqueado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(telefone)
);

-- Índices para bloqueios
CREATE INDEX idx_agent_blocks_telefone ON agent_blocks(telefone);
CREATE INDEX idx_agent_blocks_bloqueado ON agent_blocks(bloqueado);

-- Habilitar RLS nas novas tabelas
ALTER TABLE chat_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_blocks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para chat_whatsapp
CREATE POLICY "Acesso total para authenticated" ON chat_whatsapp
    FOR ALL USING (true);

-- Políticas RLS para chat_sessions
CREATE POLICY "Acesso total para authenticated" ON chat_sessions
    FOR ALL USING (true);

-- Políticas RLS para ai_config
CREATE POLICY "Acesso total para authenticated" ON ai_config
    FOR ALL USING (true);

-- Políticas RLS para chat_processing_logs
CREATE POLICY "Acesso total para authenticated" ON chat_processing_logs
    FOR ALL USING (true);

-- Políticas RLS para agent_blocks
CREATE POLICY "Acesso total para authenticated" ON agent_blocks
    FOR ALL USING (true);

-- Conceder permissões
GRANT ALL PRIVILEGES ON chat_whatsapp TO authenticated;
GRANT ALL PRIVILEGES ON chat_sessions TO authenticated;
GRANT ALL PRIVILEGES ON ai_config TO authenticated;
GRANT ALL PRIVILEGES ON chat_processing_logs TO authenticated;
GRANT ALL PRIVILEGES ON agent_blocks TO authenticated;

GRANT ALL PRIVILEGES ON chat_whatsapp TO anon;
GRANT ALL PRIVILEGES ON chat_sessions TO anon;
GRANT ALL PRIVILEGES ON ai_config TO anon;
GRANT ALL PRIVILEGES ON chat_processing_logs TO anon;
GRANT ALL PRIVILEGES ON agent_blocks TO anon;

-- Inserir configuração padrão da IA Júlia
INSERT INTO ai_config (
    nome,
    prompt_sistema,
    modelo_ia,
    temperatura,
    max_tokens,
    configuracoes_extras
) VALUES (
    'Júlia',
    'Você é a Júlia, uma atendente virtual especializada em atendimento psicológico. Você trabalha para a psicóloga Fernanda Mendes e deve:

1. Ser sempre empática, acolhedora e profissional
2. Ajudar com agendamentos, reagendamentos e cancelamentos
3. Fornecer informações sobre os serviços da psicóloga
4. Manter o foco no bem-estar do paciente
5. Encaminhar casos complexos para a psicóloga
6. Respeitar a confidencialidade e ética profissional

Sempre responda de forma clara e objetiva, mantendo um tom acolhedor e profissional.',
    'gpt-4',
    0.7,
    1000,
    '{
        "provider": "openai",
        "backup_model": "gpt-3.5-turbo",
        "max_retries": 3,
        "timeout": 30000
    }'::jsonb
);

-- Função para atualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_chat_whatsapp_updated_at 
    BEFORE UPDATE ON chat_whatsapp 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_config_updated_at 
    BEFORE UPDATE ON ai_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_blocks_updated_at 
    BEFORE UPDATE ON agent_blocks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();