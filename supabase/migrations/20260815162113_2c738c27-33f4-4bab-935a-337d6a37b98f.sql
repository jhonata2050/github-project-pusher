-- Garantir que o RLS está habilitado
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver (para evitar erros)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can do everything on system_settings') THEN
        DROP POLICY "Admins can do everything on system_settings" ON public.system_settings;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Everyone can read system_settings') THEN
        DROP POLICY "Everyone can read system_settings" ON public.system_settings;
    END IF;
END $$;

-- Criar política para permitir leitura pública (necessário para a landing page e app config)
CREATE POLICY "Everyone can read system_settings"
ON public.system_settings
FOR SELECT
TO authenticated, anon
USING (true);

-- Criar política para permitir que admins gerenciem tudo
CREATE POLICY "Admins can do everything on system_settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Reforçar Grants
GRANT SELECT ON public.system_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;