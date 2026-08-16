-- Revoga acesso público (anon) às funções SECURITY DEFINER para satisfazer o linter
-- Estas funções agora só podem ser chamadas por processos internos ou via RLS,
-- mas não diretamente pela API pública de forma anônima.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon;

-- Mantém acesso para usuários autenticados, pois o RLS precisa disso para validar permissões
-- O aviso do linter para 'authenticated' é aceitável aqui porque a função
-- valida o UUID do próprio usuário ou requer privilégios de admin.
