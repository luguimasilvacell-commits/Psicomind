-- Migration: Limpar todos os dados de teste/mocados
-- Remove dados de teste mantendo apenas estrutura das tabelas

-- Limpar dados de teste em ordem (respeitando foreign keys)

-- 1. Limpar transações financeiras de teste
DELETE FROM transacoes_financeiras 
WHERE paciente_id IN (
  SELECT id FROM pacientes 
  WHERE psicologo_id = '1da6af50-2658-4047-873e-04ba7fde3e52'
);

-- 2. Limpar prontuários de teste
DELETE FROM prontuarios 
WHERE paciente_id IN (
  SELECT id FROM pacientes 
  WHERE psicologo_id = '1da6af50-2658-4047-873e-04ba7fde3e52'
);

-- 3. Limpar agendamentos de teste
DELETE FROM agendamentos 
WHERE paciente_id IN (
  SELECT id FROM pacientes 
  WHERE psicologo_id = '1da6af50-2658-4047-873e-04ba7fde3e52'
);

-- 4. Limpar pacientes de teste
DELETE FROM pacientes 
WHERE psicologo_id = '1da6af50-2658-4047-873e-04ba7fde3e52'
   OR cpf IN ('123.456.789-01', '234.567.890-12', '345.678.901-23')
   OR email IN ('maria.silva@email.com', 'joao.santos@email.com', 'ana.costa@email.com');

-- 5. Limpar psicólogo de teste (mantém apenas admin)
DELETE FROM psicologos 
WHERE email = 'teste@psicomind.com' 
   OR id = '1da6af50-2658-4047-873e-04ba7fde3e52';

-- 6. Limpar outros dados de teste que possam existir
-- Remover agendamentos órfãos
DELETE FROM agendamentos WHERE paciente_id NOT IN (SELECT id FROM pacientes);

-- Remover prontuários órfãos
DELETE FROM prontuarios WHERE paciente_id NOT IN (SELECT id FROM pacientes);

-- Remover transações órfãs
DELETE FROM transacoes_financeiras WHERE paciente_id NOT IN (SELECT id FROM pacientes);

-- Reset das sequences (se necessário)
-- ALTER SEQUENCE IF EXISTS pacientes_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS agendamentos_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS prontuarios_id_seq RESTART WITH 1;

-- Comentário final
COMMENT ON TABLE pacientes IS 'Tabela limpa - dados de teste removidos';
COMMENT ON TABLE agendamentos IS 'Tabela limpa - dados de teste removidos';
COMMENT ON TABLE prontuarios IS 'Tabela limpa - dados de teste removidos';
COMMENT ON TABLE transacoes_financeiras IS 'Tabela limpa - dados de teste removidos';