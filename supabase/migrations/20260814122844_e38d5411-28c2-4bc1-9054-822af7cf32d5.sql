ALTER TABLE public.services ADD COLUMN IF NOT EXISTS server_id UUID REFERENCES public.servers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_services_server_id ON public.services(server_id);