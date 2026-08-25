-- ==============================================================================
-- EQSAM PAINEL - FULL SCHEMA SQL (Consolidado & Limpo)
-- Execute este script no SQL Editor do Supabase para inicializar o banco completo.
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'client');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.order_status AS ENUM ('pending', 'active', 'fraud', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.service_status AS ENUM ('pending', 'active', 'suspended', 'terminated', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.invoice_status AS ENUM ('pending', 'paid', 'cancelled', 'refunded', 'overdue');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'quarterly', 'semiannually', 'annually', 'biennially');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. FUNÇÕES BÁSICAS
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

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. TABELAS PRINCIPAIS

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
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

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
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
  account_balance DECIMAL(10,2) DEFAULT 0.00,
  whmcs_id text,
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

-- Auto profile creation trigger
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Product Groups
CREATE TABLE IF NOT EXISTS public.product_groups (
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

-- Products
CREATE TABLE IF NOT EXISTS public.products (
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
  is_featured boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
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

-- Product Prices
CREATE TABLE IF NOT EXISTS public.product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  cycle public.billing_cycle NOT NULL,
  price numeric(10,2) NOT NULL,
  setup_fee numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
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

-- Servers
CREATE TABLE IF NOT EXISTS public.servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    hostname TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    port INTEGER DEFAULT 2222 NOT NULL,
    type TEXT DEFAULT 'directadmin' NOT NULL,
    api_user TEXT NOT NULL,
    api_token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    max_accounts INTEGER DEFAULT 100 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
GRANT ALL ON public.servers TO authenticated;
GRANT ALL ON public.servers TO service_role;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage all servers" ON public.servers
    FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- VPS Instances
CREATE TABLE IF NOT EXISTS public.vps_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    external_id TEXT NOT NULL,
    name TEXT NOT NULL,
    ip_address TEXT,
    os_template TEXT,
    region TEXT,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
GRANT ALL ON public.vps_instances TO authenticated;
GRANT ALL ON public.vps_instances TO service_role;
ALTER TABLE public.vps_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own VPS" ON public.vps_instances
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can manage all VPS" ON public.vps_instances
    FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0 NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
GRANT ALL ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Staff can manage all coupons" ON public.coupons FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
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

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can manage all orders" ON public.orders FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Services
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    server_id UUID REFERENCES public.servers(id) ON DELETE SET NULL,
    status public.service_status DEFAULT 'pending' NOT NULL,
    domain TEXT,
    billing_cycle public.billing_cycle NOT NULL,
    next_due_date TIMESTAMP WITH TIME ZONE,
    suspension_reason TEXT,
    username TEXT,
    password TEXT,
    whmcs_id TEXT,
    vps_hostname TEXT,
    vps_os_template TEXT,
    vps_region TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
GRANT SELECT, INSERT, UPDATE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own services" ON public.services FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can manage all services" ON public.services FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices" ON public.invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can manage all invoices" ON public.invoices FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Invoice Items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
GRANT SELECT, INSERT ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoice items" ON public.invoice_items FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
);
CREATE POLICY "Users can create their own invoice items" ON public.invoice_items FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
);
CREATE POLICY "Staff can manage all invoice items" ON public.invoice_items FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
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
GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can manage all transactions" ON public.transactions FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Wallet Transactions (Carteira de Saldo)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'deposit', 'payment', 'refund', 'bonus', 'adjustment'
    amount DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wallet transactions" ON public.wallet_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can manage all wallet transactions" ON public.wallet_transactions FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Domains
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    domain_name TEXT NOT NULL UNIQUE,
    registrar TEXT NOT NULL DEFAULT 'openprovider',
    status TEXT NOT NULL DEFAULT 'pending',
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT TRUE,
    nameservers TEXT[] DEFAULT '{}',
    is_locked BOOLEAN DEFAULT TRUE,
    auth_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.domains TO authenticated;
GRANT ALL ON public.domains TO service_role;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own domains" ON public.domains FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own domains" ON public.domains FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can manage all domains" ON public.domains FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Tickets
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    department TEXT DEFAULT 'Suporte Geral' NOT NULL,
    priority TEXT DEFAULT 'medium' NOT NULL,
    status TEXT DEFAULT 'open' NOT NULL,
    subject TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
GRANT ALL ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON public.tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tickets" ON public.tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can manage all tickets" ON public.tickets FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Ticket Messages
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_staff BOOLEAN DEFAULT FALSE NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
GRANT ALL ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of own tickets" ON public.ticket_messages FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.user_id = auth.uid())
);
CREATE POLICY "Users can insert messages to own tickets" ON public.ticket_messages FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.user_id = auth.uid())
);
CREATE POLICY "Staff can manage all ticket messages" ON public.ticket_messages FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Staff manage settings" ON public.system_settings FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Email Logs
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    template_name TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
GRANT ALL ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email logs" ON public.email_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can manage all email logs" ON public.email_logs FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email TEXT,
    actor_role TEXT,
    category TEXT DEFAULT 'system',
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    description TEXT,
    status TEXT DEFAULT 'success',
    metadata JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
