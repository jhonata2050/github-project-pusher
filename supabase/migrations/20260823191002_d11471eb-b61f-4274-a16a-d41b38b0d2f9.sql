CREATE UNIQUE INDEX IF NOT EXISTS vps_instances_external_id_unique
  ON public.vps_instances (external_id)
  WHERE external_id IS NOT NULL;

REVOKE ALL ON public.vps_instances FROM anon, authenticated;
GRANT SELECT (
  id,
  service_id,
  external_id,
  provider_id,
  provider_name,
  ip_address,
  status,
  created_at,
  last_metrics,
  region,
  os_template,
  cpu_cores,
  ram_gb,
  disk_gb
) ON public.vps_instances TO authenticated;
GRANT ALL ON public.vps_instances TO service_role;

ALTER TABLE public.vps_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own VPS instances" ON public.vps_instances;
DROP POLICY IF EXISTS "Staff can manage VPS instances" ON public.vps_instances;

CREATE POLICY "Users can view their own VPS instances"
ON public.vps_instances
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = vps_instances.service_id
      AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can manage VPS instances"
ON public.vps_instances
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));