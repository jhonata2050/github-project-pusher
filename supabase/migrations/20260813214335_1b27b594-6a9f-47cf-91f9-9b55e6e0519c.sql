-- SMTP Configuration keys
INSERT INTO public.system_settings (key, value)
VALUES 
  ('smtp_host', '""'),
  ('smtp_port', '587'),
  ('smtp_user', '""'),
  ('smtp_pass', '""'),
  ('smtp_encryption', '"tls"'),
  ('use_resend', 'true')
ON CONFLICT (key) DO NOTHING;

-- Domains table
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    domain_name TEXT NOT NULL UNIQUE,
    registrar TEXT NOT NULL, -- 'namecheap', 'registrobr', etc.
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'expired'
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT TRUE,
    nameservers TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.domains TO authenticated;
GRANT ALL ON public.domains TO service_role;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own domains" ON public.domains
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own domains" ON public.domains
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- WHMCS Import tracking
CREATE TABLE IF NOT EXISTS public.whmcs_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    stats JSONB DEFAULT '{}', -- { clients: 0, invoices: 0, services: 0 }
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whmcs_imports TO authenticated;
GRANT ALL ON public.whmcs_imports TO service_role;
ALTER TABLE public.whmcs_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whmcs imports" ON public.whmcs_imports
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
