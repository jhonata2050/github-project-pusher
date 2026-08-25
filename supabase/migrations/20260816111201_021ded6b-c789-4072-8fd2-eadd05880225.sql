-- Force creation of relationship between services and profiles for PostgREST
-- Even though profiles(id) is the target, we use user_id in services
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_user_id_profiles_fkey;
ALTER TABLE public.services 
  ADD CONSTRAINT services_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure grants are active for the joined query
GRANT SELECT ON public.profiles TO authenticated, service_role;
GRANT SELECT ON public.services TO authenticated, service_role;
GRANT SELECT ON public.vps_instances TO authenticated, service_role;
