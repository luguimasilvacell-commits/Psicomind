-- Migration: Debug temporário - desabilitar RLS para testar persistência
-- Data: 2025-01-09
-- Descrição: Desabilita temporariamente RLS para identificar se é o problema

-- Desabilitar RLS temporariamente para debug
ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE prontuarios DISABLE ROW LEVEL SECURITY;

-- Comentário
COMMENT ON TABLE agendamentos IS 'RLS temporariamente desabilitado para debug - 2025-01-09';
COMMENT ON TABLE pacientes IS 'RLS temporariamente desabilitado para debug - 2025-01-09';
COMMENT ON TABLE prontuarios IS 'RLS temporariamente desabilitado para debug - 2025-01-09';