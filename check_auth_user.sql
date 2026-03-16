-- Check the auth.users table for the specific user
SELECT id, email, is_anonymous, is_super_admin, is_sso_user, phone, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data
FROM auth.users
WHERE id = 'b7bf7790-1856-4bdb-b1e3-2fd8601fc949';
