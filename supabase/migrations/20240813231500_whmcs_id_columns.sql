-- Add whmcs_id columns to link data during import
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whmcs_id TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS whmcs_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS whmcs_id TEXT;

-- Create indexes for faster lookups during import
CREATE INDEX IF NOT EXISTS idx_profiles_whmcs_id ON public.profiles(whmcs_id);
CREATE INDEX IF NOT EXISTS idx_services_whmcs_id ON public.services(whmcs_id);
CREATE INDEX IF NOT EXISTS idx_invoices_whmcs_id ON public.invoices(whmcs_id);

-- Update RLS grants to be safe
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;

-- Ensure staff can see everything
CREATE POLICY "Admins can view whmcs_id in profiles" ON public.profiles
    FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "Admins can view whmcs_id in services" ON public.services
    FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "Admins can view whmcs_id in invoices" ON public.invoices
    FOR SELECT TO authenticated USING (is_staff(auth.uid()));
