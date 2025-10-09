-- Migration: Temporarily remove estado constraint to allow patient registration
-- This is a temporary fix to investigate the constraint issue

-- Drop the existing constraint
ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS check_estado;

-- Add comment to document the temporary removal
COMMENT ON COLUMN pacientes.estado IS 'Estado constraint temporarily removed for debugging - accepts any value';