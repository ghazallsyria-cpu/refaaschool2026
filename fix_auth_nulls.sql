-- إصلاح مشكلة GoTrue 500 Internal Server Error
-- هذا السكربت يقوم بتعبئة الحقول الجديدة التي يطلبها Supabase والتي قد تكون فارغة (NULL) وتسبب انهيار النظام

UPDATE auth.users
SET 
  is_anonymous = COALESCE(is_anonymous, false),
  is_super_admin = COALESCE(is_super_admin, false),
  is_sso_user = COALESCE(is_sso_user, false);
