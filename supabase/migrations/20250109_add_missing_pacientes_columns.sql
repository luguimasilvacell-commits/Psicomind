-- Add missing columns to pacientes table
-- These columns are expected by the frontend form but don't exist in the database

ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS cep VARCHAR(10),
ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
ADD COLUMN IF NOT EXISTS estado VARCHAR(2),
ADD COLUMN IF NOT EXISTS profissao VARCHAR(100),
ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(20),
ADD COLUMN IF NOT EXISTS contato_emergencia VARCHAR(20),
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Add check constraint for estado_civil
ALTER TABLE pacientes 
ADD CONSTRAINT check_estado_civil 
CHECK (estado_civil IS NULL OR estado_civil IN ('solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel', 'separado'));

-- Add check constraint for estado (Brazilian states)
ALTER TABLE pacientes 
ADD CONSTRAINT check_estado 
CHECK (estado IS NULL OR estado IN ('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'));

-- Create indexes for commonly searched fields
CREATE INDEX IF NOT EXISTS idx_pacientes_cep ON pacientes(cep);
CREATE INDEX IF NOT EXISTS idx_pacientes_cidade ON pacientes(cidade);
CREATE INDEX IF NOT EXISTS idx_pacientes_estado ON pacientes(estado);