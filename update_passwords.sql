UPDATE auth.users
SET encrypted_password = crypt('123456', gen_salt('bf'));

UPDATE public.users
SET must_reset_password = true;
