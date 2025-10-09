-- Migration: Fix pacientes table constraints
-- Remove NOT NULL constraints from optional fields
-- Only 'nome' and 'telefone' should be mandatory

-- Remove NOT NULL constraint from cpf column
ALTER TABLE pacientes 
ALTER COLUMN cpf DROP NOT NULL;

-- Remove NOT NULL constraint from data_nascimento column
ALTER TABLE pacientes 
ALTER COLUMN data_nascimento DROP NOT NULL;

-- Add comment to document the mandatory fields
COMMENT ON TABLE pacientes IS 'Tabela de pacientes. Campos obrigatórios: nome, telefone';
COMMENT ON COLUMN pacientes.nome IS 'Campo obrigatório';
COMMENT ON COLUMN pacientes.telefone IS 'Campo obrigatório';
COMMENT ON COLUMN pacientes.cpf IS 'Campo opcional';
COMMENT ON COLUMN pacientes.data_nascimento IS 'Campo opcional';