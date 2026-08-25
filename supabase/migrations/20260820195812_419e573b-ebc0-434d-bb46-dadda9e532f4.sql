CREATE TABLE public.provisioning_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    attempt_number integer NOT NULL DEFAULT 1,
    status text NOT NULL CHECK (status IN ('success', 'failure', 'pending')),
    error_code text,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.provisioning_logs TO authenticated;
GRANT ALL ON public.provisioning_logs TO service_role;

ALTER TABLE public.provisioning_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select all provisioning logs" 
ON public.provisioning_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can select their own provisioning logs" 
ON public.provisioning_logs FOR SELECT TO authenticated
USING (auth.uid() = user_id);