-- Migration: Fix estado constraint in pacientes table
-- Remove and recreate the check_estado constraint to ensure it works properly

-- Drop the existing constraint if it exists
ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS check_estado;

-- Recreate the constraint with proper syntax
ALTER TABLE pacientes 
ADD CONSTRAINT check_estado 
CHECK (estado IS NULL OR estado IN (
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
));

-- Add comment to document the constraint
COMMENT ON CONSTRAINT check_estado ON pacientes IS 'Permite apenas siglas válidas de estados brasileiros ou NULL';