-- Migration: Limpar e recriar dados com vínculos corretos
-- Data: 2025-01-09
-- Descrição: Limpa e recria dados de agendamentos com vínculos corretos

-- 1. Limpar dados na ordem correta
DELETE FROM prontuarios;
DELETE FROM transacoes_financeiras;
DELETE FROM agendamentos;
DELETE FROM pacientes;

-- 2. Recriar pacientes com dados completos
INSERT INTO pacientes (
    id, 
    psicologo_id, 
    nome, 
    cpf, 
    telefone, 
    email, 
    data_nascimento, 
    endereco,
    cep,
    cidade,
    estado,
    profissao,
    estado_civil,
    contato_emergencia,
    observacoes,
    status
) VALUES
('11111111-1111-1111-1111-111111111111', '975cdada-b05b-4604-b4ab-e664aad693eb', 'Ana Silva Costa', '123.456.789-01', '(11) 99999-1111', 'ana.silva@email.com', '1990-03-15', '{"rua": "Rua das Flores, 123", "bairro": "Centro"}', '01234-567', 'São Paulo', 'SP', 'Professora', 'solteiro', '(11) 88888-1111', 'Paciente com ansiedade generalizada', 'ativo'),
('22222222-2222-2222-2222-222222222222', '975cdada-b05b-4604-b4ab-e664aad693eb', 'Carlos Oliveira Santos', '987.654.321-02', '(11) 99999-2222', 'carlos.oliveira@email.com', '1985-07-22', '{"rua": "Av. Paulista, 456", "bairro": "Bela Vista"}', '01310-100', 'São Paulo', 'SP', 'Engenheiro', 'casado', '(11) 88888-2222', 'Paciente com depressão leve', 'ativo'),
('33333333-3333-3333-3333-333333333333', '975cdada-b05b-4604-b4ab-e664aad693eb', 'Maria Santos Lima', '456.789.123-03', '(11) 99999-3333', 'maria.santos@email.com', '1992-11-08', '{"rua": "Rua Augusta, 789", "bairro": "Consolação"}', '01305-000', 'São Paulo', 'SP', 'Designer', 'divorciado', '(11) 88888-3333', 'Paciente com síndrome do pânico', 'ativo'),
('44444444-4444-4444-4444-444444444444', '975cdada-b05b-4604-b4ab-e664aad693eb', 'João Pedro Almeida', '321.654.987-04', '(11) 99999-4444', 'joao.pedro@email.com', '1988-12-03', '{"rua": "Rua Oscar Freire, 321", "bairro": "Jardins"}', '01426-001', 'São Paulo', 'SP', 'Advogado', 'casado', '(11) 88888-4444', 'Paciente com transtorno bipolar', 'ativo'),
('55555555-5555-5555-5555-555555555555', '975cdada-b05b-4604-b4ab-e664aad693eb', 'Fernanda Costa Silva', '159.753.486-05', '(11) 99999-5555', 'fernanda.costa@email.com', '1995-04-18', '{"rua": "Rua Haddock Lobo, 654", "bairro": "Cerqueira César"}', '01414-001', 'São Paulo', 'SP', 'Psicóloga', 'solteiro', '(11) 88888-5555', 'Paciente com burnout', 'ativo');

-- 3. Criar agendamentos distribuídos
INSERT INTO agendamentos (
    id, 
    paciente_id, 
    psicologo_id, 
    data_hora, 
    duracao_minutos, 
    tipo, 
    valor, 
    status, 
    status_sessao, 
    observacoes
) VALUES
-- Agendamentos para hoje (2025-01-09)
('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-09 09:00:00+00', 50, 'consulta', 150.00, 'confirmado', 'nao_iniciada', 'Primeira consulta - avaliação inicial'),
('aaaa2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-09 10:30:00+00', 50, 'consulta', 150.00, 'agendado', 'nao_iniciada', 'Consulta de acompanhamento'),
('aaaa3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-09 14:00:00+00', 50, 'consulta', 150.00, 'confirmado', 'nao_iniciada', 'Sessão de terapia cognitiva'),
('aaaa4444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-09 16:00:00+00', 50, 'consulta', 150.00, 'agendado', 'nao_iniciada', 'Consulta de rotina'),

