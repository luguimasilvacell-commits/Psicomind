-- Disable RLS completely for psicologos table to fix infinite recursion
-- This is a temporary fix to allow login functionality

-- Drop ALL policies first
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'psicologos'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON psicologos';
    END LOOP;
END $$;

-- Disable RLS completely
ALTER TABLE psicologos DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON psicologos TO authenticated;
GRANT ALL ON psicologos TO anon;
GRANT ALL ON psicologos TO service_role;

-- Add comment explaining the temporary nature
COMMENT ON TABLE psicologos IS 'RLS temporarily disabled due to infinite recursion issue. Will be re-enabled with proper policies later.';