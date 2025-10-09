-- Inserir psicólogo de teste
INSERT INTO psicologos (id, email, nome, crp, telefone, senha_hash)
VALUES (
  '1da6af50-2658-4047-873e-04ba7fde3e52',
  'teste@psicomind.com',
  'Dr. Teste',
  'CRP-01/12345',
  '(11) 99999-9999',
  'dummy_hash'
) ON CONFLICT (id) DO NOTHING;

-- Inserir pacientes de teste
INSERT INTO pacientes (nome, email, telefone, data_nascimento, endereco, psicologo_id)
VALUES 
  (
    'Maria Silva',
    'maria.silva@email.com',
    '(11) 98765-4321',
    '1985-03-15',
    'Rua das Flores, 123 - São Paulo, SP',
    '1da6af50-2658-4047-873e-04ba7fde3e52'
  ),
  (
    'João Santos',
    'joao.santos@email.com',
    '(11) 97654-3210',
    '1990-07-22',
    'Av. Paulista, 456 - São Paulo, SP',
    '1da6af50-2658-4047-873e-04ba7fde3e52'
  ),
  (
    'Ana Costa',
    'ana.costa@email.com',
    '(11) 96543-2109',
    '1988-11-08',
    'Rua Augusta, 789 - São Paulo, SP',
    '1da6af50-2658-4047-873e-04ba7fde3e52'
  )