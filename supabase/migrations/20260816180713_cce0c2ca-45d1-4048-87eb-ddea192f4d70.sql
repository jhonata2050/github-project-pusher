GRANT ALL ON public.system_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'Admins can manage system settings'
    ) THEN
        CREATE POLICY "Admins can manage system settings" 
        ON public.system_settings 
        FOR ALL 
        TO authenticated 
        USING (public.has_role(auth.uid(), 'admin'))
        WITH CHECK (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;