
-- 1. Ensure email is unique in profiles
-- Clean up any existing records that might conflict by ID or email
-- (In case some legacy records exist that we didn't see)
DELETE FROM public.profiles p1
USING public.profiles p2
WHERE p1.id > p2.id AND p1.email = p2.email;

-- Now add the unique constraint if not already present
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- 2. Update the sync function to also handle email updates from auth.users
-- This ensures that if an email changes in auth, it reflects in profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  -- Ensure the user has at least the 'client' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3. Replace the trigger to handle both insert and update on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users 
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Grant access
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
