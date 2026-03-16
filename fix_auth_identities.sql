-- سكربت شامل لإصلاح حسابات المستخدمين في Supabase (بما في ذلك الهويات)
-- يرجى تشغيل هذا الكود في Supabase SQL Editor

-- 1. إصلاح البيانات الوصفية المفقودة في جدول auth.users
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

-- 2. إضافة الهويات المفقودة في جدول auth.identities
-- هذا يحل مشكلة "Database error checking email" و "A user with this email address has already been registered"
INSERT INTO auth.identities (
    id, 
    user_id, 
    identity_data, 
    provider, 
    provider_id, 
    last_sign_in_at, 
    created_at, 
    updated_at
)
SELECT 
    gen_random_uuid(), 
    id, 
    jsonb_build_object('sub', id, 'email', email, 'email_verified', true), 
    'email', 
    id::text, 
    now(), 
    now(), 
    now()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM auth.identities)
AND email IS NOT NULL;
