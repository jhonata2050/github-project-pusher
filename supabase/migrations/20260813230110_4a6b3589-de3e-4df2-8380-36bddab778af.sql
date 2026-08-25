
-- 1. Create whmcs_imports table
CREATE TABLE IF NOT EXISTS public.whmcs_imports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    status text NOT NULL,
    error_message text,
    stats jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

GRANT ALL ON public.whmcs_imports TO authenticated;
GRANT ALL ON public.whmcs_imports TO service_role;

ALTER TABLE public.whmcs_imports ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins to manage imports
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'whmcs_imports' AND policyname = 'Admins can manage imports'
    ) THEN
        CREATE POLICY "Admins can manage imports" ON public.whmcs_imports
            FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 2. RLS for user_roles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Admins can view all roles'
    ) THEN
        CREATE POLICY "Admins can view all roles" ON public.user_roles
            FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 3. RLS for profiles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can manage all profiles'
    ) THEN
        CREATE POLICY "Admins can manage all profiles" ON public.profiles
            FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 4. RLS for services
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'Admins can manage all services'
    ) THEN
        CREATE POLICY "Admins can manage all services" ON public.services
            FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 5. RLS for invoices
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Admins can manage all invoices'
    ) THEN
        CREATE POLICY "Admins can manage all invoices" ON public.invoices
            FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 6. RLS for email_logs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'email_logs' AND policyname = 'Admins can view all logs'
    ) THEN
        CREATE POLICY "Admins can view all logs" ON public.email_logs
            FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- 7. RLS for tickets
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'tickets' AND policyname = 'Admins can manage all tickets'
    ) THEN
        CREATE POLICY "Admins can manage all tickets" ON public.tickets
            FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;
