-- Migration: Corrigir trigger de validação de prontuários
-- Data: 2025-01-09
-- Descrição: Corrige a função de validação que pode estar interferindo na criação de agendamentos

-- 1. Remover o trigger problemático temporariamente
DROP TRIGGER IF EXISTS trigger_validate_prontuario_agendamento ON prontuarios;

-- 2. Recriar a função de validação com melhor tratamento de erros
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

-- 4. Comentário para documentação
COMMENT ON FUNCTION validate_prontuario_agendamento() IS 'Função corrigida para validar relacionamento agendamento-prontuário sem interferir na criação de agendamentos';