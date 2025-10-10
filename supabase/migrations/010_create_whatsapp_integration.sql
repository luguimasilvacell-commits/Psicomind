-- Migração para integração WhatsApp - Sistema Fernanda Mendes
-- Criação das tabelas necessárias para o fluxo de atendimento automatizado

-- Tabela para histórico de conversas WhatsApp
CREATE TABLE chat_whatsapp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
    telefone VARCHAR(20) NOT NULL,
    mensagem TEXT NOT NULL,
    tipo_mensagem VARCHAR(20) NOT NULL, -- 'text', 'audio', 'image', etc.
    direcao VARCHAR(10) NOT NULL, -- 'incoming', 'outgoing'
    timestamp_whatsapp TIMESTAMP WITH TIME ZONE NOT NULL,
    processado BOOLEAN DEFAULT FALSE,
    metadata JSONB, -- dados adicionais do WhatsApp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para sessões de chat
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telefone VARCHAR(20) UNIQUE NOT NULL,
    paciente_id UUID REFERENCES pacientes(id),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'blocked', 'ended'
    ultimo_acesso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    contexto JSONB, -- contexto da conversa
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para configurações da IA
CREATE TABLE ai_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psicologo_id UUID REFERENCES psicologos(id) ON DELETE CASCADE,
    nome_assistente VARCHAR(100) NOT NULL DEFAULT 'Júlia',
    prompt_sistema TEXT NOT NULL,
    horario_funcionamento JSONB NOT NULL, -- {"seg_sex": "08:00-18:00", "sab": "08