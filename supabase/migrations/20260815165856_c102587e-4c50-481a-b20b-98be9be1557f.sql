update public.system_settings
set value = jsonb_build_object(
  'app_name', 'EQ SAM',
  'logo_url', 'https://www.eqsam.com/cdn/imagens/novo-logo-eqsam-branco.webp',
  'favicon_url', 'https://www.eqsam.com/cdn/imagens/favicon.webp',
  'primary_color', 'oklch(0.88 0.19 128)',
  'brand_color', 'oklch(0.72 0.19 148)'
),
updated_at = now()
where key = 'branding';