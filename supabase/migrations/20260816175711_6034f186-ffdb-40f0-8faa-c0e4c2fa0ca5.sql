-- Tables for support
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    message TEXT NOT NULL,
    is_staff BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
GRANT ALL ON public.ticket_messages TO authenticated, service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Tables for finance/orders
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    gateway TEXT,
    transaction_id TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
GRANT ALL ON public.transactions TO authenticated, service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Additional columns for build compatibility
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS to_email TEXT;

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS last_reply_by_name TEXT;

-- WHMCS Import tracking
CREATE TABLE IF NOT EXISTS public.whmcs_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT,
    stats JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
GRANT ALL ON public.whmcs_imports TO authenticated, service_role;
ALTER TABLE public.whmcs_imports ENABLE ROW LEVEL SECURITY;

-- Domains
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    status TEXT,
    registration_date DATE,
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
GRANT ALL ON public.domains TO authenticated, service_role;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- RLS for messages
CREATE POLICY "Users can view their own ticket messages" ON public.ticket_messages
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.tickets 
            WHERE tickets.id = ticket_messages.ticket_id 
            AND tickets.user_id = auth.uid()
        )
    );
