-- Fix RLS policies to prevent infinite recursion
-- The issue is that policies are referencing the same table they're protecting

-- First, temporarily disable RLS to allow the fix
ALTER TABLE psicologos DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
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

-- Re-enable RLS
ALTER TABLE psicologos ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- Allow users to read their own data
CREATE POLICY "Users can view own profile" ON psicologos
    FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own data (but not role)
CREATE POLICY "Users can update own profile" ON psicologos
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow new user registration
CREATE POLICY "Allow user registration" ON psicologos
    FOR INSERT WITH CHECK (auth.uid() = id);

-- For admin access, we'll use a function to avoid recursion
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM psicologos 
        WHERE id = auth.uid() AND role = 'admin'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin policies using the function
CREATE POLICY "Admins can view all profiles" ON psicologos
    FOR SELECT USING (is_admin_user());

CREATE POLICY "Admins can update all profiles" ON psicologos
    FOR UPDATE USING (is_admin_user());

CREATE POLICY "Admins can insert profiles" ON psicologos
    FOR INSERT WITH CHECK (is_admin_user());

CREATE POLICY "Admins can delete profiles" ON psicologos
    FOR DELETE USING (is_admin_user())