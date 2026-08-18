DROP INDEX IF EXISTS public.vps_instances_service_id_key;

ALTER TABLE public.vps_instances
ADD CONSTRAINT vps_instances_service_id_key UNIQUE (service_id);