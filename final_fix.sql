-- السكربت النهائي لإصلاح مشكلة 500 Internal Server Error في Supabase
-- يرجى تشغيل هذا الكود في Supabase SQL Editor

-- 1. إصلاح الحقول التي لا تقبل قيمة فارغة (NULL) في الإصدارات الحديثة من Supabase
UPDATE auth.users
SET 
  is_anonymous = COALESCE(is_anonymous, false),
  is_super_admin = COALESCE(is_super_admin, false),
  is_sso_user = COALESCE(is_sso_user, false),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  phone = NULLIF(phone, ''),
  aud = COALESCE(aud, 'authenticated'),
  role = COALESCE(role, 'authenticated'),
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{"full_name":"user"}'::jsonb);

-- 2. التأكد من أن الهويات (identities) صحيحة ومطابقة لما يتوقعه Supabase
-- حذف الهويات الخاطئة التي تم إنشاؤها مسبقاً (إن وجدت)
DELETE FROM auth.identities 
WHERE provider = 'email' 
AND id IN (
  SELECT i.id FROM auth.identities i
  JOIN auth.users u ON u.id = i.user_id
  WHERE i.provider_id != u.id::text
);

-- 3. إعادة إنشاء الهويات المفقودة بالشكل الصحيح 100%
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
    jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 
    'email', 
    id::text, 
    now(), 
    now(), 
    now()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM auth.identities WHERE provider = 'email')
AND email IS NOT NULL;
