-- 1. Update is_admin function to include 'management'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'management')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Re-apply policies to all tables for management/admin
DO $$ 
DECLARE 
    tab RECORD;
BEGIN 
    FOR tab IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
                AND tablename IN ('users', 'students', 'teachers', 'parents', 'classes', 'sections', 'subjects', 'attendance', 'exams', 'platform_settings')) 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS "admin_all_access" ON public.%I', tab.tablename);
        EXECUTE format('CREATE POLICY "admin_all_access" ON public.%I FOR ALL USING (public.is_admin())', tab.tablename);
    END LOOP; 
END $$;

-- 3. Bootstrap Admin User (If not exists)
-- NOTE: This only creates the public.users record. 
-- You MUST create the auth user in Supabase Dashboard first with email 'admin@alrefaa.edu'
-- and then update the ID below to match the Auth UID.
-- Alternatively, use the 'admin_setup.sql' for a full bootstrap if your Supabase allows direct auth.users inserts.
