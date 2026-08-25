ALTER TABLE public.vps_instances ADD COLUMN IF NOT EXISTS last_metrics JSONB;
GRANT ALL ON public.vps_instances TO service_role;
GRANT SELECT ON public.vps_instances TO authenticated;