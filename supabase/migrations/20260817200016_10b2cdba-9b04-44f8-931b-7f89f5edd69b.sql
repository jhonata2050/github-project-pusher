UPDATE public.system_settings 
SET value = '{
  "app_name": "HostPanel",
  "brand_color": "oklch(0.72 0.19 148)",
  "favicon_url": "https://storage.googleapis.com/gpt-engineer-file-uploads/VV3qU2PelKOQSTgoS8NokayrB433/81706fc3-eb57-46e2-8830-68fa4bd6e897.png",
  "logo_url": "https://storage.googleapis.com/gpt-engineer-file-uploads/VV3qU2PelKOQSTgoS8NokayrB433/81706fc3-eb57-46e2-8830-68fa4bd6e897.png",
  "primary_color": "oklch(0.88 0.19 128)"
}'::jsonb
WHERE key = 'branding';