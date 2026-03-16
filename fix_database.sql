-- 1. إصلاح حسابات المستخدمين التالفة في جدول auth.users
-- هذا سيحل مشكلة "Database error loading user" عند محاولة تسجيل الدخول أو تغيير كلمة المرور
UPDATE auth.users
SET raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
WHERE raw_app_meta_data IS NULL;

UPDATE auth.users
SET raw_user_meta_data = '{"full_name":"user"}'::jsonb
WHERE raw_user_meta_data IS NULL;

UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;

-- 2. إضافة حقول إعدادات المدرسة إلى جدول platform_settings
-- هذا سيسمح لك بحفظ إعدادات المدرسة العامة
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS school_name TEXT DEFAULT 'مدرسة الرفعة النموذجية',
ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025 - 2026',
ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT 'الفصل الدراسي الأول',
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT 'شارع الملك فهد، حي الياسمين، الرياض',
ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '0112345678',
ADD COLUMN IF NOT EXISTS email TEXT DEFAULT 'info@alrifaa.edu';
