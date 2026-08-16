-- 1. Fix servers table (add max_accounts)
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS max_accounts integer DEFAULT 100;

-- 2. Fix tickets table (add missing columns)
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Fix services table (add auto_renew and server_id if missing/named differently)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT true;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS server_id uuid REFERENCES public.servers(id);

-- 4. Fix vps_instances table (add external_id)
ALTER TABLE public.vps_instances ADD COLUMN IF NOT EXISTS external_id text;

-- 5. Fix transactions table (add gateway_reference)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS gateway_reference text;

-- 6. Add audit_logs missing columns if any (based on runtime errors)
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 7. Ensure profiles has all needed fields for relations
-- Sometimes relations fail because of column naming mismatches
-- (Handled in previous migration, but re-checking logic)

-- 8. Refresh permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
