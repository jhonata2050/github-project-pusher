-- Use supabase--migration for data updates in Cloud environment
BEGIN;
UPDATE public.system_settings 
SET value = jsonb_set(value, '{app_name}', '"Eqsam"')
WHERE key = 'branding';

UPDATE public.system_settings 
SET value = '"Eqsam"'
WHERE key = 'company_name';

UPDATE public.system_settings 
SET value = '"suporte@eqsam.com"'
WHERE key = 'support_email';
COMMIT;
