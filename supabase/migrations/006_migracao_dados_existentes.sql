-- Migration: Migração de dados existentes para nova estrutura
-- Data: 2025-01-08
-- Descrição: Vincula prontuários existentes aos agendamentos correspondentes

-- 1. Backup dos dados atuais
CREATE TABLE IF NOT EXISTS prontuarios_backup AS SELECT * FROM prontuarios WHERE 1=0;
INSERT INTO prontuarios_backup SELECT * FROM prontuarios WHERE agendamento_id IS NULL;

-- 2. Tentar vincular prontuários existentes aos agendamentos
-- Baseado na data da sessão e paciente
UPDATE prontuarios 
SET agendamento_id = (
    SELECT a.id 
    FROM agendamentos a 
    WHERE a.paciente_id = prontuarios.paciente_id
    AND DATE(a.data_hora) = DATE(prontuarios.data_sessao)
    AND a.status IN ('realizado', 'confirmado')
    ORDER BY ABS(EXTRACT(EPOCH FROM (a.data_hora - prontuarios.data_sessao)))
    LIMIT 1
)
WHERE agendamento_id IS NULL
AND EXISTS (
    SELECT 1 FROM agendamentos a 
    WHERE a.paciente_id = prontuarios.paciente_id
    AND DATE(a.data_hora) = DATE(prontuarios.data_sessao)
);

-- 3. Para prontuários que não puderam ser vinculados,
-- criar agendamentos retroativos
INSERT INTO agendamentos (
    paciente_id, 
    psicologo_id, 
    data_hora, 
    duracao_minutos, 
    tipo, 
    valor, 
    status,
    status_sessao,
    observacoes,
    created_at
)
SELECT 
    pr.paciente_id,
    pr.psicologo_id,
    pr.data_sessao,
    COALESCE(pr.duracao_sessao_segundos / 60, 50) as duracao_minutos,
    'consulta' as tipo,
    0.00 as valor, -- Valor padrão, pode ser ajustado manualmente
    'realizado' as status,
    'finalizada' as status_sessao,
    'Agendamento criado automaticamente durante migração' as observacoes,
    pr.created_at
FROM prontuarios pr
WHERE pr.agendamento_id IS NULL;

-- 4. Vincular prontuários aos agendamentos recém-criados
UPDATE prontuarios 
SET agendamento_id = (
    SELECT a.id 
    FROM agendamentos a 
    WHERE a.paciente_id = prontuarios.paciente_id
    AND a.data_hora = prontuarios.data_sessao
    AND a.observacoes LIKE '%migração%'
    LIMIT 1
)
WHERE agendamento_id IS NULL;

-- 5. Atualizar agendamentos existentes que já têm prontuários
UPDATE agendamentos 
SET status_sessao = 'finalizada',
    status = 'realizado'
WHERE id IN (
    SELECT DISTINCT agendamento_id 
    FROM prontuarios 
    WHERE agendamento_id IS NOT NULL
)
AND status_sessao = 'nao_iniciada';

-- 6. Verificar integridade da migração
DO $$
DECLARE
    total_prontuarios INTEGER;
    prontuarios_vinculados INTEGER;
    prontuarios_sem_vinculo INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_prontuarios FROM prontuarios;
    SELECT COUNT(agendamento_id) INTO prontuarios_vinculados FROM prontuarios;
    prontuarios_sem_vinculo := total_prontuarios - prontuarios_vinculados;
    
    RAISE NOTICE 'Migração concluída:';
    RAISE NOTICE 'Total de prontuários: %', total_prontuarios;
    RAISE NOTICE 'Prontuários vinculados: %', prontuarios_vinculados;
    RAISE NOTICE 'Prontuários sem vínculo: %', prontuarios_sem_vinculo;
    
    IF prontuarios_sem_vinculo > 0 THEN
        RAISE WARNING 'Existem % prontuários sem vínculo que requerem atenção manual', prontuarios_sem_vinculo;
    END IF;
END $$;