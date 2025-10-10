-- Buscar o primeiro psicólogo existente e criar paciente Luiz Otávio
DO $$
DECLARE
    psicologo_uuid UUID;
BEGIN
    -- Buscar o primeiro psicólogo existente
    SELECT id INTO psicologo_uuid FROM psicologos LIMIT 1;
    
    -- Se encontrou um psicólogo, criar o paciente
    IF psicologo_uuid IS NOT NULL THEN
        -- Inserir paciente Luiz Otávio
        INSERT INTO pacientes (
            id,
            psicologo_id,
            nome,
            telefone,
            email,
            data_nascimento,
            status
        ) VALUES (
            '66666666-6666-6666-6666-666666666666',
            psicologo_uuid,
            'Luiz Otávio',
            '(11) 99999-9999',
            'luiz.otavio@email.com',
            '1990-05-15',
            'ativo'
        ) ON CONFLICT (id) DO UPDATE SET
            nome = EXCLUDED.nome,
            telefone = EXCLUDED.telefone,
            email = EXCLUDED.email;

        -- Inserir agendamento para Luiz Otávio
        INSERT INTO agendamentos (
            id,
            psicologo_id,
            paciente_id,
            data_hora,
            duracao_minutos,
            tipo,
            status,
            valor
        ) VALUES (
            'eeee1111-1111-1111-1111-111111111111',
            psicologo_uuid,
            '66666666-6666-6666-6666-666666666666',
            '2025-01-15T10:00:00+00:00',
            60,
            'consulta',
            'confirmado',
            150.00
        ) ON CONFLICT (id) DO UPDATE SET
            data_hora = EXCLUDED.data_hora,
            status = EXCLUDED.status;
    END IF;
END $$;