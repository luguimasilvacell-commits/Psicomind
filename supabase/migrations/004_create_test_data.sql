-- Criar dados de teste para WhatsApp
-- Este arquivo cria um psicólogo e um paciente de teste para validar o sistema de WhatsApp

-- Inserir psicólogo de teste (se não existir)
INSERT INTO psicologos (id, email, nome, crp, telefone, senha_hash, role)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'admin@psicomind.com',
  'Dr. Admin Teste',
  'CRP-06/123456',
  '(11) 98765-4321',
  '$2a$12$LQv3c1yqBwEHxv68JaMCOeYpjb2vn7hOyVuMusbVdXXN.JrO3zO6.',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Inserir paciente de teste para WhatsApp (se não existir)
INSERT INTO pacientes (
  id,
  psicologo_id,
  nome,
  telefone,
  email,
  cpf,
  data_nascimento,
  status
) VALUES (
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Paciente Teste WhatsApp',
  '(11) 99999-9999',
  'teste.whatsapp@email.com',
  '123.456.789-00',
  '1990-01-01',
  'ativo'
) ON CONFLICT (cpf) DO UPDATE SET
  telefone = EXCLUDED.telefone,
  email = EXCLUDED.email,
  updated_at = now();

-- Comentário para logs
COMMENT ON TABLE pacientes IS 'Dados de teste criados para validação do WhatsApp';