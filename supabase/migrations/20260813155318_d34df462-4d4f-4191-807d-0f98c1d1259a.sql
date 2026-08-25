-- Fix handle_updated_at function search_path and permissions
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO service_role;
