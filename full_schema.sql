-- Add whmcs_id columns to link data during import
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whmcs_id TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS whmcs_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS whmcs_id TEXT;

-- Create indexes for faster lookups during import
CREATE INDEX IF NOT EXISTS idx_profiles_whmcs_id ON public.profiles(whmcs_id);
CREATE INDEX IF NOT EXISTS idx_services_whmcs_id ON public.services(whmcs_id);
CREATE INDEX IF NOT EXISTS idx_invoices_whmcs_id ON public.invoices(whmcs_id);

-- Update RLS grants to be safe
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;

-- Ensure staff can see everything
CREATE POLICY "Admins can view whmcs_id in profiles" ON public.profiles
    FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "Admins can view whmcs_id in services" ON public.services
    FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY "Admins can view whmcs_id in invoices" ON public.invoices
    FOR SELECT TO authenticated USING (is_staff(auth.uid()));
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'client');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','staff')
  )
$$;

CREATE POLICY "own roles readable" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "staff read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- shared updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  company_name text,
  tax_id text,
  phone text,
  address_line text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'BR',
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "staff read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff update profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "admins delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto profile + default client role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATALOG
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_groups TO authenticated;
GRANT SELECT ON public.product_groups TO anon;
GRANT ALL ON public.product_groups TO service_role;
ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visible groups public" ON public.product_groups
  FOR SELECT USING (is_visible = true);
CREATE POLICY "staff read groups" ON public.product_groups
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admins manage groups" ON public.product_groups
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER product_groups_updated_at BEFORE UPDATE ON public.product_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visible products public" ON public.products
  FOR SELECT USING (is_visible = true);
CREATE POLICY "staff read products" ON public.products
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admins manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TYPE public.billing_cycle AS ENUM ('monthly','quarterly','semiannually','annually','biennially');

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_prices TO authenticated;
GRANT SELECT ON public.product_prices TO anon;
GRANT ALL ON public.product_prices TO service_role;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active prices public" ON public.product_prices
  FOR SELECT USING (is_active = true);
CREATE POLICY "staff read prices" ON public.product_prices
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admins manage prices" ON public.product_prices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER product_prices_updated_at BEFORE UPDATE ON public.product_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- seed catalog
INSERT INTO public.product_groups (name, slug, description, sort_order) VALUES
  ('Hospedagem compartilhada', 'hospedagem-compartilhada', 'Planos de hospedagem web em servidores compartilhados', 1),
  ('Revenda de hospedagem', 'revenda', 'Planos de revenda com painel próprio', 2);

INSERT INTO public.products (group_id, name, slug, description, directadmin_package, disk_quota_mb, bandwidth_quota_mb, domains_limit, email_accounts_limit, database_limit, is_featured, sort_order)
SELECT g.id, v.name, v.slug, v.description, v.pkg, v.disk, v.bw, v.dom, v.mail, v.db, v.featured, v.sort
FROM public.product_groups g
JOIN (VALUES
  ('hospedagem-compartilhada','Plano Start','plano-start','Ideal para sites pessoais e portfólios','start',10240,102400,1,10,2,false,1),
  ('hospedagem-compartilhada','Plano Pro','plano-pro','Para pequenos negócios e lojas virtuais','pro',30720,307200,5,50,10,true,2),
  ('hospedagem-compartilhada','Plano Business','plano-business','Alta performance para projetos em crescimento','business',102400,1048576,20,200,50,false,3),
  ('revenda','Revenda Essencial','revenda-essencial','Comece a revender hospedagem hoje','reseller-basic',204800,2097152,50,500,100,false,1)
) AS v(gslug,name,slug,description,pkg,disk,bw,dom,mail,db,featured,sort)
ON g.slug = v.gslug;

