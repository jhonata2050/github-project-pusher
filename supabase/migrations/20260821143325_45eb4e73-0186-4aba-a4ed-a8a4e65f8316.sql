ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS sso_supported boolean DEFAULT NULL;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS last_capability_check timestamp with time zone;

-- Grant access (redundant but safe)
GRANT ALL ON public.servers TO service_role;
GRANT SELECT ON public.servers TO authenticated;