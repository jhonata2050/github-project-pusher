
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

INSERT INTO public.system_settings (key, value)
VALUES 
  ('branding', '{"logo_url": null, "app_name": "HostPanel", "primary_color": "oklch(0.88 0.19 128)", "brand_color": "oklch(0.72 0.19 148)", "favicon_url": null}')
ON CONFLICT (key) DO NOTHING;
