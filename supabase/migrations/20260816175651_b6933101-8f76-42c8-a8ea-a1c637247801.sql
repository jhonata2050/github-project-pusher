-- Enumsfaltantes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE public.order_status AS ENUM ('pending', 'active', 'fraud', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_status') THEN
        CREATE TYPE public.service_status AS ENUM ('pending', 'active', 'suspended', 'terminated', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE public.invoice_status AS ENUM ('pending', 'paid', 'cancelled', 'refunded', 'overdue');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle') THEN
        CREATE TYPE public.billing_cycle AS ENUM ('monthly','quarterly','semiannually','annually','biennially');
    END IF;
END $$;

-- Tabelas principais com colunas corretas
DROP TABLE IF EXISTS public.coupons CASCADE;
CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value DECIMAL(10,2) NOT NULL,
    is_recurring BOOLEAN DEFAULT false,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
GRANT ALL ON public.coupons TO authenticated, service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.orders CASCADE;
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    status public.order_status DEFAULT 'pending' NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
GRANT ALL ON public.orders TO authenticated, service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.product_groups CASCADE;
CREATE TABLE public.product_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.product_groups TO authenticated, service_role;
GRANT SELECT ON public.product_groups TO anon;
ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.products CASCADE;
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.product_groups(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  product_type text NOT NULL DEFAULT 'hosting',
  directadmin_package text,
  disk_quota_mb integer,
  bandwidth_quota_mb integer,
  domains_limit integer,
  email_accounts_limit integer,
  database_limit integer,
  setup_fee numeric(12,2) NOT NULL DEFAULT 0,
  auto_provision boolean NOT NULL DEFAULT true,
  is_visible boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.products TO authenticated, service_role;
GRANT SELECT ON public.products TO anon;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.product_prices CASCADE;
CREATE TABLE public.product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  cycle public.billing_cycle NOT NULL,
  price numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, cycle)
);
GRANT ALL ON public.product_prices TO authenticated, service_role;
GRANT SELECT ON public.product_prices TO anon;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.services CASCADE;
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    status public.service_status DEFAULT 'pending' NOT NULL,
    domain TEXT,
    billing_cycle public.billing_cycle,
    next_due_date TIMESTAMP WITH TIME ZONE,
    suspension_reason TEXT,
    username TEXT,
    whmcs_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
GRANT ALL ON public.services TO authenticated, service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.invoices CASCADE;
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    status public.invoice_status DEFAULT 'pending' NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method TEXT,
    notes TEXT,
    whmcs_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
GRANT ALL ON public.invoices TO authenticated, service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.invoice_items CASCADE;
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
GRANT ALL ON public.invoice_items TO authenticated, service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.email_logs CASCADE;
CREATE TABLE public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject text,
    body text,
    sent_at timestamptz DEFAULT now(),
    status text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
GRANT ALL ON public.email_logs TO authenticated, service_role;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.tickets CASCADE;
CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject text,
    status text DEFAULT 'open',
    priority text DEFAULT 'medium',
    last_reply_at timestamptz DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
GRANT ALL ON public.tickets TO authenticated, service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.servers CASCADE;
CREATE TABLE public.servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostname text NOT NULL,
    ip_address text,
    api_user text,
    api_token text,
    server_type text DEFAULT 'directadmin',
    is_active boolean DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
GRANT ALL ON public.servers TO authenticated, service_role;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

DROP TABLE IF EXISTS public.vps_instances CASCADE;
CREATE TABLE public.vps_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    provider_id text,
    provider_name text DEFAULT 'contabo',
    ip_address text,
    status text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
GRANT ALL ON public.vps_instances TO authenticated, service_role;
ALTER TABLE public.vps_instances ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own services" ON public.services FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own invoices" ON public.invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can manage all" ON public.orders TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage services" ON public.services TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage invoices" ON public.invoices TO authenticated USING (public.is_staff(auth.uid()));
