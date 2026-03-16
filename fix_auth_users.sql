-- سكربت شامل لإصلاح جميع حسابات المستخدمين في جدول auth.users
-- يرجى تشغيل هذا الكود في Supabase SQL Editor

UPDATE auth.users
SET 
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{"full_name":"user"}'::jsonb),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  is_sso_user = COALESCE(is_sso_user, false),
  is_super_admin = COALESCE(is_super_admin, false),
  aud = COALESCE(aud, 'authenticated'),
  role = COALESCE(role, 'authenticated')
WHERE id IN (SELECT id FROM public.users);
