ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
GRANT ALL ON public.transactions TO authenticated, service_role;
