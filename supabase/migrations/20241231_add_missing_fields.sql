-- Adicionar campos faltantes na tabela prontuarios
ALTER TABLE prontuarios 
ADD COLUMN IF NOT EXISTS psicologo_id uuid REFERENCES psicologos(id),
ADD COLUMN IF NOT EXISTS diagnostico text,
ADD COLUMN IF NOT EXISTS observacoes text,
ADD COLUMN IF NOT EXISTS plano_tratamento text,
ADD COLUMN IF NOT EXISTS medicamentos text,
ADD COLUMN IF NOT EXISTS proxima_sessao timestamptz;

-- Atualizar campo conteudo para ser opcional (pode ser null se temos campos estruturados)
ALTER TABLE prontuarios ALTER COLUMN conteudo DROP NOT NULL;

-- Adicionar campos faltantes na tabela transacoes_financeiras
ALTER TABLE transacoes_financeiras 
ADD COLUMN IF NOT EXISTS paciente_id uuid REFERENCES pacientes(id),
ADD COLUMN IF NOT EXISTS data_vencimento date,
ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente', 'vencido', 'cancelado')),
ADD COLUMN IF NOT EXISTS forma_pagamento varchar(50),
ADD COLUMN IF NOT EXISTS observacoes text;

-- Atualizar campo categoria para ser opcional
ALTER TABLE transacoes_financeiras ALTER COLUMN categoria DROP NOT NULL;

-- Atualizar campo descricao para ser obrigatório
ALTER TABLE transacoes_financeiras ALTER COLUMN descricao SET NOT NULL;

-- Adicionar alias duracao para agendamentos (compatibilidade com formulário)
-- Não precisamos adicionar coluna física, apenas ajustar o código

-- Atualizar políticas RLS se necessário
-- As políticas existentes devem funcionar com os novos campos