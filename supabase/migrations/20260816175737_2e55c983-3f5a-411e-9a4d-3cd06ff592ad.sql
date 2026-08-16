-- 1. Fix products table (add external_id, WHMCS integration fields if missing)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS whmcs_id integer;

-- 2. Fix servers table (add server_type, name might be missing in some routes)
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS server_type text DEFAULT 'directadmin';

-- 3. Fix profiles table (ensure full_name and whmcs_id exist)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whmcs_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line2 text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postcode text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notes text;

-- 4. Fix email_logs (ensure relation to profiles works)
-- If the relation is missing, it's usually because user_id is missing or incorrectly named
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 5. Fix system_settings (change value from text to jsonb to match app expectations)
ALTER TABLE public.system_settings ALTER COLUMN value TYPE jsonb USING value::jsonb;

-- 6. Grant permissions again to ensure everything is accessible
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
