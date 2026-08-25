REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_coupon_uses(uuid) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.increment_coupon_uses(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO service_role;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;
