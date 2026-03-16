-- Fix auth.users
UPDATE auth.users
SET 
  is_anonymous = COALESCE(is_anonymous, false),
  phone = COALESCE(phone, NULL),
  is_super_admin = COALESCE(is_super_admin, false),
  is_sso_user = COALESCE(is_sso_user, false);
