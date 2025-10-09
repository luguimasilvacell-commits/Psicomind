-- Criação das tabelas do sistema Psicomind
-- Baseado na arquitetura técnica definida

-- Tabela de Psicólogos
CREATE TABLE psicologos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    crp VARCHAR(20) UNIQUE NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para psicólogos
CREATE INDEX idx_psicologos_email ON psicologos(email);
CREATE INDEX idx_psicologos_crp ON psicologos(crp);

-- Tabela de Pacientes
CREATE TABLE pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psicologo_id UUID NOT NULL REFERENCES psicologos(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    data_nascimento DATE NOT NULL,
    endereco JSONB,
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'arquivado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para pacientes
CREATE INDEX idx_pacientes_psicologo_id ON pacientes(psicologo_id);
CREATE INDEX idx_pacientes_cpf ON pacientes(cpf);
CREATE INDEX idx_pacientes_nome ON pacientes(nome);

-- Tabela de Agendamentos
CREATE TABLE agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    psicologo_id UUID NOT NULL REFERENCES psicologos(id) ON DELETE CASCADE,
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    duracao_minutos INTEGER NOT NULL DEFAULT 50,
    tipo VARCHAR(50) NOT NULL DEFAULT 'consulta',
    valor DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'agendado' CHECK (status IN ('agendado', 'confirmado', 'realizado', 'cancelado', 'faltou')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para agendamentos
CREATE INDEX idx_agendamentos_paciente_id ON agendamentos(paciente_id);
CREATE INDEX idx_agendamentos_psicologo_id ON agendamentos(psicologo_id);
CREATE INDEX idx_agendamentos_data_hora ON agendamentos(data_hora);
CREATE INDEX idx_agendamentos_status ON agendamentos(status);

-- Tabela de Prontuários
CREATE TABLE prontuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    agendamento_id UUID REFERENCES agendamentos(id) ON DELETE SET NULL,
    conteudo TEXT NOT NULL,
    campos_estruturados JSONB,
    data_sessao TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para prontuários
CREATE INDEX idx_prontuarios_paciente_id ON prontuarios(paciente_id);
CREATE INDEX idx_prontuarios_data_sessao ON prontuarios(data_sessao DESC);

-- Tabela de Transações Financeiras
CREATE TABLE transacoes_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psicologo_id UUID NOT NULL REFERENCES psicologos(id) ON DELETE CASCADE,
    agendamento_id UUID REFERENCES agendamentos(id) ON DELETE SET NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    valor DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    descricao TEXT,
    data_transacao DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para transações financeiras
CREATE INDEX idx_transacoes_psicologo_id ON transacoes_financeiras(psicologo_id);
CREATE INDEX idx_transacoes_data ON transacoes_financeiras(data_transacao DESC);
CREATE INDEX idx_transacoes_tipo ON transacoes_financeiras(tipo);

-- Tabela de Histórico de Chat
CREATE TABLE chat_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    psicologo_id UUID NOT NULL REFERENCES psicologos(id) ON DELETE CASCADE,
    numero_whatsapp VARCHAR(20) NOT NULL,
    mensagem TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('recebida', 'enviada', 'automatica')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para chat histórico
CREATE INDEX idx_chat_psicologo_id ON chat_historico(psicologo_id);
CREATE INDEX idx_chat_numero ON chat_historico(numero_whatsapp);
CREATE INDEX idx_chat_created_at ON chat_historico(created_at DESC);

-- Habilitar RLS (Row Level Security) em todas as tabelas
ALTER TABLE psicologos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_historico ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para psicólogos
CREATE POLICY "Psicólogos podem ver seus próprios dados" ON psicologos
    FOR ALL USING (auth.uid()::text = id::text);

-- Políticas RLS para pacientes
CREATE POLICY "Psicólogos podem ver seus pacientes" ON pacientes
    FOR ALL USING (auth.uid()::text = psicologo_id::text);

-- Políticas RLS para agendamentos
CREATE POLICY "Psicólogos podem ver seus agendamentos" ON agendamentos
    FOR ALL USING (auth.uid()::text = psicologo_id::text);

-- Políticas RLS para prontuários
CREATE POLICY "Psicólogos podem ver prontuários de seus pacientes" ON prontuarios
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM pacientes 
            WHERE pacientes.id = prontuarios.paciente_id 
            AND pacientes.psicologo_id::text = auth.uid()::text
        )
    );

