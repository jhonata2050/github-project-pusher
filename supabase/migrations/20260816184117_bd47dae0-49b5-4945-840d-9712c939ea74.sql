-- Garantir permissões básicas na tabela servers
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servers TO authenticated;
GRANT ALL ON public.servers TO service_role;

-- Habilitar RLS
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Admins can manage servers" ON public.servers;
DROP POLICY IF EXISTS "Admins can view all servers" ON public.servers;
DROP POLICY IF EXISTS "Admins can insert servers" ON public.servers;
DROP POLICY IF EXISTS "Admins can update servers" ON public.servers;
DROP POLICY IF EXISTS "Admins can delete servers" ON public.servers;
DROP POLICY IF EXISTS "Staff can view servers" ON public.servers;

-- Criar política completa para administradores
CREATE POLICY "Admins can manage servers"
ON public.servers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
