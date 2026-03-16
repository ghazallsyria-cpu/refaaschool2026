-- 1. Ensure the admin user has the correct role
UPDATE public.users 
SET role = 'admin', must_reset_password = false 
WHERE email = 'ghazallsyria@gmail.com' OR id = 'ea8752a5-c5cf-4c92-ad07-3ab09b222503';

-- 2. Update is_admin function to be robust and include management
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN user_role IN ('admin', 'management');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix RLS policies to avoid recursion and allow full access for admins
-- First, drop existing problematic policies on users table
DROP POLICY IF EXISTS "safe_read_self" ON public.users;
DROP POLICY IF EXISTS "safe_read_admin" ON public.users;
DROP POLICY IF EXISTS "admin_all_access" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "users_read_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create clean policies for users table
CREATE POLICY "users_read_policy" ON public.users
FOR SELECT USING (
  auth.uid() = id OR is_admin()
);

CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE USING (
  auth.uid() = id OR is_admin()
) WITH CHECK (
  auth.uid() = id OR is_admin()
);

CREATE POLICY "users_admin_all" ON public.users
FOR ALL USING (is_admin());

-- 4. Apply admin_all_access to all other relevant tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('students', 'teachers', 'parents', 'classes', 'subjects', 'exams', 'attendance', 'platform_settings', 'grades', 'schedule')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "admin_all_access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "admin_all_access" ON public.%I FOR ALL USING (public.is_admin())', t);
    END LOOP;
END $$;

-- 5. Ensure platform_settings is accessible
DROP POLICY IF EXISTS "Public read access" ON public.platform_settings;
CREATE POLICY "Public read access" ON public.platform_settings FOR SELECT USING (true);
