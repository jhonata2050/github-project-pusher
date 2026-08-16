export interface BrandingSettings {
  logo_url: string | null;
  app_name: string;
  primary_color: string;
  brand_color: string;
  favicon_url: string | null;
}

export const DEFAULT_BRANDING: BrandingSettings = {
  logo_url: null,
  app_name: "HostPanel",
  primary_color: "oklch(0.88 0.19 128)",
  brand_color: "oklch(0.72 0.19 148)",
  favicon_url: null,
};
