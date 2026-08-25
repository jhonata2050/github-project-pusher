-- Garantir permissões nas tabelas de catálogo
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_prices TO authenticated;

GRANT ALL ON public.product_groups TO service_role;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.product_prices TO service_role;

-- RLS
ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

-- Políticas para Admins
DROP POLICY IF EXISTS "Admins can manage product groups" ON public.product_groups;
CREATE POLICY "Admins can manage product groups"
ON public.product_groups FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
ON public.products FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage product prices" ON public.product_prices;
CREATE POLICY "Admins can manage product prices"
ON public.product_prices FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Políticas para usuários verem produtos ativos
DROP POLICY IF EXISTS "Everyone can view active groups" ON public.product_groups;
CREATE POLICY "Everyone can view active groups"
ON public.product_groups FOR SELECT TO authenticated
USING (is_visible = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Everyone can view active products" ON public.products;
CREATE POLICY "Everyone can view active products"
ON public.products FOR SELECT TO authenticated
USING (is_visible = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Everyone can view active prices" ON public.product_prices;
CREATE POLICY "Everyone can view active prices"
ON public.product_prices FOR SELECT TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
