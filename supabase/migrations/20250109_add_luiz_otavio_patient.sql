-- Adicionar paciente Luiz Otávio para teste
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
  '11111111-1111-1111-1111-111111111111', -- ID do psicólogo de teste
  'Luiz Otávio',
  '(11) 99999-9999',
  'luiz.otavio@email.com',
  '1990-05-15',
  'ativo'
);

-- Adicionar agendamento para Luiz Otávio
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
  '11111111-1111-1111-1111-111111111111', -- ID do psicólogo de teste
  '66666666-6666-6666-6666-666666666666', -- ID do Luiz Otávio
  '2025-01-15T10:00:00+00:00',
  60,
  'consulta',
  'confirmado',
  150.00
);