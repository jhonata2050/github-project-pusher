ALTER TABLE public.vps_instances ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.vps_instances ADD COLUMN IF NOT EXISTS os_template text;
ALTER TABLE public.vps_instances ADD COLUMN IF NOT EXISTS cpu_cores integer;
ALTER TABLE public.vps_instances ADD COLUMN IF NOT EXISTS ram_gb integer;
ALTER TABLE public.vps_instances ADD COLUMN IF NOT EXISTS disk_gb integer;

-- Update existing instance with data from the screenshot provided by user
UPDATE public.vps_instances 
SET 
  cpu_cores = 31, 
  ram_gb = 81, 
  disk_gb = 30, 
  region = 'European Union (Germany)', 
  os_template = 'Ubuntu 22.04'
WHERE external_id = '203016028';