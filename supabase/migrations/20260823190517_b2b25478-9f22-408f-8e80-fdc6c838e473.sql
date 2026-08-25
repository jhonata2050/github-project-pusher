ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS vps_hostname text,
  ADD COLUMN IF NOT EXISTS vps_os_template text,
  ADD COLUMN IF NOT EXISTS vps_region text;

CREATE UNIQUE INDEX IF NOT EXISTS vps_instances_service_id_unique
  ON public.vps_instances (service_id)
  WHERE service_id IS NOT NULL;