CREATE OR REPLACE FUNCTION public.increment_coupon_uses(_coupon_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.coupons
    SET used_count = COALESCE(used_count, 0) + 1,
        updated_at = now()
    WHERE id = _coupon_id;
END;
$$;

-- Revoke execute from public/authenticated and grant to service_role (used by server fn)
REVOKE EXECUTE ON FUNCTION public.increment_coupon_uses(UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.increment_coupon_uses(UUID) TO service_role;