-- Políticas RLS para transações financeiras
CREATE POLICY "Psicólogos podem ver suas transações" ON transacoes_financeiras
    FOR ALL USING (auth.uid()::text = psicologo_id::text);

-- Políticas RLS para chat histórico
CREATE POLICY "Psicólogos podem ver seu histórico de chat" ON chat_historico
    FOR ALL USING (auth.uid()::text = psicologo_id::text);

-- Conceder permissões básicas
GRANT SELECT ON psicologos TO anon;
GRANT ALL PRIVILEGES ON psicologos TO authenticated;

GRANT SELECT ON pacientes TO anon;
GRANT ALL PRIVILEGES ON pacientes TO authenticated;

GRANT SELECT ON agendamentos TO anon;
GRANT ALL PRIVILEGES ON agendamentos TO authenticated;

GRANT SELECT ON prontuarios TO anon;
GRANT ALL PRIVILEGES ON prontuarios TO authenticated;

GRANT SELECT ON transacoes_financeiras TO anon;
GRANT ALL PRIVILEGES ON transacoes_financeiras TO authenticated;

GRANT SELECT ON chat_historico TO anon;
GRANT ALL PRIVILEGES ON chat_historico TO authenticated;

-- Inserir dados de exemplo
INSERT INTO psicologos (email, nome, crp, telefone, senha_hash) VALUES
('dr.silva@email.com', 'Dr. João Silva', 'CRP-01/12345', '(11) 99999-9999', '$2b$10$hashedpassword'),
('dra.santos@email.com', 'Dra. Maria Santos', 'CRP-01/67890', '(11) 88888-8888', '$2b$10$hashedpassword2');

-- Inserir pacientes de exemplo
INSERT INTO pacientes (psicologo_id, nome, cpf, telefone, email, data_nascimento, endereco) VALUES
((SELECT id FROM psicologos WHERE email = 'dr.silva@email.com'), 'Ana Costa', '123.456.789-00', '(11) 77777-7777', 'ana@email.com', '1990-05-15', '{"rua": "Rua das Flores, 123", "cidade": "São Paulo", "cep": "01234-567"}'),
((SELECT id FROM psicologos WHERE email = 'dr.silva@email.com'), 'Carlos Oliveira', '987.654.321-00', '(11) 66666-6666', 'carlos@email.com', '1985-08-22', '{"rua": "Av. Paulista, 456", "cidade": "São Paulo", "cep": "01310-100"}');

-- Inserir agendamentos de exemplo
INSERT INTO agendamentos (paciente_id, psicologo_id, data_hora, valor, tipo) VALUES
((SELECT id FROM pacientes WHERE cpf = '123.456.789-00'), (SELECT id FROM psicologos WHERE email = 'dr.silva@email.com'), NOW() + INTERVAL '1 day', 150.00, 'consulta'),
((SELECT id FROM pacientes WHERE cpf = '987.654.321-00'), (SELECT id FROM psicologos WHERE email = 'dr.silva@email.com'), NOW() + INTERVAL '2 days', 150.00, 'consulta');

-- Inserir transações financeiras de exemplo
INSERT INTO transacoes_financeiras (psicologo_id, tipo, valor, categoria, descricao, data_transacao) VALUES
((SELECT id FROM psicologos WHERE email = 'dr.silva@email.com'), 'receita', 150.00, 'Consulta', 'Consulta com Ana Costa', CURRENT_DATE),
((SELECT id FROM psicologos WHERE email = 'dr.silva@email.com'), 'despesa', 50.00, 'Material', 'Material de escritório', CURRENT_DATE);