GRANT ALL ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can manage all audit logs" ON public.audit_logs FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- WHMCS Imports
CREATE TABLE IF NOT EXISTS public.whmcs_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    source_database TEXT,
    summary JSONB,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
GRANT ALL ON public.whmcs_imports TO authenticated;
GRANT ALL ON public.whmcs_imports TO service_role;
ALTER TABLE public.whmcs_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage whmcs imports" ON public.whmcs_imports FOR ALL TO authenticated USING (public.is_staff(auth.uid()));

-- 5. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_domains_user_id ON public.domains(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_id ON public.wallet_transactions(user_id);

-- 6. DADOS INICIAIS (SEEDS)
INSERT INTO public.product_groups (name, slug, description, sort_order)
VALUES 
  ('Hospedagem de Sites', 'hospedagem', 'Planos de hospedagem cPanel e DirectAdmin com discos NVMe ultrarrápidos e SSL Grátis', 1),
  ('Servidores Cloud VPS', 'vps', 'Servidores virtuais dedicados de alta performance com tráfego ilimitado', 2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (group_id, name, slug, description, product_type, directadmin_package, disk_quota_mb, bandwidth_quota_mb, domains_limit, email_accounts_limit, database_limit, is_featured, sort_order)
SELECT 
  id, 
  'Plano Starter', 
  'plano-starter', 
  'Perfeito para sites pessoais, blogs e portfólios iniciantes.', 
  'hosting',
  'Starter',
  10240, 
  102400, 
  1, 
  5, 
  2, 
  false, 
  1
FROM public.product_groups WHERE slug = 'hospedagem'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (group_id, name, slug, description, product_type, directadmin_package, disk_quota_mb, bandwidth_quota_mb, domains_limit, email_accounts_limit, database_limit, is_featured, sort_order)
SELECT 
  id, 
  'Plano Pro', 
  'plano-pro', 
  'Nosso plano mais popular. Ideal para empresas e lojas virtuais em crescimento.', 
  'hosting',
  'Pro',
  25600, 
  -1, 
  5, 
  20, 
  10, 
  true, 
  2
FROM public.product_groups WHERE slug = 'hospedagem'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products (group_id, name, slug, description, product_type, directadmin_package, disk_quota_mb, bandwidth_quota_mb, domains_limit, email_accounts_limit, database_limit, is_featured, sort_order)
SELECT 
  id, 
  'Plano Turbo', 
  'plano-turbo', 
  'Máxima potência com recursos dedicados para portais e sites de altíssimo tráfego.', 
  'hosting',
  'Turbo',
  51200, 
  -1, 
  -1, 
  -1, 
  -1, 
  false, 
  3
FROM public.product_groups WHERE slug = 'hospedagem'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.product_prices (product_id, cycle, price, setup_fee)
SELECT id, 'monthly', 19.90, 0 FROM public.products WHERE slug = 'plano-starter'
ON CONFLICT (product_id, cycle) DO NOTHING;

INSERT INTO public.product_prices (product_id, cycle, price, setup_fee)
SELECT id, 'annually', 199.00, 0 FROM public.products WHERE slug = 'plano-starter'
ON CONFLICT (product_id, cycle) DO NOTHING;

INSERT INTO public.product_prices (product_id, cycle, price, setup_fee)
SELECT id, 'monthly', 34.90, 0 FROM public.products WHERE slug = 'plano-pro'
ON CONFLICT (product_id, cycle) DO NOTHING;

INSERT INTO public.product_prices (product_id, cycle, price, setup_fee)
SELECT id, 'annually', 349.00, 0 FROM public.products WHERE slug = 'plano-pro'
ON CONFLICT (product_id, cycle) DO NOTHING;

INSERT INTO public.product_prices (product_id, cycle, price, setup_fee)
SELECT id, 'monthly', 69.90, 0 FROM public.products WHERE slug = 'plano-turbo'
ON CONFLICT (product_id, cycle) DO NOTHING;

INSERT INTO public.product_prices (product_id, cycle, price, setup_fee)
SELECT id, 'annually', 699.00, 0 FROM public.products WHERE slug = 'plano-turbo'
ON CONFLICT (product_id, cycle) DO NOTHING;

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

