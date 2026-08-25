
-- Adicionar colunas de erro e notas na tabela de serviços para auditoria
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS notes TEXT;

-- Garantir que as permissões estão corretas
GRANT SELECT, UPDATE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
