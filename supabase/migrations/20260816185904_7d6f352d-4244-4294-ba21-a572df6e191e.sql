ALTER TABLE public.services ADD CONSTRAINT services_whmcs_id_key UNIQUE (whmcs_id);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_whmcs_id_key UNIQUE (whmcs_id);
