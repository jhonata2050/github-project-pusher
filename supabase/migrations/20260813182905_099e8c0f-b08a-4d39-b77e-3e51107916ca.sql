
-- 1. Grant EXECUTE on the is_staff function to authenticated users.
-- This is necessary because RLS policies like "staff read all roles" use this function,
-- and PostgREST/Supabase requires the user to have permission to execute it.
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- 2. Grant EXECUTE on has_role as well, as it is used in admin policies.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 3. Speed up queries: Add index to user_roles.user_id if not present
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
