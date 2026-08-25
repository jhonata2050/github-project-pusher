ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whmcs_id TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS whmcs_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS whmcs_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_whmcs_id_key ON public.profiles (whmcs_id) WHERE whmcs_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS services_whmcs_id_key ON public.services (whmcs_id) WHERE whmcs_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_whmcs_id_key ON public.invoices (whmcs_id) WHERE whmcs_id IS NOT NULL;