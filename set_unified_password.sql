-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update all users' passwords to '123456'
UPDATE auth.users
SET encrypted_password = crypt('123456', gen_salt('bf'));

-- Force all users to reset their password on next login
UPDATE public.users
SET must_reset_password = true;
