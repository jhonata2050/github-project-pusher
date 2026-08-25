-- Criar políticas RLS para vps_instances
DO $$ 
BEGIN
    -- Permitir que usuários vejam suas próprias instâncias VPS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own VPS instances') THEN
        CREATE POLICY "Users can view their own VPS instances" ON public.vps_instances
        FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.services s 
                WHERE s.id = vps_instances.service_id 
                AND s.user_id = auth.uid()
            )
        );
    END IF;

    -- Permitir que a equipe gerencie todas as instâncias VPS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage VPS instances') THEN
        CREATE POLICY "Staff manage VPS instances" ON public.vps_instances
        FOR ALL TO authenticated
        USING (is_staff(auth.uid()));
    END IF;
END $$;

-- Garantir privilégios
GRANT SELECT ON public.vps_instances TO authenticated;
GRANT ALL ON public.vps_instances TO service_role;
