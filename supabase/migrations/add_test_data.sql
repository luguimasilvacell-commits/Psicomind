-- Adicionar dados de teste para demonstrar a funcionalidade de filtragem de agendamentos

-- Primeiro, vamos inserir alguns pacientes de teste
INSERT INTO pacientes (id, psicologo_id, nome, telefone, email, status) VALUES
('11111111-1111-1111-1111-111111111111', '975cdada-b05b-4604-b4ab-e664aad693eb', 'Luiz Silva', '(11) 99999-1111', 'luiz.silva@email.com', 'ativo'),
('22222222-2222-2222-2222-222222222222', '975cdada-b05b-4604-b4ab-e664aad693eb', 'Maria Santos', '(11) 99999-2222', 'maria.santos@email.com', 'ativo'),
('33333333-3333-3333-3333-333333333333', '975cdada-b05b-4604-b4ab-e664aad693eb', 'João Oliveira', '(11) 99999-3333', 'joao.oliveira@email.com', 'ativo')
ON CONFLICT (id) DO NOTHING;

-- Agora vamos inserir agendamentos para estes pacientes
INSERT INTO agendamentos (id, paciente_id, psicologo_id, data_hora, duracao_minutos, tipo, valor, status) VALUES
-- Agendamentos para Luiz Silva
('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-09 09:00:00+00', 50, 'consulta', 150.00, 'agendado'),
('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-09 14:00:00+00', 50, 'consulta', 150.00, 'confirmado'),
('aaaa3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-09 16:00:00+00', 50, 'consulta', 150.00, 'agendado'),

-- Agendamentos para Maria Santos
('bbbb1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-09 10:00:00+00', 50, 'consulta', 150.00, 'agendado'),
('bbbb2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-09 15:00:00+00', 50, 'consulta', 150.00, 'confirmado'),

-- Agendamentos para João Oliveira
('cccc1111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-09 11:00:00+00', 50, 'consulta', 150.00, 'agendado')
ON CONFLICT (id) DO NOTHING;