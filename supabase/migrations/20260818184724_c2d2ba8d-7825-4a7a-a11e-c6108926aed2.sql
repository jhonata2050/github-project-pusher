UPDATE public.product_groups SET name = 'Servidores' WHERE name = 'Hospedagem Compartilhada';
UPDATE public.product_groups SET name = 'Servidores' WHERE name = 'Servidores DirectAdmin';
GRANT ALL ON public.product_groups TO authenticated;
GRANT ALL ON public.product_groups TO service_role;
GRANT SELECT ON public.product_groups TO anon;