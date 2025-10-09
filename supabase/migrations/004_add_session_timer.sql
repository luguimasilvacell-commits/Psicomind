-- Migration: Adicionar campos de cronometragem à tabela prontuarios
-- Data: 2025-01-08
-- Descrição: Adiciona campos para controle de tempo de sessão nos prontuários

-- Adicionar campos de cronometragem à tabela prontuarios
ALTER TABLE prontuarios 
ADD COLUMN duracao_sessao_segundos INTEGER DEFAULT 0,
ADD COLUMN tempo_inicio_sessao TIMESTAMP WITH TIME ZONE,
ADD COLUMN tempo_fim_sessao TIMESTAMP WITH TIME ZONE;

-- Adicionar índice para consultas por duração
CREATE INDEX idx_prontuarios_duracao ON prontuarios(duracao_sessao_segundos);

-- Adicionar comentários para documentação
COMMENT ON COLUMN prontuarios.duracao_sessao_segundos IS 'Duração total da sessão em segundos';
COMMENT ON COLUMN prontuarios.tempo_inicio_sessao IS 'Timestamp do início da sessão';
COMMENT ON COLUMN prontuarios.tempo_fim_sessao IS 'Timestamp do fim da sessão';

-- Adicionar constraint para garantir que duração seja positiva
ALTER TABLE prontuarios 
ADD CONSTRAINT check_duracao_positiva 
CHECK (duracao_sessao_segundos >= 0);

-- Adicionar constraint para garantir que tempo de fim seja posterior ao início
ALTER TABLE prontuarios 
ADD CONSTRAINT check_tempo_sessao_valido 
CHECK (tempo_fim_sessao IS NULL OR tempo_inicio_sessao IS NULL OR tempo_fim_sessao >= tempo_inicio_sessao);