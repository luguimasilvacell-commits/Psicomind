-- Migration: Corrigir problema de persistência de agendamentos
-- Data: 2025-01-09
-- Descrição: Corrige triggers e validações que podem estar interferindo na criação de agendamentos

-- 1. Remover temporariamente o trigger problemático
DROP TRIGGER IF EXISTS trigger_validate_prontuario_agendamento ON prontuarios;

-- 2. Recriar a função de validação simplificada
CREATE OR REPLACE FUNCTION validate_prontuario_agendamento()
RETURNS TRIGGER AS $$
BEGIN
    -- Só validar se agendamento_id não for nulo
    IF NEW.agendamento_id IS NOT NULL THEN
        -- Verificar se agendamento existe
        IF NOT EXISTS (
            SELECT 1 FROM agendamentos 
            WHERE id = NEW.agendamento_id
        ) THEN
            RAISE EXCEPTION 'Agendamento não encontrado';
        END IF;
        
        -- Verificar se agendamento já possui prontuário (apenas para novos registros)
        IF TG_OP = 'INSERT' AND EXISTS (
            SELECT 1 FROM prontuarios 
            WHERE agendamento_id = NEW.agendamento_id
        ) THEN
            RAISE EXCEPTION 'Este agendamento já possui um prontuário';
        END IF;
        
        -- Para updates, verificar se não está duplicando agendamento_id
        IF TG_OP = 'UPDATE' AND EXISTS (
            SELECT 1 FROM prontuarios 
            WHERE agendamento_id = NEW.agendamento_id 
            AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'Este agendamento já possui um prontuário';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recriar o trigger com a função corrigida
CREATE TRIGGER trigger_validate_prontuario_agendamento
    BEFORE INSERT OR UPDATE ON prontuarios
    FOR EACH ROW
    EXECUTE FUNCTION validate_prontuario_agendamento();

-- 4. Verificar se há problemas com RLS (Row Level Security)
-- Temporariamente desabilitar RLS para debug se necessário
-- ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;

-- 5. Comentário para documentação
COMMENT ON FUNCTION validate_prontuario_agendamento() IS 'Função corrigida para validar relacionamento agendamento-prontuário sem interferir na criação de agendamentos';

-- 6. Verificar índices para performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_psicologo_data ON agendamentos(psicologo_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamentos_paciente_data ON agendamentos(paciente_id, data_hora);