-- 1. Create Platform Settings Table
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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
CREATE POLICY "Allow all to read platform_settings" ON public.platform_settings FOR SELECT USING (true);

-- Allow only admins to update platform_settings
CREATE POLICY "Allow admins to update platform_settings" ON public.platform_settings FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Insert default settings if empty
INSERT INTO public.platform_settings (is_open)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- 2. Create Admin User
-- Replace the UUIDs if you want, but these are generated for the admin
DO $$
DECLARE
    admin_id UUID := '00000000-0000-0000-0000-000000000001';
    admin_email TEXT := 'admin@alrefaa.edu';
    admin_password TEXT := 'admin123';
    admin_civil_id TEXT := '123456789012';
BEGIN
    -- Insert into auth.users if not exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
        VALUES (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', admin_email, crypt(admin_password, gen_salt('bf')), now(), now());
    END IF;

    -- Insert into public.users if not exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = admin_email) THEN
        INSERT INTO public.users (id, email, full_name, role)
        VALUES (admin_id, admin_email, 'مدير النظام', 'admin');
    END IF;
END
$$;
