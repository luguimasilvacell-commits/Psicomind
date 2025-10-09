-- Fix RLS policies to prevent infinite recursion
-- Remove existing policies that might be causing recursion
DROP POLICY IF EXISTS "psicologos_select_policy" ON psicologos;
DROP POLICY IF EXISTS "psicologos_insert_policy" ON psicologos;
DROP POLICY IF EXISTS "psicologos_update_policy" ON psicologos;
DROP POLICY IF EXISTS "psicologos_delete_policy" ON psicologos;

-- Create new, simpler policies that avoid recursion
-- Allow users to read their own data
CREATE POLICY "psicologos_select_own" ON psicologos
    FOR SELECT USING (auth.uid() = id);

-- Allow admins to read all data
CREATE POLICY "psicologos_select_admin" ON psicologos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM psicologos p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Allow users to update their own data (except role)
CREATE POLICY "psicologos_update_own" ON psicologos
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = OLD.role);

-- Allow admins to update any data
CREATE POLICY "psicologos_update_admin" ON psicologos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM psicologos p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Allow new user registration (insert)
CREATE POLICY "psicologos_insert_new" ON psicologos
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow admins to insert new users
CREATE POLICY "psicologos_insert_admin" ON psicologos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM psicologos p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Allow admins to delete users
CREATE POLICY "psicologos_delete_admin" ON psicologos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM psicologos p 
            WHERE p.id = auth.uid() AND p