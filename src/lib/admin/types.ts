import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { BrandingSettings } from "../branding";

export type { BrandingSettings };

export interface AdminContext {
  supabase: SupabaseClient<Database>;
  userId: string;
  claims?: any;
}

export interface AdminChangePasswordData {
  userId: string;
  newPassword: string;
}

export interface AdminSendPasswordResetData {
  userId: string;
  email: string;
}

export interface LeadSourceStat {
  name: string;
  value: number;
}
