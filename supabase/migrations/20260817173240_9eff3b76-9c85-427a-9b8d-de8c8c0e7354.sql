
-- Grant SELECT on products, product_groups and product_prices to anon role
GRANT SELECT ON public.product_groups TO anon;
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.product_prices TO anon;

-- Ensure RLS is enabled
ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public (anon) reads for visible items
DROP POLICY IF EXISTS "Public can view visible product groups" ON public.product_groups;
CREATE POLICY "Public can view visible product groups" 
ON public.product_groups 
FOR SELECT 
TO anon, authenticated
USING (is_visible = true);

DROP POLICY IF EXISTS "Public can view visible products" ON public.products;
CREATE POLICY "Public can view visible products" 
ON public.products 
FOR SELECT 
TO anon, authenticated
USING (is_visible = true);

DROP POLICY IF EXISTS "Public can view active prices" ON public.product_prices;
CREATE POLICY "Public can view active prices" 
ON public.product_prices 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);
