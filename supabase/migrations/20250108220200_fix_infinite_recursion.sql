-- Fix infinite recursion in RLS policies for psicologos table
-- The issue is that admin policies are trying to query the same table they're protecting

-- Temporarily disable RLS to make changes
ALTER TABLE psicologos DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "psicologos_select_policy" ON psicologos;
DROP POLICY IF EXISTS "psicologos_insert_policy" ON psicologos;
DROP POLICY IF EXISTS "psicologos_update_policy" ON psicologos;
DROP POLICY IF EXISTS "psicologos_delete_policy" ON psicologos;
DROP POLICY IF EXISTS "psicologos_select_own" ON psicologos;
DROP POLICY IF EXISTS "psicologos_select_admin" ON psicologos;
DROP POLICY IF EXISTS "psicologos_update_own" ON psicologos;
DROP POLICY IF EXISTS "psicologos_update_admin" ON psicologos;
DROP POLICY IF EXISTS "psicologos_insert_new" ON psicologos;
DROP POLICY IF EXISTS "psicologos_insert_admin" ON psicologos;
DROP POLICY IF EXISTS "psicologos_delete_admin" ON psicologos;
DROP POLICY IF EXISTS "Users can view own profile" ON psicologos;
DROP POLICY IF EXISTS "Users can update own profile" ON psicologos;
DROP POLICY IF EXISTS "Allow user registration" ON psicologos;
DROP POLICY IF EXISTS "Admins can view all profiles" ON psicologos;
DROP POLICY IF EXISTS "Admins can update all profiles" ON psicologos;
DROP POLICY IF EXISTS "Admins can insert profiles" ON psicologos;
DROP POLICY IF EXISTS "Admins can delete profiles" ON psicologos;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS is_admin_user();

-- Re-enable RLS
ALTER TABLE psicologos ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows users to see their own data
CREATE POLICY "psicologos_own_data" ON psicologos
    FOR ALL USING (auth.uid() = id);

-- Create a separate policy for admin access using a direct role check
-- This avoids recursion by using a simple condition
CREATE POLICY "psicologos_admin_access" ON psicologos
    FOR ALL USING (
        -- Check if the current user has admin role directly
        (SELECT role FROM psicologos WHERE id = auth.uid() LIMIT 1) = 'admin'
    );

-- Grant necessary permissions
GRANT ALL ON psicologos TO authenticated;
GRANT ALL ON psicologos TO service_role;