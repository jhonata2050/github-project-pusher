-- A tabela public.services já existe. Vamos adicionar campos extras.
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS next_invoice_date date,
ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT true;

-- Tabela para instâncias VPS (Contabo)
CREATE TABLE IF NOT EXISTS public.vps_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    external_id text UNIQUE NOT NULL, -- ID na Contabo
    ip_address text,
    status text DEFAULT 'provisioning', -- provisioning, active, suspended, deleted
    os_template text,
    region text,
    vps_type text, -- M, L, XL etc
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS se ainda não habilitado
ALTER TABLE public.vps_instances ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vps_instances TO authenticated;
GRANT ALL ON public.vps_instances TO service_role;

-- Políticas VPS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own VPS instances') THEN
        CREATE POLICY "Users can view their own VPS instances"
        ON public.vps_instances FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.services
                WHERE services.id = vps_instances.service_id
                AND services.user_id = auth.uid()
            ) OR public.has_role(auth.uid(), 'admin')
        );
    END IF;
END $$;
