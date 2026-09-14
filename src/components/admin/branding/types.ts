import type { BrandingSettings } from "@/lib/admin.functions";

export interface BrandingPreset {
  label: string;
  color: string;
  brand: string;
}

export interface BrandingIdentityCardProps {
  form: BrandingSettings;
  uploading: string | null;
  onFormChange: (updater: (prev: BrandingSettings) => BrandingSettings) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "favicon") => void;
}

export interface BrandingPaletteCardProps {
  form: BrandingSettings;
  onFormChange: (updater: (prev: BrandingSettings) => BrandingSettings) => void;
  onApplyPreset: (preset: BrandingPreset) => void;
}
