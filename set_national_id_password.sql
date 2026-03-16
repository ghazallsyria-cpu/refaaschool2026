-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Set the password to the National ID for all users
UPDATE auth.users au
SET encrypted_password = crypt(pu.national_id, gen_salt('bf'))
FROM public.users pu
WHERE au.id = pu.id AND pu.national_id IS NOT NULL;

-- Force all users to reset their password on next login
UPDATE public.users
SET must_reset_password = true;
