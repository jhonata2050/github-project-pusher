-- --------------------------------------------------------
-- SISTEMA DE AFILIADOS (INDIQUE E GANHE)
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    commission_percent DECIMAL(5,2) DEFAULT 10.00 NOT NULL,
    total_clicks INTEGER DEFAULT 0 NOT NULL,
    total_sales INTEGER DEFAULT 0 NOT NULL,
    pending_commission DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    available_balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    paid_earnings DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE ON public.affiliates TO authenticated, anon;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own affiliate account" ON public.affiliates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own affiliate account" ON public.affiliates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can manage all affiliate accounts" ON public.affiliates FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
    referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    sale_amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'paid', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.affiliate_referrals FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.affiliates WHERE affiliates.id = affiliate_referrals.affiliate_id AND affiliates.user_id = auth.uid())
);
CREATE POLICY "Staff can manage all referrals" ON public.affiliate_referrals FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.affiliate_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    method TEXT DEFAULT 'wallet' NOT NULL, -- 'wallet', 'pix'
    status TEXT DEFAULT 'completed' NOT NULL, -- 'pending', 'completed', 'rejected'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT ON public.affiliate_withdrawals TO authenticated;
GRANT ALL ON public.affiliate_withdrawals TO service_role;
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawals" ON public.affiliate_withdrawals FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.affiliates WHERE affiliates.id = affiliate_withdrawals.affiliate_id AND affiliates.user_id = auth.uid())
);
CREATE POLICY "Staff can manage all withdrawals" ON public.affiliate_withdrawals FOR ALL TO authenticated USING (public.is_staff(auth.uid()));