-- Agendamentos para amanhã (2025-01-10)
('bbbb1111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-10 08:30:00+00', 50, 'consulta', 150.00, 'confirmado', 'nao_iniciada', 'Sessão de burnout'),
('bbbb2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-10 10:00:00+00', 50, 'retorno', 150.00, 'agendado', 'nao_iniciada', 'Retorno - avaliação de progresso'),
('bbbb3333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-10 15:30:00+00', 50, 'consulta', 150.00, 'confirmado', 'nao_iniciada', 'Terapia comportamental'),

-- Agendamentos para próxima semana (2025-01-13 a 2025-01-17)
('cccc1111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-13 09:00:00+00', 50, 'consulta', 150.00, 'agendado', 'nao_iniciada', 'Sessão de exposição gradual'),
('cccc2222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-13 11:00:00+00', 50, 'consulta', 150.00, 'agendado', 'nao_iniciada', 'Estabilização do humor'),
('cccc3333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-14 14:00:00+00', 50, 'consulta', 150.00, 'confirmado', 'nao_iniciada', 'Técnicas de relaxamento'),
('cccc4444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-15 10:30:00+00', 50, 'retorno', 150.00, 'agendado', 'nao_iniciada', 'Avaliação mensal'),
('cccc5555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-16 16:00:00+00', 50, 'consulta', 150.00, 'confirmado', 'nao_iniciada', 'Terapia de grupo'),
('cccc6666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-17 09:30:00+00', 50, 'consulta', 150.00, 'agendado', 'nao_iniciada', 'Prevenção de recaída'),

-- Agendamentos históricos (semana passada)
('dddd1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-02 09:00:00+00', 50, 'consulta', 150.00, 'realizado', 'finalizada', 'Consulta realizada com sucesso'),
('dddd2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-03 14:00:00+00', 50, 'consulta', 150.00, 'cancelado', 'nao_iniciada', 'Cancelado pelo paciente'),
('dddd3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-04 11:00:00+00', 50, 'consulta', 150.00, 'faltou', 'nao_iniciada', 'Paciente não compareceu'),
('dddd4444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-05 15:30:00+00', 50, 'consulta', 150.00, 'realizado', 'finalizada', 'Sessão produtiva'),

-- Agendamentos para o final do mês
('eeee1111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-30 10:00:00+00', 50, 'avaliacao', 180.00, 'agendado', 'nao_iniciada', 'Avaliação psicológica completa'),
('eeee2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '975cdada-b05b-4604-b4ab-e664aad693eb', '2025-01-31 14:00:00+00', 50, 'consulta', 150.00, 'agendado', 'nao_iniciada', 'Última consulta do mês');

-- 4. Criar transações financeiras
INSERT INTO transacoes_financeiras (
    id,
    psicologo_id, 
    agendamento_id, 
    tipo, 
    valor, 
    categoria, 
    descricao, 
    data_transacao
) VALUES
('ffff1111-1111-1111-1111-111111111111', '975cdada-b05b-4604-b4ab-e664aad693eb', 'dddd1111-1111-1111-1111-111111111111', 'receita', 150.00, 'Consulta', 'Pagamento consulta Ana Silva', '2025-01-02'),
('ffff2222-2222-2222-2222-222222222222', '975cdada-b05b-4604-b4ab-e664aad693eb', 'dddd4444-4444-4444-4444-444444444444', 'receita', 150.00, 'Consulta', 'Pagamento consulta João Pedro', '2025-01-05');

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_hora_status ON agendamentos(data_hora, status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_psicologo_data ON agendamentos(psicologo_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_pacientes_psicologo_status ON pacientes(psicologo_id, status);