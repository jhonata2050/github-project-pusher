-- Habilitar pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabela de Tickets (Caso não exista)
CREATE TABLE IF NOT EXISTS public.tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    subject text NOT NULL,
    status text DEFAULT 'open', -- 'open', 'answered', 'customer-reply', 'closed'
    priority text DEFAULT 'medium', -- 'low', 'medium', 'high'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios tickets"
ON public.tickets FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem criar tickets"
ON public.tickets FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins podem atualizar tickets"
ON public.tickets FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Mensagens de Tickets
CREATE TABLE public.ticket_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    message text NOT NULL,
    is_staff_reply boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver mensagens de seus tickets"
ON public.ticket_messages FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.tickets
        WHERE tickets.id = ticket_messages.ticket_id
        AND (tickets.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
);

CREATE POLICY "Usuários podem postar mensagens"
ON public.ticket_messages FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 3. Servidores (DirectAdmin)
CREATE TABLE public.servers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    hostname text NOT NULL,
    ip_address text,
    api_user text NOT NULL,
    api_token text NOT NULL,
    is_active boolean DEFAULT true,
    max_accounts integer DEFAULT 100,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.servers TO authenticated;
GRANT ALL ON public.servers TO service_role;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins acessam servidores"
ON public.servers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Configurações do Sistema
CREATE TABLE public.system_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    description text,
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública autenticada de configurações"
ON public.system_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Apenas admins editam configurações"
ON public.system_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Seeds iniciais
INSERT INTO public.system_settings (key, value, description)
VALUES 
('company_name', '"HostPanel"', 'Nome da empresa'),
('support_email', '"suporte@hostpanel.com"', 'Email de suporte')
ON CONFLICT (key) DO NOTHING;