INSERT INTO public.product_prices (product_id, cycle, price)
SELECT p.id, c.cycle, ROUND(v.base * c.mult, 2)
FROM public.products p
JOIN (VALUES
  ('plano-start', 19.90::numeric),
  ('plano-pro', 39.90::numeric),
  ('plano-business', 89.90::numeric),
  ('revenda-essencial', 149.90::numeric)
) AS v(slug, base) ON v.slug = p.slug
JOIN (VALUES
  ('monthly'::public.billing_cycle, 1::numeric),
  ('quarterly'::public.billing_cycle, 2.85::numeric),
  ('semiannually'::public.billing_cycle, 5.4::numeric),
  ('annually'::public.billing_cycle, 10::numeric)
) AS c(cycle, mult) ON true;REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;-- Create Enums
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
END $$;

-- Coupons
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupons" ON public.coupons
    TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients can view active coupons" ON public.coupons FOR SELECT
    TO authenticated USING (is_active = true);

-- Orders
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    status public.order_status DEFAULT 'pending' NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT
    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can manage all orders" ON public.orders
    TO authenticated USING (public.is_staff(auth.uid()));

-- Services
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    status public.service_status DEFAULT 'pending' NOT NULL,
    domain TEXT,
    billing_cycle public.billing_cycle NOT NULL,
    next_due_date TIMESTAMP WITH TIME ZONE,
    suspension_reason TEXT,
    username TEXT, -- DirectAdmin username
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own services" ON public.services FOR SELECT
    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can manage all services" ON public.services
    TO authenticated USING (public.is_staff(auth.uid()));

-- Invoices
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices" ON public.invoices FOR SELECT
    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can manage all invoices" ON public.invoices
    TO authenticated USING (public.is_staff(auth.uid()));

-- Invoice Items
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoice items" ON public.invoice_items FOR SELECT
    TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.user_id = auth.uid()
        )
    );
CREATE POLICY "Staff can manage all invoice items" ON public.invoice_items
    TO authenticated USING (public.is_staff(auth.uid()));

-- Transactions
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    gateway TEXT,
    gateway_reference TEXT,
    status TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT
    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can manage all transactions" ON public.transactions
    TO authenticated USING (public.is_staff(auth.uid()));

