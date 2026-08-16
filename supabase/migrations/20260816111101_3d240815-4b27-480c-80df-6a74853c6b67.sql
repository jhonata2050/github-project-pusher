-- Add foreign key constraint from services.user_id to profiles.id
-- This allows PostgREST to automatically resolve the relationship in joined queries
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'services_user_id_profiles_fkey'
    ) THEN
        ALTER TABLE public.services
        ADD CONSTRAINT services_user_id_profiles_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Also ensure vps_instances has a direct relation to services (already exists but verify consistency)
-- Ensure grants are correct for joined queries
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.services TO authenticated;
GRANT SELECT ON public.vps_instances TO authenticated;
