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
) AS c(cycle, mult) ON true;