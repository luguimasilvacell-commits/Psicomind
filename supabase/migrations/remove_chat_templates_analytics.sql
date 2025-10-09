-- Migration para remover entidades: Templates, Histórico de Chat e Analytics IA
-- Data: 2025-01-09

-- Remover políticas RLS relacionadas ao chat_historico
DROP POLICY IF EXISTS "Psicólogos podem ver seu histórico de chat" ON chat_historico;

-- Remover políticas RLS relacionadas às conversas_pacientes
DROP POLICY IF EXISTS "Psicólogos podem ver suas próprias conversas" ON conversas_pacientes;
DROP POLICY IF EXISTS "Psicólogos podem inserir conversas" ON conversas_pacientes;
DROP POLICY IF EXISTS "Psicólogos podem atualizar suas conversas" ON conversas_pacientes;

-- Remover índices das tabelas que serão removidas
DROP INDEX IF EXISTS idx_chat_psicologo_id;
DROP INDEX IF EXISTS idx_chat_numero;
DROP INDEX IF EXISTS idx_chat_created_at;

DROP INDEX IF EXISTS idx_conversas_pacientes_psicologo_id;
DROP INDEX IF EXISTS idx_conversas_pacientes_paciente_id;
DROP INDEX IF EXISTS idx_conversas_pacientes_created_at;
DROP INDEX IF EXISTS idx_conversas_pacientes_tipo;

-- Remover tabelas relacionadas a chat e templates
DROP TABLE IF EXISTS conversas_pacientes CASCADE;
DROP TABLE IF EXISTS chat_historico CASCADE;

-- Remover tabelas relacionadas a templates (caso existam)
DROP TABLE IF EXISTS message_templates CASCADE;
DROP TABLE IF EXISTS template_analytics CASCADE;
DROP TABLE IF EXISTS template_usage CASCADE;

-- Remover tabelas relacionadas a analytics IA (caso existam)
DROP TABLE IF EXISTS ai_analytics CASCADE;
DROP TABLE IF EXISTS sentiment_analysis CASCADE;
DROP TABLE IF EXISTS ai_interactions CASCADE;

-- Comentário de finalização
-- Esta migration remove completamente as funcionalidades de:
-- 1. Histórico de Chat (chat_historico, conversas_pacientes)
-- 2. Templates de mensagem (message_templates, template_analytics, template_usage)
-- 3. Analytics IA (ai_analytics, sentiment_analysis, ai_interactions)