-- Functions to sync updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER sync_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER sync_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER sync_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER sync_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
-- Fix handle_updated_at function search_path and permissions
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO service_role;
CREATE OR REPLACE FUNCTION public.increment_coupon_uses(_coupon_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.coupons
    SET used_count = COALESCE(used_count, 0) + 1,
        updated_at = now()
    WHERE id = _coupon_id;
END;
$$;

-- Revoke execute from public/authenticated and grant to service_role (used by server fn)
REVOKE EXECUTE ON FUNCTION public.increment_coupon_uses(UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.increment_coupon_uses(UUID) TO service_role;
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
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_coupon_uses(uuid) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.increment_coupon_uses(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO service_role;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;
-- Adicionar chave estrangeira explícita se faltar (profiles usa o mesmo id de auth.users)
ALTER TABLE public.tickets 
DROP CONSTRAINT IF EXISTS tickets_user_id_fkey;

ALTER TABLE public.tickets
ADD CONSTRAINT tickets_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- 1. Grant EXECUTE on the is_staff function to authenticated users.
-- This is necessary because RLS policies like "staff read all roles" use this function,
-- and PostgREST/Supabase requires the user to have permission to execute it.
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- 2. Grant EXECUTE on has_role as well, as it is used in admin policies.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 3. Speed up queries: Add index to user_roles.user_id if not present
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
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
    FOR SELECT TO authenticated USING (auth.uid() = user_id);-- SMTP Configuration keys
INSERT INTO public.system_settings (key, value)
VALUES 
  ('smtp_host', '""'),
  ('smtp_port', '587'),
  ('smtp_user', '""'),
  ('smtp_pass', '""'),
  ('smtp_encryption', '"tls"'),
  ('use_resend', 'true')
ON CONFLICT (key) DO NOTHING;

-- Domains table
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    domain_name TEXT NOT NULL UNIQUE,
    registrar TEXT NOT NULL, -- 'namecheap', 'registrobr', etc.
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'expired'
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT TRUE,
    nameservers TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.domains TO authenticated;
GRANT ALL ON public.domains TO service_role;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own domains" ON public.domains
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own domains" ON public.domains
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- WHMCS Import tracking
CREATE TABLE IF NOT EXISTS public.whmcs_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    stats JSONB DEFAULT '{}', -- { clients: 0, invoices: 0, services: 0 }
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whmcs_imports TO authenticated;
GRANT ALL ON public.whmcs_imports TO service_role;
ALTER TABLE public.whmcs_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage whmcs imports" ON public.whmcs_imports
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Garante que as funções de segurança possam ser executadas pelos usuários autenticados
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;

-- Recria is_staff como SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT exists (
    SELECT 1
    from public.user_roles
    where user_id = _user_id
      and role IN ('admin', 'staff')
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO anon;

-- Políticas de Admin
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles" ON public.profiles
    FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all services" ON public.services;
CREATE POLICY "Admins can view all services" ON public.services
    FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Admins can manage services" ON public.services
    FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all invoices" ON public.invoices;
CREATE POLICY "Admins can view all invoices" ON public.invoices
    FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;
CREATE POLICY "Admins can manage invoices" ON public.invoices
    FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all email logs" ON public.email_logs;
CREATE POLICY "Admins can view all email logs" ON public.email_logs
    FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
-- Revoga acesso público (anon) às funções SECURITY DEFINER para satisfazer o linter
-- Estas funções agora só podem ser chamadas por processos internos ou via RLS,
-- mas não diretamente pela API pública de forma anônima.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon;

-- Mantém acesso para usuários autenticados, pois o RLS precisa disso para validar permissões
-- O aviso do linter para 'authenticated' é aceitável aqui porque a função
-- valida o UUID do próprio usuário ou requer privilégios de admin.

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
DROP POLICY IF EXISTS "Leitura pública autenticada de configurações" ON public.system_settings;
CREATE POLICY "Apenas equipe lê configurações" ON public.system_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whmcs_id TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS whmcs_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS whmcs_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_whmcs_id_key ON public.profiles (whmcs_id) WHERE whmcs_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS services_whmcs_id_key ON public.services (whmcs_id) WHERE whmcs_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_whmcs_id_key ON public.invoices (whmcs_id) WHERE whmcs_id IS NOT NULL;CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status_pending ON public.invoices(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tickets TO authenticated;
GRANT SELECT ON TABLE public.email_logs TO authenticated;
GRANT SELECT ON TABLE public.products TO authenticated;

GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.services TO service_role;
GRANT ALL ON TABLE public.invoices TO service_role;
GRANT ALL ON TABLE public.tickets TO service_role;
GRANT ALL ON TABLE public.email_logs TO service_role;
GRANT ALL ON TABLE public.products TO service_role;ALTER TABLE public.services ADD COLUMN IF NOT EXISTS server_id UUID REFERENCES public.servers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_services_server_id ON public.services(server_id);
-- 1. Ensure email is unique in profiles
-- Clean up any existing records that might conflict by ID or email
-- (In case some legacy records exist that we didn't see)
DELETE FROM public.profiles p1
USING public.profiles p2
WHERE p1.id > p2.id AND p1.email = p2.email;

-- Now add the unique constraint if not already present
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- 2. Update the sync function to also handle email updates from auth.users
-- This ensures that if an email changes in auth, it reflects in profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  -- Ensure the user has at least the 'client' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3. Replace the trigger to handle both insert and update on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users 
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Grant access
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Revoke execute from public to resolve linter warnings
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;

-- Grant execute to authenticated role so they can be used in RLS policies
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
-- handle_new_user is only for the trigger, so it doesn't need authenticated access
-- Transferência de privilégios admin entre usuários
DO $$
BEGIN
  -- Remover admin do jhonatavieira2008@gmail.com
  DELETE FROM public.user_roles 
  WHERE user_id = 'b3c3c4b6-a398-48b6-8705-b065d412c294' 
    AND role = 'admin';

  -- Conceder admin ao jhonatavs@proton.me
  INSERT INTO public.user_roles (user_id, role) 
  VALUES ('a2230c6d-5f64-4b40-a0f6-f5e559cc80fd', 'admin') 
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
-- Corrigir relacionamento de email_logs para apontar para public.profiles
-- 1. Remover a constraint antiga se existir (ela aponta para auth.users)
ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_user_id_fkey;

-- 2. Adicionar a nova constraint apontando para public.profiles(id)
ALTER TABLE public.email_logs 
ADD CONSTRAINT email_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Garantir privilégios (já concedidos, mas para segurança)
GRANT SELECT, INSERT ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('auth', 'system', 'data', 'security')),
  action text NOT NULL,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning')),
  actor_id uuid,
  actor_email text,
  entity_type text,
  entity_id text,
  description text NOT NULL,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX audit_logs_category_created_at_idx ON public.audit_logs (category, created_at DESC);
CREATE INDEX audit_logs_actor_id_created_at_idx ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id);

CREATE OR REPLACE FUNCTION public.capture_audit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_id text;
  changed_columns jsonb := '[]'::jsonb;
  event_action text;
  event_description text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    row_id := COALESCE(to_jsonb(NEW)->>'id', to_jsonb(NEW)->>'key');
    event_action := 'record.created';
    event_description := format('Registro criado em %I', TG_TABLE_NAME);
  ELSIF TG_OP = 'UPDATE' THEN
    row_id := COALESCE(to_jsonb(NEW)->>'id', to_jsonb(NEW)->>'key');
    SELECT COALESCE(jsonb_agg(key ORDER BY key), '[]'::jsonb)
      INTO changed_columns
      FROM jsonb_each(to_jsonb(NEW)) current_row
     WHERE (to_jsonb(OLD)->current_row.key) IS DISTINCT FROM current_row.value
       AND current_row.key NOT IN ('api_token', 'password', 'token', 'secret', 'smtp_pass', 'resend_api_key');
    event_action := 'record.updated';
    event_description := format('Registro alterado em %I', TG_TABLE_NAME);
  ELSE
    row_id := COALESCE(to_jsonb(OLD)->>'id', to_jsonb(OLD)->>'key');
    event_action := 'record.deleted';
    event_description := format('Registro excluído de %I', TG_TABLE_NAME);
  END IF;

  INSERT INTO public.audit_logs (
    category,
    action,
    status,
    actor_id,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    'data',
    event_action,
    'success',
    auth.uid(),
    TG_TABLE_NAME,
    row_id,
    event_description,
    jsonb_build_object('operation', TG_OP, 'changed_columns', changed_columns)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'r'
       AND n.nspname = 'public'
       AND c.relname NOT IN ('audit_logs', 'spatial_ref_sys')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_changes ON public.%I', target.table_name);
    EXECUTE format(
      'CREATE TRIGGER audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_audit_change()',
      target.table_name
    );
  END LOOP;
END;
$$;REVOKE ALL ON FUNCTION public.capture_audit_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.capture_audit_change() FROM anon;
REVOKE ALL ON FUNCTION public.capture_audit_change() FROM authenticated;
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

INSERT INTO public.system_settings (key, value)
VALUES 
  ('branding', '{"logo_url": null, "app_name": "HostPanel", "primary_color": "oklch(0.88 0.19 128)", "brand_color": "oklch(0.72 0.19 148)", "favicon_url": null}')
ON CONFLICT (key) DO NOTHING;
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
GRANT ALL ON public.system_settings TO service_role;update public.system_settings
set value = jsonb_build_object(
  'app_name', 'EQ SAM',
  'logo_url', 'https://www.eqsam.com/cdn/imagens/novo-logo-eqsam-branco.webp',
  'favicon_url', 'https://www.eqsam.com/cdn/imagens/favicon.webp',
  'primary_color', 'oklch(0.88 0.19 128)',
  'brand_color', 'oklch(0.72 0.19 148)'
),
updated_at = now()
where key = 'branding';-- A tabela public.services já existe. Vamos adicionar campos extras.
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS next_invoice_date date,
ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT true;

-- Tabela para instâncias VPS (Contabo)
CREATE TABLE IF NOT EXISTS public.vps_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    external_id text UNIQUE NOT NULL, -- ID na Contabo
    ip_address text,
    status text DEFAULT 'provisioning', -- provisioning, active, suspended, deleted
    os_template text,
    region text,
    vps_type text, -- M, L, XL etc
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS se ainda não habilitado
ALTER TABLE public.vps_instances ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vps_instances TO authenticated;
GRANT ALL ON public.vps_instances TO service_role;

-- Políticas VPS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own VPS instances') THEN
        CREATE POLICY "Users can view their own VPS instances"
        ON public.vps_instances FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.services
                WHERE services.id = vps_instances.service_id
                AND services.user_id = auth.uid()
            ) OR public.has_role(auth.uid(), 'admin')
        );
    END IF;
END $$;
-- Add foreign key constraint from services.user_id to profiles.id
-- This allows PostgREST to automatically resolve the relationship in joined queries
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'services_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE public.services
        ADD CONSTRAINT services_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Also ensure vps_instances has a direct relation to services (already exists but verify consistency)
-- Ensure grants are correct for joined queries
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.services TO authenticated;
GRANT SELECT ON public.vps_instances TO authenticated;
-- Force creation of relationship between services and profiles for PostgREST
-- Even though profiles(id) is the target, we use user_id in services
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_user_id_profiles_fkey;
ALTER TABLE public.services 
  ADD CONSTRAINT services_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure grants are active for the joined query
GRANT SELECT ON public.profiles TO authenticated, service_role;
GRANT SELECT ON public.services TO authenticated, service_role;
GRANT SELECT ON public.vps_instances TO authenticated, service_role;
-- Inserir grupos padrão se não existirem
INSERT INTO public.product_groups (name, slug, sort_order)
VALUES 
  ('Hospedagem Compartilhada', 'hospedagem-compartilhada', 1),
  ('Servidores VPS', 'servidores-vps', 2)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- Garantir que a tabela de grupos tem RLS e permissões corretas
ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_groups' AND policyname = 'Admins can do everything on groups') THEN
        CREATE POLICY "Admins can do everything on groups" ON public.product_groups
        FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_groups' AND policyname = 'Anyone can view groups') THEN
        CREATE POLICY "Anyone can view groups" ON public.product_groups
        FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

GRANT ALL ON public.product_groups TO authenticated;
GRANT ALL ON public.product_groups TO service_role;
-- Adicionar coluna external_id
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS external_id text;

-- Atualizar metadados do linter (opcional mas recomendado se o Supabase usar cache de schema)
NOTIFY pgrst, 'reload schema';
CREATE INDEX IF NOT EXISTS idx_services_user_created ON public.services (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_user_created ON public.invoices (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices (due_date);
CREATE INDEX IF NOT EXISTS idx_tickets_user_updated ON public.tickets (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_updated_at ON public.tickets (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_created ON public.email_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_id ON public.invoice_items (service_id);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id ON public.transactions (invoice_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON public.transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vps_instances_service_id ON public.vps_instances (service_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_created ON public.ticket_messages (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_visible_sort ON public.products (is_visible, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_prices_product_active ON public.product_prices (product_id, is_active);
CREATE INDEX IF NOT EXISTS idx_domains_user_id ON public.domains (user_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services (status);
-- Migrações consolidadas do projeto
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'client');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','staff')
  )
$$;

CREATE POLICY "own roles readable" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "staff read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  company_name text,
  tax_id text,
  phone text,
  address_line text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text DEFAULT 'BR',
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  action text NOT NULL,
  status text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  actor_email text,
  entity_type text,
  entity_id text,
  description text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff view logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- SYSTEM SETTINGS
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Garantir que as tabelas necessárias para o build existam
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  status text,
  created_at timestamptz DEFAULT now()
);
GRANT ALL ON public.invoices TO authenticated, service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
GRANT ALL ON public.services TO authenticated, service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
GRANT ALL ON public.tickets TO authenticated, service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
GRANT ALL ON public.email_logs TO authenticated, service_role;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname text,
  api_user text,
  api_token text,
  created_at timestamptz DEFAULT now()
);
GRANT ALL ON public.servers TO authenticated, service_role;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.vps_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);
GRANT ALL ON public.vps_instances TO authenticated, service_role;
ALTER TABLE public.vps_instances ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);
GRANT ALL ON public.coupons TO authenticated, service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
