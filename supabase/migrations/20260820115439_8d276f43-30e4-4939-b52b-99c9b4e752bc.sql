-- Add columns for lead tracking and OAuth flow completion
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS lead_source text,
ADD COLUMN IF NOT EXISTS lead_source_other text,
ADD COLUMN IF NOT EXISTS registration_completed boolean DEFAULT false;

-- Grant access to these columns
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
