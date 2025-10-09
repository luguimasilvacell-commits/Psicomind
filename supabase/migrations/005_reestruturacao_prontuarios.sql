-- Migration: Reestruturação do sistema de prontuários
-- Data: 2025-01-08
-- Descrição: Implementa relacionamento 1:1 entre agendamentos e prontuários

-- 1. Adicionar campo status_sessao em agendamentos
ALTER TABLE agendamentos 
ADD COLUMN IF NOT EXISTS status_sessao VARCHAR(20) DEFAULT 'nao_iniciada' 
CHECK (status_sessao IN ('nao_iniciada', 'em_andamento', 'finalizada'));

-- 2. Adicionar constraint única para agendamento_id em prontuarios (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uk_prontuarios_agendamento_id' 
        AND table_name = 'prontuarios'
    ) THEN
        ALTER TABLE prontuarios 
        ADD CONSTRAINT uk_prontuarios_agendamento_id UNIQUE (agendamento_id);
    END IF;
END $$;

-- 3. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_prontuarios_agendamento_id ON prontuarios(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status_sessao ON agendamentos(status_sessao);
CREATE INDEX IF NOT EXISTS idx_prontuarios_data_sessao_paciente ON prontuarios(paciente_id, data_sessao DESC);

-- 4. Criar função para validar relacionamento agendamento-prontuário
CREATE OR REPLACE FUNCTION validate_prontuario_agendamento()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se agendamento existe e pertence ao mesmo psicólogo
    IF NEW.agendamento_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM agendamentos 
            WHERE id = NEW.agendamento_id 
            AND psicologo_id = NEW.psicologo_id
            AND paciente_id = NEW.paciente_id
        ) THEN
            RAISE EXCEPTION 'Agendamento não encontrado ou não pertence ao mesmo psicólogo/paciente';
        END IF;
        
        -- Verificar se agendamento já possui prontuário
        IF EXISTS (
            SELECT 1 FROM prontuarios 
            WHERE agendamento_id = NEW.agendamento_id 
            AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) THEN
            RAISE EXCEPTION 'Este agendamento já possui um prontuário';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para validação (remover se existir)
DROP TRIGGER IF EXISTS trigger_validate_prontuario_agendamento ON prontuarios;
CREATE TRIGGER trigger_validate_prontuario_agendamento
    BEFORE INSERT OR UPDATE ON prontuarios
    FOR EACH ROW
    EXECUTE FUNCTION validate_prontuario_agendamento();

-- 6. Criar função para atualizar status do agendamento
CREATE OR REPLACE FUNCTION update_agendamento_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando prontuário é criado, marcar agendamento como finalizado
    IF TG_OP = 'INSERT' AND NEW.agendamento_id IS NOT NULL THEN
        UPDATE agendamentos 
        SET status_sessao = 'finalizada',
            status = 'realizado'
        WHERE id = NEW.agendamento_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar trigger para atualização automática de status (remover se existir)
DROP TRIGGER IF EXISTS trigger_update_agendamento_status ON prontuarios;
CREATE TRIGGER trigger_update_agendamento_status
    AFTER INSERT ON prontuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_agendamento_status();

-- 8. Atualizar políticas RLS para incluir agendamento_id
DROP POLICY IF EXISTS "Psicólogos podem ver prontuários de seus pacientes" ON prontuarios;

CREATE POLICY "Psicólogos podem ver prontuários de seus pacientes" ON prontuarios
    FOR ALL USING (
        auth.uid()::text = psicologo_id::text
        OR EXISTS (
            SELECT 1 FROM pacientes 
            WHERE pacientes.id = prontuarios.paciente_id 
            AND pacientes.psicologo_id::text = auth.uid()::text
        )
    );

-- 9. Criar view para histórico do paciente
CREATE OR REPLACE VIEW vw_historico_paciente AS
SELECT 
    p.id as paciente_id,
    p.nome as paciente_nome,
    a.id as agendamento_id,
    a.data_hora,
    a.duracao_minutos,
    a.tipo as tipo_sessao,
    a.valor,
    a.status as status_agendamento,
    a.status_sessao,
    pr.id as prontuario_id,
    pr.diagnostico,
    pr.observacoes,
    pr.plano_tratamento,
    pr.duracao_sessao_segundos,
    pr.created_at as prontuario_criado_em,
    CASE 
        WHEN pr.id IS NOT NULL THEN true 
        ELSE false 
    END as tem_prontuario
FROM pacientes p
LEFT JOIN agendamentos a ON a.paciente_id = p.id
LEFT JOIN prontuarios pr ON pr.agendamento_id = a.id
ORDER BY p.id, a.data_hora DESC;

-- 10. Conceder permissões na view
GRANT SELECT ON vw_historico_paciente TO authenticated;

-- 11. Comentários para documentação
COMMENT ON CONSTRAINT uk_prontuarios_agendamento_id ON prontuarios IS 'Garante relacionamento 1:1 entre agendamento e prontuário';
COMMENT ON COLUMN agendamentos.status_sessao IS 'Status específico da sessão: nao_iniciada, em_andamento, finalizada';
COMMENT ON VIEW vw_historico_paciente IS 'View para consulta otimizada do histórico completo do paciente';