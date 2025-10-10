-- Migration: Limpar dados na ordem correta respeitando foreign keys
-- Data: 2025-01-09
-- Descrição: Limpa dados existentes respeitando as dependências de chave estrangeira

-- 1. Limpar dados na ordem correta (respeitando foreign keys)
DELETE FROM prontuarios;
DELETE FROM transacoes_financeiras;
DELETE FROM agendamentos;
DELETE FROM pacientes;

-- Comentário
COMMENT ON TABLE agendamentos IS 'Dados limpos para recriação - 2025-01-09';
COMMENT ON TABLE pacientes IS 'Dados limpos para recriação - 2025-01-09';