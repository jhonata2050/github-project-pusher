ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
GRANT ALL ON public.audit_logs TO authenticated, service_role;
