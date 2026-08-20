ALTER TABLE public.products ADD COLUMN immediate_purchase BOOLEAN DEFAULT false;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
