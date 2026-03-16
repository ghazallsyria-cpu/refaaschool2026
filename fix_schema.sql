-- 1. Ensure users table has national_id and must_reset_password
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='national_id') THEN
        ALTER TABLE public.users ADD COLUMN national_id TEXT UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='must_reset_password') THEN
        ALTER TABLE public.users ADD COLUMN must_reset_password BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 2. Create Platform Settings Table
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    is_open BOOLEAN DEFAULT true,
    open_date TIMESTAMP WITH TIME ZONE,
    close_date TIMESTAMP WITH TIME ZONE,
    message TEXT,
    updated_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read platform_settings
DROP POLICY IF EXISTS "Allow all to read platform_settings" ON public.platform_settings;
CREATE POLICY "Allow all to read platform_settings" ON public.platform_settings FOR SELECT USING (true);

-- Allow only admins to update platform_settings
DROP POLICY IF EXISTS "Allow admins to update platform_settings" ON public.platform_settings;
CREATE POLICY "Allow admins to update platform_settings" ON public.platform_settings FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Insert default settings if empty
INSERT INTO public.platform_settings (is_open)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- 3. Bootstrap Admin User (If not exists)
-- NOTE: This only creates the public.users record. 
-- You MUST create the auth user in Supabase Dashboard first with email 'admin@alrefaa.edu'
-- and then update the ID below to match the Auth UID.
-- Alternatively, use the 'admin_setup.sql' for a full bootstrap if your Supabase allows direct auth.users inserts.
