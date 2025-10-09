-- Migration: Adicionar campos webhook_secret e status_conexao na tabela configuracoes_whatsapp
-- Data: 2025-01-09
-- Descrição: Adiciona campos necessários para configuração completa da Evolution API

-- Adicionar campo webhook_secret
ALTER TABLE configuracoes_whatsapp 
ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(255);

-- Adicionar campo status_conexao
ALTER TABLE configuracoes_whatsapp 
ADD COLUMN IF NOT EXISTS status_conexao VARCHAR(50) DEFAULT 'desconectado';

-- Adicionar constraint para status_conexao
ALTER TABLE configuracoes_whatsapp 
ADD CONSTRAINT check_status_conexao 
CHECK (status_conexao IN ('desconectado', 'conectando', 'conectado', 'erro'));

-- Criar índice para status_conexao
CREATE INDEX IF NOT EXISTS idx_config_whatsapp_status ON configuracoes_whatsapp(status_conexao);

-- Comentário de finalização
COMMENT ON COLUMN configuracoes_whatsapp.webhook_secret IS 'Segredo para validação de webhooks da Evolution API';
COMMENT ON COLUMN configuracoes_whatsapp.status_conexao IS 'Status atual da conexão WhatsApp (desconectado, conectando, conectado, erro)';