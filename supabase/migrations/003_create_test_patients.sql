-- DADOS DE TESTE REMOVIDOS - Migration 20250109_clean_test_data.sql
-- Para reativar dados de teste, descomente as linhas abaixo

/*
-- Inserir pacientes de teste para o psicólogo existente
INSERT INTO pacientes (nome, cpf, email, telefone, data_nascimento, endereco, psicologo_id)
SELECT 
  'Maria Silva',
  '123.456.789-01',
  'maria.silva@email.com',
  '(11) 98765-4321',
  '1985-03-15',
  '{"rua": "Rua das Flores, 123", "cidade": "São Paulo", "estado": "SP"}'::jsonb,
  p.id
FROM psicologos p 
WHERE p.email = 'teste@psicomind.com'
ON CONFLICT (cpf) DO NOTHING;

INSERT INTO pacientes (nome, cpf, email, telefone, data_nascimento, endereco, psicologo_id)
SELECT 
  'João Santos',
  '234.567.890-12',
  'joao.santos@email.com',
  '(11) 97654-3210',
  '1990-07-22',
  '{"rua": "Av. Paulista, 456", "cidade": "São Paulo", "estado": "SP"}'::jsonb,
  p.id
FROM psicologos p 
WHERE p.email = 'teste@psicomind.com'
ON CONFLICT (cpf) DO NOTHING;

INSERT INTO pacientes (nome, cpf, email, telefone, data_nascimento, endereco, psicologo_id)
SELECT 
  'Ana Costa',
  '345.678.901-23',
  'ana.costa@email.com',
  '(11) 96543-2109',
  '1988-11-08',
  '{"rua": "Rua Augusta, 789", "cidade": "São Paulo", "estado": "SP"}'::jsonb,
  p.id
FROM psicologos p 
WHERE p.email = 'teste@psicomind.com'
ON CONFLICT (cpf) DO NOTHING;
*/