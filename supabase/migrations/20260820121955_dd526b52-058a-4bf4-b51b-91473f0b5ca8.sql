ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS identification_type text DEFAULT 'cpf';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text DEFAULT 'BR';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line2 text;

COMMENT ON COLUMN public.profiles.identification_type IS 'Type of document (cpf, cnpj, tax_id, passport, etc.)';
COMMENT ON COLUMN public.profiles.country IS 'ISO country code (e.g., BR, US, PT)';