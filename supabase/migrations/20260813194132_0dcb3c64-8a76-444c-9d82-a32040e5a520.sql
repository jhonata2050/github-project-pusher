CREATE TABLE IF NOT EXISTS public.email_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    to_email text NOT NULL,
    subject text NOT NULL,
    template_name text,
    status text DEFAULT 'sent',
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all email logs" ON public.email_logs
    FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "Users can view own email logs" ON public.email_logs
    FOR SELECT TO authenticated USING (auth.uid() = user_id);