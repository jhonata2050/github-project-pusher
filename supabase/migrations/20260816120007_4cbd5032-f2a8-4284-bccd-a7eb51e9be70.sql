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
