-- Adicionar coluna external_id
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS external_id text;

-- Atualizar metadados do linter (opcional mas recomendado se o Supabase usar cache de schema)
NOTIFY pgrst, 'reload schema';
