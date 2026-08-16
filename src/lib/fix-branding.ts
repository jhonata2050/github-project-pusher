import { supabase } from "@/integrations/supabase/client";

export async function testUpdateBranding() {
  const brandingData = {
    app_name: "HostPanel",
    logo_url: "https://www.eqsam.com/cdn/imagens/logo.png",
    favicon_url: "https://www.eqsam.com/cdn/imagens/logo.png",
    primary_color: "oklch(0.88 0.19 128)",
    brand_color: "oklch(0.72 0.19 148)"
  };

  const { data, error } = await supabase
    .from('system_settings')
    .upsert({ 
      key: 'branding', 
      value: brandingData,
      updated_at: new Date().toISOString()
    })
    .select();

  return { data, error };
}
